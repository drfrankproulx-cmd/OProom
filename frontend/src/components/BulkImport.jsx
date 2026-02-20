import React, { useState, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  UserCheck,
  Loader2,
  X,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const STEPS = [
  { id: 'upload', label: 'Upload' },
  { id: 'preview', label: 'Preview' },
  { id: 'importing', label: 'Importing' },
  { id: 'complete', label: 'Complete' }
];

export const BulkImport = ({ onBack, onNavigate }) => {
  const [currentStep, setCurrentStep] = useState('upload');
  const [entityType, setEntityType] = useState('residents');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importResult, setImportResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
  });

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(`${API_URL}/api/import/template/${entityType}`, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entityType}_template.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${entityType === 'residents' ? 'Residents' : 'Attendings'} template downloaded`);
    } catch (err) {
      toast.error('Failed to download template');
      console.error(err);
    }
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (file) => {
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Only CSV files are supported. Please select a .csv file.');
      toast.error('Only CSV files are supported');
      return;
    }
    
    setSelectedFile(file);
    setError(null);
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_URL}/api/import/preview/${entityType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to preview file');
      }
      
      const data = await response.json();
      setPreviewData(data);
      setCurrentStep('preview');
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      setSelectedFile(null);
    } finally {
      setIsLoading(false);
    }
  }, [entityType]);

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Click to browse
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  // Import data
  const handleImport = async () => {
    if (!selectedFile) return;
    
    setCurrentStep('importing');
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await fetch(
        `${API_URL}/api/import/${entityType}?skip_duplicates=${skipDuplicates}`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData,
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Import failed');
      }
      
      setImportResult(data);
      setCurrentStep('complete');
      
      if (data.imported_count > 0) {
        toast.success(`Successfully imported ${data.imported_count} ${entityType}`);
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      setCurrentStep('preview');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset wizard
  const handleReset = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setPreviewData(null);
    setImportResult(null);
    setError(null);
    setSkipDuplicates(true);
  };

  // Cancel and go back to upload
  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setError(null);
    setCurrentStep('upload');
  };

  // Navigate to residents/attendings page
  const handleViewEntities = () => {
    if (onNavigate) {
      onNavigate(entityType === 'residents' ? 'residents' : 'attendings');
    }
  };

  // Step indicator component
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, index) => {
        const stepIndex = STEPS.findIndex(s => s.id === currentStep);
        const isActive = step.id === currentStep;
        const isCompleted = index < stepIndex;
        
        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  isActive ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <ChevronRight className="h-5 w-5 text-gray-300 mx-4" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // Upload step
  const UploadStep = () => (
    <div className="space-y-6">
      {/* Entity type selector */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setEntityType('residents')}
          className={`flex items-center space-x-3 px-6 py-4 rounded-2xl border-2 transition-all ${
            entityType === 'residents'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
          }`}
          data-testid="select-residents"
        >
          <Users className="h-6 w-6" />
          <div className="text-left">
            <div className="font-semibold">Residents</div>
            <div className="text-xs opacity-75">Import resident physicians</div>
          </div>
        </button>
        <button
          onClick={() => setEntityType('attendings')}
          className={`flex items-center space-x-3 px-6 py-4 rounded-2xl border-2 transition-all ${
            entityType === 'attendings'
              ? 'border-purple-500 bg-purple-50 text-purple-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
          }`}
          data-testid="select-attendings"
        >
          <UserCheck className="h-6 w-6" />
          <div className="text-left">
            <div className="font-semibold">Attendings</div>
            <div className="text-xs opacity-75">Import attending physicians</div>
          </div>
        </button>
      </div>

      {/* Download template button */}
      <div className="flex justify-center">
        <Button
          onClick={handleDownloadTemplate}
          variant="outline"
          className="flex items-center space-x-2"
          data-testid="download-template-btn"
        >
          <Download className="h-4 w-4" />
          <span>Download {entityType === 'residents' ? 'Residents' : 'Attendings'} Template</span>
        </Button>
      </div>

      {/* Drop zone */}
      <div
        onClick={handleBrowseClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        data-testid="dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInputChange}
          className="hidden"
          data-testid="file-input"
        />
        
        {isLoading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-600">Processing file...</p>
          </div>
        ) : (
          <>
            <FileSpreadsheet className={`h-16 w-16 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
            <p className="text-lg font-medium text-gray-700 mb-2">
              {isDragging ? 'Drop your CSV file here' : 'Drag and drop your CSV file here'}
            </p>
            <p className="text-sm text-gray-500 mb-4">or click to browse</p>
            <Button variant="secondary" className="pointer-events-none">
              <Upload className="h-4 w-4 mr-2" />
              Select CSV File
            </Button>
          </>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Upload Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Help text */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="font-medium text-gray-800 mb-2">CSV Format Requirements</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Residents:</strong> name (required), email (required), pgy_level, phone, specialty</li>
          <li>• <strong>Attendings:</strong> name (required), email (required), phone, specialty, department</li>
          <li>• Download the template above for the correct format</li>
          <li>• Duplicate emails will be detected and can be skipped</li>
        </ul>
      </div>
    </div>
  );

  // Preview step
  const PreviewStep = () => {
    if (!previewData) return null;
    
    const { valid_rows, duplicate_rows, error_rows, valid_count, duplicate_count, error_count, total_rows } = previewData;
    const allErrors = [...error_rows, ...duplicate_rows];
    
    return (
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500 mb-1">Total Rows</div>
            <div className="text-2xl font-bold text-gray-900">{total_rows}</div>
          </div>
          <div className="bg-green-50 rounded-xl shadow-sm border border-green-200 p-4">
            <div className="text-sm text-green-600 mb-1">Valid (New)</div>
            <div className="text-2xl font-bold text-green-700">{valid_count}</div>
          </div>
          <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 p-4">
            <div className="text-sm text-yellow-600 mb-1">Duplicates</div>
            <div className="text-2xl font-bold text-yellow-700">{duplicate_count}</div>
          </div>
          <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-4">
            <div className="text-sm text-red-600 mb-1">Errors</div>
            <div className="text-2xl font-bold text-red-700">{error_count}</div>
          </div>
        </div>

        {/* Valid rows table */}
        {valid_rows.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-green-50 border-b border-green-200">
              <h3 className="font-semibold text-green-800 flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Valid Rows ({valid_rows.length})
              </h3>
            </div>
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                    {entityType === 'residents' ? (
                      <>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">PGY Level</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Specialty</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Specialty</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {valid_rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-900">{row.name}</td>
                      <td className="px-4 py-2 text-gray-600">{row.email}</td>
                      {entityType === 'residents' ? (
                        <>
                          <td className="px-4 py-2 text-gray-600">{row.pgy_level || '—'}</td>
                          <td className="px-4 py-2 text-gray-600">{row.phone || '—'}</td>
                          <td className="px-4 py-2 text-gray-600">{row.specialty || '—'}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2 text-gray-600">{row.phone || '—'}</td>
                          <td className="px-4 py-2 text-gray-600">{row.specialty || '—'}</td>
                          <td className="px-4 py-2 text-gray-600">{row.department || '—'}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Error rows */}
        {allErrors.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-red-50 border-b border-red-200">
              <h3 className="font-semibold text-red-800 flex items-center">
                <XCircle className="h-5 w-5 mr-2" />
                Errors & Duplicates ({allErrors.length})
              </h3>
            </div>
            <div className="overflow-x-auto max-h-48">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Row</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allErrors.map((err, idx) => (
                    <tr key={idx} className="hover:bg-red-50">
                      <td className="px-4 py-2 text-gray-900 font-medium">{err.row}</td>
                      <td className="px-4 py-2 text-gray-600 text-xs">
                        {err.data ? JSON.stringify(err.data) : '—'}
                      </td>
                      <td className="px-4 py-2 text-red-600">{err.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Skip duplicates checkbox */}
        <div className="bg-gray-50 rounded-xl p-4">
          <label className="flex items-center space-x-3 cursor-pointer">
            <Checkbox
              checked={skipDuplicates}
              onCheckedChange={(checked) => setSkipDuplicates(checked)}
              data-testid="skip-duplicates-checkbox"
            />
            <div>
              <span className="font-medium text-gray-800">Skip duplicate emails</span>
              <p className="text-sm text-gray-500">
                {duplicate_count} duplicate(s) found. Check this to skip them during import.
              </p>
            </div>
          </label>
        </div>

        {/* Action buttons */}
        <div className="flex justify-between">
          <Button
            onClick={handleCancel}
            variant="outline"
            data-testid="cancel-btn"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={valid_count === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="import-btn"
          >
            Import {valid_count} {entityType === 'residents' ? 'Resident' : 'Attending'}{valid_count !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    );
  };

  // Importing step (loading)
  const ImportingStep = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-6" />
      <h3 className="text-xl font-semibold text-gray-800 mb-2">Importing Data...</h3>
      <p className="text-gray-500">Please wait while we import your {entityType}</p>
    </div>
  );

  // Complete step
  const CompleteStep = () => {
    if (!importResult) return null;
    
    const { imported_count, skipped_count, error_count } = importResult;
    const hasErrors = error_count > 0;
    
    return (
      <div className="space-y-6">
        {/* Success/Warning banner */}
        <div className={`rounded-xl p-6 ${hasErrors ? 'bg-yellow-50' : 'bg-green-50'}`}>
          <div className="flex items-center justify-center mb-4">
            {hasErrors ? (
              <AlertTriangle className="h-16 w-16 text-yellow-500" />
            ) : (
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            )}
          </div>
          <h3 className="text-xl font-semibold text-center text-gray-800 mb-2">
            {hasErrors ? 'Import Completed with Warnings' : 'Import Successful!'}
          </h3>
          <p className="text-center text-gray-600">
            Your {entityType} have been imported to the database
          </p>
        </div>

        {/* Result summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-xl shadow-sm border border-green-200 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-green-700">{imported_count}</div>
            <div className="text-sm text-green-600">Imported</div>
          </div>
          <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-yellow-700">{skipped_count}</div>
            <div className="text-sm text-yellow-600">Skipped (Duplicates)</div>
          </div>
          <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6 text-center">
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-red-700">{error_count}</div>
            <div className="text-sm text-red-600">Errors</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center space-x-4">
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex items-center space-x-2"
            data-testid="import-another-btn"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Import Another File</span>
          </Button>
          <Button
            onClick={handleViewEntities}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
            data-testid="view-entities-btn"
          >
            <Users className="h-4 w-4" />
            <span>View {entityType === 'residents' ? 'Residents' : 'Attendings'}</span>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              onClick={onBack}
              variant="ghost"
              className="hover:bg-white/50"
              data-testid="back-btn"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Import</h1>
        </div>

        {/* Main card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8">
          {/* Step indicator */}
          <StepIndicator />

          {/* Step content */}
          {currentStep === 'upload' && <UploadStep />}
          {currentStep === 'preview' && <PreviewStep />}
          {currentStep === 'importing' && <ImportingStep />}
          {currentStep === 'complete' && <CompleteStep />}
        </div>
      </div>
    </div>
  );
};

export default BulkImport;
