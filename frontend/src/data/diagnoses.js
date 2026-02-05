/**
 * Diagnosis-to-CPT Code Mapping
 * Maps common maxillofacial and oral surgery diagnoses to relevant CPT codes
 */

export const DIAGNOSES = [
  // Mandible Fractures
  {
    id: 'mandible_fracture_general',
    name: 'Mandible Fracture',
    category: 'Mandible Fractures',
    cptCodes: ['21470', '21462', '21465', '21485', '21490', '21421', '21310', '21366']
  },
  {
    id: 'mandible_body',
    name: 'Mandibular Body Fracture',
    category: 'Mandible Fractures',
    cptCodes: ['21470', '21462', '21465', '21310']
  },
  {
    id: 'mandible_angle',
    name: 'Mandibular Angle Fracture',
    category: 'Mandible Fractures',
    cptCodes: ['21470', '21462', '21465']
  },
  {
    id: 'mandible_condyle',
    name: 'Mandibular Condyle Fracture',
    category: 'Mandible Fractures',
    cptCodes: ['21465', '21485', '21490']
  },
  {
    id: 'mandible_symphysis',
    name: 'Mandibular Symphysis Fracture',
    category: 'Mandible Fractures',
    cptCodes: ['21470', '21462', '21421']
  },
  {
    id: 'mandible_parasymphysis',
    name: 'Mandibular Parasymphysis Fracture',
    category: 'Mandible Fractures',
    cptCodes: ['21470', '21462']
  },
  {
    id: 'mandible_bilateral',
    name: 'Bilateral Mandible Fracture',
    category: 'Mandible Fractures',
    cptCodes: ['21470', '21462', '21366']
  },

  // Midface Fractures
  {
    id: 'lefort_1',
    name: 'LeFort I Fracture',
    category: 'Midface Fractures',
    cptCodes: ['21421', '21422', '21423']
  },
  {
    id: 'lefort_2',
    name: 'LeFort II Fracture',
    category: 'Midface Fractures',
    cptCodes: ['21422', '21423', '21346']
  },
  {
    id: 'lefort_3',
    name: 'LeFort III Fracture',
    category: 'Midface Fractures',
    cptCodes: ['21423', '21435']
  },
  {
    id: 'maxilla_fracture',
    name: 'Maxillary Fracture',
    category: 'Midface Fractures',
    cptCodes: ['21421', '21422', '21346']
  },

  // Zygomatic Fractures
  {
    id: 'zmc_fracture',
    name: 'Zygomaticomaxillary Complex (ZMC) Fracture',
    category: 'Zygomatic Fractures',
    cptCodes: ['21365', '21366', '21385']
  },
  {
    id: 'zygomatic_arch',
    name: 'Zygomatic Arch Fracture',
    category: 'Zygomatic Fractures',
    cptCodes: ['21355', '21356', '21365']
  },
  {
    id: 'tripod_fracture',
    name: 'Tripod Fracture',
    category: 'Zygomatic Fractures',
    cptCodes: ['21365', '21366']
  },

  // Orbital Fractures
  {
    id: 'orbital_floor',
    name: 'Orbital Floor Fracture',
    category: 'Orbital Fractures',
    cptCodes: ['21385', '21386', '21387', '21390']
  },
  {
    id: 'orbital_blowout',
    name: 'Orbital Blowout Fracture',
    category: 'Orbital Fractures',
    cptCodes: ['21385', '21386', '21387']
  },
  {
    id: 'orbital_rim',
    name: 'Orbital Rim Fracture',
    category: 'Orbital Fractures',
    cptCodes: ['21385', '21386', '21407']
  },

  // Nasal Fractures
  {
    id: 'nasal_fracture',
    name: 'Nasal Bone Fracture',
    category: 'Nasal Fractures',
    cptCodes: ['21310', '21315', '21320', '21325']
  },
  {
    id: 'noe_fracture',
    name: 'Naso-Orbital-Ethmoid (NOE) Fracture',
    category: 'Nasal Fractures',
    cptCodes: ['21338', '21339', '21340']
  },
  {
    id: 'nasal_septum',
    name: 'Nasal Septum Fracture',
    category: 'Nasal Fractures',
    cptCodes: ['30520', '21337']
  },

  // Orthognathic Conditions
  {
    id: 'class_ii_malocclusion',
    name: 'Class II Malocclusion',
    category: 'Orthognathic',
    cptCodes: ['21141', '21142', '21145', '21146']
  },
  {
    id: 'class_iii_malocclusion',
    name: 'Class III Malocclusion / Prognathism',
    category: 'Orthognathic',
    cptCodes: ['21141', '21142', '21145', '21146', '21188']
  },
  {
    id: 'open_bite',
    name: 'Anterior Open Bite',
    category: 'Orthognathic',
    cptCodes: ['21141', '21142', '21145']
  },
  {
    id: 'maxillary_hypoplasia',
    name: 'Maxillary Hypoplasia',
    category: 'Orthognathic',
    cptCodes: ['21141', '21145', '21146']
  },
  {
    id: 'mandibular_prognathism',
    name: 'Mandibular Prognathism',
    category: 'Orthognathic',
    cptCodes: ['21145', '21146', '21188']
  },
  {
    id: 'asymmetry',
    name: 'Facial Asymmetry',
    category: 'Orthognathic',
    cptCodes: ['21141', '21145', '21146', '21147']
  },

  // TMJ Disorders
  {
    id: 'tmj_ankylosis',
    name: 'TMJ Ankylosis',
    category: 'TMJ',
    cptCodes: ['21050', '21060', '21070']
  },
  {
    id: 'tmj_arthritis',
    name: 'TMJ Arthritis / Degenerative Joint Disease',
    category: 'TMJ',
    cptCodes: ['21010', '21050', '21240', '21242']
  },
  {
    id: 'tmj_disc',
    name: 'TMJ Internal Derangement / Disc Displacement',
    category: 'TMJ',
    cptCodes: ['21010', '21050']
  },

  // Reconstructive
  {
    id: 'mandible_defect',
    name: 'Mandibular Defect / Reconstruction',
    category: 'Reconstructive',
    cptCodes: ['21247', '21248', '21249', '21127']
  },
  {
    id: 'maxilla_defect',
    name: 'Maxillary Defect / Reconstruction',
    category: 'Reconstructive',
    cptCodes: ['21141', '21145', '21210']
  },
  {
    id: 'bone_graft',
    name: 'Bone Graft (Autogenous)',
    category: 'Reconstructive',
    cptCodes: ['21210', '21215', '21127']
  },
  {
    id: 'cleft_palate',
    name: 'Cleft Palate',
    category: 'Reconstructive',
    cptCodes: ['42200', '42205', '42210']
  },

  // Dental/Implant
  {
    id: 'edentulous',
    name: 'Edentulous Ridge / Alveolar Atrophy',
    category: 'Dental Implants',
    cptCodes: ['21210', '21215', '21248', '21249']
  },
  {
    id: 'ridge_augmentation',
    name: 'Alveolar Ridge Augmentation',
    category: 'Dental Implants',
    cptCodes: ['21210', '21215']
  },

  // Soft Tissue
  {
    id: 'facial_laceration',
    name: 'Facial Laceration',
    category: 'Soft Tissue',
    cptCodes: ['12051', '12052', '12053', '12054', '12055', '12056', '12057', '13131', '13132', '13133']
  },
  {
    id: 'parotid_mass',
    name: 'Parotid Gland Mass / Tumor',
    category: 'Soft Tissue',
    cptCodes: ['42410', '42415', '42420', '42425', '42426']
  }
];

