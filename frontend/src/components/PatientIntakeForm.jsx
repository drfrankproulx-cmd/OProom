import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Sample data for dropdowns
const ATTENDING_SURGEONS = [
  'Dr. Anderson',
  'Dr. Smith',
  'Dr. Jones',
  'Dr. Williams',
  'Dr. Brown',
  'Dr. Davis',
  'Dr. Martinez',
  'Dr. Garcia'
];

const COMMON_DIAGNOSES = [
  'Osteoarthritis',
  'Meniscal tear',
  'ACL rupture',
  'Rotator cuff tear',
  'Hip fracture',
  'Lumbar disc herniation',
  'Carpal tunnel syndrome',
  'Ankle fracture',
  'Shoulder impingement',
  'Total hip replacement candidate',
  'Total knee replacement candidate'
];

const COMMON_PROCEDURES = [
  { code: '27447', name: 'Total knee arthroplasty' },
  { code: '27130', name: 'Total hip arthroplasty' },
  { code: '29881', name: 'Arthroscopy, knee, surgical' },
  { code: '29827', name: 'Arthroscopy, shoulder, surgical' },
  { code: '23412', name: 'Rotator cuff repair' },
  { code: '63030', name: 'Laminectomy, lumbar' },
  { code: '64721', name: 'Carpal tunnel release' },
  { code: '27792', name: 'Open treatment ankle fracture' },
  { code: '23430', name: 'Tenodesis of long head biceps' },
  { code: '27244', name: 'Treatment of femoral fracture' }
];

