import React from 'react';
import { Check, Clock, Package } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export const VSPTracker = ({ vsp }) => {
  if (!vsp) {
    return (
      <div className="vsp-tracker">
        <span className="timeline-status-badge pending">
          <Clock size={14} />
          Not Started
        </span>
      </div>
    );
  }

  const steps = [
    {
      id: 'requested',
      label: 'VSP Requested',
      date: vsp.requested,
      completed: !!vsp.requested
    },
    {
      id: 'received',
      label: 'VSP Received',
      date: vsp.received,
      completed: !!vsp.received
    },
    {
      id: 'approved',
      label: 'VSP Approved',
      date: vsp.approved,
      completed: !!vsp.approved
    },
    {
      id: 'guide',
      label: 'Surgical Guide',
      date: null,
      completed: vsp.surgicalGuide === 'received',
      status: vsp.surgicalGuide
    }
  ];

  const completedSteps = steps.filter(s => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <div className="vsp-tracker">
      {/* Progress Summary */}
      <div style={{ marginBottom: '0.5rem' }}>
        <span className={`timeline-status-badge ${completedSteps === steps.length ? 'complete' : 'in-progress'}`}>
          {completedSteps === steps.length ? (
            <>
              <Check size={14} />
              Complete
            </>
          ) : (
            <>
              <Clock size={14} />
              {completedSteps}/{steps.length} Steps
            </>
          )}
        </span>
      </div>

      {/* VSP Steps */}
      {steps.map(step => (
        <div key={step.id} className="vsp-step">
          <div className={`vsp-step-icon ${step.completed ? 'complete' : 'pending'}`}>
            {step.completed ? <Check size={12} /> : <Clock size={12} />}
          </div>
          <span className="vsp-step-label">{step.label}</span>
          {step.date && (
            <span className="vsp-step-date">
              {format(parseISO(step.date), 'MMM d')}
            </span>
          )}
          {step.id === 'guide' && step.status === 'pending' && (
            <span className="vsp-step-date" style={{ color: '#f59e0b' }}>
              Pending
            </span>
          )}
        </div>
      ))}

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '4px',
        background: '#e5e7eb',
        borderRadius: '2px',
        overflow: 'hidden',
        marginTop: '0.5rem'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: progress === 100 ? '#10b981' : '#3b82f6',
          transition: 'width 0.5s ease'
        }} />
      </div>
    </div>
  );
};

export default VSPTracker;
