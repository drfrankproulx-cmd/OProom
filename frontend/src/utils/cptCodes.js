// Common Orthopedic CPT Codes Reference
// This would typically be populated from the uploaded PDFs
// Using standard orthopedic surgery CPT codes as reference

export const CPT_CODES = [
  // Hip & Pelvis
  { code: '27130', description: 'Total hip arthroplasty', category: 'Hip/Pelvis' },
  { code: '27132', description: 'Hip arthroplasty, conversion', category: 'Hip/Pelvis' },
  { code: '27134', description: 'Hip revision, femoral component', category: 'Hip/Pelvis' },
  { code: '27137', description: 'Hip revision, acetabular component', category: 'Hip/Pelvis' },
  { code: '27125', description: 'Hemiarthroplasty, hip', category: 'Hip/Pelvis' },
  { code: '27244', description: 'Treatment femoral fracture, intramedullary', category: 'Hip/Pelvis' },
  { code: '27245', description: 'Treatment femoral shaft fracture, open', category: 'Hip/Pelvis' },
  
  // Knee
  { code: '27447', description: 'Total knee arthroplasty', category: 'Knee' },
  { code: '27486', description: 'Knee revision arthroplasty', category: 'Knee' },
  { code: '29881', description: 'Arthroscopy, knee, meniscectomy', category: 'Knee' },
  { code: '29882', description: 'Arthroscopy, knee, meniscus repair', category: 'Knee' },
  { code: '29888', description: 'Arthroscopy, knee, ACL repair', category: 'Knee' },
  { code: '27506', description: 'Open treatment tibial fracture', category: 'Knee' },
  { code: '27792', description: 'Open treatment ankle fracture', category: 'Ankle/Foot' },
  
  // Shoulder
  { code: '23472', description: 'Total shoulder arthroplasty', category: 'Shoulder' },
  { code: '23473', description: 'Reverse total shoulder arthroplasty', category: 'Shoulder' },
  { code: '23412', description: 'Rotator cuff repair', category: 'Shoulder' },
  { code: '29827', description: 'Arthroscopy, shoulder, decompression', category: 'Shoulder' },
  { code: '29806', description: 'Arthroscopy, shoulder, capsulorrhaphy', category: 'Shoulder' },
  { code: '23430', description: 'Tenodesis biceps, long head', category: 'Shoulder' },
  
  // Spine
  { code: '22630', description: 'Lumbar arthrodesis, posterior', category: 'Spine' },
  { code: '22633', description: 'Lumbar arthrodesis, combined', category: 'Spine' },
  { code: '63030', description: 'Laminectomy, lumbar', category: 'Spine' },
  { code: '63047', description: 'Laminectomy, lumbar, single level', category: 'Spine' },
  { code: '22840', description: 'Instrumentation, spinal, posterior', category: 'Spine' },
  { code: '22851', description: 'Spinal prosthetic device, lumbar', category: 'Spine' },
  
  // Hand & Wrist
  { code: '25447', description: 'Arthroplasty, wrist', category: 'Hand/Wrist' },
  { code: '64721', description: 'Carpal tunnel release', category: 'Hand/Wrist' },
  { code: '26055', description: 'Trigger finger release', category: 'Hand/Wrist' },
  { code: '25607', description: 'Open treatment radius fracture', category: 'Hand/Wrist' },
  
  // Elbow
  { code: '24361', description: 'Arthroplasty, elbow, with implant', category: 'Elbow' },
  { code: '24362', description: 'Total elbow arthroplasty', category: 'Elbow' },
  { code: '29837', description: 'Arthroscopy, elbow, debridement', category: 'Elbow' },
  
  // Ankle & Foot
  { code: '27702', description: 'Arthroplasty, ankle', category: 'Ankle/Foot' },
  { code: '28725', description: 'Arthrodesis, subtalar', category: 'Ankle/Foot' },
  { code: '28730', description: 'Arthrodesis, ankle', category: 'Ankle/Foot' },
  { code: '28292', description: 'Bunionectomy with osteotomy', category: 'Ankle/Foot' },
  
  // General/Other
  { code: '20680', description: 'Removal hardware, deep', category: 'General' },
  { code: '20902', description: 'Bone graft, autograft', category: 'General' },
  { code: '20936', description: 'Bone graft, vascularized', category: 'General' },
];

export const searchCPTCodes = (query) => {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  
  return CPT_CODES.filter(cpt => 
    cpt.code.includes(query) ||
    cpt.description.toLowerCase().includes(lowerQuery) ||
    cpt.category.toLowerCase().includes(lowerQuery)
  ).slice(0, 10); // Limit to 10 results
};

export const getCPTByCode = (code) => {
  return CPT_CODES.find(cpt => cpt.code === code);
};

export const getCPTCategories = () => {
  return [...new Set(CPT_CODES.map(cpt => cpt.category))];
};