export const PatientIntakeForm = ({ isOpen, onClose, onSuccess, editingPatient = null }) => {
  const [formData, setFormData] = useState({
    patient_name: editingPatient?.patient_name || '',
    mrn: editingPatient?.mrn || '',
    dob: editingPatient?.dob || '',
    attending: editingPatient?.attending || '',
    diagnosis: editingPatient?.diagnosis || '',
    procedures: editingPatient?.procedures || '',
    procedure_code: editingPatient?.procedure_code || '',
    or_date: editingPatient?.or_date || null,
    or_time: editingPatient?.or_time || '08:00',
    status: editingPatient?.status || 'pending'
  });

  const [errors, setErrors] = useState({});
  const [diagnosisSearch, setDiagnosisSearch] = useState('');
  const [procedureSearch, setProcedureSearch] = useState('');
  const [showDiagnosisSuggestions, setShowDiagnosisSuggestions] = useState(false);
  const [showProcedureSuggestions, setShowProcedureSuggestions] = useState(false);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const validateForm = () => {
    const newErrors = {};

    if (!formData.patient_name.trim()) {
      newErrors.patient_name = 'Patient name is required';
    }

    if (!formData.mrn.trim()) {
      newErrors.mrn = 'MRN is required';
    }

    if (!formData.dob) {
      newErrors.dob = 'Date of birth is required';
    }

    if (!formData.attending) {
      newErrors.attending = 'Attending surgeon is required';
    }

    if (!formData.diagnosis.trim()) {
      newErrors.diagnosis = 'Diagnosis is required';
    }

    if (!formData.procedures.trim()) {
      newErrors.procedures = 'Procedure is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Save patient
      const patientData = {
        mrn: formData.mrn,
        patient_name: formData.patient_name,
        dob: formData.dob,
        diagnosis: formData.diagnosis,
        procedures: formData.procedures,
        attending: formData.attending,
        status: formData.status,
      };

      const patientUrl = editingPatient
        ? `${API_URL}/api/patients/${editingPatient.mrn}`
        : `${API_URL}/api/patients`;
      const patientMethod = editingPatient ? 'PUT' : 'POST';

      const patientResponse = await fetch(patientUrl, {
        method: patientMethod,
        headers: getAuthHeaders(),
        body: JSON.stringify(patientData),
      });

      const patientResult = await patientResponse.json();

      if (!patientResponse.ok) {
        throw new Error(patientResult.detail || 'Failed to save patient');
      }

      // If OR date is selected, create schedule
      if (formData.or_date) {
        const scheduleData = {
          patient_mrn: formData.mrn,
          patient_name: formData.patient_name,
          procedure: `${formData.procedures}${formData.procedure_code ? ' (CPT: ' + formData.procedure_code + ')' : ''}`,
          staff: formData.attending,
          scheduled_date: formData.or_date,
          scheduled_time: formData.or_time,
          status: 'scheduled',
          is_addon: false,
        };

        const scheduleResponse = await fetch(`${API_URL}/api/schedules`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(scheduleData),
        });

        const scheduleResult = await scheduleResponse.json();

        if (!scheduleResponse.ok) {
          throw new Error(scheduleResult.detail || 'Failed to schedule case');
        }
        toast.success('Patient saved and scheduled successfully!');
      } else {
        // Add to add-on list
        const addOnData = {
          patient_mrn: formData.mrn,
          patient_name: formData.patient_name,
          procedure: `${formData.procedures}${formData.procedure_code ? ' (CPT: ' + formData.procedure_code + ')' : ''}`,
          staff: formData.attending,
          scheduled_date: '',
          status: 'pending',
          is_addon: true,
        };

        const addOnResponse = await fetch(`${API_URL}/api/schedules`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(addOnData),
        });

        const addOnResult = await addOnResponse.json();

        if (!addOnResponse.ok) {
          throw new Error(addOnResult.detail || 'Failed to add to add-on list');
        }
        toast.success('Patient saved to add-on list!');
      }

      onSuccess();
      handleClose();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleClose = () => {
    setFormData({
      patient_name: '',
      mrn: '',
      dob: '',
      attending: '',
      diagnosis: '',
      procedures: '',
      procedure_code: '',
      or_date: null,
      or_time: '08:00',
      status: 'pending'
    });
    setErrors({});
    setDiagnosisSearch('');
    setProcedureSearch('');
    onClose();
  };

  const filteredDiagnoses = COMMON_DIAGNOSES.filter(d =>
    d.toLowerCase().includes(diagnosisSearch.toLowerCase())
  );

  const filteredProcedures = COMMON_PROCEDURES.filter(p =>
    p.name.toLowerCase().includes(procedureSearch.toLowerCase()) ||
    p.code.includes(procedureSearch)
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {editingPatient ? 'Edit Patient Information' : 'Patient Intake Form'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Required Fields Notice */}
          <div className="bg-info-light border border-info/20 rounded-lg p-3 flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-info mt-0.5" />
            <p className="text-sm text-foreground">
              Fields marked with <span className="text-destructive font-semibold">*</span> are required
            </p>
          </div>

          {/* Patient Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">Patient Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patient_name" className="flex items-center">
                  Patient Name <span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="patient_name"
                  value={formData.patient_name}
                  onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                  placeholder="John Doe"
                  className={errors.patient_name ? 'border-destructive' : ''}
                />
                {errors.patient_name && (
                  <p className="text-xs text-destructive">{errors.patient_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="mrn" className="flex items-center">
                  Medical Record Number (MRN) <span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="mrn"
                  value={formData.mrn}
                  onChange={(e) => setFormData({ ...formData, mrn: e.target.value })}
                  placeholder="123456"
                  disabled={!!editingPatient}
                  className={errors.mrn ? 'border-destructive' : ''}
                />
                {errors.mrn && (
                  <p className="text-xs text-destructive">{errors.mrn}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob" className="flex items-center">
                Date of Birth <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="dob"
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className={errors.dob ? 'border-destructive' : ''}
              />
              {errors.dob && (
                <p className="text-xs text-destructive">{errors.dob}</p>
              )}
            </div>
          </div>

          {/* Medical Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">Medical Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="attending" className="flex items-center">
                Attending Surgeon <span className="text-destructive ml-1">*</span>
              </Label>
              <Select 
                value={formData.attending} 
                onValueChange={(value) => setFormData({ ...formData, attending: value })}
              >
                <SelectTrigger className={errors.attending ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select attending surgeon" />
                </SelectTrigger>
                <SelectContent>
                  {ATTENDING_SURGEONS.map((surgeon) => (
                    <SelectItem key={surgeon} value={surgeon}>
                      {surgeon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.attending && (
                <p className="text-xs text-destructive">{errors.attending}</p>
              )}
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="diagnosis" className="flex items-center">
                Diagnosis <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="diagnosis"
                value={formData.diagnosis}
                onChange={(e) => {
                  setFormData({ ...formData, diagnosis: e.target.value });
                  setDiagnosisSearch(e.target.value);
                  setShowDiagnosisSuggestions(true);
                }}
                onFocus={() => setShowDiagnosisSuggestions(true)}
                onBlur={() => setTimeout(() => setShowDiagnosisSuggestions(false), 200)}
                placeholder="Start typing diagnosis..."
                className={errors.diagnosis ? 'border-destructive' : ''}
              />
              {showDiagnosisSuggestions && filteredDiagnoses.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredDiagnoses.map((diagnosis) => (
                    <div
                      key={diagnosis}
                      className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                      onClick={() => {
                        setFormData({ ...formData, diagnosis });
                        setShowDiagnosisSuggestions(false);
                      }}
                    >
                      {diagnosis}
                    </div>
                  ))}
                </div>
              )}
              {errors.diagnosis && (
                <p className="text-xs text-destructive">{errors.diagnosis}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <Label htmlFor="procedures" className="flex items-center">
                  Procedure <span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="procedures"
                  value={formData.procedures}
                  onChange={(e) => {
                    setFormData({ ...formData, procedures: e.target.value });
                    setProcedureSearch(e.target.value);
                    setShowProcedureSuggestions(true);
                  }}
                  onFocus={() => setShowProcedureSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowProcedureSuggestions(false), 200)}
                  placeholder="Start typing procedure..."
                  className={errors.procedures ? 'border-destructive' : ''}
                />
                {showProcedureSuggestions && filteredProcedures.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredProcedures.map((proc) => (
                      <div
                        key={proc.code}
                        className="px-3 py-2 hover:bg-accent cursor-pointer"
                        onClick={() => {
                          setFormData({ 
                            ...formData, 
                            procedures: proc.name,
                            procedure_code: proc.code
                          });
                          setShowProcedureSuggestions(false);
                        }}
                      >
                        <div className="text-sm font-medium">{proc.name}</div>
                        <div className="text-xs text-muted-foreground">CPT: {proc.code}</div>
                      </div>
                    ))}
                  </div>
                )}
                {errors.procedures && (
                  <p className="text-xs text-destructive">{errors.procedures}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="procedure_code">CPT Code</Label>
                <Input
                  id="procedure_code"
                  value={formData.procedure_code}
                  onChange={(e) => setFormData({ ...formData, procedure_code: e.target.value })}
                  placeholder="12345"
                />
              </div>
            </div>
          </div>

          {/* OR Scheduling Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">OR Scheduling (Optional)</h3>
            <p className="text-sm text-muted-foreground">
              Leave OR Date blank to add patient to add-on list
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="or_date">OR Date</Label>
                <Input
                  id="or_date"
                  type="date"
                  value={formData.or_date || ''}
                  onChange={(e) => setFormData({ ...formData, or_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="or_time">OR Time</Label>
                <Input
                  id="or_time"
                  type="time"
                  value={formData.or_time}
                  onChange={(e) => setFormData({ ...formData, or_time: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Status Section - Only show when editing */}
          {editingPatient && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Patient Status</h3>
              <div className="space-y-2">
                <Label htmlFor="status">Current Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="deficient">Deficient</SelectItem>
                    <SelectItem value="in_or">In OR</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Status workflow: Pending → Confirmed → In OR → Completed
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" className="min-w-[100px]">
              Save Patient
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PatientIntakeForm;
