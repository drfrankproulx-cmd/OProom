// CPT Code Categories for Oral & Maxillofacial Surgery
export const CPT_CODES = [
  // Favorites (commonly used)
  {
    code: "21141",
    description: "LeFort I osteotomy, single piece",
    category: "Favorites",
    isFavorite: true
  },
  {
    code: "21145",
    description: "LeFort I osteotomy, 2-piece",
    category: "Favorites",
    isFavorite: true
  },
  {
    code: "21146",
    description: "LeFort I osteotomy, 3 or more pieces",
    category: "Favorites",
    isFavorite: true
  },
  {
    code: "21147",
    description: "LeFort II osteotomy",
    category: "Favorites",
    isFavorite: true
  },
  {
    code: "21423",
    description: "Complex LeFort I fracture",
    category: "Midface Fractures",
    isFavorite: false
  },
  {
    code: "30520",
    description: "Septoplasty (with LeFort)",
    category: "Orthognathic",
    isFavorite: true
  },

  // Orthognathic Surgery
  {
    code: "21195",
    description: "Reconstruction of mandibular rami, horizontal, vertical, C, or L osteotomy",
    category: "Orthognathic",
    isFavorite: false
  },
  {
    code: "21196",
    description: "Reconstruction of mandibular rami and/or body, sagittal split",
    category: "Orthognathic",
    isFavorite: true
  },
  {
    code: "21198",
    description: "Osteotomy, mandible, segmented",
    category: "Orthognathic",
    isFavorite: false
  },
  {
    code: "21199",
    description: "Osteotomy, mandible, segmented, with genioplasty",
    category: "Orthognathic",
    isFavorite: true
  },
  {
    code: "21206",
    description: "Osteotomy, maxilla, segmental (eg, Wassmund or Schuchard)",
    category: "Orthognathic",
    isFavorite: false
  },
  {
    code: "21208",
    description: "Osteoplasty, facial bones; augmentation (autograft, allograft, or prosthetic implant)",
    category: "Orthognathic",
    isFavorite: false
  },
  {
    code: "21209",
    description: "Reduction (osteoplasty), facial bones",
    category: "Orthognathic",
    isFavorite: false
  },
  {
    code: "21210",
    description: "Genioplasty; augmentation (autograft, allograft, prosthetic material)",
    category: "Orthognathic",
    isFavorite: true
  },
  {
    code: "21121",
    description: "Genioplasty; sliding osteotomy, single piece",
    category: "Orthognathic",
    isFavorite: true
  },

  // Midface Fractures
  {
    code: "21421",
    description: "Simple LeFort I fracture",
    category: "Midface Fractures",
    isFavorite: false
  },
  {
    code: "21422",
    description: "Moderate LeFort I fracture",
    category: "Midface Fractures",
    isFavorite: false
  },
  {
    code: "21431",
    description: "Simple LeFort II fracture",
    category: "Midface Fractures",
    isFavorite: false
  },
  {
    code: "21432",
    description: "Moderate LeFort II fracture",
    category: "Midface Fractures",
    isFavorite: false
  },
  {
    code: "21433",
    description: "Complex LeFort II fracture",
    category: "Midface Fractures",
    isFavorite: false
  },
  {
    code: "21435",
    description: "Simple LeFort III fracture",
    category: "Midface Fractures",
    isFavorite: false
  },
  {
    code: "21436",
    description: "Complex LeFort III fracture",
    category: "Midface Fractures",
    isFavorite: false
  },

  // Mandible Fractures
  {
    code: "21470",
    description: "Simple mandible fracture (closed treatment)",
    category: "Mandible Fractures",
    isFavorite: false
  },
  {
    code: "21462",
    description: "Open treatment of mandibular fracture with interdental fixation",
    category: "Mandible Fractures",
    isFavorite: true
  },
  {
    code: "21465",
    description: "Open treatment of mandibular condylar fracture",
    category: "Mandible Fractures",
    isFavorite: true
  },
  {
    code: "21480",
    description: "Simple mandible fracture (open treatment)",
    category: "Mandible Fractures",
    isFavorite: false
  },
  {
    code: "21485",
    description: "Complex mandible fracture (open treatment)",
    category: "Mandible Fractures",
    isFavorite: false
  },
  {
    code: "21490",
    description: "Mandible fracture, complicated (open treatment)",
    category: "Mandible Fractures",
    isFavorite: false
  },

  // Zygomatic/Orbital Fractures
  {
    code: "21355",
    description: "Simple zygomatic arch fracture (open treatment)",
    category: "Zygomatic Fractures",
    isFavorite: false
  },
  {
    code: "21356",
    description: "Open treatment of depressed zygomatic arch fracture",
    category: "Zygomatic Fractures",
    isFavorite: false
  },
  {
    code: "21360",
    description: "Simple zygoma fracture (open treatment)",
    category: "Zygomatic Fractures",
    isFavorite: false
  },
  {
    code: "21365",
    description: "Complex zygoma fracture (open treatment)",
    category: "Zygomatic Fractures",
    isFavorite: false
  },
  {
    code: "21366",
    description: "Open treatment of complicated zygomatic arch fracture with internal fixation",
    category: "Zygomatic Fractures",
    isFavorite: true
  },
  {
    code: "21385",
    description: "Simple orbital floor blowout fracture (open treatment)",
    category: "Orbital Fractures",
    isFavorite: false
  },
  {
    code: "21386",
    description: "Complex orbital floor fracture (open treatment)",
    category: "Orbital Fractures",
    isFavorite: false
  },
  {
    code: "21387",
    description: "Orbital floor fracture with implant",
    category: "Orbital Fractures",
    isFavorite: false
  },
  {
    code: "21390",
    description: "Open treatment orbital wall fracture, lateral approach",
    category: "Orbital Fractures",
    isFavorite: false
  },

  // Dental Implants
  {
    code: "21248",
    description: "Reconstruction of mandible or maxilla, endosteal implant",
    category: "Dental Implants",
    isFavorite: false
  },
  {
    code: "21249",
    description: "Reconstruction, mandible or maxilla, endosteal implant (each additional)",
    category: "Dental Implants",
    isFavorite: false
  },

  // Temporomandibular Joint (TMJ)
  {
    code: "21010",
    description: "Arthrotomy, temporomandibular joint",
    category: "TMJ",
    isFavorite: false
  },
  {
    code: "21050",
    description: "Condylectomy, temporomandibular joint",
    category: "TMJ",
    isFavorite: false
  },
  {
    code: "21060",
    description: "Meniscectomy, partial or complete, temporomandibular joint",
    category: "TMJ",
    isFavorite: false
  },
  {
    code: "21070",
    description: "Coronoidectomy",
    category: "TMJ",
    isFavorite: false
  },
  {
    code: "21240",
    description: "Arthroplasty, temporomandibular joint",
    category: "TMJ",
    isFavorite: false
  },
  {
    code: "21242",
    description: "Arthroplasty, temporomandibular joint, with allograft",
    category: "TMJ",
    isFavorite: false
  },
  {
    code: "21243",
    description: "Arthroplasty, temporomandibular joint, with prosthetic joint replacement",
    category: "TMJ",
    isFavorite: false
  },

  // Reconstructive Surgery
  {
    code: "21125",
    description: "Augmentation, mandibular body or angle; prosthetic material",
    category: "Reconstructive",
    isFavorite: false
  },
  {
    code: "21127",
    description: "Augmentation, mandibular body or angle; with bone graft",
    category: "Reconstructive",
    isFavorite: false
  },
  {
    code: "21150",
    description: "Reconstruction midface, LeFort II",
    category: "Reconstructive",
    isFavorite: false
  },
  {
    code: "21151",
    description: "Reconstruction midface, LeFort III",
    category: "Reconstructive",
    isFavorite: false
  },
  {
    code: "21154",
    description: "Reconstruction of orbit",
    category: "Reconstructive",
    isFavorite: false
  },
  {
    code: "21155",
    description: "Reconstruction of anterior orbital wall and floor blowout fracture",
    category: "Reconstructive",
    isFavorite: false
  },
  {
    code: "21159",
    description: "Reconstruction midface, LeFort III with forehead advancement",
    category: "Reconstructive",
    isFavorite: false
  },
  {
    code: "21160",
    description: "Reconstruction; secondary or subsequent, LeFort I",
    category: "Reconstructive",
    isFavorite: false
  },
  {
    code: "21172",
    description: "Reconstruction superior-lateral orbital rim and lower forehead",
    category: "Reconstructive",
    isFavorite: false
  },

  // Nasal Fractures
  {
    code: "21310",
    description: "Closed treatment of nasal bone fracture without manipulation",
    category: "Nasal Fractures",
    isFavorite: true
  },
  {
    code: "21315",
    description: "Closed treatment of nasal bone fracture with stabilization",
    category: "Nasal Fractures",
    isFavorite: false
  },
  {
    code: "21320",
    description: "Open treatment of nasal bone fracture",
    category: "Nasal Fractures",
    isFavorite: false
  },
  {
    code: "21325",
    description: "Open treatment of nasal septal fracture",
    category: "Nasal Fractures",
    isFavorite: false
  },

  // Nasal Surgery
  {
    code: "30400",
    description: "Rhinoplasty, primary; lateral and alar cartilages and/or elevation of nasal tip",
    category: "Nasal",
    isFavorite: false
  },
  {
    code: "30410",
    description: "Rhinoplasty, primary; complete, external parts including bony pyramid",
    category: "Nasal",
    isFavorite: false
  },
  {
    code: "30420",
    description: "Rhinoplasty, primary; including major septal repair",
    category: "Nasal",
    isFavorite: false
  },
  {
    code: "30430",
    description: "Rhinoplasty, secondary; minor revision (small amount of nasal tip work)",
    category: "Nasal",
    isFavorite: false
  },
  {
    code: "30435",
    description: "Rhinoplasty, secondary; intermediate revision (bony work with osteotomies)",
    category: "Nasal",
    isFavorite: false
  },
  {
    code: "30450",
    description: "Rhinoplasty, secondary; major revision (nasal tip work and osteotomies)",
    category: "Nasal",
    isFavorite: false
  },
  {
    code: "30465",
    description: "Repair of nasal vestibular stenosis",
    category: "Nasal",
    isFavorite: false
  },

  // Soft Tissue Surgery
  {
    code: "15820",
    description: "Blepharoplasty, lower eyelid",
    category: "Soft Tissue",
    isFavorite: false
  },
  {
    code: "15821",
    description: "Blepharoplasty, lower eyelid; with extensive herniated fat pad",
    category: "Soft Tissue",
    isFavorite: false
  },
  {
    code: "15822",
    description: "Blepharoplasty, upper eyelid",
    category: "Soft Tissue",
    isFavorite: false
  },
  {
    code: "15823",
    description: "Blepharoplasty, upper eyelid; with excessive skin weighting down lid",
    category: "Soft Tissue",
    isFavorite: false
  },
  {
    code: "40700",
    description: "Plastic repair of cleft lip/nasal deformity; primary",
    category: "Soft Tissue",
    isFavorite: false
  },
  {
    code: "40701",
    description: "Plastic repair of cleft lip/nasal deformity; primary, bilateral",
    category: "Soft Tissue",
    isFavorite: false
  },
  {
    code: "42200",
    description: "Palatoplasty for cleft palate, soft and/or hard palate only",
    category: "Soft Tissue",
    isFavorite: false
  },
  {
    code: "42205",
    description: "Palatoplasty for cleft palate, with closure of alveolar ridge",
    category: "Soft Tissue",
    isFavorite: false
  },
  {
    code: "42215",
    description: "Palatoplasty for cleft palate; major revision",
    category: "Soft Tissue",
    isFavorite: false
  },
  {
    code: "42220",
    description: "Palatoplasty for cleft palate; secondary lengthening procedure",
    category: "Soft Tissue",
    isFavorite: false
  },
  {
    code: "42225",
    description: "Palatoplasty for cleft palate; attachment pharyngeal flap",
    category: "Soft Tissue",
    isFavorite: false
  }
];

