// CPT Code Database for Oral & Maxillofacial Surgery
// Organized by category with relevance mapping to ICD codes

export const CPT_CODES = [
  // ==================== BIOPSY ====================
  { code: "40490", description: "Biopsy lip", category: "Biopsy", isFavorite: true },
  { code: "40808", description: "Biopsy vestibule", category: "Biopsy", isFavorite: true },
  { code: "41100", description: "Biopsy anterior tongue", category: "Biopsy", isFavorite: true },
  { code: "41105", description: "Biopsy posterior tongue", category: "Biopsy", isFavorite: false },
  { code: "41108", description: "Biopsy floor of mouth", category: "Biopsy", isFavorite: false },
  { code: "42100", description: "Biopsy palate soft tissue", category: "Biopsy", isFavorite: false },
  { code: "20245", description: "Biopsy maxilla hard tissue / Deep bone open biopsy", category: "Biopsy", isFavorite: false },
  { code: "20240", description: "Biopsy mandible hard tissue", category: "Biopsy", isFavorite: false },
  { code: "20200", description: "Biopsy, Muscle, Superficial", category: "Biopsy", isFavorite: false },

  // ==================== ABLATION ====================
  { code: "31600", description: "Tracheostomy", category: "Ablation", isFavorite: false },
  { code: "31525", description: "Direct laryngoscopy", category: "Ablation", isFavorite: false },
  { code: "41120", description: "Partial glossectomy", category: "Ablation", isFavorite: true },
  { code: "41130", description: "Hemi glossectomy", category: "Ablation", isFavorite: true },
  { code: "41116", description: "Excision Floor of mouth", category: "Ablation", isFavorite: true },
  { code: "21044", description: "Marginal mandibulectomy cancer", category: "Ablation", isFavorite: true },
  { code: "21045", description: "Segmental mandibulectomy cancer", category: "Ablation", isFavorite: true },
  { code: "21047", description: "Segmental mandibulectomy benign", category: "Ablation", isFavorite: false },
  { code: "21040", description: "Excision benign tumor of mandible, enucleation curettage", category: "Ablation", isFavorite: false },
  { code: "31225", description: "Maxillectomy without orbital exenteration", category: "Ablation", isFavorite: true },
  { code: "21025", description: "Excision of mandibular bone (i.e. for osteomyelitis)", category: "Ablation", isFavorite: false },
  { code: "21030", description: "Excision benign tumor maxilla, enucleation curettage", category: "Ablation", isFavorite: false },
  { code: "21034", description: "Maxillectomy - Excision Malig Tum/Cyst Max", category: "Ablation", isFavorite: false },
  { code: "42120", description: "Resection of soft palate", category: "Ablation", isFavorite: false },
  { code: "42415", description: "Superficial Parotidectomy w/ facial nerve dissection", category: "Ablation", isFavorite: true },
  { code: "11011", description: "Debridement of bone", category: "Ablation", isFavorite: false },
  { code: "42420", description: "Total Parotidectomy w/ facial nerve dissection", category: "Ablation", isFavorite: true },
  { code: "40820", description: "Laser ablation dysplasia", category: "Ablation", isFavorite: false },
  { code: "21070", description: "Coronoidectomy", category: "Ablation", isFavorite: false },
  { code: "38700", description: "Supraomohyoid lymph node dissection", category: "Ablation", isFavorite: true },
  { code: "38724", description: "Modified Radical Neck Dissection", category: "Ablation", isFavorite: true },
  { code: "38720", description: "Radical Neck Dissection", category: "Ablation", isFavorite: false },
  { code: "40520", description: "Lip excision", category: "Ablation", isFavorite: false },
  { code: "41155", description: "Composite procedure with floor of mouth, mandibular resection, neck dissection", category: "Ablation", isFavorite: true },
  { code: "42440", description: "Excision Submandibular gland", category: "Ablation", isFavorite: false },
  { code: "42450", description: "Excision Sublingual gland", category: "Ablation", isFavorite: false },
  { code: "88331", description: "Pathology consultation during surgery", category: "Ablation", isFavorite: true },

  // ==================== RECONSTRUCTION ====================
  { code: "15758", description: "Radial Forearm free flap (soft tissue)", category: "Reconstruction", isFavorite: true },
  { code: "20969", description: "Fibula free flap (osteocutaneous)", category: "Reconstruction", isFavorite: true },
  { code: "21244", description: "Reconstruction mandible extraoral with plate", category: "Reconstruction", isFavorite: true },
  { code: "15734", description: "Pectoralis flap / Supraclavicular flap", category: "Reconstruction", isFavorite: true },
  { code: "42145", description: "Pharyngoplasty", category: "Reconstruction", isFavorite: false },
  { code: "15100", description: "STSG extremity", category: "Reconstruction", isFavorite: false },
  { code: "15120", description: "Harvest skin split thick / STSG face", category: "Reconstruction", isFavorite: true },
  { code: "15757", description: "Radial Forearm free flap", category: "Reconstruction", isFavorite: true },
  { code: "20955", description: "Bone-only fibula free flap", category: "Reconstruction", isFavorite: false },
  { code: "15220", description: "Full thickness skin graft", category: "Reconstruction", isFavorite: false },
  { code: "21209", description: "Osteoplasty reduction facial bones", category: "Reconstruction", isFavorite: false },
  { code: "15740", description: "Island Pedicle flap", category: "Reconstruction", isFavorite: false },
  { code: "21076", description: "Surgical obturator placement", category: "Reconstruction", isFavorite: true },
  { code: "14040", description: "Soft tissue rearrangement", category: "Reconstruction", isFavorite: false },
  { code: "42505", description: "Sialodochoplasty", category: "Reconstruction", isFavorite: false },
  { code: "21215", description: "Allograft, bone graft mandible", category: "Reconstruction", isFavorite: true },
  { code: "21497", description: "Interdental fixation", category: "Reconstruction", isFavorite: false },
  { code: "35701", description: "Carotid Exploration", category: "Reconstruction", isFavorite: false },
  { code: "15733", description: "Muscle myocutaneous head/neck / Submental island flap", category: "Reconstruction", isFavorite: true },
  { code: "14041", description: "Local tissue transfer 10.1 to 30.0 sq cm / V-Y closure", category: "Reconstruction", isFavorite: true },
  { code: "69990", description: "Microsurgical techniques, operating microscope", category: "Reconstruction", isFavorite: true },
  { code: "29515", description: "Leg splint application", category: "Reconstruction", isFavorite: false },
  { code: "29125", description: "Application of short arm splint", category: "Reconstruction", isFavorite: false },
  { code: "97605", description: "Wound vac application < 50cm SQ", category: "Reconstruction", isFavorite: false },
  { code: "21247", description: "Reconstruction mandibular condyle with autografts", category: "Reconstruction", isFavorite: true },
  { code: "21248", description: "Reconstruction mandible/maxilla, endosteal implant partial (1-3)", category: "Reconstruction", isFavorite: true },
  { code: "21249", description: "Reconstruction mandible/maxilla, endosteal implant complete (4+)", category: "Reconstruction", isFavorite: true },
  { code: "21210", description: "Graft bone nasal maxillary malar areas", category: "Reconstruction", isFavorite: false },

  // ==================== DIAGNOSTIC PROCEDURES ====================
  { code: "31526", description: "Laryngoscopy diagnostic with operating microscope", category: "Diagnostic", isFavorite: false },
  { code: "31622", description: "Bronchoscopy, diagnostic", category: "Diagnostic", isFavorite: false },
  { code: "43200", description: "Esophagoscopy, flexible, transoral; diagnostic", category: "Diagnostic", isFavorite: false },

  // ==================== REVISION ====================
  { code: "11042", description: "Flap debulking", category: "Revision", isFavorite: true },
  { code: "40840", description: "Vestibuloplasty anterior", category: "Revision", isFavorite: false },
  { code: "40842", description: "Vestibuloplasty posterior", category: "Revision", isFavorite: false },
  { code: "40844", description: "Vestibuloplasty entire", category: "Revision", isFavorite: false },
  { code: "20680", description: "Hardware removal", category: "Revision", isFavorite: true },
  { code: "C9290", description: "Injection of Exparel", category: "Revision", isFavorite: false },
  { code: "41850", description: "Laser hair removal at flap", category: "Revision", isFavorite: false },

  // ==================== ODONTOGENIC INFECTIONS ====================
  { code: "40801", description: "Vestibular complicated I&D", category: "Odontogenic Infections", isFavorite: true },
  { code: "41006", description: "Intraoral sublingual I&D", category: "Odontogenic Infections", isFavorite: true },
  { code: "41007", description: "Intraoral submental I&D", category: "Odontogenic Infections", isFavorite: true },
  { code: "41008", description: "Intraoral submandibular I&D", category: "Odontogenic Infections", isFavorite: true },
  { code: "41009", description: "Intraoral masticator I&D", category: "Odontogenic Infections", isFavorite: false },
  { code: "41015", description: "Extraoral sublingual I&D", category: "Odontogenic Infections", isFavorite: false },
  { code: "41016", description: "Extraoral submental I&D", category: "Odontogenic Infections", isFavorite: false },
  { code: "41017", description: "Extraoral submandibular I&D", category: "Odontogenic Infections", isFavorite: false },
  { code: "41018", description: "Extraoral masticator I&D", category: "Odontogenic Infections", isFavorite: false },
  { code: "42720", description: "Extraoral lateral and retropharyngeal I&D", category: "Odontogenic Infections", isFavorite: false },
  { code: "10140", description: "Hematoma evacuation", category: "Odontogenic Infections", isFavorite: false },
  { code: "10061", description: "Facial infection complex I&D", category: "Odontogenic Infections", isFavorite: false },
  { code: "10180", description: "Post operative wound infection", category: "Odontogenic Infections", isFavorite: false },

  // ==================== MANDIBLE FRACTURES ====================
  { code: "21453", description: "Closed treatment mandibular fracture with interdental fixation", category: "Mandible Fractures", isFavorite: true },
  { code: "21454", description: "Open treatment mandibular fracture with external fixation", category: "Mandible Fractures", isFavorite: false },
  { code: "21462", description: "Open treatment mandibular fracture with interdental fixation", category: "Mandible Fractures", isFavorite: true },
  { code: "21470", description: "Open treatment complicated mandibular fracture multiple approaches", category: "Mandible Fractures", isFavorite: true },
  { code: "21465", description: "Open treatment mandibular condylar fracture", category: "Mandible Fractures", isFavorite: true },
  { code: "21485", description: "Reduction mandibular condyle closed", category: "Mandible Fractures", isFavorite: false },
  { code: "21490", description: "Reduction mandibular condyle open", category: "Mandible Fractures", isFavorite: false },

  // ==================== MIDFACE FRACTURES ====================
  { code: "21365", description: "ZMC through multiple approaches", category: "Midface Fractures", isFavorite: true },
  { code: "21366", description: "Open treatment ZMC complex", category: "Midface Fractures", isFavorite: true },
  { code: "21421", description: "Closed treatment LeFort I / Maxillary fracture", category: "Midface Fractures", isFavorite: false },
  { code: "21422", description: "Open treatment LeFort I / Maxillary fracture", category: "Midface Fractures", isFavorite: true },
  { code: "21423", description: "Complex LeFort I fracture treatment", category: "Midface Fractures", isFavorite: true },
  { code: "21407", description: "Orbital floor reconstruction", category: "Midface Fractures", isFavorite: true },
  { code: "21338", description: "ORIF NOE", category: "Midface Fractures", isFavorite: true },
  { code: "21339", description: "Open treatment NOE type II", category: "Midface Fractures", isFavorite: false },
  { code: "21340", description: "Open treatment NOE type III", category: "Midface Fractures", isFavorite: false },
  { code: "21344", description: "ORIF frontal sinus multiple approaches, coronal", category: "Midface Fractures", isFavorite: false },
  { code: "21282", description: "Lateral canthopexy", category: "Midface Fractures", isFavorite: true },
  { code: "21385", description: "Open treatment orbital floor fracture", category: "Midface Fractures", isFavorite: true },
  { code: "21386", description: "Open treatment orbital floor with implant", category: "Midface Fractures", isFavorite: true },
  { code: "21387", description: "Combined approach orbital floor/rim", category: "Midface Fractures", isFavorite: false },
  { code: "21390", description: "Orbital floor blowout periorbital approach", category: "Midface Fractures", isFavorite: false },
  { code: "21355", description: "Closed treatment zygomatic arch", category: "Midface Fractures", isFavorite: false },
  { code: "21356", description: "Open treatment zygomatic arch", category: "Midface Fractures", isFavorite: false },
  { code: "21435", description: "Open treatment LeFort III", category: "Midface Fractures", isFavorite: false },
  { code: "21346", description: "Open treatment nasomaxillary complex", category: "Midface Fractures", isFavorite: false },

  // ==================== BONE GRAFT ====================
  { code: "20902", description: "Bone graft, major or large", category: "Bone Graft", isFavorite: true },
  { code: "21127", description: "Bone graft mandible augmentation", category: "Bone Graft", isFavorite: false },

  // ==================== LACERATION ====================
  { code: "40831", description: "Closure of laceration complex", category: "Laceration", isFavorite: true },
  { code: "12051", description: "Simple repair face 2.5cm or less", category: "Laceration", isFavorite: false },
  { code: "12052", description: "Simple repair face 2.6 to 5.0cm", category: "Laceration", isFavorite: false },
  { code: "12053", description: "Simple repair face 5.1 to 7.5cm", category: "Laceration", isFavorite: false },
  { code: "12054", description: "Simple repair face 7.6 to 12.5cm", category: "Laceration", isFavorite: false },
  { code: "13131", description: "Complex repair face 1.1 to 2.5cm", category: "Laceration", isFavorite: true },
  { code: "13132", description: "Complex repair face 2.6 to 7.5cm", category: "Laceration", isFavorite: true },
  { code: "13133", description: "Complex repair face >7.5cm", category: "Laceration", isFavorite: false },

  // ==================== ORTHOGNATHIC ====================
  { code: "21085", description: "Oral Surgical Splint", category: "Orthognathic", isFavorite: true },
  { code: "21110", description: "Apply Arch Bars", category: "Orthognathic", isFavorite: true },
  { code: "21141", description: "Max osteotomy LeFort I, 1 seg w/o graft", category: "Orthognathic", isFavorite: true },
  { code: "21142", description: "Max osteotomy LeFort I, 2 seg w/o graft", category: "Orthognathic", isFavorite: true },
  { code: "21143", description: "Max osteotomy LeFort I, 3 seg w/o graft", category: "Orthognathic", isFavorite: false },
  { code: "21145", description: "Max osteotomy LeFort I, 1 seg w/ bone graft", category: "Orthognathic", isFavorite: true },
  { code: "21146", description: "Max osteotomy LeFort I, 2 seg w/ bone graft", category: "Orthognathic", isFavorite: true },
  { code: "21147", description: "Max osteotomy LeFort I, 3+ seg w/ bone graft", category: "Orthognathic", isFavorite: false },
  { code: "30520", description: "Septoplasty (with LeFort)", category: "Orthognathic", isFavorite: true },
  { code: "21196", description: "Mandibular sagittal split osteotomy (BSSO)", category: "Orthognathic", isFavorite: true },
  { code: "21193", description: "Mandibular rami osteotomy without bone graft", category: "Orthognathic", isFavorite: true },
  { code: "21194", description: "Mandibular rami osteotomy with bone graft", category: "Orthognathic", isFavorite: false },
  { code: "21195", description: "Mandibular sagittal split without rigid fixation", category: "Orthognathic", isFavorite: false },
  { code: "21199", description: "Genioglossus advancement", category: "Orthognathic", isFavorite: true },
  { code: "21198", description: "Osteotomy mandible segmental", category: "Orthognathic", isFavorite: false },
  { code: "64400", description: "Local anesthesia for non-opioid pain control", category: "Orthognathic", isFavorite: false },
  { code: "41115", description: "Labial Frenectomy (with LeFort)", category: "Orthognathic", isFavorite: false },
  { code: "76377", description: "3D post-processing images", category: "Orthognathic", isFavorite: false },
  { code: "21206", description: "Osteotomy maxilla segmental (Wassmund/Schuchard)", category: "Orthognathic", isFavorite: false },
  { code: "21188", description: "Reconstruction midface osteotomies w/ bone grafts", category: "Orthognathic", isFavorite: false },

  // ==================== GENIOPLASTY ====================
  { code: "21120", description: "Genioplasty augmentation (autograft/allograft/prosthetic)", category: "Genioplasty", isFavorite: true },
  { code: "21121", description: "Genioplasty sliding osteotomy single piece", category: "Genioplasty", isFavorite: true },
  { code: "21122", description: "Genioplasty sliding 2+ osteotomies (asymmetry)", category: "Genioplasty", isFavorite: false },
  { code: "21123", description: "Genioplasty sliding with interpositional bone grafts", category: "Genioplasty", isFavorite: false },
  { code: "21125", description: "Augmentation mandibular body/angle prosthetic", category: "Genioplasty", isFavorite: false },

  // ==================== TMJ ====================
  { code: "21010", description: "Arthrotomy TMJ", category: "TMJ", isFavorite: true },
  { code: "21050", description: "Condylectomy", category: "TMJ", isFavorite: true },
  { code: "21060", description: "Meniscectomy partial", category: "TMJ", isFavorite: false },
  { code: "21240", description: "Arthroplasty TMJ with/without autograft", category: "TMJ", isFavorite: true },
  { code: "21242", description: "Arthroplasty TMJ with allograft", category: "TMJ", isFavorite: false },
  { code: "21243", description: "TMJ prosthesis total joint", category: "TMJ", isFavorite: true },

  // ==================== COSMETIC ====================
  { code: "11920", description: "Tattooing, micropigmentation 6.0 sq cm or less", category: "Cosmetic", isFavorite: false },
  { code: "11921", description: "Tattooing 6.1 to 20.0 sq cm", category: "Cosmetic", isFavorite: false },
  { code: "11922", description: "Tattooing each additional 20.0 sq cm", category: "Cosmetic", isFavorite: false },
  { code: "11960", description: "Insertion of tissue expander non-breast", category: "Cosmetic", isFavorite: false },
  { code: "11970", description: "Replacement tissue expander with permanent prosthesis", category: "Cosmetic", isFavorite: false },
  { code: "11971", description: "Removal of tissue expander without prosthesis", category: "Cosmetic", isFavorite: false },
  { code: "15750", description: "Flap neurovascular pedicle", category: "Cosmetic", isFavorite: false },
  { code: "15760", description: "Graft composite (ear or nasal ala)", category: "Cosmetic", isFavorite: false },
  { code: "15770", description: "Derma-fat fascia graft", category: "Cosmetic", isFavorite: false },
  { code: "15786", description: "Abrasion single lesion", category: "Cosmetic", isFavorite: false },
  { code: "15787", description: "Abrasion each additional 4 lesions or less", category: "Cosmetic", isFavorite: false },
  { code: "15819", description: "Cervicoplasty", category: "Cosmetic", isFavorite: false },
  { code: "15820", description: "Blepharoplasty lower eyelid", category: "Cosmetic", isFavorite: false },
  { code: "15821", description: "Blepharoplasty lower with herniated fat pad", category: "Cosmetic", isFavorite: false },
  { code: "15822", description: "Blepharoplasty upper eyelid", category: "Cosmetic", isFavorite: false },
  { code: "15823", description: "Blepharoplasty upper with excessive skin", category: "Cosmetic", isFavorite: false },
  { code: "15830", description: "Excision excessive skin abdomen panniculectomy", category: "Cosmetic", isFavorite: false },
  { code: "15847", description: "Abdominoplasty with umbilical transposition", category: "Cosmetic", isFavorite: false },
  { code: "17106", description: "Destruction vascular lesions < 10 sq cm", category: "Cosmetic", isFavorite: false },
  { code: "17107", description: "Destruction vascular lesions 10-50 sq cm", category: "Cosmetic", isFavorite: false },
  { code: "17108", description: "Destruction vascular lesions > 50 sq cm", category: "Cosmetic", isFavorite: false },
  { code: "20912", description: "Cartilage graft nasal septum", category: "Cosmetic", isFavorite: false },
  { code: "21137", description: "Reduction forehead contouring only", category: "Cosmetic", isFavorite: false },
  { code: "21138", description: "Reduction forehead with prosthetic/bone graft", category: "Cosmetic", isFavorite: false },
  { code: "21139", description: "Reduction forehead with setback frontal sinus", category: "Cosmetic", isFavorite: false },
  { code: "21150", description: "Reconstruction midface LeFort II anterior intrusion", category: "Cosmetic", isFavorite: false },
  { code: "21151", description: "Reconstruction midface LeFort II with bone grafts", category: "Cosmetic", isFavorite: false },
  { code: "21154", description: "Reconstruction midface LeFort III without LeFort I", category: "Cosmetic", isFavorite: false },
  { code: "21155", description: "Reconstruction midface LeFort III with LeFort I", category: "Cosmetic", isFavorite: false },
  { code: "21159", description: "Reconstruction midface LeFort III with forehead without LeFort I", category: "Cosmetic", isFavorite: false },
  { code: "21160", description: "Reconstruction midface LeFort III with forehead with LeFort I", category: "Cosmetic", isFavorite: false },
  { code: "21172", description: "Reconstruction superior-lateral orbital rim", category: "Cosmetic", isFavorite: false },
  { code: "21175", description: "Reconstruction bifrontal, orbital rims, lower forehead", category: "Cosmetic", isFavorite: false },
  { code: "21179", description: "Reconstruction forehead with allograf/prosthetic", category: "Cosmetic", isFavorite: false },
  { code: "21180", description: "Reconstruction forehead with autograft", category: "Cosmetic", isFavorite: false },
  { code: "21208", description: "Osteoplasty facial bones augmentation", category: "Cosmetic", isFavorite: false },
  { code: "21230", description: "Graft rib cartilage autogenous to face/chin/nose/ear", category: "Cosmetic", isFavorite: false },
  { code: "21235", description: "Graft ear cartilage autogenous to nose/ear", category: "Cosmetic", isFavorite: false },
  { code: "21245", description: "Reconstruction mandible/maxilla subperiosteal partial", category: "Cosmetic", isFavorite: false },
  { code: "21246", description: "Reconstruction mandible/maxilla subperiosteal complete", category: "Cosmetic", isFavorite: false },
  { code: "21255", description: "Reconstruction zygomatic arch and glenoid fossa", category: "Cosmetic", isFavorite: false },
  { code: "21270", description: "Malar augmentation prosthetic material", category: "Cosmetic", isFavorite: false },
  { code: "21275", description: "Secondary revision orbitocraniofacial reconstruction", category: "Cosmetic", isFavorite: false },
  { code: "21280", description: "Medial canthopexy", category: "Cosmetic", isFavorite: false },
  { code: "21740", description: "Reconstructive repair pectus excavatum/carinatum", category: "Cosmetic", isFavorite: false },
  { code: "30150", description: "Rhinectomy partial", category: "Cosmetic", isFavorite: false },
  { code: "30160", description: "Rhinectomy total", category: "Cosmetic", isFavorite: false },
  { code: "30400", description: "Rhinoplasty primary lateral/alar cartilages", category: "Cosmetic", isFavorite: true },
  { code: "30410", description: "Rhinoplasty complete external parts bony pyramid", category: "Cosmetic", isFavorite: true },
  { code: "30420", description: "Rhinoplasty including major septal repair", category: "Cosmetic", isFavorite: false },
  { code: "30430", description: "Rhinoplasty secondary minor revision", category: "Cosmetic", isFavorite: false },
  { code: "30435", description: "Rhinoplasty secondary intermediate (osteotomies)", category: "Cosmetic", isFavorite: false },
  { code: "30450", description: "Rhinoplasty secondary major revision", category: "Cosmetic", isFavorite: false },
  { code: "30620", description: "Septal or intranasal dermatoplasty", category: "Cosmetic", isFavorite: false },
  { code: "41510", description: "Suture tongue to lip for micrognathia (Douglas)", category: "Cosmetic", isFavorite: false },
  { code: "67900", description: "Repair of brow ptosis", category: "Cosmetic", isFavorite: false },
  { code: "67901", description: "Repair blepharoptosis frontalis with suture", category: "Cosmetic", isFavorite: false },
  { code: "67902", description: "Repair blepharoptosis frontalis with fascial sling", category: "Cosmetic", isFavorite: false },
  { code: "67903", description: "Repair blepharoptosis levator internal approach", category: "Cosmetic", isFavorite: false },
  { code: "67904", description: "Repair blepharoptosis levator external approach", category: "Cosmetic", isFavorite: false },
  { code: "67906", description: "Repair blepharoptosis superior rectus with fascial sling", category: "Cosmetic", isFavorite: false },
  { code: "67908", description: "Repair blepharoptosis conjunctivo-tarso-Muller's", category: "Cosmetic", isFavorite: false },
  { code: "67909", description: "Reduction overcorrection of ptosis", category: "Cosmetic", isFavorite: false },
  { code: "67911", description: "Correction of lid retraction", category: "Cosmetic", isFavorite: false },
  { code: "69300", description: "Otoplasty protruding ear", category: "Cosmetic", isFavorite: false },
  { code: "96405", description: "Chemotherapy intralesional up to 7 lesions", category: "Cosmetic", isFavorite: false },
  { code: "96406", description: "Chemotherapy intralesional > 7 lesions", category: "Cosmetic", isFavorite: false },
  { code: "96921", description: "Laser treatment inflammatory skin 250-500 sq cm", category: "Cosmetic", isFavorite: false },
  { code: "96922", description: "Laser treatment inflammatory skin > 500 sq cm", category: "Cosmetic", isFavorite: false },

  // ==================== NASAL FRACTURES ====================
  { code: "21310", description: "Closed treatment nasal bone fracture", category: "Nasal Fractures", isFavorite: true },
  { code: "21315", description: "Closed treatment nasal fracture with stabilization", category: "Nasal Fractures", isFavorite: false },
  { code: "21320", description: "Open treatment nasal bone fracture uncomplicated", category: "Nasal Fractures", isFavorite: false },
  { code: "21325", description: "Open treatment nasal bone fracture complicated", category: "Nasal Fractures", isFavorite: false },
  { code: "21337", description: "Nasal septal fracture closed treatment", category: "Nasal Fractures", isFavorite: false },

  // ==================== CLEFT ====================
  { code: "42200", description: "Palatoplasty for cleft palate soft tissue only", category: "Cleft", isFavorite: true },
  { code: "42205", description: "Palatoplasty for cleft palate closure with nasal septal/alveolar ridge", category: "Cleft", isFavorite: false },
  { code: "42210", description: "Palatoplasty for cleft palate with closure of alveolar ridge", category: "Cleft", isFavorite: false },
  { code: "42215", description: "Palatoplasty for cleft palate pushback", category: "Cleft", isFavorite: false },
  { code: "42220", description: "Palatoplasty for cleft palate attachment pharyngeal flap", category: "Cleft", isFavorite: false },
  { code: "42225", description: "Palatoplasty for cleft palate island flap/lengthening", category: "Cleft", isFavorite: false },
  { code: "40700", description: "Repair cleft lip primary unilateral partial", category: "Cleft", isFavorite: true },
  { code: "40701", description: "Repair cleft lip primary unilateral complete", category: "Cleft", isFavorite: true },
  { code: "40702", description: "Repair cleft lip primary bilateral", category: "Cleft", isFavorite: false },
  { code: "40720", description: "Repair cleft lip secondary partial", category: "Cleft", isFavorite: false },
  { code: "40761", description: "Repair cleft lip with cross lip pedicle flap", category: "Cleft", isFavorite: false }
];

