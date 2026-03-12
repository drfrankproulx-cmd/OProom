#!/usr/bin/env python3
"""
Build comprehensive OMFS CPT code JSON.
Combines PDF-extracted descriptions with OMFS surgical billing expertise.
"""
import json
from datetime import date

# Load PDF-extracted descriptions
with open("/app/backend/cpt_pdf_extracted.json") as f:
    pdf_descs = json.load(f)

def desc(code, fallback):
    """Use PDF description if available and meaningful, else use our description."""
    pdf = pdf_descs.get(code, "")
    # Only use PDF desc if it's a real full description (not just a fragment)
    if len(pdf) > 30 and not pdf.endswith(",") and "See " not in pdf[:20]:
        return pdf
    return fallback

# Track which codes we've added to prevent duplicates
added_codes = set()

# Load existing favorites from the current app
EXISTING_FAVORITES = {
    "40490","40808","41100","21044","21045","41120","41130","41116",
    "31225","42415","42420","38700","38724","41155","88331",
    "15758","20969","21244","15734","15733","15757","21076","21215",
    "15120","14041","69990","21247","21248","21249",
    "21453","21462","21470","21465",
    "21365","21366","21422","21423","21407","21338","21282","21385","21386",
    "40831","13131","13132",
    "21085","21110","21141","21142","21145","21146","21196","21193","21199","30520",
    "21120","21121",
    "21010","21050","21240","21243",
    "42200","40700","40701",
    "40801","41006","41007","41008",
    "20902",
    "21310",
    "30400","30410",
    "11042","20680"
}

categories = []

# ================================================================
# 1. DENTOALVEOLAR SURGERY
# ================================================================
dentoalveolar = {
    "name": "Dentoalveolar Surgery",
    "codes": []
}
dentoalveolar_codes = [
    # Extractions
    ("D7140", "Extraction, erupted tooth or exposed root", "Simple extraction", "Extractions"),
    ("D7210", "Extraction, erupted tooth requiring removal of bone and/or sectioning of tooth", "Surgical extraction", "Extractions"),
    ("D7220", "Removal of impacted tooth, soft tissue", "Soft tissue impaction", "Extractions"),
    ("D7230", "Removal of impacted tooth, partially bony", "Partial bony impaction", "Extractions"),
    ("D7240", "Removal of impacted tooth, completely bony", "Full bony impaction", "Extractions"),
    ("D7241", "Removal of impacted tooth, completely bony with unusual surgical complications", "Full bony impaction complicated", "Extractions"),
    ("D7250", "Removal of residual tooth roots", "Root tip removal", "Extractions"),
    ("D7251", "Coronectomy — intentional partial tooth removal", "Coronectomy", "Extractions"),
    # Alveolar procedures
    ("41899", "Unlisted procedure, dentoalveolar structures", "Dentoalveolar NOS", "General"),
    ("41830", "Alveolectomy, including curettage of osteitis or sequestrum", "Alveolectomy", "Alveolar"),
    ("41874", "Alveoloplasty, each quadrant (specify)", "Alveoloplasty", "Alveolar"),
    ("41806", "Removal of foreign body, mandible, requiring osteotomy", "Foreign body removal mandible", "Alveolar"),
    ("41805", "Removal of embedded foreign body from dentoalveolar structures, soft tissue", "Foreign body removal soft tissue", "Alveolar"),
    # Apicoectomy
    ("41899", "Unlisted procedure, dentoalveolar structures", "Dentoalveolar NOS", "General"),  # duplicate, skip
    ("D3410", "Apicoectomy — anterior", "Apicoectomy anterior", "Periapical"),
    ("D3421", "Apicoectomy — bicuspid (first root)", "Apicoectomy premolar", "Periapical"),
    ("D3425", "Apicoectomy — molar (first root)", "Apicoectomy molar", "Periapical"),
    ("D3426", "Apicoectomy (each additional root)", "Apicoectomy add'l root", "Periapical"),
    ("D3430", "Retrograde filling — per root", "Retrograde filling", "Periapical"),
    # Frenectomy
    ("40819", "Excision of frenum, labial or buccal", "Frenectomy labial", "Frenectomy"),
    ("41115", "Excision of lingual frenum (frenectomy)", "Lingual frenectomy", "Frenectomy"),
    ("41520", "Frenoplasty (surgical revision of frenum)", "Frenoplasty", "Frenectomy"),
    # Biopsy oral
    ("40490", "Biopsy of lip", "Biopsy lip", "Biopsy"),
    ("40808", "Biopsy of vestibule of mouth", "Biopsy vestibule", "Biopsy"),
    ("41100", "Biopsy of tongue, anterior two-thirds", "Biopsy anterior tongue", "Biopsy"),
    ("41105", "Biopsy of tongue, posterior one-third", "Biopsy posterior tongue", "Biopsy"),
    ("41108", "Biopsy of floor of mouth", "Biopsy floor of mouth", "Biopsy"),
    ("42100", "Biopsy of palate, uvula", "Biopsy palate", "Biopsy"),
    ("20240", "Biopsy, bone, open; superficial (eg, ilium, sternum, spinous process, ribs, trochanter of femur)", "Biopsy bone superficial (mandible)", "Biopsy"),
    ("20245", "Biopsy, bone, open; deep (eg, humeral shaft, ischium, femoral shaft)", "Biopsy bone deep (maxilla)", "Biopsy"),
    ("20200", "Biopsy, muscle; superficial", "Biopsy muscle superficial", "Biopsy"),
    # Torus / exostosis
    ("21031", "Excision of torus mandibularis", "Torus mandibularis removal", "Exostosis"),
    ("21032", "Excision of maxillary torus palatinus", "Torus palatinus removal", "Exostosis"),
    # Socket preservation / bone grafting alveolar
    ("D7953", "Bone replacement graft for ridge preservation — per site", "Socket preservation graft", "Socket Preservation"),
    # Exposure / bracketing
    ("D7283", "Placement of device to facilitate eruption of impacted tooth", "Exposure & bracketing", "Exposure"),
    # I&D dental abscess (also in infections category)
    ("41000", "Intraoral incision and drainage of abscess, sublingual, superficial", "I&D sublingual superficial", "I&D"),
    ("41005", "Intraoral incision and drainage of abscess, sublingual", "I&D sublingual", "I&D"),
    ("41800", "Drainage of abscess, cyst, or hematoma from dentoalveolar structures", "I&D dentoalveolar abscess", "I&D"),
    # Excision lesion
    ("41825", "Excision of lesion or tumor (except listed above), dentoalveolar structures; without repair", "Excision dentoalveolar lesion", "Excision"),
    ("41826", "Excision of lesion or tumor, dentoalveolar structures; with simple repair", "Excision dentoalveolar lesion + repair", "Excision"),
    ("41827", "Excision of lesion or tumor, dentoalveolar structures; with complex repair", "Excision dentoalveolar lesion + complex repair", "Excision"),
    # Alveolar ridge
    ("41870", "Periodontal bone graft, mucosal graft", "Gum/bone graft periodontal", "Alveolar"),
    ("41872", "Gingivoplasty, each quadrant", "Gingivoplasty", "Alveolar"),
]

for code, description, common_name, subcategory in dentoalveolar_codes:
    if code not in added_codes:
        added_codes.add(code)
        dentoalveolar["codes"].append({
            "code": code,
            "description": description,
            "common_name": common_name,
            "subcategory": subcategory,
            "isFavorite": code in EXISTING_FAVORITES
        })

categories.append(dentoalveolar)

# ================================================================
# 2. ORTHOGNATHIC SURGERY
# ================================================================
orthognathic = {
    "name": "Orthognathic Surgery",
    "codes": []
}
orthognathic_codes = [
    # Le Fort I
    ("21141", "Reconstruction midface, Le Fort I; single piece, without bone graft", "Le Fort I 1-piece no graft", "Le Fort I"),
    ("21142", "Reconstruction midface, Le Fort I; 2 pieces, without bone graft", "Le Fort I 2-piece no graft", "Le Fort I"),
    ("21143", "Reconstruction midface, Le Fort I; 3+ pieces, without bone graft", "Le Fort I 3-piece no graft", "Le Fort I"),
    ("21145", "Reconstruction midface, Le Fort I; single piece, with bone grafts", "Le Fort I 1-piece + graft", "Le Fort I"),
    ("21146", "Reconstruction midface, Le Fort I; 2 pieces, with bone grafts", "Le Fort I 2-piece + graft", "Le Fort I"),
    ("21147", "Reconstruction midface, Le Fort I; 3+ pieces, with bone grafts", "Le Fort I 3-piece + graft", "Le Fort I"),
    # BSSO
    ("21196", "Reconstruction mandibular rami and/or body, sagittal split; with internal rigid fixation", "BSSO with fixation", "BSSO"),
    ("21195", "Reconstruction mandibular rami and/or body, sagittal split; without internal rigid fixation", "BSSO without fixation", "BSSO"),
    ("21193", "Reconstruction mandibular rami, horizontal/vertical/C/L osteotomy; without bone graft", "Mandibular ramus osteotomy no graft", "Mandibular Osteotomy"),
    ("21194", "Reconstruction mandibular rami osteotomy; with bone graft", "Mandibular ramus osteotomy + graft", "Mandibular Osteotomy"),
    # Genioplasty
    ("21120", "Genioplasty; augmentation (autograft, allograft, or prosthetic material)", "Genioplasty augmentation", "Genioplasty"),
    ("21121", "Genioplasty; sliding osteotomy, single piece", "Sliding genioplasty", "Genioplasty"),
    ("21122", "Genioplasty; sliding osteotomy, 2+ osteotomies (eg, wedge excision for asymmetry)", "Genioplasty 2+ cuts (asymmetry)", "Genioplasty"),
    ("21123", "Genioplasty; sliding, augmentation with interpositional bone grafts", "Genioplasty + bone graft", "Genioplasty"),
    ("21125", "Augmentation, mandibular body or angle; prosthetic material", "Mandible angle augmentation (implant)", "Genioplasty"),
    ("21127", "Augmentation mandibular body or angle; with bone graft, onlay or interpositional", "Mandible angle augmentation (bone graft)", "Genioplasty"),
    # Segmental osteotomy
    ("21198", "Osteotomy, mandible, segmental", "Mandibular segmental osteotomy", "Segmental Osteotomy"),
    ("21199", "Osteotomy, mandible, segmental; with genioglossus advancement", "Genioglossus advancement", "Segmental Osteotomy"),
    ("21206", "Osteotomy, maxilla, segmental (eg, Wassmund or Schuchard)", "Maxillary segmental osteotomy", "Segmental Osteotomy"),
    # Midface reconstruction (Le Fort II/III for craniofacial, but also orthognathic)
    ("21188", "Reconstruction midface, osteotomies (other than Le Fort) and bone grafts", "Midface osteotomy + graft (non-Le Fort)", "Midface Osteotomy"),
    # Supportive for orthognathic
    ("21085", "Oral surgical splint", "Surgical splint", "Supportive"),
    ("21110", "Application of interdental fixation device for conditions other than fracture", "Arch bars (non-fracture)", "Supportive"),
    ("30520", "Septoplasty or submucous resection, with or without cartilage scoring", "Septoplasty (with Le Fort)", "Supportive"),
    ("41115", "Excision of lingual frenum (frenectomy)", "Frenectomy (with Le Fort)", "Supportive"),
    ("76377", "3D rendering with interpretation and reporting of CT, MRI, US", "3D post-processing images", "Planning"),
    # Distraction
    ("21150", "Reconstruction midface, Le Fort II; anterior intrusion", "Le Fort II anterior intrusion", "Le Fort II/III"),
    ("21151", "Reconstruction midface, Le Fort II; any direction, requiring bone grafts", "Le Fort II + bone graft", "Le Fort II/III"),
    ("21154", "Reconstruction midface, Le Fort III (extracranial); without Le Fort I", "Le Fort III without Le Fort I", "Le Fort II/III"),
    ("21155", "Reconstruction midface, Le Fort III (extracranial); with Le Fort I", "Le Fort III with Le Fort I", "Le Fort II/III"),
    ("21159", "Reconstruction midface, Le Fort III (extra/intracranial) with forehead; without Le Fort I", "Le Fort III + forehead, no Le Fort I", "Le Fort II/III"),
    ("21160", "Reconstruction midface, Le Fort III (extra/intracranial) with forehead; with Le Fort I", "Le Fort III + forehead + Le Fort I", "Le Fort II/III"),
    # Rigid fixation
    ("21495", "Open treatment of hyoid fracture", "Open treatment hyoid fracture", "Supportive"),
    # Masseter reduction
    ("21295", "Reduction of masseter muscle and bone; extraoral approach", "Masseter reduction extraoral", "Adjunct"),
    ("21296", "Reduction of masseter muscle and bone; intraoral approach", "Masseter reduction intraoral", "Adjunct"),
]

