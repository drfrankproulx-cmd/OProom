// Task Categories for Oral & Maxillofacial Surgery Workflows
// Each category has a color scheme and list of specific task types

export const taskCategories = {
  imaging: {
    label: 'Imaging',
    icon: '🔬',
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    tasks: [
      'CT Scan (Maxillofacial)',
      'Panoramic X-Ray (Panorex)',
      'PET Scan',
      'MRI',
      'Chest X-Ray',
      'CBCT (Cone Beam CT)',
      'Other Imaging'
    ]
  },
  insurance: {
    label: 'Insurance & Authorization',
    icon: '📋',
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    tasks: [
      'Insurance Prior Authorization',
      'Insurance Verification',
      'Predetermination Letter',
      'Financial Clearance'
    ]
  },
  surgical_planning: {
    label: 'Surgical Planning',
    icon: '🎯',
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-200',
    tasks: [
      'VSP (Virtual Surgical Planning) - KLS Martin',
      'VSP (Virtual Surgical Planning) - Stryker',
      'VSP (Virtual Surgical Planning) - Other',
      'Surgical Splint Fabrication',
      'Model Surgery',
      '3D Printing / Custom Implant Order'
    ]
  },
  labs_medical: {
    label: 'Labs & Medical Optimization',
    icon: '🧪',
    color: 'green',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    borderClass: 'border-green-200',
    tasks: [
      'CBC / BMP / CMP',
      'Coagulation Studies (PT/INR/PTT)',
      'Type & Screen / Crossmatch',
      'HbA1c',
      'Thyroid Panel',
      'Nutritional Labs (Albumin/Prealbumin)',
      'Medical Clearance (Cardiology)',
      'Medical Clearance (Pulmonology)',
      'Medical Clearance (Primary Care)',
      'Anesthesia Pre-Op Evaluation',
      'Other Labs'
    ]
  },
  consents: {
    label: 'Consents & Documentation',
    icon: '📝',
    color: 'orange',
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-700',
    borderClass: 'border-orange-200',
    tasks: [
      'Surgical Consent',
      'Anesthesia Consent',
      'Blood Transfusion Consent',
      'Informed Consent Discussion',
      'H&P (History & Physical)',
      'Dictation / Op Note'
    ]
  },
  patient_coordination: {
    label: 'Patient Coordination',
    icon: '👤',
    color: 'teal',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-700',
    borderClass: 'border-teal-200',
    tasks: [
      'Schedule Pre-Op Appointment',
      'Schedule Post-Op Follow-Up',
      'Patient Phone Call',
      'Pharmacy / Medication Prior Auth',
      'DME Order (Hardware, Splints)',
      'Dietary / Nutrition Consult',
      'Social Work Consult',
      'Interpreter Services'
    ]
  },
  other: {
    label: 'Other',
    icon: '📌',
    color: 'gray',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-700',
    borderClass: 'border-gray-200',
    tasks: [
      'Custom Task (free text)'
    ]
  }
};

// Get category info by key
export const getCategoryInfo = (categoryKey) => {
  return taskCategories[categoryKey] || taskCategories.other;
};

// Get category by task type (for existing tasks without category)
export const getCategoryByTaskType = (taskType) => {
  for (const [key, category] of Object.entries(taskCategories)) {
    if (category.tasks.includes(taskType)) {
      return { key, ...category };
    }
  }
  return { key: 'other', ...taskCategories.other };
};

// Get all categories as array for dropdown
export const getCategoriesArray = () => {
  return Object.entries(taskCategories).map(([key, value]) => ({
    key,
    ...value
  }));
};

// Color mapping for badges
export const categoryColors = {
  imaging: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  insurance: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  surgical_planning: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  labs_medical: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  consents: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  patient_coordination: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
  other: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' }
};

export default taskCategories;