/**
 * Get all unique diagnosis categories
 */
export const getDiagnosisCategories = () => {
  const categories = new Set(DIAGNOSES.map(d => d.category));
  return Array.from(categories);
};

/**
 * Search diagnoses by name or category
 */
export const searchDiagnoses = (query) => {
  if (!query || query.trim() === '') return DIAGNOSES;

  const lowerQuery = query.toLowerCase();
  return DIAGNOSES.filter(diagnosis =>
    diagnosis.name.toLowerCase().includes(lowerQuery) ||
    diagnosis.category.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Get CPT codes relevant to a diagnosis
 */
export const getCPTCodesForDiagnosis = (diagnosisText) => {
  if (!diagnosisText || diagnosisText.trim() === '') return null;

  const lowerDiagnosis = diagnosisText.toLowerCase();

  // Try exact match first
  const exactMatch = DIAGNOSES.find(d =>
    d.name.toLowerCase() === lowerDiagnosis
  );

  if (exactMatch) return exactMatch.cptCodes;

  // Try partial match - get ALL matching diagnoses and combine their codes
  const partialMatches = DIAGNOSES.filter(d =>
    d.name.toLowerCase().includes(lowerDiagnosis) ||
    lowerDiagnosis.includes(d.name.toLowerCase()) ||
    d.category.toLowerCase().includes(lowerDiagnosis)
  );

  if (partialMatches.length > 0) {
    // Combine all CPT codes from matching diagnoses and remove duplicates
    const allCodes = partialMatches.flatMap(d => d.cptCodes);
    return [...new Set(allCodes)];
  }

  return null;
};

/**
 * Get diagnosis by ID
 */
export const getDiagnosisById = (id) => {
  return DIAGNOSES.find(d => d.id === id);
};

/**
 * Get all diagnoses for a category
 */
export const getDiagnosesByCategory = (category) => {
  return DIAGNOSES.filter(d => d.category === category);
};