for code, description, common_name, subcategory in orthognathic_codes:
    if code not in added_codes:
        added_codes.add(code)
        orthognathic["codes"].append({
            "code": code,
            "description": description,
            "common_name": common_name,
            "subcategory": subcategory,
            "isFavorite": code in EXISTING_FAVORITES
        })

categories.append(orthognathic)

# ================================================================
# 3. RECONSTRUCTION & FREE FLAPS
# ================================================================
reconstruction = {
    "name": "Reconstruction & Free Flaps",
    "codes": []
}
recon_codes = [
    # Free flaps
    ("20955", "Bone graft with microvascular anastomosis; fibula", "Fibula free flap (bone only)", "Free Flaps"),
    ("20956", "Bone graft with microvascular anastomosis; iliac crest", "Iliac crest free flap (DCIA)", "Free Flaps"),
    ("20957", "Bone graft with microvascular anastomosis; metatarsal", "Metatarsal free flap", "Free Flaps"),
    ("20962", "Bone graft with microvascular anastomosis; other than fibula, iliac crest, or metatarsal", "Free bone flap (other)", "Free Flaps"),
    ("20969", "Free osteocutaneous flap with microvascular anastomosis; other than iliac crest, metatarsal, or great toe", "Fibula free flap (osteocutaneous)", "Free Flaps"),
    ("20970", "Free osteocutaneous flap with microvascular anastomosis; iliac crest", "Iliac crest osteocutaneous flap", "Free Flaps"),
    ("20972", "Free osteocutaneous flap with microvascular anastomosis; metatarsal", "Metatarsal osteocutaneous flap", "Free Flaps"),
    ("20973", "Free osteocutaneous flap with microvascular anastomosis; great toe with web space", "Great toe osteocutaneous flap", "Free Flaps"),
    ("15757", "Free skin flap with microvascular anastomosis", "Free skin flap (eg, radial forearm)", "Free Flaps"),
    ("15758", "Free fascial flap with microvascular anastomosis", "Free fascial flap (eg, ALT, radial forearm)", "Free Flaps"),
    ("15756", "Free muscle flap with microvascular anastomosis", "Free muscle flap", "Free Flaps"),
    # Microvascular
    ("69990", "Microsurgical techniques, requiring use of operating microscope", "Microsurgical technique (add-on)", "Microvascular"),
    ("35180", "Repair, congenital arteriovenous fistula; head and neck", "AV fistula repair head/neck", "Microvascular"),
    ("35201", "Repair blood vessel, direct; neck", "Vessel repair neck", "Microvascular"),
    ("35231", "Repair blood vessel with vein graft; neck", "Vessel repair + vein graft neck", "Microvascular"),
    ("35261", "Repair blood vessel with graft other than vein; neck", "Vessel repair + synthetic graft neck", "Microvascular"),
    # Pedicled flaps
    ("15734", "Muscle, myocutaneous, or fasciocutaneous flap; trunk", "Pectoralis major flap / Pec flap", "Pedicled Flaps"),
    ("15733", "Muscle, myocutaneous, or fasciocutaneous flap; head and neck", "Submental island flap / head-neck flap", "Pedicled Flaps"),
    ("15740", "Flap; island pedicle, requiring identification and dissection of an anatomically named axial vessel", "Island pedicle flap", "Pedicled Flaps"),
    ("15750", "Flap; neurovascular pedicle", "Neurovascular pedicle flap", "Pedicled Flaps"),
    ("15731", "Forehead flap with microvascular anastomosis", "Forehead flap", "Pedicled Flaps"),
    ("15730", "Midface flap (muscle, myocutaneous, or fasciocutaneous)", "Midface flap", "Pedicled Flaps"),
    ("15736", "Muscle, myocutaneous, or fasciocutaneous flap; upper extremity", "Upper extremity flap", "Pedicled Flaps"),
    ("15738", "Muscle, myocutaneous, or fasciocutaneous flap; lower extremity", "Lower extremity flap", "Pedicled Flaps"),
    # Skin grafts
    ("15100", "Split-thickness autograft, trunk, arms, legs; first 100 sq cm", "STSG trunk/extremity", "Skin Grafts"),
    ("15120", "Split-thickness autograft, face, scalp, eyelids, mouth, neck, ears, orbits, genitalia; first 100 sq cm", "STSG face/neck", "Skin Grafts"),
    ("15220", "Full thickness graft, free, including direct closure of donor site; 20 sq cm or less", "FTSG ≤20 sq cm", "Skin Grafts"),
    ("15240", "Full thickness graft, free; 20 sq cm or less, face/neck", "FTSG face/neck", "Skin Grafts"),
    ("15260", "Full thickness graft, free; 20 sq cm or less, nose/ears/eyelids/lips", "FTSG nose/ears/eyelids/lips", "Skin Grafts"),
    # Mandible reconstruction
    ("21244", "Reconstruction of mandible, extraoral, with transosteal bone plate", "Mandible recon with plate", "Mandible Reconstruction"),
    ("21245", "Reconstruction mandible or maxilla, subperiosteal implant; partial", "Mandible/maxilla recon subperiosteal partial", "Mandible Reconstruction"),
    ("21246", "Reconstruction mandible or maxilla, subperiosteal implant; complete", "Mandible/maxilla recon subperiosteal complete", "Mandible Reconstruction"),
    ("21247", "Reconstruction mandibular condyle with bone and cartilage autografts", "Condyle reconstruction autograft", "Mandible Reconstruction"),
    ("21248", "Reconstruction mandible or maxilla, endosteal implant; partial", "Mandible/maxilla recon endosteal partial", "Mandible Reconstruction"),
    ("21249", "Reconstruction mandible or maxilla, endosteal implant; complete", "Mandible/maxilla recon endosteal complete", "Mandible Reconstruction"),
    # Bone grafting
    ("20900", "Bone graft, any donor area; minor or small", "Bone graft minor/small", "Bone Grafts"),
    ("20902", "Bone graft, any donor area; major or large", "Bone graft major/large", "Bone Grafts"),
    ("21210", "Graft, bone; nasal, maxillary or malar areas (includes obtaining graft)", "Bone graft nasal/maxillary/malar", "Bone Grafts"),
    ("21215", "Graft, bone; mandible (includes obtaining graft)", "Bone graft mandible", "Bone Grafts"),
    # Tissue rearrangement
    ("14040", "Adjacent tissue transfer or rearrangement, forehead, cheeks, chin, mouth, neck, axillae, genitalia; defect 10 sq cm or less", "Local tissue transfer ≤10 sq cm", "Tissue Transfer"),
    ("14041", "Adjacent tissue transfer or rearrangement; defect 10.1 to 30 sq cm", "Local tissue transfer 10-30 sq cm / V-Y", "Tissue Transfer"),
    ("14060", "Adjacent tissue transfer or rearrangement; eyelids, nose, ears, lips; defect 10 sq cm or less", "Local transfer eyelids/nose/ears/lips ≤10 sq cm", "Tissue Transfer"),
    ("14061", "Adjacent tissue transfer or rearrangement; eyelids, nose, ears, lips; defect 10.1 to 30 sq cm", "Local transfer eyelids/nose/ears/lips 10-30 sq cm", "Tissue Transfer"),
    # Prosthetics/obturators
    ("21076", "Impression and custom preparation; surgical obturator prosthesis", "Surgical obturator", "Prosthetics"),
    ("21077", "Impression and custom preparation; orbital prosthesis", "Orbital prosthesis", "Prosthetics"),
    ("21079", "Impression and custom preparation; interim obturator prosthesis", "Interim obturator", "Prosthetics"),
    ("21080", "Impression and custom preparation; definitive obturator prosthesis", "Definitive obturator", "Prosthetics"),
    ("21081", "Impression and custom preparation; mandibular resection prosthesis", "Mandibular resection prosthesis", "Prosthetics"),
    ("21082", "Impression and custom preparation; palatal augmentation prosthesis", "Palatal augmentation prosthesis", "Prosthetics"),
    ("21083", "Impression and custom preparation; palatal lift prosthesis", "Palatal lift prosthesis", "Prosthetics"),
    ("21084", "Impression and custom preparation; speech aid prosthesis", "Speech aid prosthesis", "Prosthetics"),
    ("21086", "Impression and custom preparation; auricular prosthesis", "Auricular prosthesis", "Prosthetics"),
    ("21087", "Impression and custom preparation; nasal prosthesis", "Nasal prosthesis", "Prosthetics"),
    ("21088", "Impression and custom preparation; facial prosthesis", "Facial prosthesis", "Prosthetics"),
    ("21089", "Unlisted maxillofacial prosthetic procedure", "Maxillofacial prosthetic NOS", "Prosthetics"),
    # Osteoplasty
    ("21208", "Osteoplasty, facial bones; augmentation (autograft, allograft, or prosthetic)", "Facial bone augmentation", "Osteoplasty"),
    ("21209", "Osteoplasty, facial bones; reduction", "Facial bone reduction", "Osteoplasty"),
    # Cartilage grafts
    ("21230", "Graft; rib cartilage, autogenous, to face, chin, nose or ear", "Rib cartilage graft to face", "Cartilage Grafts"),
    ("21235", "Graft; ear cartilage, autogenous, to nose or ear", "Ear cartilage graft to nose/ear", "Cartilage Grafts"),
    ("20910", "Cartilage graft; costochondral", "Costochondral graft", "Cartilage Grafts"),
    ("20912", "Cartilage graft; nasal septum", "Nasal septal cartilage graft", "Cartilage Grafts"),
    # Carotid exploration
    ("35701", "Exploration not followed by surgical repair, carotid artery", "Carotid exploration", "Vascular"),
    # Wound care
    ("97605", "Negative pressure wound therapy (VAC); surface area ≤50 sq cm", "Wound VAC ≤50 sq cm", "Wound Care"),
    ("97606", "Negative pressure wound therapy (VAC); surface area >50 sq cm", "Wound VAC >50 sq cm", "Wound Care"),
    # Splints
    ("29125", "Application of short arm splint, forearm to hand; static", "Short arm splint (radial forearm donor)", "Donor Site"),
    ("29515", "Application of short leg splint; calf to foot", "Short leg splint (fibula donor)", "Donor Site"),
    # Facial reconstruction
    ("21172", "Reconstruction superior-lateral orbital rim and lower forehead", "Orbital rim reconstruction", "Facial Reconstruction"),
    ("21175", "Reconstruction bifrontal, superior-lateral orbital rims and lower forehead", "Bifrontal/orbital reconstruction", "Facial Reconstruction"),
    ("21179", "Reconstruction forehead and/or orbital rims; with allograft/prosthetic", "Forehead recon (allograft)", "Facial Reconstruction"),
    ("21180", "Reconstruction forehead and/or orbital rims; with autograft", "Forehead recon (autograft)", "Facial Reconstruction"),
    ("21181", "Reconstruction by extracranial removal of cranial bone", "Extracranial bone removal recon", "Facial Reconstruction"),
    ("21182", "Reconstruction of orbital walls, rims, forehead; total, ≤40 sq cm", "Orbital wall recon ≤40 sq cm", "Facial Reconstruction"),
    ("21183", "Reconstruction of orbital walls, rims, forehead; total, 40-80 sq cm", "Orbital wall recon 40-80 sq cm", "Facial Reconstruction"),
    ("21184", "Reconstruction of orbital walls, rims, forehead; total, >80 sq cm", "Orbital wall recon >80 sq cm", "Facial Reconstruction"),
    ("21255", "Reconstruction zygomatic arch and glenoid fossa with bone and cartilage", "Zygomatic arch reconstruction", "Facial Reconstruction"),
    ("21256", "Reconstruction of orbit with osteotomies and bone grafts", "Orbital recon + bone graft", "Facial Reconstruction"),
    ("21260", "Periorbital osteotomies for orbital hypertelorism", "Hypertelorism correction", "Facial Reconstruction"),
    ("21261", "Combined intra- and extracranial approach, periorbital osteotomies", "Hypertelorism correction (combined)", "Facial Reconstruction"),
    ("21263", "Periorbital osteotomies with forehead advancement", "Hypertelorism + forehead advancement", "Facial Reconstruction"),
    ("21267", "Orbital repositioning with bone grafts; extracranial approach", "Orbital repositioning extracranial", "Facial Reconstruction"),
    ("21268", "Orbital repositioning with bone grafts; combined intra/extracranial", "Orbital repositioning combined", "Facial Reconstruction"),
    ("21270", "Malar augmentation, prosthetic material", "Malar augmentation (implant)", "Facial Reconstruction"),
    ("21275", "Secondary revision of orbitocraniofacial reconstruction", "Revision orbitocraniofacial recon", "Facial Reconstruction"),
]

