import React from 'react';
import { CheckCircle, Upload, Printer, Mail, Calendar, AlertTriangle, Trash2 } from 'lucide-react';

export const QuickActions = ({ patient, onAction }) => {
  const actions = [
    {
      id: 'mark-ready',
      label: 'Mark Ready for Surgery',
      icon: CheckCircle,
      className: 'success',
      disabled: false
    },
    {
      id: 'upload-docs',
      label: 'Upload Documents',
      icon: Upload,
      className: 'primary',
      disabled: false
    },
    {
      id: 'print-checklist',
      label: 'Print Checklist',
      icon: Printer,
      className: '',
      disabled: false
    },
    {
      id: 'notify-team',
      label: 'Notify Team',
      icon: Mail,
      className: '',
      disabled: false
    },
    {
      id: 'reschedule',
      label: 'Reschedule',
      icon: Calendar,
      className: '',
      disabled: false
    },
    {
      id: 'flag-issue',
      label: 'Flag Issue',
      icon: AlertTriangle,
      className: '',
      disabled: false
    },
    {
      id: 'delete-patient',
      label: 'Delete Patient',
      icon: Trash2,
      className: 'danger',
      disabled: false
    }
  ];

  return (
    <div className="quick-actions">
      {actions.map(action => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            className={`quick-action-btn ${action.className}`}
            disabled={action.disabled}
            onClick={() => onAction(action.id, patient)}
          >
            <Icon size={16} />
            {action.label}
          </button>
        );
      })}
    </div>
  );
};

export default QuickActions;