export const CPT_CATEGORIES = [
  "Favorites",
  "Orthognathic",
  "Midface Fractures",
  "Mandible Fractures",
  "Zygomatic Fractures",
  "Orbital Fractures",
  "Nasal Fractures",
  "Dental Implants",
  "TMJ",
  "Reconstructive",
  "Nasal",
  "Soft Tissue"
];

export const searchCPTCodes = (query) => {
  const lowerQuery = query.toLowerCase();
  return CPT_CODES.filter(cpt =>
    cpt.code.toLowerCase().includes(lowerQuery) ||
    cpt.description.toLowerCase().includes(lowerQuery) ||
    cpt.category.toLowerCase().includes(lowerQuery)
  );
};

export const getCPTCodesByCategory = (category) => {
  return CPT_CODES.filter(cpt => cpt.category === category);
};

export const getFavoriteCPTCodes = () => {
  return CPT_CODES.filter(cpt => cpt.isFavorite);
};

export const getCPTCodeByCode = (code) => {
  return CPT_CODES.find(cpt => cpt.code === code);
};

/**
 * Filter CPT codes by a list of code numbers
 * Used for diagnosis-specific filtering
 */
export const getCPTCodesByCodes = (codes) => {
  if (!codes || codes.length === 0) return CPT_CODES;
  return CPT_CODES.filter(cpt => codes.includes(cpt.code));
};
