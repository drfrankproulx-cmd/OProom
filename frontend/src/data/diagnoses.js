/**
 * Diagnosis/ICD Code Database
 * Maps common maxillofacial and oral surgery diagnoses to ICD-10 codes and relevant CPT codes
 */

export const DIAGNOSES = [
  // ==================== TRAUMA ====================
  {
    id: 'trauma_angle_open',
    name: 'Fracture angle, open, initial encounter',
    icdCode: 'S02.65xB',
    category: 'Trauma',
    cptCodes: ['21470', '21462', '21465']
  },
  {
    id: 'trauma_angle_nonunion',
    name: 'Fracture angle, non union, subsequent encounter',
    icdCode: 'S02.65xK',
    category: 'Trauma',
    cptCodes: ['21470', '21462', '21465']
  },
  {
    id: 'trauma_subcondylar',
    name: 'Fracture subcondylar, closed, initial encounter',
    icdCode: 'S02.62xA',
    category: 'Trauma',
    cptCodes: ['21465', '21485', '21490']
  },
  {
    id: 'trauma_symphysis_open',
    name: 'Fracture symphysis, open, initial encounter',
    icdCode: 'S02.66xB',
    category: 'Trauma',
    cptCodes: ['21470', '21462', '21421']
  },
  {
    id: 'trauma_symphysis_nonunion',
    name: 'Fracture symphysis, non union, subsequent encounter',
    icdCode: 'S02.66xK',
    category: 'Trauma',
    cptCodes: ['21470', '21462', '21421']
  },
  {
    id: 'trauma_body_open',
    name: 'Fracture of body, open, initial encounter',
    icdCode: 'S02.60B',
    category: 'Trauma',
    cptCodes: ['21470', '21462', '21465', '21310']
  },
  {
    id: 'trauma_body_nonunion',
    name: 'Fracture of body, nonunion, subsequent encounter',
    icdCode: 'S02.60K',
    category: 'Trauma',
    cptCodes: ['21470', '21462', '21465', '21310']
  },
  {
    id: 'trauma_zygomatic',
    name: 'Fracture zygomatic, closed, initial encounter',
    icdCode: 'S02.402A',
    category: 'Trauma',
    cptCodes: ['21365', '21366', '21385']
  },
  {
    id: 'trauma_orbital_floor',
    name: 'Fracture orbital floor, closed, initial encounter',
    icdCode: 'S02.3xxA',
    category: 'Trauma',
    cptCodes: ['21385', '21386', '21387', '21390']
  },
  {
    id: 'trauma_lefort_i',
    name: 'Fracture LeFort I, closed, initial encounter',
    icdCode: 'S02.411A',
    category: 'Trauma',
    cptCodes: ['21421', '21422', '21423']
  },

  // ==================== HEAD & NECK (H&N) ====================
  {
    id: 'hn_tongue_anterior',
    name: 'Malignancy Anterior 2/3 tongue',
    icdCode: 'C02.3',
    category: 'H&N Oncology',
    cptCodes: ['41135', '41140', '41145', '41153']
  },
  {
    id: 'hn_tongue_overlapping',
    name: 'Malignancy Overlapping sites of tongue',
    icdCode: 'C02.8',
    category: 'H&N Oncology',
    cptCodes: ['41135', '41140', '41145', '41153']
  },
  {
    id: 'hn_tongue_ventral',
    name: 'Malignancy Ventral Surface of tongue',
    icdCode: 'C02.2',
    category: 'H&N Oncology',
    cptCodes: ['41135', '41140', '41145']
  },
  {
    id: 'hn_lip',
    name: 'Malignancy lip',
    icdCode: 'C00.9',
    category: 'H&N Oncology',
    cptCodes: ['40510', '40520', '40525', '40530']
  },
  {
    id: 'hn_floor_mouth',
    name: 'Malignancy floor of mouth',
    icdCode: 'C04.9',
    category: 'H&N Oncology',
    cptCodes: ['41116', '41120', '41130']
  },
  {
    id: 'hn_upper_gum',
    name: 'Malignancy upper gum',
    icdCode: 'C03.0',
    category: 'H&N Oncology',
    cptCodes: ['41825', '41827', '21040', '21046']
  },
  {
    id: 'hn_lower_gum',
    name: 'Malignancy lower gum',
    icdCode: 'C03.1',
    category: 'H&N Oncology',
    cptCodes: ['41825', '41827', '21040', '21047']
  },
  {
    id: 'hn_mandible',
    name: 'Malignancy mandible',
    icdCode: 'C41.1',
    category: 'H&N Oncology',
    cptCodes: ['21040', '21044', '21045', '21047', '21247']
  },
  {
    id: 'hn_cheek',
    name: 'Malignancy cheek',
    icdCode: 'C06.0',
    category: 'H&N Oncology',
    cptCodes: ['40810', '40812', '40814', '40816']
  },
  {
    id: 'hn_hard_palate',
    name: 'Malignancy hard palate',
    icdCode: 'C05.0',
    category: 'H&N Oncology',
    cptCodes: ['42104', '42106', '42120', '21032']
  },
  {
    id: 'hn_vestibule',
    name: 'Malignancy vestibule of mouth',
    icdCode: 'C06.1',
    category: 'H&N Oncology',
    cptCodes: ['40808', '40810', '40812']
  },
  {
    id: 'hn_retromolar',
    name: 'Malignancy retromolar',
    icdCode: 'C06.2',
    category: 'H&N Oncology',
    cptCodes: ['41116', '41130', '21040']
  },
  {
    id: 'hn_dysplasia',
    name: 'Oral Dysplasia',
    icdCode: 'K13.21',
    category: 'H&N Oncology',
    cptCodes: ['40808', '40810', '40812']
  },
  {
    id: 'hn_benign_mandible',
    name: 'Benign mandible',
    icdCode: 'D16.5',
    category: 'H&N Oncology',
    cptCodes: ['21040', '21044', '21025']
  },
  {
    id: 'hn_benign_maxilla',
    name: 'Benign maxilla',
    icdCode: 'D16.4',
    category: 'H&N Oncology',
    cptCodes: ['21030', '21032', '21034']
  },
  {
    id: 'hn_benign_parotid',
    name: 'Benign parotid',
    icdCode: 'D11.0',
    category: 'H&N Oncology',
    cptCodes: ['42410', '42415', '42420']
  },
  {
    id: 'hn_malignant_parotid',
    name: 'Malignant parotid',
    icdCode: 'C08.9',
    category: 'H&N Oncology',
    cptCodes: ['42420', '42425', '42426']
  },
  {
    id: 'hn_osteomyelitis',
    name: 'Osteomyelitis of Jaw',
    icdCode: 'M27.2',
    category: 'H&N Oncology',
    cptCodes: ['21025', '21026', '21040']
  },
  {
    id: 'hn_orn',
    name: 'ORN (Osteoradionecrosis)',
    icdCode: 'M27.2',
    category: 'H&N Oncology',
    cptCodes: ['21025', '21026', '21040', '21247']
  },
  {
    id: 'hn_mronj',
    name: 'MRONJ (Medication-Related Osteonecrosis of the Jaw)',
    icdCode: 'M87.180',
    category: 'H&N Oncology',
    cptCodes: ['21025', '21026', '21040']
  },
  {
    id: 'hn_history_oral_cancer',
    name: 'History of Oral Cancer',
    icdCode: 'Z85.818',
    category: 'H&N Oncology',
    cptCodes: []
  },

  // ==================== TMJ ====================
  {
    id: 'tmj_osteoarthritis',
    name: 'Osteoarthritis / degenerative joint disease',
    icdCode: 'M19.91',
    category: 'TMJ',
    cptCodes: ['21010', '21050', '21240', '21242']
  },
  {
    id: 'tmj_sounds',
    name: 'TMJ sounds on opening / closing jaw',
    icdCode: 'M26.69',
    category: 'TMJ',
    cptCodes: ['21010', '21050']
  },
  {
    id: 'tmj_internal_derangement',
    name: 'Internal derangement of temporomandibular joint',
    icdCode: 'M26.633',
    category: 'TMJ',
    cptCodes: ['21010', '21050']
  },
  {
    id: 'tmj_disc_disorder',
    name: 'TMJ articular disc disorder / dislocation',
    icdCode: 'M26.633',
    category: 'TMJ',
    cptCodes: ['21010', '21050']
  },
  {
    id: 'tmj_arthralgia',
    name: 'Arthralgia (joint pain)',
    icdCode: 'M26.623',
    category: 'TMJ',
    cptCodes: ['21010', '21050']
  },
  {
    id: 'tmj_ankylosis',
    name: 'Temporomandibular joint adhesions / ankylosis',
    icdCode: 'M26.613',
    category: 'TMJ',
    cptCodes: ['21050', '21060', '21070']
  },
  {
    id: 'tmj_rheumatoid',
    name: 'Rheumatoid arthritis',
    icdCode: 'M06.9',
    category: 'TMJ',
    cptCodes: ['21010', '21050', '21240']
  },
  {
    id: 'tmj_capsulitis',
    name: 'Temporomandibular joint capsulitis',
    icdCode: 'M77.8',
    category: 'TMJ',
    cptCodes: ['21010', '21050']
  },
  {
    id: 'tmj_myalgia',
    name: 'Myalgia (muscle pain)',
    icdCode: 'M79.1',
    category: 'TMJ',
    cptCodes: ['21010']
  },
  {
    id: 'tmj_dystonia',
    name: 'Muscle dystonia',
    icdCode: 'M62.838',
    category: 'TMJ',
    cptCodes: ['21010']
  },
  {
    id: 'tmj_spasm',
    name: 'Muscle spasm',
    icdCode: 'M62.838',
    category: 'TMJ',
    cptCodes: ['21010']
  },
  {
    id: 'tmj_tendinitis',
    name: 'Temporalis tendinitis',
    icdCode: 'M77.8',
    category: 'TMJ',
    cptCodes: ['21010']
  },
  {
    id: 'tmj_bruxism',
    name: 'Bruxism',
    icdCode: 'F45.8',
    category: 'TMJ',
    cptCodes: []
  },
  {
    id: 'tmj_headache_facial_pain',
    name: 'Headache / facial pain',
    icdCode: 'G44.209',
    category: 'TMJ',
    cptCodes: ['21010']
  },

  // ==================== ORTHOGNATHIC ====================
  {
    id: 'ortho_max_hypoplasia',
    name: 'Maxillary hypoplasia',
    icdCode: 'M26.02',
    category: 'Orthognathic',
    cptCodes: ['21141', '21145', '21146']
  },
  {
    id: 'ortho_max_transverse',
    name: 'Maxillary transverse deficiency',
    icdCode: 'M26.09',
    category: 'Orthognathic',
    cptCodes: ['21141', '21145', '21146', '21147']
  },
  {
    id: 'ortho_max_posterior_excess',
    name: 'Maxillary posterior vertical excess',
    icdCode: 'M26.01',
    category: 'Orthognathic',
    cptCodes: ['21141', '21145', '21146']
  },
  {
    id: 'ortho_max_vertical_excess',
    name: 'Maxillary vertical excess',
    icdCode: 'M26.01',
    category: 'Orthognathic',
    cptCodes: ['21141', '21145', '21146']
  },
  {
    id: 'ortho_max_asymmetry',
    name: 'Maxillary asymmetry',
    icdCode: 'M26.11',
    category: 'Orthognathic',
    cptCodes: ['21141', '21145', '21146', '21147']
  },
  {
    id: 'ortho_occlusal_canted',
    name: 'Maxillary occlusal plane canted',
    icdCode: 'M26.11',
    category: 'Orthognathic',
    cptCodes: ['21141', '21145', '21146']
  },
  {
    id: 'ortho_apertognathia',
    name: 'Apertognathia',
    icdCode: 'M26.220',
    category: 'Orthognathic',
    cptCodes: ['21141', '21145', '21146']
  },
  {
    id: 'ortho_mand_hypoplasia',
    name: 'Mandibular hypoplasia',
    icdCode: 'M26.04',
    category: 'Orthognathic',
    cptCodes: ['21141', '21142', '21143', '21194', '21195', '21196']
  },
  {
    id: 'ortho_mand_hyperplasia',
    name: 'Mandibular hyperplasia',
    icdCode: 'M26.03',
    category: 'Orthognathic',
    cptCodes: ['21145', '21146', '21188', '21193']
  },
  {
    id: 'ortho_mand_asymmetry',
    name: 'Mandibular asymmetry',
    icdCode: 'M26.12',
    category: 'Orthognathic',
    cptCodes: ['21141', '21145', '21146', '21147']
  },
  {
    id: 'ortho_hemimand_hyperplasia',
    name: 'Hemimandibular hyperplasia',
    icdCode: 'M26.12',
    category: 'Orthognathic',
    cptCodes: ['21145', '21146', '21193']
  },
  {
    id: 'ortho_congenital_asymmetry',
    name: 'Congenital facial asymmetry',
    icdCode: 'Q67.0',
    category: 'Orthognathic',
    cptCodes: ['21141', '21145', '21146', '21147']
  },
  {
    id: 'ortho_microgenia',
    name: 'Microgenia',
    icdCode: 'M26.05',
    category: 'Orthognathic',
    cptCodes: ['21120', '21121', '21122', '21123']
  },
  {
    id: 'ortho_macrogenia',
    name: 'Macrogenia',
    icdCode: 'M26.06',
    category: 'Orthognathic',
    cptCodes: ['21120', '21121', '21122', '21123']
  },
  {
    id: 'ortho_malocclusion',
    name: 'Malocclusion',
    icdCode: 'M26.4',
    category: 'Orthognathic',
    cptCodes: ['21141', '21142', '21145', '21146']
  },
  {
    id: 'ortho_class_ii',
    name: 'Class II malocclusion',
    icdCode: 'M26.212',
    category: 'Orthognathic',
    cptCodes: ['21141', '21142', '21145', '21146']
  },
  {
    id: 'ortho_class_ii_deep',
    name: 'Class II deep bite malocclusion',
    icdCode: 'M26.212',
    category: 'Orthognathic',
    cptCodes: ['21141', '21142', '21145', '21146']
  },
  {
    id: 'ortho_class_ii_open',
    name: 'Class II open bite malocclusion',
    icdCode: 'M26.212',
    category: 'Orthognathic',
    cptCodes: ['21141', '21142', '21145', '21146']
  },
  {
    id: 'ortho_class_ii_asymmetric',
    name: 'Class II asymmetric malocclusion',
    icdCode: 'M26.212',
    category: 'Orthognathic',
    cptCodes: ['21141', '21142', '21145', '21146', '21147']
  },
  {
    id: 'ortho_class_ii_compensated',
    name: 'Compensated Class II malocclusion',
    icdCode: 'M26.216',
    category: 'Orthognathic',
    cptCodes: ['21141', '21142', '21145', '21146']
  },
  {
    id: 'ortho_class_iii',
    name: 'Class III malocclusion',
    icdCode: 'M26.213',
    category: 'Orthognathic',
    cptCodes: ['21141', '21142', '21145', '21146', '21188']
  },
  {
    id: 'ortho_class_iii_deep',
    name: 'Class III deep bite malocclusion',
    icdCode: 'M26.213',
    category: 'Orthognathic',
    cptCodes: ['21141', '21142', '21145', '21146', '21188']
  },
  {
    id: 'ortho_class_iii_open',
    name: 'Class III open bite malocclusion',
    icdCode: 'M26.213',
    category: 'Orthognathic',
    cptCodes: ['21141', '21142', '21145', '21146', '21188']
  },
  {
    id: 'ortho_class_iii_asymmetric',
    name: 'Class III asymmetric malocclusion',
    icdCode: 'M26.213',
    category: 'Orthognathic',
    cptCodes: ['21141', '21142', '21145', '21146', '21147', '21188']
  },
  {
    id: 'ortho_class_iii_compensated',
    name: 'Compensated Class III malocclusion',
    icdCode: 'M26.213',
    category: 'Orthognathic',
    cptCodes: ['21141', '21142', '21145', '21146', '21188']
  },
  {
    id: 'ortho_anterior_open_bite',
    name: 'Anterior open bite malocclusion',
    icdCode: 'M26.220',
    category: 'Orthognathic',
    cptCodes: ['21141', '21142', '21145']
  },
  {
    id: 'ortho_posterior_open_bite',
    name: 'Posterior open bite malocclusion',
    icdCode: 'M26.221',
    category: 'Orthognathic',
    cptCodes: ['21141', '21145']
  },
  {
    id: 'ortho_deep_bite',
    name: 'Deep bite malocclusion',
    icdCode: 'M26.23',
    category: 'Orthognathic',
    cptCodes: ['21141', '21145', '21146']
  },
  {
    id: 'ortho_abnormal_jaw_closure',
    name: 'Abnormal jaw closure',
    icdCode: 'M26.51',
    category: 'Orthognathic',
    cptCodes: ['21141', '21145']
  },
  {
    id: 'ortho_crowding',
    name: 'Crowding',
    icdCode: 'M26.31',
    category: 'Orthognathic',
    cptCodes: []
  },
  {
    id: 'ortho_excessive_spacing',
    name: 'Excessive spacing of teeth',
    icdCode: 'M26.32',
    category: 'Orthognathic',
    cptCodes: []
  },
  {
    id: 'ortho_tooth_positioning',
    name: 'Anomalies of tooth positioning',
    icdCode: 'M26.39',
    category: 'Orthognathic',
    cptCodes: []
  },
  {
    id: 'ortho_masticatory_dysfunction',
    name: 'Masticatory dysfunction',
    icdCode: 'R13.11',
    category: 'Orthognathic',
    cptCodes: ['21141', '21145']
  },
  {
    id: 'ortho_anterior_impingement',
    name: 'Anterior soft tissue impingement',
    icdCode: 'M26.81',
    category: 'Orthognathic',
    cptCodes: ['21141', '21145']
  },
  {
    id: 'ortho_posterior_impingement',
    name: 'Posterior soft tissue impingement (cheek biting)',
    icdCode: 'M26.82',
    category: 'Orthognathic',
    cptCodes: ['21141', '21145']
  },
  {
    id: 'ortho_dysphagia',
    name: 'Dysphagia / difficulty swallowing',
    icdCode: 'R13.10',
    category: 'Orthognathic',
    cptCodes: []
  },
  {
    id: 'ortho_speech_concerns',
    name: 'Speech and articulation concerns',
    icdCode: 'R47.89',
    category: 'Orthognathic',
    cptCodes: []
  },
  {
    id: 'ortho_osa',
    name: 'Obstructive sleep apnea (OSA)',
    icdCode: 'G47.33',
    category: 'Orthognathic',
    cptCodes: ['21141', '21145', '21146', '21199']
  },

  // ==================== CLEFT & CRANIOFACIAL ====================
  {
    id: 'cleft_lip',
    name: 'Cleft lip',
    icdCode: 'Z87.790',
    category: 'Cleft & Craniofacial',
    cptCodes: ['40700', '40701', '40702', '40720', '40761']
  },
  {
    id: 'cleft_palate',
    name: 'Cleft palate',
    icdCode: 'Z87.790',
    category: 'Cleft & Craniofacial',
    cptCodes: ['42200', '42205', '42210', '42215', '42220', '42225']
  },
  {
    id: 'cleft_lip_palate',
    name: 'Cleft lip and palate',
    icdCode: 'Z87.790',
    category: 'Cleft & Craniofacial',
    cptCodes: ['40700', '40701', '42200', '42205', '42210']
  },

  // ==================== COSMETICS ====================
  {
    id: 'cosmetic_deviated_septum',
    name: 'Deviated nasal septum',
    icdCode: 'J34.2',
    category: 'Cosmetics',
    cptCodes: ['30520', '30540', '30545']
  },
  {
    id: 'cosmetic_turbinate_hypertrophy',
    name: 'Hypertrophy of nasal turbinates',
    icdCode: 'J34.3',
    category: 'Cosmetics',
    cptCodes: ['30130', '30140']
  },
  {
    id: 'cosmetic_nasal_deformity',
    name: 'Nasal deformity',
    icdCode: 'M95',
    category: 'Cosmetics',
    cptCodes: ['30400', '30410', '30420', '30430']
  },

  // ==================== LEGACY ENTRIES (kept for backwards compatibility) ====================
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
    id: 'mandible_defect',
    name: 'Mandibular Defect / Reconstruction',
    category: 'Reconstructive',
    cptCodes: ['21247', '21248', '21249', '21127']
  },
  {
    id: 'bone_graft',
    name: 'Bone Graft (Autogenous)',
    category: 'Reconstructive',
    cptCodes: ['21210', '21215', '21127']
  },
  {
    id: 'edentulous',
    name: 'Edentulous Ridge / Alveolar Atrophy',
    category: 'Dental Implants',
    cptCodes: ['21210', '21215', '21248', '21249']
  },
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
 * Search diagnoses by name, category, or ICD code
 */
export const searchDiagnoses = (query) => {
  if (!query || query.trim() === '') return DIAGNOSES;

  const lowerQuery = query.toLowerCase();
  return DIAGNOSES.filter(diagnosis =>
    diagnosis.name.toLowerCase().includes(lowerQuery) ||
    diagnosis.category.toLowerCase().includes(lowerQuery) ||
    (diagnosis.icdCode && diagnosis.icdCode.toLowerCase().includes(lowerQuery))
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

/**
 * Get diagnosis by ICD code
 */
export const getDiagnosisByICD = (icdCode) => {
  return DIAGNOSES.filter(d => d.icdCode === icdCode);
};
