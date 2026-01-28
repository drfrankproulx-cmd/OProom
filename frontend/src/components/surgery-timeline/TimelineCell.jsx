import React from 'react';
import { Check, Clock, AlertCircle, X } from 'lucide-react';
import { DateValidator } from './DateValidator';

export const TimelineCell = ({ status, date, documentType, onClick }) => {
  const renderContent = () => {
    if (!status || status === 'pending') {
      return (
        <div className="timeline-cell-content">
          <span className="timeline-status-badge pending">
            <Clock size={14} />
            Pending
          </span>
          <span className="requirement-label">
            {DateValidator.getRequirementLabel(documentType)}
          </span>
        </div>
      );
    }

    if (status === 'complete' && date) {
      let validation;
      switch (documentType) {
        case 'prior_auth':
          validation = DateValidator.validatePriorAuth(date);
          break;
        case 'surgical_records':
          validation = DateValidator.validateSurgicalRecords(date);
          break;
        case 'bite_approval':
          validation = DateValidator.validateBiteApproval(date);
          break;
        default:
          validation = { status: 'valid', age: DateValidator.getDocumentAge(date), isValid: true };
      }

      const { status: validationStatus, age, isValid } = validation;

      return (
        <div className="timeline-cell-content">
          <span className={`timeline-status-badge ${isValid ? 'complete' : 'overdue'}`}>
            {isValid ? <Check size={14} /> : <AlertCircle size={14} />}
            {isValid ? 'Complete' : 'Expired'}
          </span>
          {age !== null && (
            <span className={`document-age ${validationStatus}`}>
              {DateValidator.formatDocumentAge(age)} old
            </span>
          )}
          {!isValid && validation.message && (
            <span className="requirement-label" style={{ color: '#ef4444' }}>
              {validation.message}
            </span>
          )}
          {isValid && documentType && (
            <span className="requirement-label">
              {DateValidator.getRequirementLabel(documentType)}
            </span>
          )}
        </div>
      );
    }

    if (status === 'overdue') {
      return (
        <div className="timeline-cell-content">
          <span className="timeline-status-badge overdue">
            <AlertCircle size={14} />
            Overdue
          </span>
          <span className="requirement-label" style={{ color: '#ef4444' }}>
            {DateValidator.getRequirementLabel(documentType)}
          </span>
        </div>
      );
    }

    if (status === 'in-progress') {
      return (
        <div className="timeline-cell-content">
          <span className="timeline-status-badge in-progress">
            <Clock size={14} />
            In Progress
          </span>
          {date && (
            <span className="document-age">
              Started {DateValidator.formatDocumentAge(DateValidator.getDocumentAge(date))} ago
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="timeline-cell-content">
        <span className="timeline-status-badge pending">
          <X size={14} />
          {status}
        </span>
      </div>
    );
  };

  return (
    <td
      className="timeline-cell"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {renderContent()}
    </td>
  );
};

export default TimelineCell;