for code, description, common_name, subcategory in recon_codes:
    if code not in added_codes:
        added_codes.add(code)
        reconstruction["codes"].append({
            "code": code,
            "description": description,
            "common_name": common_name,
            "subcategory": subcategory,
            "isFavorite": code in EXISTING_FAVORITES
        })

categories.append(reconstruction)

# ================================================================
# 4. ONCOLOGY & ABLATIVE
# ================================================================
oncology = {
    "name": "Oncology & Ablative",
    "codes": []
}
onc_codes = [
    # Mandible
    ("21040", "Excision of benign tumor or cyst of mandible by enucleation and/or curettage", "Enucleation mandible (benign)", "Mandible Tumor"),
    ("21044", "Excision of malignant tumor of mandible", "Marginal mandibulectomy", "Mandible Tumor"),
    ("21045", "Excision of malignant tumor of mandible; radical resection", "Segmental mandibulectomy (radical)", "Mandible Tumor"),
    ("21046", "Excision of benign tumor or cyst of mandible; requiring intra-oral osteotomy", "Excision mandible tumor intraoral", "Mandible Tumor"),
    ("21047", "Excision of benign tumor or cyst of mandible; requiring extra-oral osteotomy and partial mandibulectomy", "Partial mandibulectomy (benign)", "Mandible Tumor"),
    # Maxilla
    ("21030", "Excision of benign tumor or cyst of maxilla by enucleation and/or curettage", "Enucleation maxilla (benign)", "Maxilla Tumor"),
    ("21034", "Excision of malignant tumor of maxilla or zygoma", "Maxillectomy (malignant)", "Maxilla Tumor"),
    ("21048", "Excision of benign tumor or cyst of maxilla; requiring intra-oral osteotomy", "Excision maxilla tumor intraoral", "Maxilla Tumor"),
    ("21049", "Excision of benign tumor or cyst of maxilla; requiring extra-oral osteotomy and partial maxillectomy", "Partial maxillectomy (benign)", "Maxilla Tumor"),
    ("31225", "Maxillectomy without orbital exenteration", "Maxillectomy (without orbital exenteration)", "Maxilla Tumor"),
    ("31230", "Maxillectomy with orbital exenteration", "Maxillectomy (with orbital exenteration)", "Maxilla Tumor"),
    # Mandible bone
    ("21025", "Excision of bone (eg, for osteomyelitis or bone abscess); mandible", "Mandible bone excision (osteomyelitis)", "Bone Excision"),
    ("21026", "Excision of bone; facial bone(s)", "Facial bone excision", "Bone Excision"),
    # Tongue
    ("41110", "Excision of lesion of tongue without closure", "Tongue lesion excision", "Tongue"),
    ("41112", "Excision of lesion of tongue with closure; anterior two-thirds", "Tongue lesion excision + closure anterior", "Tongue"),
    ("41113", "Excision of lesion of tongue with closure; posterior one-third", "Tongue lesion excision + closure posterior", "Tongue"),
    ("41114", "Excision of lesion of tongue with closure; with local tongue flap", "Tongue lesion excision + local flap", "Tongue"),
    ("41116", "Excision, lesion of floor of mouth", "Floor of mouth excision", "Tongue"),
    ("41120", "Glossectomy; less than one-half tongue", "Partial glossectomy", "Tongue"),
    ("41130", "Glossectomy; hemiglossectomy", "Hemiglossectomy", "Tongue"),
    ("41135", "Glossectomy; partial, with unilateral radical neck dissection", "Glossectomy + radical neck", "Tongue"),
    ("41140", "Glossectomy; complete or total, with or without tracheostomy, without radical neck dissection", "Total glossectomy", "Tongue"),
    ("41145", "Glossectomy; complete, with or without tracheostomy, with unilateral radical neck dissection", "Total glossectomy + unilateral neck", "Tongue"),
    ("41150", "Glossectomy; composite procedure with resection floor of mouth and mandibular resection, without radical neck dissection", "Composite resection no neck", "Tongue"),
    ("41153", "Glossectomy; composite procedure with resection floor of mouth, with suprahyoid neck dissection", "Composite resection + suprahyoid neck", "Tongue"),
    ("41155", "Glossectomy; composite procedure with resection floor of mouth, mandibular resection, and radical neck dissection (commando)", "Commando procedure", "Tongue"),
    # Lip
    ("40500", "Vermilionectomy (lip shave), with mucosal advancement", "Lip shave / vermilionectomy", "Lip"),
    ("40510", "Excision of lip; transverse wedge excision with primary closure", "Lip wedge excision", "Lip"),
    ("40520", "Excision of lip; V-excision with primary direct linear closure", "Lip V-excision", "Lip"),
    ("40525", "Excision of lip; full thickness, reconstruction with local flap (eg, Estlander or fan)", "Lip excision + local flap (Estlander)", "Lip"),
    ("40527", "Excision of lip; full thickness, reconstruction with cross lip flap (Abbe-Estlander)", "Lip excision + Abbe-Estlander flap", "Lip"),
    # Palate
    ("42104", "Excision, lesion of palate, uvula; without closure", "Palate lesion excision", "Palate"),
    ("42106", "Excision, lesion of palate, uvula; with simple primary closure", "Palate lesion excision + closure", "Palate"),
    ("42107", "Excision, lesion of palate, uvula; with local flap closure", "Palate lesion excision + local flap", "Palate"),
    ("42120", "Resection of palate or extensive resection of lesion", "Palate resection", "Palate"),
    # Neck dissection
    ("38700", "Suprahyoid lymphadenectomy", "Suprahyoid neck dissection", "Neck Dissection"),
    ("38720", "Cervical lymphadenectomy (complete)", "Radical neck dissection", "Neck Dissection"),
    ("38724", "Cervical lymphadenectomy (modified radical neck dissection)", "Modified radical neck dissection", "Neck Dissection"),
    # Sentinel node
    ("38792", "Injection procedure; for identification of sentinel node", "Sentinel node injection", "Neck Dissection"),
    ("38900", "Intraoperative identification of sentinel lymph node(s)", "Sentinel node identification", "Neck Dissection"),
    # Salivary glands
    ("42410", "Excision of parotid tumor or parotid gland; lateral lobe, without nerve dissection", "Parotidectomy superficial (no nerve)", "Salivary Glands"),
    ("42415", "Excision of parotid tumor or parotid gland; lateral lobe, with nerve dissection and/or preservation", "Parotidectomy superficial + nerve", "Salivary Glands"),
    ("42420", "Excision of parotid tumor or parotid gland; total, with nerve dissection", "Total parotidectomy + nerve", "Salivary Glands"),
    ("42425", "Excision of parotid tumor or parotid gland; total, en bloc removal with sacrifice of facial nerve", "Total parotidectomy (nerve sacrifice)", "Salivary Glands"),
    ("42426", "Excision of parotid tumor or parotid gland; total, with unilateral radical neck dissection", "Parotidectomy + neck dissection", "Salivary Glands"),
    ("42440", "Excision of submandibular (submaxillary) gland", "Submandibular gland excision", "Salivary Glands"),
    ("42450", "Excision of sublingual gland", "Sublingual gland excision", "Salivary Glands"),
    # Soft tissue face/scalp tumors
    ("21011", "Excision, tumor, soft tissue of face or scalp, subcutaneous; <2 cm", "Face/scalp tumor excision subQ <2cm", "Soft Tissue Tumor"),
    ("21012", "Excision, tumor, soft tissue of face or scalp, subcutaneous; ≥2 cm", "Face/scalp tumor excision subQ ≥2cm", "Soft Tissue Tumor"),
    ("21013", "Excision, tumor, soft tissue of face or scalp, subfascial; <2 cm", "Face/scalp tumor excision subfascial <2cm", "Soft Tissue Tumor"),
    ("21014", "Excision, tumor, soft tissue of face or scalp, subfascial; ≥2 cm", "Face/scalp tumor excision subfascial ≥2cm", "Soft Tissue Tumor"),
    ("21015", "Radical resection of tumor, soft tissue of face or scalp; <2 cm", "Radical resection face/scalp <2cm", "Soft Tissue Tumor"),
    ("21016", "Radical resection of tumor, soft tissue of face or scalp; ≥2 cm", "Radical resection face/scalp ≥2cm", "Soft Tissue Tumor"),
    # Neck tumors
    ("21552", "Excision, tumor, soft tissue of neck or anterior thorax, subcutaneous; ≥3 cm", "Neck tumor excision subQ ≥3cm", "Neck Tumor"),
    ("21554", "Excision, tumor, soft tissue of neck or anterior thorax, subfascial; <5 cm", "Neck tumor excision subfascial <5cm", "Neck Tumor"),
    ("21555", "Excision, tumor, soft tissue of neck or anterior thorax, subcutaneous; <3 cm", "Neck tumor excision subQ <3cm", "Neck Tumor"),
    ("21556", "Excision, tumor, soft tissue of neck or anterior thorax, subcutaneous; ≥3 cm", "Neck tumor excision subQ ≥3cm (deep)", "Neck Tumor"),
    ("21557", "Radical resection of tumor, soft tissue of neck or anterior thorax; <5 cm", "Radical resection neck <5cm", "Neck Tumor"),
    ("21558", "Radical resection of tumor, soft tissue of neck or anterior thorax; ≥5 cm", "Radical resection neck ≥5cm", "Neck Tumor"),
    # Laser ablation
    ("40820", "Destruction of lesion or scar of vestibule of mouth by physical methods", "Laser ablation oral dysplasia", "Ablation"),
    # Pathology consultation
    ("88331", "Pathology consultation during surgery; first tissue block", "Frozen section (first block)", "Pathology"),
    ("88332", "Pathology consultation during surgery; each additional tissue block", "Frozen section (each add'l block)", "Pathology"),
    # Debridement
    ("11011", "Debridement including removal of foreign material associated with open fracture and/or dislocation; skin, subcutaneous tissue, muscle fascia, and muscle and bone", "Bone debridement", "Debridement"),
    ("11042", "Debridement, subcutaneous tissue; first 20 sq cm", "Debridement subcutaneous", "Debridement"),
    ("11043", "Debridement, muscle and/or fascia; first 20 sq cm", "Debridement muscle/fascia", "Debridement"),
    ("11044", "Debridement, bone; first 20 sq cm", "Bone debridement (first 20 sq cm)", "Debridement"),
    # Vestibule / mouth
    ("40810", "Excision of lesion of mucosa and submucosa, vestibule of mouth; without repair", "Vestibule lesion excision", "Vestibule/Mouth"),
    ("40812", "Excision of lesion of mucosa and submucosa, vestibule of mouth; with simple repair", "Vestibule lesion excision + repair", "Vestibule/Mouth"),
    ("40814", "Excision of lesion of mucosa and submucosa, vestibule of mouth; with complex repair", "Vestibule lesion excision + complex repair", "Vestibule/Mouth"),
    ("40816", "Excision of lesion of mucosa and submucosa, vestibule of mouth; complex, with excision of underlying muscle", "Vestibule lesion excision + muscle", "Vestibule/Mouth"),
    ("40818", "Excision of mucosa of vestibule of mouth as donor graft", "Mucosal graft harvest vestibule", "Vestibule/Mouth"),
    # Oropharynx
    ("42145", "Palatopharyngoplasty (eg, uvulopalatopharyngoplasty)", "UPPP / Pharyngoplasty", "Oropharynx"),
    ("42890", "Limited pharyngectomy", "Limited pharyngectomy", "Oropharynx"),
    ("42892", "Resection of lateral pharyngeal wall or pyriform sinus, direct closure", "Pharyngeal wall resection", "Oropharynx"),
    ("42894", "Resection of pharyngeal wall requiring closure with myocutaneous or fasciocutaneous flap or free muscle, skin, or fascial flap with microvascular anastomosis", "Pharyngeal wall resection + flap", "Oropharynx"),
]

