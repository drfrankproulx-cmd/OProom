import React from 'react';

export const StatusBadge = ({ status }) => {
  const getStatusClass = () => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'status-badge confirmed';
      case 'pending':
        return 'status-badge pending';
      case 'in-progress':
      case 'in_progress':
        return 'status-badge in-progress';
      case 'ready':
        return 'status-badge ready';
      case 'delayed':
        return 'status-badge delayed';
      case 'completed':
        return 'status-badge ready';
      default:
        return 'status-badge pending';
    }
  };

  const getStatusText = () => {
    if (!status) return 'Pending';
    return status.replace('_', ' ').split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <span className={getStatusClass()}>
      {getStatusText()}
    </span>
  );
};

export default StatusBadge;
