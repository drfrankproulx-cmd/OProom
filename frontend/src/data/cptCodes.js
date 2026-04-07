/**
 * CPT Code data layer.
 * Primary data is loaded from the backend JSON (/api/cpt-codes/all).
 * Falls back to a minimal hardcoded set if the API is unavailable.
 */
import { getToken } from '../utils/auth';


const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Runtime cache
let _categorizedData = null;
let _flatCodes = null;
let _loadPromise = null;

/**
 * Load all CPT codes from the backend (cached).
 * Returns { categories: [...], metadata: {...} }
 */
export async function loadCPTCodes() {
  if (_categorizedData) return _categorizedData;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/cpt-codes/all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      _categorizedData = await res.json();
      // Build flat index
      _flatCodes = [];
      for (const cat of _categorizedData.categories || []) {
        for (const c of cat.codes || []) {
          _flatCodes.push({ ...c, category: cat.name });
        }
      }
      return _categorizedData;
    } catch (e) {
      return FALLBACK_DATA;
    }
  })();
  return _loadPromise;
}

/**
 * Get the flat list of all CPT codes.
 * Loads from API if not yet cached.
 */
export async function getAllCPTCodesFlat() {
  await loadCPTCodes();
  return _flatCodes || FALLBACK_FLAT;
}

/**
 * Search CPT codes (local, instant).
 * Returns array sorted by relevance: exact code match > common_name > description.
 * Results are grouped by category.
 */
export function searchCPTCodes(query, diagnosis) {
  const codes = _flatCodes || FALLBACK_FLAT;
  if (!query && !diagnosis) return codes.slice(0, 30);

  const q = (query || '').toLowerCase().trim();
  const diag = (diagnosis || '').toLowerCase().trim();

  // If no query but diagnosis, filter by diagnosis-relevant category
  if (!q && diag) {
    const relevantCat = getDiagnosisCategory(diag);
    if (relevantCat) {
      return codes.filter(c => c.category === relevantCat);
    }
    return codes.slice(0, 30);
  }

  // Score-based search
  const scored = [];
  for (const c of codes) {
    let score = 0;
    const code = c.code.toLowerCase();
    const common = (c.common_name || '').toLowerCase();
    const desc = (c.description || '').toLowerCase();
    const subcat = (c.subcategory || '').toLowerCase();

    if (code === q) score = 100;
    else if (code.startsWith(q)) score = 80;
    else if (common.includes(q)) score = 60;
    else if (subcat.includes(q)) score = 40;
    else if (desc.includes(q)) score = 30;
    else if (code.includes(q)) score = 20;
    else continue;

    // Boost favorites
    if (c.isFavorite) score += 5;
    // Boost if matches diagnosis category
    if (diag) {
      const relevantCat = getDiagnosisCategory(diag);
      if (relevantCat && c.category === relevantCat) score += 10;
    }
    scored.push({ ...c, _score: score });
  }

  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, 30);
}

/**
 * Get relevant CPT codes for a given diagnosis.
 * Returns code strings only (for backward compat).
 */
export function getRelevantCPTCodes(diagnosis) {
  if (!diagnosis) return [];
  const codes = _flatCodes || FALLBACK_FLAT;
  const cat = getDiagnosisCategory(diagnosis.toLowerCase());
  if (!cat) return [];
  return codes.filter(c => c.category === cat).map(c => c.code);
}

/**
 * Get favorite CPT codes.
 */
export function getFavoriteCPTCodes() {
  const codes = _flatCodes || FALLBACK_FLAT;
  return codes.filter(c => c.isFavorite);
}

/**
 * Find a CPT code by its code string.
 */
export function getCPTCodeByCode(code) {
  const codes = _flatCodes || FALLBACK_FLAT;
  return codes.find(c => c.code === code) || null;
}

/**
 * Map diagnosis keywords to category names.
 */
