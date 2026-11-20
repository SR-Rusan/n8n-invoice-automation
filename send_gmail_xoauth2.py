#!/usr/bin/env python3
"""
Reliable Gmail XOAUTH2 SMTP Sender for n8n Invoice Automation.
Automatically refreshes the Google OAuth2 access_token using refresh_token
and sends UTF-8 emails via smtp.gmail.com:465 (SASL XOAUTH2).
"""
import sys
import json
import time
import base64
import smtplib
import urllib.request
import urllib.parse
from email.message import EmailMessage

CREDS_PATH = "/Users/rusan/.config/gdrive/.gdrive-server-credentials.json"
CLIENT_SECRET_PATH = "/Users/rusan/.config/gdrive/client_secret.json"
SENDER_EMAIL = "shahriar.rusan12@gmail.com"
SENDER_NAME = "AI Invoice & Accounting Automation"


def get_valid_access_token() -> str:
    with open(CREDS_PATH, "r", encoding="utf-8") as f:
        creds = json.load(f)

    with open(CLIENT_SECRET_PATH, "r", encoding="utf-8") as f:
        raw_keys = json.load(f)
        keys = raw_keys.get("installed") or raw_keys.get("web")

    now_ms = int(time.time() * 1000)
    expiry_ms = int(creds.get("expiry_date", 0))

    # Refresh if less than 5 minutes remaining
    if expiry_ms - now_ms < 300_000 and creds.get("refresh_token"):
        data = urllib.parse.urlencode({
            "client_id": keys["client_id"],
            "client_secret": keys["client_secret"],
            "refresh_token": creds["refresh_token"],
            "grant_type": "refresh_token",
        }).encode("utf-8")
        req = urllib.request.Request(
            "https://oauth2.googleapis.com/token",
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            refreshed = json.loads(resp.read().decode("utf-8"))

        creds["access_token"] = refreshed["access_token"]
        creds["expiry_date"] = now_ms + int(refreshed.get("expires_in", 3599)) * 1000
        with open(CREDS_PATH, "w", encoding="utf-8") as f:
            json.dump(creds, f, indent=2)

    return creds["access_token"]


def send_email(to_addr: str, subject: str, body: str, cc_addr: str = "") -> dict:
    token = get_valid_access_token()
    auth_string = f"user={SENDER_EMAIL}\x01auth=Bearer {token}\x01\x01"
    auth_b64 = base64.b64encode(auth_string.encode("utf-8")).decode("utf-8")

    msg = EmailMessage()
    msg["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
    msg["To"] = to_addr
    if cc_addr and cc_addr.strip().lower() != to_addr.strip().lower():
        msg["Cc"] = cc_addr
    msg["Subject"] = subject
    msg.set_content(body, subtype="plain", charset="utf-8")

    server = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=20)
    server.ehlo()
    code, resp = server.docmd("AUTH", "XOAUTH2 " + auth_b64)
    if code != 235:
        server.quit()
        raise RuntimeError(f"SMTP XOAUTH2 Auth Failed ({code}): {resp}")

    server.send_message(msg)
    server.quit()
    return {
        "status": "sent",
        "from": SENDER_EMAIL,
        "to": to_addr,
        "cc": cc_addr,
        "subject": subject,
    }


if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    result = send_email(
        to_addr=payload["to"],
        subject=payload["subject"],
        body=payload["body"],
        cc_addr=payload.get("cc", ""),
    )
    print(json.dumps(result))