for code, description, common_name, subcategory in onc_codes:
    if code not in added_codes:
        added_codes.add(code)
        oncology["codes"].append({
            "code": code,
            "description": description,
            "common_name": common_name,
            "subcategory": subcategory,
            "isFavorite": code in EXISTING_FAVORITES
        })

categories.append(oncology)

# ================================================================
# 5. PATHOLOGY
# ================================================================
pathology = {
    "name": "Pathology",
    "codes": []
}
path_codes = [
    ("21029", "Removal by contouring of benign tumor of facial bone", "Facial bone tumor contouring", "Excision"),
    ("21030", "Excision of benign tumor or cyst of maxilla by enucleation and/or curettage", "Enucleation maxilla", "Excision"),  # dup
    ("21040", "Excision of benign tumor or cyst of mandible by enucleation and/or curettage", "Enucleation mandible", "Excision"),  # dup
    ("42408", "Excision of sublingual salivary cyst (ranula)", "Ranula excision", "Cyst"),
    ("42409", "Marsupialization of sublingual salivary cyst (ranula)", "Ranula marsupialization", "Cyst"),
    ("42300", "Drainage of abscess; parotid, simple", "Parotid abscess I&D simple", "Drainage"),
    ("42305", "Drainage of abscess; parotid, complicated", "Parotid abscess I&D complicated", "Drainage"),
    ("42310", "Drainage of abscess; submaxillary or sublingual, intraoral", "Submandibular/sublingual abscess I&D intraoral", "Drainage"),
    ("42320", "Drainage of abscess; submaxillary, external", "Submandibular abscess I&D extraoral", "Drainage"),
    ("42330", "Sialolithotomy; submandibular, sublingual, intraoral", "Sialolithiasis removal intraoral", "Salivary"),
    ("42335", "Sialolithotomy; submandibular, extraoral", "Sialolithiasis removal extraoral", "Salivary"),
    ("42340", "Sialolithotomy; parotid, extraoral or complicated intraoral", "Sialolithiasis removal parotid", "Salivary"),
    ("42500", "Plastic repair of salivary duct", "Salivary duct repair", "Salivary"),
    ("42505", "Sialodochoplasty", "Sialodochoplasty", "Salivary"),
    ("42507", "Parotid duct diversion, bilateral", "Parotid duct diversion", "Salivary"),
    ("42510", "Parotid duct diversion, bilateral; with excision of one submandibular gland", "Parotid duct diversion + SMG excision", "Salivary"),
    ("42550", "Injection for sialography", "Sialography injection", "Salivary"),
    ("42600", "Closure salivary fistula", "Salivary fistula closure", "Salivary"),
    ("42650", "Dilation salivary duct", "Salivary duct dilation", "Salivary"),
    ("42660", "Dilation and catheterization of salivary duct, with or without injection", "Salivary duct catheterization", "Salivary"),
    ("42665", "Ligation salivary duct, intraoral", "Salivary duct ligation", "Salivary"),
    ("42699", "Unlisted procedure, salivary glands or ducts", "Salivary procedure NOS", "Salivary"),
    ("42810", "Excision branchial cleft cyst or vestige, confined to skin and subcutaneous tissues", "Branchial cleft cyst excision (superficial)", "Cyst"),
    ("42815", "Excision branchial cleft cyst, vestige, or fistula, extending beneath subcutaneous tissues and/or into pharynx", "Branchial cleft cyst excision (deep)", "Cyst"),
]

for code, description, common_name, subcategory in path_codes:
    if code not in added_codes:
        added_codes.add(code)
        pathology["codes"].append({
            "code": code,
            "description": description,
            "common_name": common_name,
            "subcategory": subcategory,
            "isFavorite": code in EXISTING_FAVORITES
        })

categories.append(pathology)

# ================================================================
# 6. TMJ
# ================================================================
tmj = {
    "name": "TMJ",
    "codes": []
}
tmj_codes = [
    ("20605", "Arthrocentesis, aspiration and/or injection; intermediate joint", "TMJ arthrocentesis", "Arthrocentesis"),
    ("21010", "Arthrotomy, temporomandibular joint", "TMJ arthrotomy", "Open Surgery"),
    ("21050", "Condylectomy, temporomandibular joint (separate procedure)", "Condylectomy", "Open Surgery"),
    ("21060", "Meniscectomy, partial or complete, temporomandibular joint (separate procedure)", "TMJ meniscectomy / discectomy", "Open Surgery"),
    ("21070", "Coronoidectomy (separate procedure)", "Coronoidectomy", "Open Surgery"),
    ("21073", "Manipulation of temporomandibular joint(s) under anesthesia", "TMJ manipulation under anesthesia", "Manipulation"),
    ("21116", "Injection procedure for TMJ arthrography", "TMJ arthrogram injection", "Injection"),
    ("21240", "Arthroplasty, TMJ, with or without autograft", "TMJ arthroplasty (autograft)", "Arthroplasty"),
    ("21242", "Arthroplasty, TMJ, with allograft", "TMJ arthroplasty (allograft)", "Arthroplasty"),
    ("21243", "Arthroplasty, TMJ, with prosthetic joint replacement", "TMJ total joint replacement", "Arthroplasty"),
    ("29800", "Arthroscopy, temporomandibular joint, diagnostic, with or without synovial biopsy", "TMJ arthroscopy diagnostic", "Arthroscopy"),
    ("29804", "Arthroscopy, temporomandibular joint, surgical", "TMJ arthroscopy surgical", "Arthroscopy"),
]

