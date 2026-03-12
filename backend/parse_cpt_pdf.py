#!/usr/bin/env python3
"""
Parse structured CPT code descriptions from the PDF's detailed listing pages.
These pages have format: CODE_NUMBER followed by description text.
"""
import fitz
import re
import json

doc = fitz.open("/tmp/omfs_cpt.pdf")

# Extract text from ALL pages
all_text = ""
for i in range(len(doc)):
    all_text += doc[i].get_text() + "\n"

# Pattern to match CPT codes with their descriptions in the detailed listing pages
# Format: 5-digit code followed by description text
# We look for code at start of line or after whitespace, followed by description
cpt_descriptions = {}

# Parse the detailed listing pages (pages 230-237 have structured code+description format)
for page_num in range(229, min(237, len(doc))):
    text = doc[page_num].get_text()
    lines = text.split('\n')
    
    current_code = None
    current_desc = []
    
    for line in lines:
        line = line.strip()
        # Check if line starts with a 5-digit CPT code
        code_match = re.match(r'^(\d{5})\s*$', line)
        if code_match:
            # Save previous code
            if current_code and current_desc:
                desc = ' '.join(current_desc).strip()
                # Clean up OCR artifacts
                desc = re.sub(r'\s+', ' ', desc)
                if len(desc) > 10:  # Only save meaningful descriptions
                    cpt_descriptions[current_code] = desc
            current_code = code_match.group(1)
            current_desc = []
        elif current_code:
            # Skip lines that are just formatting/metadata
            if re.match(r'^[Q\d.]+\s+Q', line) or re.match(r'^AMA:', line) or re.match(r'^[IEQBCF\[\]]+$', line):
                # Save and reset
                if current_desc:
                    desc = ' '.join(current_desc).strip()
                    desc = re.sub(r'\s+', ' ', desc)
                    if len(desc) > 5:
                        cpt_descriptions[current_code] = desc
                current_code = None
                current_desc = []
            elif line and not re.match(r'^[\+\s]*$', line) and not line.startswith('rmmm') and not line.startswith('lm'):
                current_desc.append(line)
    
    # Don't forget last code
    if current_code and current_desc:
        desc = ' '.join(current_desc).strip()
        desc = re.sub(r'\s+', ' ', desc)
        if len(desc) > 5:
            cpt_descriptions[current_code] = desc

# Also scan the entire document for code-description patterns 
# Look for patterns like "21044 Excision of malignant tumor of mandible"
full_pattern = re.compile(r'(\d{5})\s+([A-Z][a-z][\w\s,;()\-/\'\.]+?)(?=\d{5}|\n[Q\d]|\nAMA:|$)', re.MULTILINE)
for match in full_pattern.finditer(all_text):
    code = match.group(1)
    desc = match.group(2).strip()
    desc = re.sub(r'\s+', ' ', desc)
    if code not in cpt_descriptions and len(desc) > 10 and len(desc) < 300:
        cpt_descriptions[code] = desc

print(f"Extracted {len(cpt_descriptions)} CPT codes with descriptions from PDF")

# Save for reference
with open("/app/backend/cpt_pdf_extracted.json", "w") as f:
    json.dump(cpt_descriptions, f, indent=2, sort_keys=True)

# Print some samples
for code in sorted(list(cpt_descriptions.keys()))[:30]:
    print(f"  {code}: {cpt_descriptions[code][:100]}")

doc.close()
