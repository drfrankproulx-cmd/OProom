import React from 'react';
import { ChecklistItem } from './ChecklistItem';
import { 
  TestTube, 
  Image as ImageIcon, 
  FileText, 
  Stethoscope, 
  Shield, 
  Scan, 
  FileCheck, 
  Target 
} from 'lucide-react';

// Helper function to detect if patient has orthognathic surgery diagnosis
const isOrthognathicCase = (patient) => {
  const diagnosis = (patient.diagnosis || '').toLowerCase();
  const procedures = (patient.procedures || '').toLowerCase();
  
  const orthognathicKeywords = [
    'jaw deformity',
    'orthognathic',
    'mandibular',
    'maxillary',
    'le fort',
    'lefort',
    'bsso',
    'bilateral sagittal',
    'genioplasty',
    'prognathism',
    'retrognathia',
    'open bite',
    'crossbite',
    'facial asymmetry',
    'dentofacial',
    'malocclusion',
    'class ii',
    'class iii',
    'skeletal'
  ];
  
  return orthognathicKeywords.some(keyword => 
    diagnosis.includes(keyword) || procedures.includes(keyword)
  );
};

export const PreOpChecklist = ({ patient, onItemToggle, onItemViewDetails }) => {
  const isOrthognathic = isOrthognathicCase(patient);
  
  const getChecklistData = () => {
    const checklist = patient.prep_checklist || {};
    
    // Standard checklist for all patients
    const standardChecklist = {
      labs: {
        title: 'Laboratory Tests',
        icon: TestTube,
        iconClass: 'labs',
        items: [
          {
            id: 'lab_tests',
            label: 'Complete Blood Count (CBC)',
            completed: checklist.lab_tests || false,
            required: true,
            dueDate: patient.scheduled_date || null,
            hasDocument: false,
            overdue: false
          },
          {
            id: 'lab_metabolic',
            label: 'Basic Metabolic Panel',
            completed: checklist.lab_metabolic || false,
            required: true,
            dueDate: patient.scheduled_date || null,
            hasDocument: false,
            overdue: false
          },
          {
            id: 'lab_coag',
            label: 'Coagulation Studies',
            completed: checklist.lab_coag || false,
            required: false,
            dueDate: patient.scheduled_date || null,
            hasDocument: false,
            overdue: false
          }
        ]
      },
      imaging: {
        title: 'Imaging Studies',
        icon: ImageIcon,
        iconClass: 'imaging',
        items: [
          {
            id: 'xrays',
            label: 'X-rays',
            completed: checklist.xrays || false,
            required: true,
            dueDate: patient.scheduled_date || null,
            hasDocument: checklist.xrays,
            overdue: false
          },
          {
            id: 'ct_scan',
            label: 'CT Scan',
            completed: checklist.ct_scan || false,
            required: false,
            dueDate: patient.scheduled_date || null,
            hasDocument: false,
            overdue: false
          }
        ]
      },
      consent: {
        title: 'Consent & Documentation',
        icon: FileText,
        iconClass: 'consent',
        items: [
          {
            id: 'insurance_approval',
            label: 'Insurance Authorization',
            completed: checklist.insurance_approval || false,
            required: true,
            dueDate: patient.scheduled_date || null,
            hasDocument: checklist.insurance_approval,
            overdue: false
          },
          {
            id: 'surgical_consent',
            label: 'Surgical Consent Form',
            completed: checklist.surgical_consent || false,
            required: true,
            dueDate: patient.scheduled_date || null,
            hasDocument: false,
            overdue: false
          },
          {
            id: 'anesthesia_consent',
            label: 'Anesthesia Consent',
            completed: checklist.anesthesia_consent || false,
            required: true,
            dueDate: patient.scheduled_date || null,
            hasDocument: false,
            overdue: false
          }
        ]
      },
      clearance: {
        title: 'Medical Clearance',
        icon: Stethoscope,
        iconClass: 'clearance',
        items: [
          {
            id: 'medical_optimization',
            label: 'Medical Optimization',
            completed: checklist.medical_optimization || false,
            required: true,
            dueDate: patient.scheduled_date || null,
            hasDocument: false,
            overdue: false
          },
          {
            id: 'cardiology_clearance',
            label: 'Cardiology Clearance',
            completed: checklist.cardiology_clearance || false,
            required: false,
            dueDate: patient.scheduled_date || null,
            hasDocument: false,
            overdue: false
          },
          {
            id: 'anesthesia_eval',
            label: 'Anesthesia Evaluation',
            completed: checklist.anesthesia_eval || false,
            required: true,
            dueDate: patient.scheduled_date || null,
            hasDocument: false,
            overdue: false
          }
        ]
      }
    };
    
    // Additional orthognathic-specific checklist items
    if (isOrthognathic) {
      return {
        // Orthognathic-specific section at the top
        orthognathic: {
          title: 'Orthognathic Surgery Workflow',
          icon: Target,
          iconClass: 'orthognathic',
          isSpecialized: true,
          items: [
            {
              id: 'prior_auth_complete',
              label: 'Prior Authorization Complete',
              completed: checklist.prior_auth_complete || false,
              required: true,
              dueDate: patient.scheduled_date || null,
              hasDocument: checklist.prior_auth_complete,
              overdue: false,
              description: 'Insurance pre-authorization for orthognathic surgery'
            },
            {
              id: 'surgical_records',
              label: 'Surgical Records',
              completed: checklist.surgical_records || false,
              required: true,
              dueDate: patient.scheduled_date || null,
              hasDocument: checklist.surgical_records,
              overdue: false,
              description: 'Cephalometric analysis, dental models, photos'
            },
            {
              id: 'bite_approval',
              label: 'Bite Approval',
              completed: checklist.bite_approval || false,
              required: true,
              dueDate: patient.scheduled_date || null,
              hasDocument: checklist.bite_approval,
              overdue: false,
              description: 'Orthodontist clearance for surgical bite'
            },
            {
              id: 'vsp_complete',
              label: 'VSP (Virtual Surgical Planning)',
              completed: checklist.vsp_complete || false,
              required: true,
              dueDate: patient.scheduled_date || null,
              hasDocument: checklist.vsp_complete,
              overdue: false,
              description: 'Virtual surgical planning session completed'
            }
          ]
        },
        ...standardChecklist
      };
    }
    
    return standardChecklist;
  };

  const checklistSections = getChecklistData();

  const getSectionProgress = (items) => {
    const completed = items.filter(item => item.completed).length;
    const total = items.length;
    return { completed, total };
  };

  return (
    <div className="preop-checklist">
      {isOrthognathic && (
        <div style={{
          background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
          color: 'white',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: 500
        }}>
          <Target size={16} />
          Orthognathic Surgery Case - Additional requirements displayed
        </div>
      )}
      
      {Object.entries(checklistSections).map(([key, section]) => {
        const Icon = section.icon;
        const progress = getSectionProgress(section.items);

        return (
          <div 
            key={key} 
            className={`checklist-section ${section.isSpecialized ? 'specialized-section' : ''}`}
            style={section.isSpecialized ? {
              background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(20, 184, 166, 0.05) 100%)',
              border: '2px solid #14b8a6',
              borderRadius: '0.75rem',
              marginBottom: '1rem'
            } : {}}
          >
            <div className="checklist-section-header">
              <div className={`section-icon ${section.iconClass}`} style={section.isSpecialized ? {
                background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                color: 'white'
              } : {}}>
                <Icon size={18} />
              </div>
              <h3 className="section-title">{section.title}</h3>
              <span className="section-progress" style={section.isSpecialized && progress.completed === progress.total ? {
                background: '#10b981',
                color: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem'
              } : {}}>
                {progress.completed}/{progress.total} Complete
              </span>
            </div>

            <div className="checklist-items">
              {section.items.map(item => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  onToggle={(itemId) => onItemToggle(patient.mrn, itemId)}
                  onViewDetails={onItemViewDetails}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PreOpChecklist;
