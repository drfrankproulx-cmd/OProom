import React, { useState } from 'react';
import { ChevronRight, Calendar, User, Stethoscope } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';
import { PreOpChecklist } from './PreOpChecklist';
import { QuickActions } from './QuickActions';

export const PatientRow = ({ patient, schedule, onItemToggle, onAction, onItemViewDetails }) => {
  const [expanded, setExpanded] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'UN';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getPrepProgress = () => {
    const checklist = patient.prep_checklist || {};
    const completed = Object.values(checklist).filter(Boolean).length;
    const total = 4; // This should match the number of checklist items in your backend
    return { completed, total };
  };

  const progress = getPrepProgress();

  return (
    <div className={`patient-row ${expanded ? 'expanded' : ''}`}>
      {/* Header - Always visible */}
      <div className="patient-row-header" onClick={() => setExpanded(!expanded)}>
        {/* Expand Icon */}
        <div className={`expand-icon ${expanded ? 'expanded' : ''}`}>
          <ChevronRight size={20} />
        </div>

        {/* Patient Avatar */}
        <div className="patient-avatar">
          {getInitials(patient.patient_name)}
        </div>

        {/* Patient Info */}
        <div className="patient-info">
          <div className="patient-name">{patient.patient_name}</div>
          <div className="patient-meta">
            <span className="patient-meta-item">
              <User size={14} />
              ID: {patient.mrn}
            </span>
            {patient.dob && (
              <span className="patient-meta-item">
                DOB: {format(parseISO(patient.dob), 'MM/dd/yyyy')}
              </span>
            )}
            {patient.attending && (
              <span className="patient-meta-item">
                <Stethoscope size={14} />
                Dr. {patient.attending}
              </span>
            )}
            {schedule?.scheduled_date && (
              <span className="patient-meta-item">
                <Calendar size={14} />
                {format(parseISO(schedule.scheduled_date), 'MMM dd, yyyy')}
                {schedule.scheduled_time && ` at ${schedule.scheduled_time}`}
              </span>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <StatusBadge status={patient.status} />

        {/* Progress Bar */}
        <ProgressBar completed={progress.completed} total={progress.total} />
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="patient-row-content">
          {/* Patient Details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
            padding: '1rem',
            background: 'white',
            borderRadius: '0.75rem'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Diagnosis
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                {patient.diagnosis || 'Not specified'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Procedure
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                {patient.procedures || 'Not specified'}
              </div>
            </div>
            {schedule && (
              <>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    Type
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                    {schedule.is_addon ? 'Add-on' : 'Scheduled'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    Priority
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                    {schedule.priority || 'Medium'}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Pre-Op Checklist */}
          <PreOpChecklist
            patient={patient}
            onItemToggle={onItemToggle}
            onItemViewDetails={onItemViewDetails}
          />

          {/* Quick Actions */}
          <QuickActions patient={patient} onAction={onAction} />
        </div>
      )}
    </div>
  );
};

export default PatientRow;
