import React from 'react';
import { Check, Clock, AlertCircle, Upload, Eye } from 'lucide-react';

export const ChecklistItem = ({ item, onToggle, onViewDetails }) => {
  const { id, label, completed, required, dueDate, hasDocument, overdue } = item;

  const getBadgeInfo = () => {
    if (completed) return { className: 'item-badge complete', text: 'Complete' };
    if (overdue) return { className: 'item-badge overdue', text: 'Overdue' };
    if (!required) return { className: 'item-badge not-required', text: 'Optional' };
    return { className: 'item-badge pending', text: 'Pending' };
  };

  const badge = getBadgeInfo();

  return (
    <div className={`checklist-item ${completed ? 'completed' : ''}`}>
      <div
        className={`item-checkbox ${completed ? 'checked' : ''}`}
        onClick={() => onToggle(id)}
      >
        {completed && <Check size={16} />}
      </div>

      <div className="item-content">
        <div className={`item-label ${completed ? 'completed' : ''}`}>
          {label}
        </div>
        {dueDate && (
          <div className="item-details">
            <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
            Due: {dueDate}
          </div>
        )}
      </div>

      <div className="item-status">
        <span className={badge.className}>{badge.text}</span>

        {hasDocument && (
          <button
            className="quick-action-btn"
            style={{ padding: '0.25rem 0.5rem' }}
            onClick={() => onViewDetails && onViewDetails(item)}
            title="View document"
          >
            <Eye size={14} />
          </button>
        )}

        {!completed && required && (
          <button
            className="quick-action-btn"
            style={{ padding: '0.25rem 0.5rem' }}
            onClick={() => onViewDetails && onViewDetails(item)}
            title="Upload document"
          >
            <Upload size={14} />
          </button>
        )}

        {overdue && <AlertCircle size={16} className="text-red-600" />}
      </div>
    </div>
  );
};

export default ChecklistItem;
