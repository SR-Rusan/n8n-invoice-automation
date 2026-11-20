#!/usr/bin/env python3
"""
Generate a professional sample invoice matching the screenshot's 'ABC Ltd' scenario.
"""
from PIL import Image, ImageDraw, ImageFont
import os

width, height = 800, 1000
image = Image.new("RGB", (width, height), color="#FFFFFF")
draw = ImageDraw.Draw(image)

# Colors
primary = "#1E293B"
accent = "#2563EB"
light_gray = "#F1F5F9"
text_dark = "#0F172A"
text_muted = "#64748B"
border_color = "#E2E8F0"

# Header
draw.rectangle([0, 0, width, 120], fill="#0F172A")
draw.text((40, 40), "ABC Ltd", fill="#FFFFFF", font_size=32)
draw.text((40, 80), "Global Supplies & Logistics Inc.", fill="#94A3B8", font_size=14)
draw.text((580, 40), "INVOICE", fill="#38BDF8", font_size=32)

# Invoice Metadata Box
draw.rectangle([40, 150, 760, 240], fill=light_gray, outline=border_color, width=1)
draw.text((60, 165), "Invoice Number:", fill=text_muted, font_size=13)
draw.text((60, 185), "INV-10382", fill=text_dark, font_size=16)

draw.text((280, 165), "Invoice Date:", fill=text_muted, font_size=13)
draw.text((280, 185), "2026-09-25", fill=text_dark, font_size=16)

draw.text((500, 165), "Payment Terms:", fill=text_muted, font_size=13)
draw.text((500, 185), "Net 30 Days", fill=text_dark, font_size=16)

# Bill To
draw.text((40, 270), "Billed To:", fill=text_muted, font_size=14)
draw.text((40, 295), "Acme Corporation", fill=text_dark, font_size=16)
draw.text((40, 320), "100 Enterprise Way, Suite 400", fill=text_muted, font_size=13)
draw.text((40, 340), "San Francisco, CA 94105", fill=text_muted, font_size=13)

# Table Header
table_top = 390
draw.rectangle([40, table_top, 760, table_top + 40], fill="#F8FAFC", outline=border_color, width=1)
draw.text((60, table_top + 12), "Description", fill=text_dark, font_size=14)
draw.text((420, table_top + 12), "Qty", fill=text_dark, font_size=14)
draw.text((520, table_top + 12), "Unit Price", fill=text_dark, font_size=14)
draw.text((660, table_top + 12), "Amount", fill=text_dark, font_size=14)

# Line items
row1_y = table_top + 50
draw.rectangle([40, row1_y, 760, row1_y + 60], fill="#FFFFFF", outline=border_color, width=1)
draw.text((60, row1_y + 12), "Enterprise Office Supplies & Stationery", fill=text_dark, font_size=14)
draw.text((60, row1_y + 32), "High-yield laser cartridges & premium paper packs", fill=text_muted, font_size=12)
draw.text((430, row1_y + 20), "1", fill=text_dark, font_size=14)
draw.text((520, row1_y + 20), "$5,000.00", fill=text_dark, font_size=14)
draw.text((660, row1_y + 20), "$5,000.00", fill=text_dark, font_size=14)

# Summary Box
summary_y = 560
draw.rectangle([460, summary_y, 760, summary_y + 150], fill=light_gray, outline=border_color, width=1)

draw.text((480, summary_y + 20), "Subtotal:", fill=text_muted, font_size=14)
draw.text((660, summary_y + 20), "$5,000.00", fill=text_dark, font_size=14)

draw.text((480, summary_y + 55), "Tax (VAT 15%):", fill=text_muted, font_size=14)
draw.text((660, summary_y + 55), "$750.00", fill=text_dark, font_size=14)

draw.line([480, summary_y + 90, 740, summary_y + 90], fill=border_color, width=1)

draw.text((480, summary_y + 105), "Total Due:", fill=text_dark, font_size=18)
draw.text((650, summary_y + 105), "$5,750.00", fill=accent, font_size=18)

# Footer
draw.text((40, 880), "Thank you for your business!", fill=text_muted, font_size=14)
draw.text((40, 910), "ABC Ltd | support@abcltd.com | +1 (800) 555-0199", fill=text_muted, font_size=12)

output_path = os.path.join(os.path.dirname(__file__), "sample_invoice_abc_ltd.png")
image.save(output_path, "PNG")
print(f"Generated sample invoice at {output_path}")
