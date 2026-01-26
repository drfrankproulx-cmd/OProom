import React from 'react';
import { ChecklistItem } from './ChecklistItem';
import { TestTube, Image as ImageIcon, FileText, Stethoscope } from 'lucide-react';

export const PreOpChecklist = ({ patient, onItemToggle, onItemViewDetails }) => {
  const getChecklistData = () => {
    const checklist = patient.prep_checklist || {};

    return {
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
            completed: false,
            required: true,
            dueDate: patient.scheduled_date || null,
            hasDocument: false,
            overdue: false
          },
          {
            id: 'lab_coag',
            label: 'Coagulation Studies',
            completed: false,
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
            completed: false,
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
            completed: false,
            required: true,
            dueDate: patient.scheduled_date || null,
            hasDocument: false,
            overdue: false
          },
          {
            id: 'anesthesia_consent',
            label: 'Anesthesia Consent',
            completed: false,
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
            completed: false,
            required: false,
            dueDate: patient.scheduled_date || null,
            hasDocument: false,
            overdue: false
          },
          {
            id: 'anesthesia_eval',
            label: 'Anesthesia Evaluation',
            completed: false,
            required: true,
            dueDate: patient.scheduled_date || null,
            hasDocument: false,
            overdue: false
          }
        ]
      }
    };
  };

  const checklistSections = getChecklistData();

  const getSectionProgress = (items) => {
    const completed = items.filter(item => item.completed).length;
    const total = items.length;
    return { completed, total };
  };

  return (
    <div className="preop-checklist">
      {Object.entries(checklistSections).map(([key, section]) => {
        const Icon = section.icon;
        const progress = getSectionProgress(section.items);

        return (
          <div key={key} className="checklist-section">
            <div className="checklist-section-header">
              <div className={`section-icon ${section.iconClass}`}>
                <Icon size={18} />
              </div>
              <h3 className="section-title">{section.title}</h3>
              <span className="section-progress">
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
