import React from 'react';
import { Button } from './ui/button';
import { ArrowRight, CheckCircle, Archive, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

/**
 * Reusable component for patient status transition buttons
 * Handles: Send to OR, Mark Complete, Archive, and Restore
 */
export const StatusTransitionButtons = ({
  patient,
  onSuccess,
  showLabels = false,
  size = 'sm',
  variant = 'ghost',
  isArchived = false
}) => {
  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const handleSendToOR = async () => {
    if (!window.confirm(`Send ${patient.patient_name} to the operating room?`)) return;

    try {
      const response = await fetch(`${API_URL}/api/patients/${patient.mrn}/send-to-or`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to send patient to OR');
      }

      toast.success(`${patient.patient_name} sent to OR`);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleMarkComplete = async () => {
    if (!window.confirm(`Mark procedure complete for ${patient.patient_name}?`)) return;

    try {
      const response = await fetch(`${API_URL}/api/patients/${patient.mrn}/mark-complete`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to mark procedure complete');
      }

      toast.success(
        `Procedure completed for ${patient.patient_name}. Will auto-archive in ${result.auto_archive_in_hours} hours.`,
        { duration: 5000 }
      );
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm(`Archive patient record for ${patient.patient_name}? This can be undone later.`)) return;

    try {
      const response = await fetch(`${API_URL}/api/patients/${patient.mrn}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to archive patient');
      }

      toast.success(`${patient.patient_name} archived successfully`);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm(`Restore ${patient.patient_name} from archive?`)) return;

    try {
      const response = await fetch(`${API_URL}/api/patients/${patient.mrn}/restore`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to restore patient');
      }

      toast.success(`${patient.patient_name} restored successfully`);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // If archived, only show restore button
  if (isArchived) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleRestore}
        title="Restore from archive"
      >
        <RotateCcw className="h-4 w-4 text-blue-600" />
        {showLabels && <span className="ml-2">Restore</span>}
      </Button>
    );
  }

  // Show appropriate buttons based on current status
  return (
    <div className="flex space-x-1">
      {patient.status === 'confirmed' && (
        <Button
          variant={variant}
          size={size}
          onClick={handleSendToOR}
          title="Send to OR"
        >
          <ArrowRight className="h-4 w-4 text-blue-600" />
          {showLabels && <span className="ml-2">Send to OR</span>}
        </Button>
      )}

      {patient.status === 'in_or' && (
        <Button
          variant={variant}
          size={size}
          onClick={handleMarkComplete}
          title="Mark procedure complete"
        >
          <CheckCircle className="h-4 w-4 text-green-600" />
          {showLabels && <span className="ml-2">Complete</span>}
        </Button>
      )}

      {patient.status === 'completed' && (
        <Button
          variant={variant}
          size={size}
          onClick={handleArchive}
          title="Archive patient"
        >
          <Archive className="h-4 w-4 text-gray-600" />
          {showLabels && <span className="ml-2">Archive</span>}
        </Button>
      )}
    </div>
  );
};

export default StatusTransitionButtons;