// ICD code to CPT code mapping for intelligent sorting
// Maps diagnosis ICD codes to their most relevant CPT codes
export const ICD_TO_CPT_MAPPING = {
  // Trauma
  'S02.65xB': ['21470', '21462', '21465', '21110'], // Fracture angle open
  'S02.65xK': ['21470', '21462', '21465', '20680'], // Fracture angle nonunion
  'S02.62xA': ['21465', '21485', '21490', '21110'], // Fracture subcondylar
  'S02.66xB': ['21470', '21462', '21421', '21110'], // Fracture symphysis open
  'S02.66xK': ['21470', '21462', '21421', '20680'], // Fracture symphysis nonunion
  'S02.60B': ['21470', '21462', '21465', '21110'], // Fracture body open
  'S02.60K': ['21470', '21462', '21465', '20680'], // Fracture body nonunion
  'S02.402A': ['21365', '21366', '21385', '21407'], // Fracture zygomatic
  'S02.3xxA': ['21385', '21386', '21387', '21407'], // Fracture orbital floor
  'S02.411A': ['21421', '21422', '21423', '21110'], // Fracture LeFort I

  // H&N Oncology
  'C02.3': ['41100', '41120', '41130', '38724', '88331'], // Malignancy tongue anterior
  'C02.8': ['41100', '41120', '41130', '38724', '88331'], // Malignancy tongue overlapping
  'C02.2': ['41100', '41120', '41130', '88331'], // Malignancy tongue ventral
  'C00.9': ['40490', '40520', '38724', '88331'], // Malignancy lip
  'C04.9': ['41108', '41116', '41120', '38724', '88331'], // Malignancy floor of mouth
  'C03.0': ['41825', '21030', '38724', '88331'], // Malignancy upper gum
  'C03.1': ['41825', '21040', '21044', '38724', '88331'], // Malignancy lower gum
  'C41.1': ['21040', '21044', '21045', '20969', '15758', '38724', '88331'], // Malignancy mandible
  'C06.0': ['40808', '40820', '38724', '88331'], // Malignancy cheek
  'C05.0': ['42100', '42120', '38724', '88331'], // Malignancy hard palate
  'C06.1': ['40808', '40820', '88331'], // Malignancy vestibule
  'C06.2': ['41116', '21040', '38724', '88331'], // Malignancy retromolar
  'K13.21': ['40808', '40820', '88331'], // Oral dysplasia
  'D16.5': ['21040', '21047', '20240', '88331'], // Benign mandible
  'D16.4': ['21030', '20245', '88331'], // Benign maxilla
  'D11.0': ['42415', '42410', '88331'], // Benign parotid
  'C08.9': ['42420', '42415', '38724', '88331'], // Malignant parotid
  'M27.2': ['21025', '21040', '11011'], // Osteomyelitis/ORN
  'M87.180': ['21025', '21040', '11011'], // MRONJ

  // TMJ
  'M19.91': ['21010', '21050', '21240', '21242'], // Osteoarthritis
  'M26.69': ['21010', '21050'], // TMJ sounds
  'M26.633': ['21010', '21050', '21060'], // Internal derangement
  'M26.623': ['21010', '21050'], // Arthralgia
  'M26.613': ['21050', '21060', '21070', '21240'], // Ankylosis
  'M06.9': ['21010', '21050', '21240'], // Rheumatoid arthritis
  'M77.8': ['21010'], // Capsulitis/Tendinitis
  'M79.1': ['21010'], // Myalgia
  'M62.838': ['21010'], // Dystonia/Spasm

  // Orthognathic
  'M26.02': ['21141', '21145', '21146', '21085', '21110'], // Maxillary hypoplasia
  'M26.09': ['21141', '21145', '21147', '21085', '21110'], // Maxillary transverse deficiency
  'M26.01': ['21141', '21145', '21146', '21085', '21110'], // Maxillary vertical excess
  'M26.11': ['21141', '21145', '21146', '21147', '21085'], // Maxillary asymmetry
  'M26.04': ['21193', '21194', '21196', '21085', '21110'], // Mandibular hypoplasia
  'M26.03': ['21193', '21196', '21188', '21085', '21110'], // Mandibular hyperplasia
  'M26.12': ['21145', '21146', '21193', '21196', '21085'], // Mandibular asymmetry
  'Q67.0': ['21141', '21145', '21146', '21147', '21085'], // Congenital facial asymmetry
  'M26.05': ['21120', '21121', '21122', '21123'], // Microgenia
  'M26.06': ['21120', '21121', '21122', '21123'], // Macrogenia
  'M26.4': ['21141', '21142', '21145', '21146', '21085', '21110'], // Malocclusion
  'M26.212': ['21141', '21142', '21145', '21146', '21193', '21196', '21085'], // Class II malocclusion
  'M26.216': ['21141', '21142', '21145', '21146', '21085'], // Compensated Class II
  'M26.213': ['21141', '21145', '21146', '21188', '21193', '21196', '21085'], // Class III malocclusion
  'M26.220': ['21141', '21145', '21146', '21085', '21110'], // Anterior open bite
  'M26.221': ['21141', '21145', '21085', '21110'], // Posterior open bite
  'M26.23': ['21141', '21145', '21146', '21085', '21110'], // Deep bite
  'M26.51': ['21141', '21145', '21085'], // Abnormal jaw closure
  'G47.33': ['21141', '21145', '21146', '21199', '21085'], // OSA

  // Cleft & Craniofacial
  'Z87.790': ['40700', '40701', '40702', '42200', '42205', '42210', '42215'], // Cleft

  // Cosmetics
  'J34.2': ['30520', '30540', '30545', '30400', '30410'], // Deviated septum
  'J34.3': ['30130', '30140'], // Turbinate hypertrophy
  'M95': ['30400', '30410', '30420', '30430'] // Nasal deformity
};

