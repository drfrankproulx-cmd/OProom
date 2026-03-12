#!/usr/bin/env python3
"""
Extract all text from the CPT code PDF using PyMuPDF.
Save raw text for reference.
"""
import fitz
import sys

PDF_PATH = "/tmp/omfs_cpt.pdf"
OUTPUT_PATH = "/app/backend/cpt_raw_extract.txt"

doc = fitz.open(PDF_PATH)
total_pages = len(doc)
print(f"Processing {total_pages} pages...")

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    for i in range(total_pages):
        text = doc[i].get_text()
        f.write(f"\n{'='*60}\n")
        f.write(f"PAGE {i+1}\n")
        f.write(f"{'='*60}\n")
        f.write(text)
        if (i+1) % 50 == 0:
            print(f"  Processed {i+1}/{total_pages} pages...")

doc.close()
print(f"Done. Raw text saved to {OUTPUT_PATH}")

import os
size = os.path.getsize(OUTPUT_PATH)
print(f"File size: {size/1024/1024:.1f} MB")
