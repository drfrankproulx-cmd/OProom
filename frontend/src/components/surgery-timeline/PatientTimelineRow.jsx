import React, { useState } from 'react';
import { ChevronRight, Calendar, User, Check, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { TimelineCell } from './TimelineCell';
import { VSPTracker } from './VSPTracker';
import { DateValidator } from './DateValidator';

export const PatientTimelineRow = ({ patient, schedule, onUpdateStatus }) => {
  const [expanded, setExpanded] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'UN';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Calculate timeline data from patient/schedule
  const timeline = {
    priorAuth: {
      status: patient.prep_checklist?.insurance_approval ? 'complete' : 'pending',
      date: patient.prep_checklist?.insurance_approval ? patient.created_at : null
    },
    surgicalRecords: {
      status: patient.prep_checklist?.medical_optimization ? 'complete' : 'pending',
      date: patient.prep_checklist?.medical_optimization ? patient.created_at : null
    },
    biteApproval: {
      status: patient.prep_checklist?.xrays ? 'complete' : 'pending',
      date: patient.prep_checklist?.xrays ? patient.created_at : null
    },
    vsp: patient.vsp || null
  };

  // Calculate progress
  const completedItems = Object.values(patient.prep_checklist || {}).filter(Boolean).length;
  const totalItems = 4;
  const progress = Math.round((completedItems / totalItems) * 100);

  // Days until surgery
  const daysUntilSurgery = schedule?.scheduled_date
    ? DateValidator.getDaysUntilSurgery(schedule.scheduled_date)
    : null;

  const urgency = daysUntilSurgery !== null
    ? DateValidator.getSurgeryUrgency(schedule.scheduled_date)
    : 'unknown';

  // To-do items (mock data - would come from backend)
  const todoItems = [
    {
      id: 1,
      task: 'Final pre-op photos',
      status: 'pending',
      dueDate: schedule?.scheduled_date ? new Date(parseISO(schedule.scheduled_date).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() : null
    },
    {
      id: 2,
      task: 'Anesthesia clearance',
      status: patient.prep_checklist?.lab_tests ? 'complete' : 'pending',
      completedDate: patient.prep_checklist?.lab_tests ? patient.created_at : null
    }
  ];

  const handleTodoToggle = (todoId) => {
    console.log('Toggle todo:', todoId);
    // Would update via API
  };

  return (
    <>
      <tr className="expandable-row" onClick={() => setExpanded(!expanded)}>
        {/* Expand Icon */}
        <td style={{ width: '40px', padding: '0.5rem 1rem' }}>
          <div className={`expand-icon ${expanded ? 'expanded' : ''}`}>
            <ChevronRight size={20} />
          </div>
        </td>

        {/* Patient Info */}
        <td>
          <div className="patient-info-cell">
            <div className="patient-avatar">
              {getInitials(patient.patient_name)}
            </div>
            <div className="patient-details">
              <div className="patient-name">{patient.patient_name}</div>
              <div className="patient-mrn">ID: {patient.mrn}</div>
            </div>
          </div>
        </td>

        {/* Staff/Orthodontist */}
        <td>
          <div style={{ fontSize: '0.875rem' }}>
            <div style={{ fontWeight: 600, color: '#111827' }}>
              {patient.attending || 'Not assigned'}
            </div>
            {schedule?.staff && schedule.staff !== patient.attending && (
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                Ortho: {schedule.staff}
              </div>
            )}
          </div>
        </td>

        {/* Surgery Date & Days Until */}
        <td>
          {schedule?.scheduled_date ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>
                {format(parseISO(schedule.scheduled_date), 'MMM dd, yyyy')}
              </div>
              <div className="days-countdown">
                <span className={`days-number ${urgency === 'urgent' ? 'urgent' : urgency === 'warning' ? 'warning' : ''}`}>
                  {daysUntilSurgery}
                </span>
                <span className="days-label">Days</span>
              </div>
            </div>
          ) : (
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Not scheduled</span>
          )}
        </td>

        {/* Prior Auth */}
        <TimelineCell
          status={timeline.priorAuth.status}
          date={timeline.priorAuth.date}
          documentType="prior_auth"
        />

        {/* Surgical Records */}
        <TimelineCell
          status={timeline.surgicalRecords.status}
          date={timeline.surgicalRecords.date}
          documentType="surgical_records"
        />

        {/* Bite Approval */}
        <TimelineCell
          status={timeline.biteApproval.status}
          date={timeline.biteApproval.date}
          documentType="bite_approval"
        />

        {/* VSP */}
        <td className="timeline-cell">
          <VSPTracker vsp={timeline.vsp} />
        </td>

        {/* Progress */}
        <td className="progress-cell">
          <div className="progress-wrapper">
            <div className="circular-progress">
              <svg width="48" height="48" viewBox="0 0 48 48">
                <circle
                  className="circular-progress-bg"
                  cx="24"
                  cy="24"
                  r="20"
                />
                <circle
                  className={`circular-progress-fill ${progress === 100 ? 'complete' : progress >= 50 ? 'in-progress' : 'warning'}`}
                  cx="24"
                  cy="24"
                  r="20"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                />
              </svg>
              <div className="circular-progress-text">{progress}%</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                {completedItems}/{totalItems}
              </div>
              <div className="progress-label">Complete</div>
            </div>
          </div>
        </td>
      </tr>

      {/* Expanded Content */}
      {expanded && (
        <tr>
          <td colSpan="9" className="expanded-content">
            <div className="expanded-content-inner">
              {/* Patient Details Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
                padding: '1.5rem',
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
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    DOB
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                    {patient.dob ? format(parseISO(patient.dob), 'MM/dd/yyyy') : 'Not provided'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    Status
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>
                    {patient.status}
                  </div>
                </div>
              </div>

              {/* To-Do List */}
              <div className="todo-list">
                <div className="todo-list-header">
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={18} />
                    Pre-Op To-Do List
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>
                    {todoItems.filter(t => t.status === 'complete').length}/{todoItems.length} Complete
                  </span>
                </div>

                {todoItems.map(todo => (
                  <div key={todo.id} className={`todo-item ${todo.status === 'complete' ? 'completed' : ''}`}>
                    <div
                      className={`todo-checkbox ${todo.status === 'complete' ? 'checked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTodoToggle(todo.id);
                      }}
                    >
                      {todo.status === 'complete' && <Check size={14} style={{ color: 'white' }} />}
                    </div>
                    <span className={`todo-text ${todo.status === 'complete' ? 'completed' : ''}`}>
                      {todo.task}
                    </span>
                    {todo.dueDate && todo.status !== 'complete' && (
                      <span className={`todo-due-date ${new Date(todo.dueDate) < new Date() ? 'overdue' : ''}`}>
                        Due: {format(parseISO(todo.dueDate), 'MMM dd')}
                      </span>
                    )}
                    {todo.completedDate && (
                      <span className="todo-due-date">
                        {format(parseISO(todo.completedDate), 'MMM dd')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default PatientTimelineRow;
