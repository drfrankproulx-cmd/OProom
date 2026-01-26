import React, { useState } from 'react';
import { X, Upload, Check, AlertCircle } from 'lucide-react';

export const RequirementModal = ({ item, patient, onClose, onSave }) => {
  const [files, setFiles] = useState([]);
  const [notes, setNotes] = useState('');
  const [dragOver, setDragOver] = useState(false);

  if (!item) return null;

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // Here you would upload files and save notes
    onSave({ item, files, notes });
    onClose();
  };

  return (
    <div className="requirement-modal-overlay" onClick={onClose}>
      <div className="requirement-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{item.label}</h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
              Patient: {patient?.patient_name || 'Unknown'} (ID: {patient?.mrn || 'N/A'})
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Status Info */}
          <div style={{
            padding: '1rem',
            borderRadius: '0.5rem',
            background: item.completed ? '#d1fae5' : '#fef3c7',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            {item.completed ? (
              <>
                <Check size={20} style={{ color: '#065f46' }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#065f46' }}>Completed</div>
                  <div style={{ fontSize: '0.875rem', color: '#047857' }}>
                    This requirement has been fulfilled
                  </div>
                </div>
              </>
            ) : (
              <>
                <AlertCircle size={20} style={{ color: '#92400e' }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#92400e' }}>
                    {item.required ? 'Required' : 'Optional'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#b45309' }}>
                    {item.dueDate ? `Due: ${item.dueDate}` : 'No due date set'}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* File Upload */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '0.5rem'
            }}>
              Upload Documents
            </label>

            <div
              className={`file-upload-area ${dragOver ? 'dragover' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
            >
              <Upload size={32} style={{ margin: '0 auto 0.5rem', color: '#6b7280' }} />
              <p style={{ fontSize: '0.875rem', color: '#111827', marginBottom: '0.25rem' }}>
                <span style={{ color: '#3b82f6', fontWeight: 600 }}>Click to upload</span> or drag and drop
              </p>
              <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                PDF, PNG, JPG up to 10MB
              </p>
              <input
                id="file-input"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                {files.map((file, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      background: '#f9fafb',
                      borderRadius: '0.5rem',
                      marginBottom: '0.5rem'
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', color: '#111827' }}>{file.name}</span>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      style={{
                        padding: '0.25rem',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ef4444'
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '0.5rem'
            }}>
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant notes or comments..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="quick-action-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="quick-action-btn primary" onClick={handleSave}>
            <Check size={16} />
            Save & Mark Complete
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequirementModal;