for code, description, common_name, subcategory in tmj_codes:
    if code not in added_codes:
        added_codes.add(code)
        tmj["codes"].append({
            "code": code,
            "description": description,
            "common_name": common_name,
            "subcategory": subcategory,
            "isFavorite": code in EXISTING_FAVORITES
        })

categories.append(tmj)

# ================================================================
# 7. TRAUMA
# ================================================================
trauma = {
    "name": "Trauma",
    "codes": []
}
trauma_codes = [
    # Nasal fractures
    ("21310", "Closed treatment of nasal bone fracture without manipulation", "Nasal fracture closed (no manipulation)", "Nasal Fractures"),
    ("21315", "Closed treatment of nasal bone fracture; with manipulation, without stabilization", "Nasal fracture closed + manipulation", "Nasal Fractures"),
    ("21320", "Closed treatment of nasal bone fracture; with manipulation, with stabilization", "Nasal fracture closed + stabilization", "Nasal Fractures"),
    ("21325", "Open treatment of nasal fracture; uncomplicated", "ORIF nasal (uncomplicated)", "Nasal Fractures"),
    ("21330", "Open treatment of nasal fracture; complicated, with internal and/or external skeletal fixation", "ORIF nasal (complicated)", "Nasal Fractures"),
    ("21335", "Open treatment of nasal fracture; with concomitant open treatment fractured septum", "ORIF nasal + septum", "Nasal Fractures"),
    ("21336", "Open treatment of nasal septal fracture, with or without stabilization", "ORIF nasal septum", "Nasal Fractures"),
    ("21337", "Closed treatment of nasal septal fracture, with or without stabilization", "Nasal septal fracture closed", "Nasal Fractures"),
    # NOE fractures
    ("21338", "Open treatment of naso-ethmoid-orbital fracture; without external fixation", "ORIF NOE (no ext fixation)", "NOE Fractures"),
    ("21339", "Open treatment of naso-ethmoid-orbital fracture; with external fixation", "ORIF NOE (with ext fixation)", "NOE Fractures"),
    ("21340", "Percutaneous treatment of naso-ethmoid-orbital complex fracture, with splint, wire, or headcap", "NOE fracture percutaneous", "NOE Fractures"),
    # Frontal sinus
    ("21343", "Open treatment of depressed frontal sinus fracture", "ORIF frontal sinus", "Frontal Sinus"),
    ("21344", "Open treatment of complicated depressed frontal sinus fracture, via coronal or multiple approaches", "ORIF frontal sinus (multiple approaches)", "Frontal Sinus"),
    # Le Fort fractures
    ("21421", "Closed treatment of palatal or maxillary fracture (Le Fort I type)", "Le Fort I fracture closed", "Le Fort Fractures"),
    ("21422", "Open treatment of palatal or maxillary fracture (Le Fort I type)", "ORIF Le Fort I", "Le Fort Fractures"),
    ("21423", "Open treatment of palatal or maxillary fracture; complicated, multiple approaches", "ORIF Le Fort I (complicated)", "Le Fort Fractures"),
    ("21431", "Closed treatment of craniofacial separation (Le Fort III type)", "Le Fort III fracture closed", "Le Fort Fractures"),
    ("21432", "Open treatment of craniofacial separation (Le Fort III type); with wiring/fixation", "ORIF Le Fort III", "Le Fort Fractures"),
    ("21433", "Open treatment of craniofacial separation (Le Fort III type); complicated, multiple approaches", "ORIF Le Fort III (complicated)", "Le Fort Fractures"),
    ("21435", "Open treatment of craniofacial separation (Le Fort III); with internal and/or external fixation", "ORIF Le Fort III (int + ext fixation)", "Le Fort Fractures"),
    ("21436", "Open treatment of craniofacial separation (Le Fort III); complicated, utilizing internal and external fixation techniques", "ORIF Le Fort III (halo/headcap)", "Le Fort Fractures"),
    # Maxillary / alveolar fractures
    ("21345", "Closed treatment of nasomaxillary complex fracture (Le Fort II) with interdental wire fixation", "Le Fort II closed", "Maxillary Fractures"),
    ("21346", "Open treatment of nasomaxillary complex fracture (Le Fort II)", "ORIF Le Fort II", "Maxillary Fractures"),
    ("21347", "Open treatment of nasomaxillary complex fracture; requiring multiple surgical approaches", "ORIF Le Fort II (multiple approaches)", "Maxillary Fractures"),
    ("21348", "Open treatment of nasomaxillary complex fracture; with bone grafting", "ORIF Le Fort II + bone graft", "Maxillary Fractures"),
    ("21440", "Closed treatment of mandibular or maxillary alveolar ridge fracture", "Alveolar fracture closed", "Maxillary Fractures"),
    ("21445", "Open treatment of mandibular or maxillary alveolar ridge fracture", "ORIF alveolar ridge", "Maxillary Fractures"),
    # ZMC / zygoma
    ("21355", "Percutaneous treatment of fracture of malar area, including zygomatic arch and malar tripod", "Zygoma fracture percutaneous (Gillies)", "Zygoma Fractures"),
    ("21356", "Open treatment of depressed zygomatic arch fracture", "ORIF zygomatic arch", "Zygoma Fractures"),
    ("21360", "Open treatment of depressed malar fracture, including zygomatic arch", "ORIF ZMC (single approach)", "Zygoma Fractures"),
    ("21365", "Open treatment of complicated fracture of malar area; with multiple approaches and internal fixation", "ORIF ZMC (multiple approaches)", "Zygoma Fractures"),
    ("21366", "Open treatment of complicated fracture of malar area; with bone grafting", "ORIF ZMC + bone graft", "Zygoma Fractures"),
    # Orbital fractures
    ("21385", "Open treatment of orbital floor blowout fracture; transantral approach", "Orbital floor repair (Caldwell-Luc)", "Orbital Fractures"),
    ("21386", "Open treatment of orbital floor blowout fracture; periorbital approach", "Orbital floor repair (periorbital)", "Orbital Fractures"),
    ("21387", "Open treatment of orbital floor blowout fracture; combined approach", "Orbital floor repair (combined)", "Orbital Fractures"),
    ("21390", "Open treatment of orbital floor blowout fracture; periorbital approach, with alloplastic or other implant", "Orbital floor repair + implant", "Orbital Fractures"),
    ("21395", "Open treatment of orbital floor blowout fracture; periorbital approach, with bone graft", "Orbital floor repair + bone graft", "Orbital Fractures"),
    ("21400", "Closed treatment of fracture of orbit, except blowout; without manipulation", "Orbital fracture closed (no manipulation)", "Orbital Fractures"),
    ("21401", "Closed treatment of fracture of orbit, except blowout; with manipulation", "Orbital fracture closed + manipulation", "Orbital Fractures"),
    ("21406", "Open treatment of fracture of orbit, except blowout; without implant", "ORIF orbit (no implant)", "Orbital Fractures"),
    ("21407", "Open treatment of fracture of orbit, except blowout; with implant", "ORIF orbit + implant", "Orbital Fractures"),
    ("21408", "Open treatment of fracture of orbit, except blowout; with bone grafting", "ORIF orbit + bone graft", "Orbital Fractures"),
    # Mandible fractures
    ("21450", "Closed treatment of mandibular fracture; without manipulation", "Mandible fracture closed (no manipulation)", "Mandible Fractures"),
    ("21451", "Closed treatment of mandibular fracture; with manipulation", "Mandible fracture closed + manipulation", "Mandible Fractures"),
    ("21452", "Percutaneous treatment of mandibular fracture, with external fixation", "Mandible fracture percutaneous ext fixation", "Mandible Fractures"),
    ("21453", "Closed treatment of mandibular fracture with interdental fixation", "Mandible fracture closed + IMF", "Mandible Fractures"),
    ("21454", "Open treatment of mandibular fracture with external fixation", "ORIF mandible (ext fixation)", "Mandible Fractures"),
    ("21461", "Open treatment of mandibular fracture; without interdental fixation", "ORIF mandible (no IMF)", "Mandible Fractures"),
    ("21462", "Open treatment of mandibular fracture; with interdental fixation", "ORIF mandible + IMF", "Mandible Fractures"),
    ("21465", "Open treatment of mandibular condylar fracture", "ORIF mandible condyle", "Mandible Fractures"),
    ("21470", "Open treatment of complicated mandibular fracture by multiple surgical approaches", "ORIF mandible (complicated, multiple approaches)", "Mandible Fractures"),
    # TMJ dislocation
    ("21480", "Closed treatment of temporomandibular dislocation; initial or subsequent", "TMJ dislocation closed", "TMJ Dislocation"),
    ("21485", "Closed treatment of temporomandibular dislocation; complicated, requiring anesthesia and/or fixation", "TMJ dislocation closed (complicated)", "TMJ Dislocation"),
    ("21490", "Open treatment of temporomandibular dislocation", "TMJ dislocation open treatment", "TMJ Dislocation"),
    # Palatal fracture
    ("21497", "Interdental wiring, for condition other than fracture", "Interdental wiring (non-fracture)", "Fixation"),
    # IMF / Arch bars
    ("21100", "Application of halo type appliance for maxillofacial fixation", "Halo application (maxillofacial)", "Fixation"),
    # Canthopexy
    ("21280", "Medial canthopexy (separate procedure)", "Medial canthopexy", "Canthopexy"),
    ("21282", "Lateral canthopexy", "Lateral canthopexy", "Canthopexy"),
    # Laceration repair
    ("12011", "Simple repair of superficial wounds of face, ears, eyelids, nose, lips, and/or mucous membranes; 2.5 cm or less", "Simple repair face ≤2.5cm", "Laceration"),
    ("12013", "Simple repair of superficial wounds of face; 2.6 to 5.0 cm", "Simple repair face 2.6-5cm", "Laceration"),
    ("12014", "Simple repair of superficial wounds of face; 5.1 to 7.5 cm", "Simple repair face 5.1-7.5cm", "Laceration"),
    ("12015", "Simple repair of superficial wounds of face; 7.6 to 12.5 cm", "Simple repair face 7.6-12.5cm", "Laceration"),
    ("12016", "Simple repair of superficial wounds of face; 12.6 to 20.0 cm", "Simple repair face 12.6-20cm", "Laceration"),
    ("12051", "Layered closure of wounds of face; 2.5 cm or less", "Layered closure face ≤2.5cm", "Laceration"),
    ("12052", "Layered closure of wounds of face; 2.6 to 5.0 cm", "Layered closure face 2.6-5cm", "Laceration"),
    ("12053", "Layered closure of wounds of face; 5.1 to 7.5 cm", "Layered closure face 5.1-7.5cm", "Laceration"),
    ("12054", "Layered closure of wounds of face; 7.6 to 12.5 cm", "Layered closure face 7.6-12.5cm", "Laceration"),
    ("12056", "Layered closure of wounds of face; 20.1 to 30.0 cm", "Layered closure face 20-30cm", "Laceration"),
    ("13131", "Complex repair, forehead, cheeks, chin, mouth, neck, axillae, genitalia, hands, and/or feet; 1.1 to 2.5 cm", "Complex repair face 1.1-2.5cm", "Laceration"),
    ("13132", "Complex repair, forehead, cheeks, chin, mouth, neck; 2.6 to 7.5 cm", "Complex repair face 2.6-7.5cm", "Laceration"),
    ("13133", "Complex repair, forehead, cheeks, chin, mouth, neck; each additional 5 cm or less", "Complex repair face add'l 5cm", "Laceration"),
    ("40830", "Closure of laceration, vestibule of mouth; 2.5 cm or less", "Vestibule laceration ≤2.5cm", "Laceration"),
    ("40831", "Closure of laceration, vestibule of mouth; over 2.5 cm or complex", "Vestibule laceration complex", "Laceration"),
    ("42180", "Repair of laceration of palate; up to 2 cm", "Palate laceration ≤2cm", "Laceration"),
    ("42182", "Repair of laceration of palate; over 2 cm or complex", "Palate laceration complex", "Laceration"),
    # Nerve repair
    ("64831", "Suture of digital nerve, hand or foot; 1 nerve", "Digital nerve repair", "Nerve Repair"),
    ("64856", "Suture of major peripheral nerve, arm or leg, except sciatic; each nerve", "Peripheral nerve repair", "Nerve Repair"),
    ("64885", "Nerve graft (includes obtaining graft), head or neck; up to 4 cm", "Nerve graft head/neck ≤4cm", "Nerve Repair"),
    ("64886", "Nerve graft (includes obtaining graft), head or neck; more than 4 cm", "Nerve graft head/neck >4cm", "Nerve Repair"),
    # Duct repair
    ("42500", "Plastic repair of salivary duct", "Parotid duct repair (Stensen's)", "Duct Repair"),
    # Hardware
    ("20670", "Removal of implant; superficial (eg, buried wire, pin, rod)", "Hardware removal superficial", "Hardware"),
    ("20680", "Removal of implant; deep (eg, buried wire, pin, screw, metal band, nail, rod, plate)", "Hardware removal deep", "Hardware"),
]

