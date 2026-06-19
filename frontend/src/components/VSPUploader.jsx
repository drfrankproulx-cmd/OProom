import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAuthHeaders, getToken } from '../utils/auth';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * VSP (Virtual Surgical Plan) PDF uploader. Drag-and-drop OR click-to-browse.
 * One file per patient; uploading a new one replaces the old.
 */
const VSPUploader = ({ patient, onChange }) => {
  const mrn = patient.mrn;
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const hasFile = !!patient.vsp_filename;

  const formatBytes = (n) => {
    if (!n) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are allowed');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('File exceeds 25 MB limit');
      return;
    }

    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/api/patients/${mrn}/vsp`, {
        method: 'POST',
        headers: getAuthHeaders(), // intentionally NO Content-Type; browser sets boundary
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(`Upload failed: ${err.detail || res.status}`);
        return;
      }
      const data = await res.json();
      toast.success(`Uploaded ${data.filename}`);
      onChange && onChange({
        vsp_filename: data.filename,
        vsp_size_bytes: data.size_bytes,
        vsp_uploaded_at: new Date().toISOString(),
      });
    } catch (e) {
      toast.error(`Upload failed: ${e.message || 'network error'}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(`${API_URL}/api/patients/${mrn}/vsp`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        toast.error('Download failed');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      // Open in new tab for inline preview
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast.error('Download failed');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this VSP file?')) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/patients/${mrn}/vsp`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        toast.error('Delete failed');
        return;
      }
      toast.success('VSP deleted');
      onChange && onChange({
        vsp_filename: null,
        vsp_size_bytes: null,
        vsp_uploaded_at: null,
      });
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 p-4"
      data-testid="vsp-uploader"
    >
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-teal-600" />
        <span className="text-sm font-semibold text-slate-700">VSP (Virtual Surgical Plan)</span>
      </div>

      {hasFile ? (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-teal-50 border border-teal-200">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-teal-600 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate" title={patient.vsp_filename}>
                {patient.vsp_filename}
              </div>
              <div className="text-xs text-slate-500">
                {formatBytes(patient.vsp_size_bytes)}
                {patient.vsp_uploaded_at && ` • uploaded ${new Date(patient.vsp_uploaded_at).toLocaleDateString()}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleDownload}
              disabled={busy}
              className="p-2 rounded-md text-teal-700 hover:bg-teal-100 transition-colors disabled:opacity-50"
              title="Open PDF"
              data-testid="vsp-download-btn"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="p-2 rounded-md text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              title="Replace PDF"
              data-testid="vsp-replace-btn"
            >
              <Upload className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={busy}
              className="p-2 rounded-md text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Delete VSP"
              data-testid="vsp-delete-btn"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-6 px-4 cursor-pointer transition-colors ${
            isDragging
              ? 'border-teal-500 bg-teal-50'
              : 'border-slate-300 bg-slate-50 hover:border-teal-400 hover:bg-teal-50'
          } ${busy ? 'opacity-50 pointer-events-none' : ''}`}
          data-testid="vsp-dropzone"
        >
          {busy ? (
            <>
              <Loader2 className="h-6 w-6 text-teal-500 animate-spin" />
              <span className="text-xs text-slate-500">Uploading…</span>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-slate-400" />
              <div className="text-sm text-slate-600 text-center">
                <span className="font-medium text-teal-600">Click to upload</span>{' '}
                <span className="text-slate-500">or drag &amp; drop a PDF</span>
              </div>
              <div className="text-xs text-slate-400">Max 25 MB</div>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = ''; // reset so re-uploading the same file works
        }}
      />
    </div>
  );
};

export default VSPUploader;