function getDiagnosisCategory(diag) {
  const map = {
    'mandible fracture': 'Trauma', 'mandibular fracture': 'Trauma',
    'jaw fracture': 'Trauma', 'zmc': 'Trauma', 'zygomatic': 'Trauma',
    'orbital fracture': 'Trauma', 'lefort': 'Trauma', 'noe': 'Trauma',
    'nasal fracture': 'Trauma', 'condyle': 'Trauma', 'panfacial': 'Trauma',
    'malocclusion': 'Orthognathic Surgery', 'prognathism': 'Orthognathic Surgery',
    'retrognathia': 'Orthognathic Surgery', 'micrognathia': 'Orthognathic Surgery',
    'orthognathic': 'Orthognathic Surgery', 'open bite': 'Orthognathic Surgery',
    'abscess': 'Odontogenic Infections', 'infection': 'Odontogenic Infections',
    'cellulitis': 'Odontogenic Infections', 'ludwig': 'Odontogenic Infections',
    'cancer': 'Oncology & Ablative', 'tumor': 'Oncology & Ablative',
    'carcinoma': 'Oncology & Ablative', 'scc': 'Oncology & Ablative',
    'ameloblastoma': 'Oncology & Ablative',
    'reconstruction': 'Reconstruction & Free Flaps', 'free flap': 'Reconstruction & Free Flaps',
    'fibula': 'Reconstruction & Free Flaps',
    'biopsy': 'Pathology', 'lesion': 'Pathology', 'cyst': 'Pathology',
    'tmj': 'TMJ', 'temporomandibular': 'TMJ', 'ankylosis': 'TMJ',
    'cleft': 'Cleft & Craniofacial',
    'implant': 'Implants & Preprosthetic', 'sinus lift': 'Implants & Preprosthetic',
    'extraction': 'Dentoalveolar Surgery', 'impacted': 'Dentoalveolar Surgery',
    'torus': 'Dentoalveolar Surgery', 'wisdom': 'Dentoalveolar Surgery',
  };
  for (const [kw, cat] of Object.entries(map)) {
    if (diag.includes(kw)) return cat;
  }
  return null;
}

// ============================================================
// Minimal hardcoded fallback (used if API fails)
// ============================================================
const FALLBACK_FLAT = [
  { code: '21462', description: 'Open treatment of mandibular fracture with interdental fixation', common_name: 'ORIF mandible + IMF', category: 'Trauma', subcategory: 'Mandible Fractures', isFavorite: true },
  { code: '21196', description: 'Reconstruction mandibular rami, sagittal split; with internal rigid fixation', common_name: 'BSSO with fixation', category: 'Orthognathic Surgery', subcategory: 'BSSO', isFavorite: true },
  { code: '21141', description: 'Reconstruction midface, Le Fort I; single piece, without bone graft', common_name: 'Le Fort I 1-piece no graft', category: 'Orthognathic Surgery', subcategory: 'Le Fort I', isFavorite: true },
  { code: '21121', description: 'Genioplasty; sliding osteotomy, single piece', common_name: 'Sliding genioplasty', category: 'Orthognathic Surgery', subcategory: 'Genioplasty', isFavorite: true },
  { code: '20969', description: 'Free osteocutaneous flap with microvascular anastomosis', common_name: 'Fibula free flap', category: 'Reconstruction & Free Flaps', subcategory: 'Free Flaps', isFavorite: true },
  { code: '21044', description: 'Excision of malignant tumor of mandible', common_name: 'Marginal mandibulectomy', category: 'Oncology & Ablative', subcategory: 'Mandible Tumor', isFavorite: true },
  { code: '38724', description: 'Cervical lymphadenectomy (modified radical neck dissection)', common_name: 'Modified radical neck dissection', category: 'Oncology & Ablative', subcategory: 'Neck Dissection', isFavorite: true },
  { code: '31600', description: 'Tracheostomy, planned', common_name: 'Tracheostomy (planned)', category: 'Complex Case & Supportive', subcategory: 'Airway', isFavorite: false },
];

const FALLBACK_DATA = { categories: [{ name: 'Favorites', codes: FALLBACK_FLAT }], metadata: { total_codes: FALLBACK_FLAT.length } };

// Legacy export for backward compatibility
export const CPT_CODES = _flatCodes || FALLBACK_FLAT;

export default { searchCPTCodes, getFavoriteCPTCodes, getRelevantCPTCodes, getCPTCodeByCode, loadCPTCodes };