for code, description, common_name, subcategory in trauma_codes:
    if code not in added_codes:
        added_codes.add(code)
        trauma["codes"].append({
            "code": code,
            "description": description,
            "common_name": common_name,
            "subcategory": subcategory,
            "isFavorite": code in EXISTING_FAVORITES
        })

categories.append(trauma)

# ================================================================
# 8. COMPLEX CASE & SUPPORTIVE PROCEDURES
# ================================================================
complex_support = {
    "name": "Complex Case & Supportive",
    "codes": []
}
complex_codes = [
    # Tracheostomy
    ("31600", "Tracheostomy, planned (separate procedure)", "Tracheostomy (planned)", "Airway"),
    ("31601", "Tracheostomy, planned; younger than 2 years", "Tracheostomy (planned, <2 years)", "Airway"),
    ("31603", "Tracheostomy, emergency procedure; transtracheal", "Emergency tracheostomy (transtracheal)", "Airway"),
    ("31605", "Tracheostomy, emergency procedure; cricothyroid membrane", "Emergency cricothyrotomy", "Airway"),
    ("31610", "Tracheostomy, fenestration procedure with skin flaps", "Tracheostomy fenestration", "Airway"),
    # Endoscopy
    ("31525", "Laryngoscopy, direct, with or without tracheoscopy; diagnostic", "Direct laryngoscopy", "Endoscopy"),
    ("31526", "Laryngoscopy with operating microscope or telescope", "Laryngoscopy + microscope", "Endoscopy"),
    ("31622", "Bronchoscopy, rigid or flexible; diagnostic", "Bronchoscopy diagnostic", "Endoscopy"),
    ("43200", "Esophagoscopy, flexible, transoral; diagnostic", "Esophagoscopy diagnostic", "Endoscopy"),
    # Feeding / tubes
    ("43246", "Esophagogastroduodenoscopy with directed placement of percutaneous gastrostomy tube", "PEG tube placement (EGD)", "Feeding"),
    ("43653", "Laparoscopy, surgical; gastrostomy, without construction of gastric tube", "Laparoscopic gastrostomy", "Feeding"),
    ("43830", "Gastrostomy, open; without construction of gastric tube", "Open gastrostomy (PEG tube)", "Feeding"),
    ("43760", "Change of gastrostomy tube, percutaneous, without imaging or endoscopic guidance", "PEG tube change", "Feeding"),
    ("89130", "Nasogastric tube placement, for enteral feeding", "NGT placement", "Feeding"),
    # Central line
    ("36555", "Insertion of non-tunneled centrally inserted central venous catheter; younger than 5 years", "Central line <5 yrs", "Vascular Access"),
    ("36556", "Insertion of non-tunneled centrally inserted central venous catheter; age 5 years or older", "Central line ≥5 yrs", "Vascular Access"),
    # Blood transfusion
    ("36430", "Transfusion, blood or blood components", "Blood transfusion", "Transfusion"),
    # Surgical navigation
    ("20985", "Computer-assisted surgical navigational procedure for musculoskeletal procedures, image-less", "Surgical navigation (image-less)", "Navigation"),
    ("61781", "Stereotactic computer-assisted (navigated) procedure; cranial", "Surgical navigation (cranial)", "Navigation"),
    # Bone grafting
    ("20936", "Autograft for spine surgery only; local morselized", "Bone graft local morselized", "Bone Grafts"),
    ("20937", "Autograft for spine surgery only; morselized through separate incision", "Bone graft morselized separate incision", "Bone Grafts"),
    ("20938", "Autograft for spine surgery only; structural, bicortical or tricortical", "Bone graft structural separate incision", "Bone Grafts"),
    # Splint/fixation
    ("21110", "Application of interdental fixation device", "Arch bars", "Fixation"),  # dup, will skip
    ("21497", "Interdental wiring, for condition other than fracture", "Interdental wiring", "Fixation"),  # dup
    # Sedation
    ("99151", "Moderate sedation services provided by the same physician; initial 15 minutes, patient younger than 5 years", "Moderate sedation same MD <5yrs", "Sedation"),
    ("99152", "Moderate sedation services provided by the same physician; initial 15 minutes, patient age 5 years or older", "Moderate sedation same MD ≥5yrs", "Sedation"),
    ("99153", "Moderate sedation services; each additional 15 minutes intraservice time", "Moderate sedation add'l 15 min", "Sedation"),
    ("99155", "Moderate sedation services provided by a physician other than the health care professional performing the procedure; initial 15 minutes, patient younger than 5 years", "Moderate sedation diff MD <5yrs", "Sedation"),
    ("99156", "Moderate sedation services provided by a physician other than the health care professional performing the procedure; initial 15 minutes, patient age 5 years or older", "Moderate sedation diff MD ≥5yrs", "Sedation"),
    # General anesthesia (commonly coded by OMFS)
    ("00170", "Anesthesia for intraoral procedures, including biopsy; not otherwise specified", "General anesthesia intraoral NOS", "Anesthesia"),
    ("00172", "Anesthesia for repair of cleft palate", "General anesthesia cleft palate", "Anesthesia"),
    ("00190", "Anesthesia for procedures on facial bones or skull; not otherwise specified", "General anesthesia facial bones NOS", "Anesthesia"),
    ("00192", "Anesthesia for procedures on facial bones or skull; radical surgery", "General anesthesia radical face surgery", "Anesthesia"),
    # Unlisted
    ("21299", "Unlisted craniofacial and maxillofacial procedure", "Unlisted craniofacial/maxillofacial procedure", "Unlisted"),
    ("21499", "Unlisted musculoskeletal procedure, head", "Unlisted MSK head procedure", "Unlisted"),
    ("42999", "Unlisted procedure, pharynx, adenoids, or tonsils", "Unlisted pharynx/tonsil procedure", "Unlisted"),
    ("40899", "Unlisted procedure, vestibule of mouth", "Unlisted vestibule procedure", "Unlisted"),
]

for code, description, common_name, subcategory in complex_codes:
    if code not in added_codes:
        added_codes.add(code)
        complex_support["codes"].append({
            "code": code,
            "description": description,
            "common_name": common_name,
            "subcategory": subcategory,
            "isFavorite": code in EXISTING_FAVORITES
        })

categories.append(complex_support)

# ================================================================
# 9. IMPLANTS & PREPROSTHETIC
# ================================================================
implants = {
    "name": "Implants & Preprosthetic",
    "codes": []
}
implant_codes = [
    # Dental implants (CDT codes commonly used)
    ("D6010", "Surgical placement of implant body; endosteal implant", "Dental implant placement", "Implant Placement"),
    ("D6013", "Surgical placement of mini implant", "Mini dental implant", "Implant Placement"),
    ("D6040", "Surgical placement: eposteal implant", "Eposteal implant", "Implant Placement"),
    ("D6100", "Implant removal", "Implant removal", "Implant Removal"),
    # Sinus lift
    ("D6945", "Sinus augmentation via lateral open approach", "Sinus lift (lateral approach)", "Sinus"),
    ("31295", "Nasal/sinus endoscopy, surgical, with dilation of maxillary sinus ostium", "Sinus dilation maxillary", "Sinus"),
    # Ridge augmentation / GBR
    ("D7950", "Osseous, osteoperiosteal, or cartilage graft of the mandible or maxilla — autogenous or nonautogenous, by report", "Ridge augmentation / GBR", "Ridge Augmentation"),
    ("D7955", "Repair of maxillofacial soft and hard tissue defect", "Maxillofacial defect repair", "Ridge Augmentation"),
    # Vestibuloplasty
    ("40840", "Vestibuloplasty; anterior", "Vestibuloplasty anterior", "Preprosthetic"),
    ("40842", "Vestibuloplasty; posterior, unilateral", "Vestibuloplasty posterior", "Preprosthetic"),
    ("40843", "Vestibuloplasty; posterior, bilateral", "Vestibuloplasty posterior bilateral", "Preprosthetic"),
    ("40844", "Vestibuloplasty; entire arch", "Vestibuloplasty entire arch", "Preprosthetic"),
    ("40845", "Vestibuloplasty; complex (ridge extension, muscle repositioning)", "Vestibuloplasty complex", "Preprosthetic"),
    # Nerve repositioning
    ("64738", "Transection or avulsion of obturator nerve, extrapelvic, with or without adductor tenotomy", "Nerve transection", "Nerve"),
    # Alveolar distraction
    ("21073", "Manipulation of TMJ under anesthesia", "TMJ manipulation", "Distraction"),  # dup
    ("21499", "Unlisted musculoskeletal procedure, head", "Alveolar distraction (unlisted)", "Distraction"),  # dup
]