/**
 * Get all unique CPT categories
 */
export const getCPTCategories = () => {
  const categories = new Set(CPT_CODES.map(c => c.category));
  return Array.from(categories);
};

/**
 * Get CPT code by code number
 */
export const getCPTCodeByCode = (code) => {
  return CPT_CODES.find(c => c.code === code);
};

/**
 * Search CPT codes with optional diagnosis-based sorting
 */
export const searchCPTCodes = (query, diagnosisText = null) => {
  let results = CPT_CODES;
  
  // Filter by search query if provided
  if (query && query.trim() !== '') {
    const lowerQuery = query.toLowerCase();
    results = CPT_CODES.filter(cpt =>
      cpt.code.toLowerCase().includes(lowerQuery) ||
      cpt.description.toLowerCase().includes(lowerQuery) ||
      cpt.category.toLowerCase().includes(lowerQuery)
    );
  }
  
  // Sort by diagnosis relevance if diagnosis is provided
  if (diagnosisText && diagnosisText.trim() !== '') {
    const relevantCodes = getRelevantCPTCodes(diagnosisText);
    
    if (relevantCodes && relevantCodes.length > 0) {
      // Create a priority map
      const priorityMap = new Map();
      relevantCodes.forEach((code, index) => {
        priorityMap.set(code, index);
      });
      
      // Sort results: relevant codes first (in order), then favorites, then rest
      results = [...results].sort((a, b) => {
        const aRelevant = priorityMap.has(a.code);
        const bRelevant = priorityMap.has(b.code);
        
        if (aRelevant && bRelevant) {
          return priorityMap.get(a.code) - priorityMap.get(b.code);
        }
        if (aRelevant) return -1;
        if (bRelevant) return 1;
        
        // If neither is relevant, sort by favorites then alphabetically
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        
        return a.code.localeCompare(b.code);
      });
    }
  } else {
    // Default sort: favorites first, then by code
    results = [...results].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.code.localeCompare(b.code);
    });
  }
  
  return results;
};

