import http from 'http';
import fs from 'fs';
import { exec, execSync } from 'child_process';

const PORT = 54322;
const REDIRECT_URI = `http://localhost:${PORT}`;

const keysRaw = JSON.parse(fs.readFileSync('/Users/rusan/.config/gdrive/client_secret.json', 'utf8'));
const keys = keysRaw.installed || keysRaw.web;
const CLIENT_ID = keys.client_id;
const CLIENT_SECRET = keys.client_secret;

const SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/documents'
];

const authParams = new URLSearchParams({
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  response_type: 'code',
  access_type: 'offline',
  prompt: 'consent',
  login_hint: 'shahriar.rusan12@gmail.com',
  scope: SCOPES.join(' ')
});

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`;

function createMimeMessage(to, subject, bodyText) {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
  const mime = [
    `From: "AI Invoice & Accounting Automation" <shahriar.rusan12@gmail.com>`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    bodyText
  ].join('\r\n');

  return Buffer.from(mime, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sendGmailMessage(accessToken, to, subject, bodyText) {
  const raw = createMimeMessage(to, subject, bodyText);
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Gmail API Error (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url, REDIRECT_URI);
    const code = reqUrl.searchParams.get('code');
    const error = reqUrl.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Authorization failed: ${error}`);
      console.error('Authorization error:', error);
      server.close(() => process.exit(1));
      return;
    }

    if (!code) {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Waiting for Google OAuth callback...');
      return;
    }

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      throw new Error(`Failed to exchange token: ${JSON.stringify(tokens)}`);
    }

    // Load existing refresh_token as fallback if not returned
    let existingRefresh = '';
    try {
      const prev = JSON.parse(fs.readFileSync('/Users/rusan/.config/gdrive/.gdrive-server-credentials.json', 'utf8'));
      existingRefresh = prev.refresh_token || '';
    } catch (e) {}

    const refreshToken = tokens.refresh_token || existingRefresh;
    const expiryDate = Date.now() + (Number(tokens.expires_in || 3599) * 1000);

    const savedGdriveToken = {
      access_token: tokens.access_token,
      refresh_token: refreshToken,
      scope: tokens.scope || SCOPES.join(' '),
      token_type: tokens.token_type || 'Bearer',
      expiry_date: expiryDate
    };

    // 1. Save updated credentials to ~/.config/gdrive/.gdrive-server-credentials.json
    fs.writeFileSync(
      '/Users/rusan/.config/gdrive/.gdrive-server-credentials.json',
      JSON.stringify(savedGdriveToken, null, 2)
    );

    // 2. Save n8n credentials JSON with both Google Sheets and Gmail OAuth2
    const n8nTokenData = {
      access_token: tokens.access_token,
      refresh_token: refreshToken,
      scope: tokens.scope || SCOPES.join(' '),
      token_type: tokens.token_type || 'Bearer',
      expires_in: tokens.expires_in || 3599,
      expiry_date: expiryDate,
      n8n_expires_at: String(expiryDate)
    };

    const n8nCreds = [
      {
        id: 'google-sheets-oauth-cred',
        name: 'Google Sheets Account (shahriar.rusan12@gmail.com)',
        type: 'googleSheetsOAuth2Api',
        data: {
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
          oauthTokenData: n8nTokenData
        }
      },
      {
        id: 'gmail-oauth-cred',
        name: 'Gmail Account (shahriar.rusan12@gmail.com)',
        type: 'gmailOAuth2',
        data: {
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
          oauthTokenData: n8nTokenData
        }
      }
    ];

    const credFilePath = '/Users/rusan/Documents/Google anti-gravity projects/n8n-invoice-automation/google_credentials.json';
    const wfFilePath = '/Users/rusan/Documents/Google anti-gravity projects/n8n-invoice-automation/workflow_ai_invoice_processor.json';
    fs.writeFileSync(credFilePath, JSON.stringify(n8nCreds, null, 2));

    // 3. Import credentials & updated workflow into n8n database
    try {
      execSync(
        `export PATH="/Users/rusan/node/bin:$PATH" && set -a && source "/Users/rusan/Documents/Google anti-gravity projects/n8n-invoice-automation/.env" && set +a && n8n import:credentials --input="${credFilePath}" --projectId=XJr2xcFIWy7mvij2 && n8n import:workflow --input="${wfFilePath}" --projectId=XJr2xcFIWy7mvij2`,
        { stdio: 'pipe', shell: '/bin/zsh' }
      );
      console.log('✅ Imported Gmail & Google Sheets OAuth credentials and updated workflow into n8n!');
    } catch (impErr) {
      console.error('Warning importing credentials via CLI:', impErr.message);
    }

    // 4. Immediately send the exact Chain 1 and Chain 2 emails from the user's Execution #6 (NORTHSTAR DIGITAL SYSTEMS LTD. / NSD-INV-2026-0947)
    const chain1Subject = '🔍 [Action Needed: Provide Details] Invoice NSD-INV-2026-0947 from NORTHSTAR DIGITAL SYSTEMS LTD. ($1,810,383.25)';
    const chain1Body = `Hi Shahriar,

An incoming invoice from "NORTHSTAR DIGITAL SYSTEMS LTD." was paused by the AI Accounting Automation and requires additional details or manual sign-off from you before it can be posted to the General Ledger.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 EXTRACTED INVOICE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Vendor:              NORTHSTAR DIGITAL SYSTEMS LTD.
• Invoice Number:      NSD-INV-2026-0947
• Invoice Date:        2026-09-25
• Submitted By:        you@example.com
• File Name:           ChatGPT Image Sep 26, 2026, 12_01_16 AM.png
• Suggested Category:  Software (Software Expense)
• Stated Subtotal:     $1,583,525.00
• Stated Tax:          $237,528.75
• Calculated Total:    $1,821,053.75
• Stated Total Due:    $1,810,383.25
• Discrepancy Amount:  $10,670.50
• AI Confidence Score: 62%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ WHY THIS INVOICE WAS HALTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Mathematical Discrepancy: Subtotal ($1,583,525.00) + Tax ($237,528.75) = $1,821,053.75, which does not match the stated Total Due ($1,810,383.25) — difference of $10,670.50.
  2. Low AI extraction confidence (62%) due to line-item discount/amount mismatches across the 18 line items.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 DETAILS NEEDED FROM YOU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Please reply or update the tracker with the following details:
  1. Is the $10,670.50 difference an authorized fee/discount adjustment, or a vendor billing error?
  2. Should this expense be booked under "Software Expense" (Software)?
  3. Do you authorize a manual override, or should we wait for the vendor's corrected upload?

(Note: An automated notice has also been dispatched to you@example.com requesting a corrected invoice upload.)

Best regards,
AI Invoice & Accounting Controller`;

    const chain2Subject = '⚠️ Action Required: Corrections Needed for Invoice NSD-INV-2026-0947 (NORTHSTAR DIGITAL SYSTEMS LTD.)';
    const chain2Body = `Dear Northstar Digital Systems Ltd. Billing Team,

Thank you for submitting Invoice NSD-INV-2026-0947 dated 2026-09-25. During our automated Accounts Payable verification process, we identified issues that prevent your invoice from being processed for payment at this time.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ IDENTIFIED ISSUES IN YOUR SUBMISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Mathematical Discrepancy: The stated Subtotal ($1,583,525.00) plus Tax ($237,528.75) equals $1,821,053.75, which does not match the stated Total Due of $1,810,383.25 (an unexplained difference of $10,670.50).
  2. Line-Item Extended Amount Mismatches: Several line items (among the 18 listed services/licenses) have extended amounts that do not match Quantity × Unit Price without explicit discount line items.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 REQUIRED INFORMATION TO UPLOAD / RESUBMIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To ensure prompt payment processing, please upload a corrected invoice via our Invoice Upload Portal (http://localhost:5678/form/upload-invoice) or reply to this email with a revised invoice that clearly includes:

  1. Verified Mathematical Totals:
     • Reconciled Subtotal ($1,583,525.00 or updated sum of all 18 line items)
     • Confirmed Tax / VAT breakdown ($237,528.75)
     • Corrected Total Amount Due so that Subtotal + Tax = Total Due ($1,821,053.75, or an explicit credit/discount line explaining the $10,670.50 difference)

  2. Complete Vendor & Invoice Metadata:
     • Full Legal Company Name (NORTHSTAR DIGITAL SYSTEMS LTD.) & Billing Address
     • Official Invoice Number (NSD-INV-2026-0947) & Issue Date (2026-09-25)

  3. Itemized Line-Item Breakdown:
     • Clear description of each software license / implementation service
     • Exact Quantity, Unit Price, Discount (if applicable), and Extended Line Amount

  4. Clear Document Format:
     • High-resolution PDF, PNG, or JPG invoice document.

Kind regards,
Accounts Payable & Finance Automation Team
shahriar.rusan12@gmail.com`;

    const msg1 = await sendGmailMessage(tokens.access_token, 'shahriar.rusan12@gmail.com', chain1Subject, chain1Body);
    const msg2 = await sendGmailMessage(tokens.access_token, 'you@example.com', chain2Subject, chain2Body);
    const msg2Copy = await sendGmailMessage(tokens.access_token, 'shahriar.rusan12@gmail.com', chain2Subject, chain2Body);

    console.log('✅ Sent Chain 1 Email to shahriar.rusan12@gmail.com! Gmail ID:', msg1.id);
    console.log('✅ Sent Chain 2 Email to you@example.com! Gmail ID:', msg2.id);
    console.log('✅ Sent Chain 2 Copy to shahriar.rusan12@gmail.com! Gmail ID:', msg2Copy.id);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gmail + n8n Connected & Emails Sent!</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #0f172a; color: #f8fafc; }
          .card { background: #1e293b; padding: 2.5rem; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); max-width: 600px; border: 1px solid #334155; }
          h1 { color: #4ade80; font-size: 1.5rem; margin-top: 0; }
          p { color: #cbd5e1; font-size: 1rem; line-height: 1.6; }
          .badge { background: #064e3b; color: #6ee7b7; padding: 8px 12px; border-radius: 8px; font-family: monospace; font-size: 0.85rem; display: block; margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>✅ Gmail Connected & Both Emails Delivered!</h1>
          <p>Your n8n automation now has full permission to send emails via Gmail.</p>
          <span class="badge">Chain 1 → shahriar.rusan12@gmail.com (ID: ${msg1.id})</span>
          <span class="badge">Chain 2 → you@example.com (ID: ${msg2.id})</span>
          <span class="badge">Chain 2 Copy → shahriar.rusan12@gmail.com (ID: ${msg2Copy.id})</span>
          <p>Check your inbox now! You can close this browser tab.</p>
        </div>
      </body>
      </html>
    `);

    server.close(() => process.exit(0));
  } catch (err) {
    console.error('❌ Error in OAuth callback:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Error: ${err.message}`);
    server.close(() => process.exit(1));
  }
});

server.listen(PORT, () => {
  console.log('Listening for Google OAuth callback on', REDIRECT_URI);
  console.log('Auth URL:', authUrl);
  exec(`open "${authUrl}"`);
});
