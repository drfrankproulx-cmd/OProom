import React from 'react';

export const ProgressBar = ({ completed, total, showLabel = true }) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const getProgressClass = () => {
    if (percentage === 100) return 'complete';
    if (percentage >= 50) return '';
    if (percentage >= 25) return 'warning';
    return 'danger';
  };

  return (
    <div className="progress-container">
      {showLabel && (
        <div className="progress-label">
          <span>Pre-Op Checklist</span>
          <span className="font-semibold">{completed}/{total}</span>
        </div>
      )}
      <div className="progress-bar-wrapper">
        <div
          className={`progress-bar-fill ${getProgressClass()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