/**
 * Get relevant CPT codes for a diagnosis
 */
export const getRelevantCPTCodes = (diagnosisText) => {
  if (!diagnosisText || diagnosisText.trim() === '') return null;
  
  // Extract ICD code from diagnosis text if present (format: "Diagnosis Name (ICD_CODE)")
  const icdMatch = diagnosisText.match(/\(([A-Z][0-9.]+[A-Za-z]*)\)$/);
  if (icdMatch) {
    const icdCode = icdMatch[1];
    if (ICD_TO_CPT_MAPPING[icdCode]) {
      return ICD_TO_CPT_MAPPING[icdCode];
    }
  }
  
  // Try to find by partial ICD code match
  const lowerDiagnosis = diagnosisText.toLowerCase();
  for (const [icdCode, cptCodes] of Object.entries(ICD_TO_CPT_MAPPING)) {
    if (lowerDiagnosis.includes(icdCode.toLowerCase())) {
      return cptCodes;
    }
  }
  
  // Try keyword matching
  const keywordMapping = {
    'fracture': ['21470', '21462', '21465', '21110', '21453'],
    'mandible': ['21470', '21462', '21465', '21044', '21045', '21247'],
    'maxilla': ['21141', '21145', '21146', '31225', '21030'],
    'zygomatic': ['21365', '21366', '21385'],
    'orbital': ['21385', '21386', '21387', '21407'],
    'lefort': ['21421', '21422', '21423', '21141', '21145'],
    'tongue': ['41100', '41120', '41130'],
    'parotid': ['42415', '42420'],
    'tmj': ['21010', '21050', '21240'],
    'genioplasty': ['21120', '21121', '21122', '21123'],
    'bsso': ['21196', '21193'],
    'sagittal': ['21196', '21195'],
    'cleft': ['40700', '40701', '42200', '42205'],
    'rhinoplasty': ['30400', '30410', '30420'],
    'septoplasty': ['30520'],
    'biopsy': ['40490', '40808', '41100', '20240', '20245'],
    'malignancy': ['21044', '21045', '38724', '88331'],
    'cancer': ['21044', '21045', '31225', '38724', '88331'],
    'infection': ['40801', '41006', '41007', '41008', '41017'],
    'reconstruction': ['15758', '20969', '21244', '21247'],
    'flap': ['15758', '20969', '15734', '15733']
  };
  
  for (const [keyword, codes] of Object.entries(keywordMapping)) {
    if (lowerDiagnosis.includes(keyword)) {
      return codes;
    }
  }
  
  return null;
};

/**
 * Get favorite CPT codes
 */
export const getFavoriteCPTCodes = () => {
  return CPT_CODES.filter(c => c.isFavorite);
};

/**
 * Get CPT codes by category
 */
export const getCPTCodesByCategory = (category) => {
  return CPT_CODES.filter(c => c.category === category);
};
