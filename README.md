# 🚀 AI Invoice Processing & Accounting Automation (Free Stack)

A complete end-to-end local invoice accounting workflow built on **n8n local**, **Google Gemini 2.5 Flash-Lite**, **Groq (GPT-OSS 120B)**, **Google Sheets**, and **Gmail**.

---

## 📸 Workflow Architecture (Matching Blueprint)

```
[1. Gmail / Webhook Trigger] ──> [2. Download Attachment] (PDF / Image)
                                              │
                                              ▼
                                 [3. Google Gemini 2.5 Flash-Lite] (Vision Extraction)
                                              │
                                              ▼
                                 [4. GPT-OSS 120B via Groq] (Categorization & Journal Entry)
                                              │
                                              ▼
                                 [5. IF / Code Validation]
                                        /         \
                     (Math & Confidence Pass)     (Discrepancy / Review)
                                      /             \
                                     ▼               ▼
                [6. Google Sheets Append]       [Manual Review Gmail Alert]
                             │
                             ▼
                 [7. Gmail Confirmation]
```

---

## 🛠️ Components & What They Do

| Component | Role | Status / Config |
| :--- | :--- | :--- |
| **n8n Local Server** | Workflow orchestrator running on Mac | `http://localhost:5678` |
| **Gemini 2.5 Flash-Lite** | Multimodal OCR & structured JSON extraction from invoices | Vision REST API / Base64 Inline |
| **GPT-OSS 120B via Groq** | Expense categorization, debit/credit GL assignment, confidence scoring | `https://api.groq.com/openai/v1` (Active & Tested) |
| **Validation Engine** | Verifies `Subtotal + Tax = Total`, checks fields, thresholds | IF / Code Logic Node |
| **Google Sheets** | Stores expense ledger (Date, Vendor, Invoice #, Category, Subtotal, Tax, Total, Status) | Google Sheets OAuth2 / API |
| **Gmail** | Receives invoices and sends confirmation or review alert | Google Mail OAuth2 / SMTP |

---

## ⚡ Quick Start & Controls

### 1. Check or Start the n8n Server
n8n is installed globally on your Mac (`v1.97.1`).
To start or stop n8n anytime:
```bash
cd "/Users/rusan/Documents/Google anti-gravity projects/n8n-invoice-automation"
./start-n8n.sh   # Starts n8n in background and checks health
./stop-n8n.sh    # Stops n8n cleanly
```

Open your browser to:
👉 **[http://localhost:5678](http://localhost:5678)**

### 2. The Imported Workflow
The workflow **"AI Invoice Processing & Accounting Automation"** is already imported into your n8n SQLite database.
- Go to `http://localhost:5678/workflows`
- Click on **AI Invoice Processing & Accounting Automation**
- You will see the entire visual node canvas matching the diagram.

---

## 🔑 Credentials & Environment Setup

All configuration is centralized in `.env`:

### 1. Groq API (Active ✅)
Pre-configured with your active Groq key:
- Key: `gsk_V05...`
- Model: `openai/gpt-oss-120b` (Ultra-fast LPU inference)

### 2. Google Gemini API
Add your free Gemini API key from [Google AI Studio](https://aistudio.google.com/):
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
```
*(If empty during test runs, the workflow gracefully uses realistic simulation data so you can test before adding the key!)*

### 3. Google Sheets & Gmail OAuth2
Your Mac already contains configured OAuth Client IDs in GCP Project `antigravity-assistance-505515`:
- **Client ID**: `YOUR_CLIENT_ID.apps.googleusercontent.com`
- **Client Secret**: `YOUR_GOOGLE_CLIENT_SECRET`

To link them in n8n:
1. In n8n, click **Credentials** on the left menu -> **Add Credential**.
2. Select **Google Sheets OAuth2 API** (and **Gmail OAuth2**).
3. Paste the Client ID and Client Secret above, then click **Sign in with Google**.
4. In the Google Sheets node, select your desired spreadsheet (or create a new sheet with columns: `Date`, `Vendor`, `Invoice #`, `Category`, `Subtotal`, `Tax`, `Total`, `Status`).

---

## 🧪 Testing the Automation Locally

We have provided built-in testing tools:

### Option A: Run the Python Simulation Test
```bash
python3 test_pipeline.py
```
This runs a live test of:
- Gemini output parsing
- Groq `openai/gpt-oss-120b` live API response
- Math validation check (`$5,000 + $750 == $5,750`)
- Google Sheets row formatter
- Gmail notification generator

### Option B: Test inside n8n UI
1. Open `http://localhost:5678`
2. Open the **AI Invoice Processing & Accounting Automation** workflow.
3. Click the **Manual Test Trigger** or **Test Workflow** button in the canvas.
4. Watch the data flow seamlessly across all nodes from Trigger to Sheets and Email!