for code, description, common_name, subcategory in implant_codes:
    if code not in added_codes:
        added_codes.add(code)
        implants["codes"].append({
            "code": code,
            "description": description,
            "common_name": common_name,
            "subcategory": subcategory,
            "isFavorite": code in EXISTING_FAVORITES
        })

categories.append(implants)

# ================================================================
# 10. CLEFT & CRANIOFACIAL
# ================================================================
cleft = {
    "name": "Cleft & Craniofacial",
    "codes": []
}
cleft_codes = [
    # Cleft lip
    ("40700", "Repair cleft lip/nasal deformity; primary, partial or complete, unilateral", "Cleft lip repair unilateral (partial)", "Cleft Lip"),
    ("40701", "Repair cleft lip/nasal deformity; primary, complete, unilateral", "Cleft lip repair unilateral (complete)", "Cleft Lip"),
    ("40702", "Repair cleft lip/nasal deformity; primary bilateral, one stage or two stage", "Cleft lip repair bilateral", "Cleft Lip"),
    ("40720", "Repair cleft lip/nasal deformity; secondary, by recreation of defect and reclosure", "Cleft lip revision", "Cleft Lip"),
    ("40761", "Repair cleft lip/nasal deformity; with cross lip pedicle flap (Abbe-Estlander type)", "Cleft lip repair (Abbe-Estlander)", "Cleft Lip"),
    # Cleft palate
    ("42200", "Palatoplasty for cleft palate, soft and/or hard palate only", "Cleft palate repair (soft/hard)", "Cleft Palate"),
    ("42205", "Palatoplasty for cleft palate; closure of alveolar ridge and nasal floor", "Cleft palate repair + alveolar/nasal floor", "Cleft Palate"),
    ("42210", "Palatoplasty for cleft palate; with closure of alveolar ridge (vomer flap)", "Cleft palate repair + alveolar (vomer flap)", "Cleft Palate"),
    ("42215", "Palatoplasty for cleft palate; major revision (cleft palate pushback)", "Cleft palate pushback", "Cleft Palate"),
    ("42220", "Palatoplasty for cleft palate; attachment pharyngeal flap", "Cleft palate + pharyngeal flap", "Cleft Palate"),
    ("42225", "Palatoplasty for cleft palate; island flap or lengthening", "Cleft palate (island flap/Furlow)", "Cleft Palate"),
    ("42226", "Lengthening of palate, and target pharyngeal flap or sphincter pharyngoplasty", "Palate lengthening + pharyngoplasty", "Cleft Palate"),
    ("42227", "Lengthening of palate, and pharyngeal flap attachment", "Palate lengthening + pharyngeal flap", "Cleft Palate"),
    ("42235", "Repair of anterior palate, including vomer flap", "Anterior palate repair (vomer flap)", "Cleft Palate"),
    # Alveolar bone grafting
    ("42260", "Repair of nasoalveolar fistula (oronasal fistula)", "Oronasal fistula repair", "Alveolar Bone Graft"),
    # Cleft rhinoplasty
    ("30460", "Rhinoplasty for nasal deformity secondary to congenital cleft lip/palate, including columellar lengthening; tip only", "Cleft rhinoplasty (tip)", "Cleft Rhinoplasty"),
    ("30462", "Rhinoplasty for nasal deformity secondary to congenital cleft lip/palate; tip, septum, osteotomies", "Cleft rhinoplasty (complete)", "Cleft Rhinoplasty"),
    # Palatal prosthesis
    ("42280", "Maxillary impression for palatal prosthesis", "Palatal prosthesis impression", "Prosthesis"),
    ("42281", "Insertion of pin-retained palatal prosthesis", "Palatal prosthesis insertion", "Prosthesis"),
    # Pharyngeal flap
    ("42950", "Pharyngoplasty (pharyngeal flap)", "Pharyngeal flap", "VPI Surgery"),
]

for code, description, common_name, subcategory in cleft_codes:
    if code not in added_codes:
        added_codes.add(code)
        cleft["codes"].append({
            "code": code,
            "description": description,
            "common_name": common_name,
            "subcategory": subcategory,
            "isFavorite": code in EXISTING_FAVORITES
        })

categories.append(cleft)

# ================================================================
# 11. MISCELLANEOUS / COSMETIC / OTHER
# ================================================================
misc = {
    "name": "Miscellaneous",
    "codes": []
}
misc_codes = [
    # Rhinoplasty (cosmetic/functional)
    ("30400", "Rhinoplasty, primary; lateral and alar cartilages and/or elevation of nasal tip", "Rhinoplasty primary (tip/alar)", "Rhinoplasty"),
    ("30410", "Rhinoplasty, primary; complete, external parts including bony pyramid, lateral and alar cartilages, and/or elevation of nasal tip", "Rhinoplasty primary (complete)", "Rhinoplasty"),
    ("30420", "Rhinoplasty, primary; including major septal repair", "Rhinoplasty primary + major septal repair", "Rhinoplasty"),
    ("30430", "Rhinoplasty, secondary; minor revision (small amount of nasal tip work)", "Rhinoplasty revision (minor)", "Rhinoplasty"),
    ("30435", "Rhinoplasty, secondary; intermediate revision (bony work with osteotomies)", "Rhinoplasty revision (intermediate)", "Rhinoplasty"),
    ("30450", "Rhinoplasty, secondary; major revision (nasal tip work and osteotomies)", "Rhinoplasty revision (major)", "Rhinoplasty"),
    # Septoplasty
    ("30520", "Septoplasty or submucous resection, with or without cartilage scoring", "Septoplasty", "Nasal"),  # dup
    # Turbinate
    ("30130", "Excision inferior turbinate, partial or complete, any method", "Inferior turbinectomy", "Nasal"),
    ("30140", "Submucous resection inferior turbinate, partial or complete, any method", "Submucous resection turbinate", "Nasal"),
    # Blepharoplasty / eyelid
    ("15820", "Blepharoplasty, lower eyelid", "Blepharoplasty lower", "Cosmetic"),
    ("15821", "Blepharoplasty, lower eyelid; with extensive herniated fat pad", "Blepharoplasty lower + fat", "Cosmetic"),
    ("15822", "Blepharoplasty, upper eyelid", "Blepharoplasty upper", "Cosmetic"),
    ("15823", "Blepharoplasty, upper eyelid; with excessive skin weighing down lid", "Blepharoplasty upper + skin", "Cosmetic"),
    # Otoplasty
    ("69300", "Otoplasty, protruding ear, with or without size reduction", "Otoplasty", "Cosmetic"),
    # Tissue expander
    ("11960", "Insertion of tissue expander(s) for other than breast", "Tissue expander insertion", "Cosmetic"),
    ("11970", "Replacement of tissue expander with permanent prosthesis", "Tissue expander → prosthesis", "Cosmetic"),
    ("11971", "Removal of tissue expander(s) without insertion of prosthesis", "Tissue expander removal", "Cosmetic"),
    # Tattoo / scar
    ("11920", "Tattooing, intradermal introduction of insoluble opaque pigments; 6.0 sq cm or less", "Tattooing/micropigmentation ≤6 sq cm", "Cosmetic"),
    ("11921", "Tattooing; 6.1 to 20.0 sq cm", "Tattooing 6.1-20 sq cm", "Cosmetic"),
    ("11922", "Tattooing; each additional 20.0 sq cm", "Tattooing add'l 20 sq cm", "Cosmetic"),
    # Forehead
    ("21137", "Reduction forehead; contouring only", "Forehead contouring", "Cosmetic"),
    ("21138", "Reduction forehead; contouring and application of prosthetic material or bone graft", "Forehead contouring + graft", "Cosmetic"),
    ("21139", "Reduction forehead; contouring and setback of anterior frontal sinus wall", "Forehead contouring + frontal sinus setback", "Cosmetic"),
    # Ptosis repair
    ("67900", "Repair of brow ptosis (supraciliary, mid-forehead, or coronal approach)", "Brow ptosis repair", "Eyelid"),
    ("67901", "Repair of blepharoptosis; frontalis muscle technique with suture or other material", "Blepharoptosis repair (frontalis suture)", "Eyelid"),
    ("67902", "Repair of blepharoptosis; frontalis muscle technique with fascial sling", "Blepharoptosis repair (fascial sling)", "Eyelid"),
    ("67903", "Repair of blepharoptosis; tarso levator resection or advancement, internal approach", "Blepharoptosis repair (internal)", "Eyelid"),
    ("67904", "Repair of blepharoptosis; tarso levator resection or advancement, external approach", "Blepharoptosis repair (external)", "Eyelid"),
    # Vascular lesions
    ("17106", "Destruction of cutaneous vascular proliferative lesions; less than 10 sq cm", "Vascular lesion destruction <10 sq cm", "Lesion"),
    ("17107", "Destruction of cutaneous vascular proliferative lesions; 10-50 sq cm", "Vascular lesion destruction 10-50 sq cm", "Lesion"),
    ("17108", "Destruction of cutaneous vascular proliferative lesions; >50 sq cm", "Vascular lesion destruction >50 sq cm", "Lesion"),
    # Composite grafts
    ("15760", "Graft; composite (eg, full thickness of external ear or nasal ala)", "Composite graft (ear/nose)", "Grafts"),
    ("15770", "Graft; derma-fat-fascia", "Derma-fat-fascia graft", "Grafts"),
    # Cervicoplasty
    ("15819", "Cervicoplasty", "Cervicoplasty", "Cosmetic"),
    # Rhinectomy
    ("30150", "Rhinectomy; partial", "Rhinectomy partial", "Nasal"),
    ("30160", "Rhinectomy; total", "Rhinectomy total", "Nasal"),
    # Dermabrasion
    ("15786", "Abrasion; single lesion (eg, keratosis, scar)", "Dermabrasion single lesion", "Scar Revision"),
    ("15787", "Abrasion; each additional 4 lesions or less", "Dermabrasion add'l lesions", "Scar Revision"),
    # Scar revision
    ("13100", "Repair of wound or scar; trunk; 1.1 to 2.5 cm", "Scar revision trunk", "Scar Revision"),
    # Tongue fixation
    ("41510", "Suture of tongue to lip for micrognathia (Douglas procedure)", "Tongue-lip adhesion (Douglas)", "Special"),
    ("41512", "Tongue base suspension, permanent suture technique", "Tongue base suspension", "Special"),
    # Choanal atresia
    ("30540", "Repair choanal atresia; intranasal", "Choanal atresia repair intranasal", "Nasal"),
    ("30545", "Repair choanal atresia; transpalatine", "Choanal atresia repair transpalatine", "Nasal"),
    # Injection
    ("64400", "Injection, anesthetic agent; trigeminal nerve", "Trigeminal nerve block", "Injection"),
    ("C9290", "Injection of liposomal bupivacaine (Exparel)", "Exparel injection", "Injection"),
    # Wound vac / laser
    ("41850", "Destruction of lesion (except excision), dentoalveolar structures", "Laser treatment dentoalveolar", "Special"),
    # E/M codes commonly used
    ("99213", "Office or other outpatient visit for the evaluation and management of an established patient (level 3)", "E/M office visit level 3", "E/M"),
    ("99214", "Office or other outpatient visit for the evaluation and management of an established patient (level 4)", "E/M office visit level 4", "E/M"),
    ("99215", "Office or other outpatient visit for the evaluation and management of an established patient (level 5)", "E/M office visit level 5", "E/M"),
    ("99221", "Initial hospital care (level 1)", "E/M hospital admission level 1", "E/M"),
    ("99222", "Initial hospital care (level 2)", "E/M hospital admission level 2", "E/M"),
    ("99223", "Initial hospital care (level 3)", "E/M hospital admission level 3", "E/M"),
    ("99231", "Subsequent hospital care (level 1)", "E/M subsequent hospital level 1", "E/M"),
    ("99232", "Subsequent hospital care (level 2)", "E/M subsequent hospital level 2", "E/M"),
    ("99233", "Subsequent hospital care (level 3)", "E/M subsequent hospital level 3", "E/M"),
    ("99281", "Emergency department visit (level 1)", "ED visit level 1", "E/M"),
    ("99282", "Emergency department visit (level 2)", "ED visit level 2", "E/M"),
    ("99283", "Emergency department visit (level 3)", "ED visit level 3", "E/M"),
    ("99284", "Emergency department visit (level 4)", "ED visit level 4", "E/M"),
    ("99285", "Emergency department visit (level 5)", "ED visit level 5", "E/M"),
    # Nasal synechiae / other
    ("30560", "Lysis intranasal synechia", "Intranasal synechiae lysis", "Nasal"),
    ("30580", "Repair fistula; oromaxillary (combine with 31030 if antral)", "Oromaxillary fistula repair", "Nasal"),
    ("30600", "Repair fistula; oronasal", "Oronasal fistula repair", "Nasal"),
    # Nasal valve
    ("30468", "Repair of nasal valve collapse with subcutaneous/submucosal lateral wall implant(s)", "Nasal valve repair (implant)", "Nasal"),
    ("30469", "Repair of nasal valve collapse with low energy, temperature-controlled submucosal tissue remodeling", "Nasal valve repair (tissue remodeling)", "Nasal"),
    # Septal dermatoplasty
    ("30620", "Septal or other intranasal dermatoplasty (does not include obtaining graft)", "Septal dermatoplasty", "Nasal"),
    # Nasal hemorrhage
    ("30901", "Control nasal hemorrhage, anterior, simple", "Epistaxis control anterior simple", "Nasal"),
    ("30903", "Control nasal hemorrhage, anterior, complex (limited cautery and/or packing)", "Epistaxis control anterior complex", "Nasal"),
    ("30905", "Control nasal hemorrhage, posterior, with posterior nasal packs and/or cautery", "Epistaxis control posterior (packing)", "Nasal"),
    ("30906", "Control nasal hemorrhage, posterior, repeat", "Epistaxis control posterior (repeat)", "Nasal"),
    # Throat
    ("42700", "Incision and drainage abscess; peritonsillar", "Peritonsillar abscess I&D", "Throat"),
    ("42720", "Incision and drainage abscess; retropharyngeal or parapharyngeal, intraoral approach", "Retropharyngeal abscess I&D", "Throat"),
    ("42725", "Incision and drainage abscess; retropharyngeal or parapharyngeal, external approach", "Parapharyngeal abscess I&D (external)", "Throat"),
    # Tonsillectomy (common in peds OMFS)
    ("42820", "Tonsillectomy and adenoidectomy; younger than age 12", "T&A <12 yrs", "Throat"),
    ("42821", "Tonsillectomy and adenoidectomy; age 12 or over", "T&A ≥12 yrs", "Throat"),
    ("42825", "Tonsillectomy, primary or secondary; younger than age 12", "Tonsillectomy <12 yrs", "Throat"),
    ("42826", "Tonsillectomy, primary or secondary; age 12 or over", "Tonsillectomy ≥12 yrs", "Throat"),
]

for code, description, common_name, subcategory in misc_codes:
    if code not in added_codes:
        added_codes.add(code)
        misc["codes"].append({
            "code": code,
            "description": description,
            "common_name": common_name,
            "subcategory": subcategory,
            "isFavorite": code in EXISTING_FAVORITES
        })

categories.append(misc)

# ================================================================
# INFECTIONS (moved from dentoalveolar as a standalone relevant section)
# ================================================================
infections = {
    "name": "Odontogenic Infections",
    "codes": []
}
infection_codes = [
    ("40800", "Drainage of abscess, cyst, hematoma, vestibule of mouth; simple", "Vestibular I&D simple", "Vestibular"),
    ("40801", "Drainage of abscess, cyst, hematoma, vestibule of mouth; complicated", "Vestibular I&D complicated", "Vestibular"),
    ("41000", "Intraoral I&D abscess, sublingual superficial", "I&D sublingual superficial", "Intraoral"),  # dup
    ("41005", "Intraoral I&D abscess, sublingual", "I&D sublingual", "Intraoral"),  # dup
    ("41006", "Intraoral I&D abscess, sublingual, bilateral", "I&D sublingual bilateral", "Intraoral"),
    ("41007", "Intraoral I&D abscess, submental", "I&D submental intraoral", "Intraoral"),
    ("41008", "Intraoral I&D abscess, submandibular space", "I&D submandibular intraoral", "Intraoral"),
    ("41009", "Intraoral I&D abscess, masticator space", "I&D masticator space intraoral", "Intraoral"),
    ("41015", "Extraoral I&D abscess, sublingual", "I&D sublingual extraoral", "Extraoral"),
    ("41016", "Extraoral I&D abscess, submental", "I&D submental extraoral", "Extraoral"),
    ("41017", "Extraoral I&D abscess, submandibular", "I&D submandibular extraoral", "Extraoral"),
    ("41018", "Extraoral I&D abscess, masticator space", "I&D masticator space extraoral", "Extraoral"),
    ("41019", "Placement of needles, catheters, or other device(s) into the head and/or neck for subsequent interstitial radioelement application", "I&D head/neck (device placement)", "Deep Space"),
    ("42720", "Incision and drainage abscess; retropharyngeal or parapharyngeal, intraoral approach", "Retropharyngeal I&D intraoral", "Deep Space"),  # dup
    ("42725", "Incision and drainage abscess; retropharyngeal or parapharyngeal, external approach", "Parapharyngeal I&D external", "Deep Space"),  # dup
    ("10060", "Incision and drainage of abscess; simple or single", "I&D abscess simple/single", "Skin"),
    ("10061", "Incision and drainage of abscess; complicated or multiple", "I&D abscess complicated/multiple", "Skin"),
    ("10140", "Incision and drainage of hematoma, seroma, or fluid collection", "Hematoma evacuation", "Skin"),
    ("10180", "Incision and drainage, complex, postoperative wound infection", "Post-op wound infection I&D", "Skin"),
]

for code, description, common_name, subcategory in infection_codes:
    if code not in added_codes:
        added_codes.add(code)
        infections["codes"].append({
            "code": code,
            "description": description,
            "common_name": common_name,
            "subcategory": subcategory,
            "isFavorite": code in EXISTING_FAVORITES
        })

# Insert infections after TMJ (position 6) to keep the 11 categories
categories.insert(6, infections)

# ================================================================
# Build final JSON
# ================================================================

# Sort codes numerically within each category
for cat in categories:
    cat["codes"].sort(key=lambda x: x["code"])

# Count totals
total_codes = sum(len(cat["codes"]) for cat in categories)

output = {
    "categories": categories,
    "metadata": {
        "total_codes": total_codes,
        "source": "Extracted from Optum Current Procedural Coding Expert 2024 PDF + OMFS clinical expertise",
        "extracted_date": str(date.today()),
        "categories_count": len(categories)
    }
}

# Save
with open("/app/backend/cpt_codes.json", "w") as f:
    json.dump(output, f, indent=2)

print(f"\n=== OMFS CPT Code JSON Complete ===")
print(f"Total categories: {len(categories)}")
print(f"Total unique codes: {total_codes}")
print()
for cat in categories:
    favorites = sum(1 for c in cat["codes"] if c.get("isFavorite"))
    print(f"  {cat['name']}: {len(cat['codes'])} codes ({favorites} favorites)")

# Verification
print(f"\n=== Verification Checks ===")
checks = {
    "Le Fort I": "21141",
    "BSSO": "21196",
    "Genioplasty": "21121",
    "Fibula free flap": "20969",
    "Radial forearm free flap": "15758",
    "Microvascular anastomosis": "69990",
    "Mandibulectomy": "21044",
    "Segmental mandibulectomy": "21045",
    "Neck dissection": "38724",
    "TMJ arthroscopy": "29804",
    "ORIF mandible": "21462",
    "ORIF zygoma": "21365",
    "Orbital floor repair": "21385",
    "Tracheostomy": "31600",
    "PEG tube": "43246",
    "Sinus lift": "D6945",
    "Dental implant": "D6010",
    "Cleft lip repair": "40700",
    "Cleft palate repair": "42200",
    "Biopsy soft tissue": "40490",
    "I&D abscess": "41008",
    "Arch bars": "21110",
    "Torus mandibularis": "21031",
    "Frenectomy": "40819",
    "Coronoidectomy": "21070",
}

all_codes = set()
for cat in categories:
    for c in cat["codes"]:
        all_codes.add(c["code"])

for name, code in checks.items():
    status = "FOUND" if code in all_codes else "MISSING"
    print(f"  [{status}] {name} ({code})")
