import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  X,
  User,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Stethoscope,
  AlertCircle,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Activity,
  Phone,
  ClipboardList
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export const PatientDetailPanel = ({
  schedule,
  patient,
  onClose,
  onEdit,
  onCancelCase,
  onViewFullRecord,
  onUpdateChecklist
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [patientTasks, setPatientTasks] = useState([]);

  const checklist = patient?.prep_checklist || {
    consent_signed: false,
    labs_complete: false,
    imaging_complete: false,
    clearance_obtained: false
  };

  const checklistItems = [
    { key: 'consent_signed', label: 'Consent Signed', icon: FileText },
    { key: 'labs_complete', label: 'Labs Complete', icon: Activity },
    { key: 'imaging_complete', label: 'Imaging Complete', icon: Stethoscope },
    { key: 'clearance_obtained', label: 'Medical Clearance', icon: CheckCircle2 }
  ];

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const prepPercentage = (completedCount / 4) * 100;

  // Fetch related tasks for this patient
  useEffect(() => {
    const fetchPatientTasks = async () => {
      if (!patient?.mrn) return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/tasks?patient_mrn=${patient.mrn}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const tasks = await res.json();
          setPatientTasks(tasks.filter(t => t.patient_mrn === patient.mrn));
        }
      } catch (err) {
        console.error('Failed to fetch patient tasks', err);
      }
    };
    fetchPatientTasks();
  }, [patient?.mrn]);

  const handleCancelCase = async () => {
    if (!window.confirm('Are you sure you want to cancel this case? The patient will be returned to the Add-On list.')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await onCancelCase(schedule._id);
      toast.success('Case cancelled and returned to Add-On list');
      onClose();
    } catch (error) {
      toast.error('Failed to cancel case');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChecklistChange = async (item, checked) => {
    if (onUpdateChecklist) {
      await onUpdateChecklist(patient.mrn, item, checked);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div 
        className="bg-white w-full md:w-[600px] h-[90vh] md:h-auto md:max-h-[85vh] rounded-t-2xl md:rounded-2xl overflow-hidden shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-4 md:px-6 md:py-5 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {(schedule?.patient_name || 'UN').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg md:text-xl font-bold text-white truncate">
                  {schedule?.patient_name || patient?.patient_name}
                </h2>
                <p className="text-blue-100 text-sm">
                  ID: {schedule?.patient_mrn || patient?.mrn}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${getStatusColor(patient?.status || schedule?.status)} text-xs`}>
                    {patient?.status || schedule?.status || 'pending'}
                  </Badge>
                  {schedule?.priority && (
                    <Badge className={`${getPriorityColor(schedule.priority)} text-xs`}>
                      {schedule.priority}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Schedule Info */}
          <div className="px-4 py-4 md:px-6 border-b">
            <h3 className="font-semibold text-slate-900 mb-3 text-sm uppercase tracking-wide">Schedule Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">
                  {schedule?.scheduled_date 
                    ? format(parseISO(schedule.scheduled_date), 'EEEE, MMM d, yyyy')
                    : 'Not scheduled'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">
                  {schedule?.scheduled_time || 'No time set'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">
                  {schedule?.or_room || 'No OR assigned'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">
                  {schedule?.staff || 'No attending assigned'}
                </span>
              </div>
            </div>
          </div>

          {/* Diagnosis & Procedure */}
          <div className="px-4 py-4 md:px-6 border-b">
            <h3 className="font-semibold text-slate-900 mb-3 text-sm uppercase tracking-wide">Clinical Info</h3>
            <div className="space-y-3">
              {patient?.diagnosis && (
                <div>
                  <span className="text-xs text-slate-500 uppercase">Diagnosis</span>
                  <p className="text-slate-900 font-medium">{patient.diagnosis}</p>
                </div>
              )}
              {(schedule?.procedure || patient?.procedures) && (
                <div>
                  <span className="text-xs text-slate-500 uppercase">Procedure</span>
                  <p className="text-slate-900 font-medium">{schedule?.procedure || patient?.procedures}</p>
                </div>
              )}
              {patient?.procedure_code && (
                <div>
                  <span className="text-xs text-slate-500 uppercase">CPT Code</span>
                  <Badge variant="outline" className="font-mono">
                    {patient.procedure_code}
                  </Badge>
                </div>
              )}
              {patient?.dob && (
                <div>
                  <span className="text-xs text-slate-500 uppercase">Date of Birth</span>
                  <p className="text-slate-900">{patient.dob}</p>
                </div>
              )}
              {patient?.orthodontist && (
                <div>
                  <span className="text-xs text-slate-500 uppercase">Orthodontist</span>
                  <p className="text-slate-900 font-medium">{patient.orthodontist}</p>
                </div>
              )}
            </div>
          </div>

          {/* Pre-Op Checklist */}
          <div className="px-4 py-4 md:px-6 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">Pre-Op Checklist</h3>
              <span className="text-sm text-slate-500">{completedCount}/4 complete</span>
            </div>
            <div className="mb-3">
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    prepPercentage === 100 ? 'bg-green-500' : 
                    prepPercentage >= 50 ? 'bg-teal-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${prepPercentage}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              {checklistItems.map(item => {
                const Icon = item.icon;
                return (
                  <label 
                    key={item.key}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={checklist[item.key] || false}
                      onCheckedChange={(checked) => handleChecklistChange(item.key, checked)}
                      className="h-5 w-5"
                    />
                    <Icon className="h-4 w-4 text-slate-400" />
                    <span className={`text-sm ${checklist[item.key] ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                      {item.label}
                    </span>
                    {checklist[item.key] && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Related Tasks */}
          {patientTasks.length > 0 && (
            <div className="px-4 py-4 md:px-6 border-b">
              <h3 className="font-semibold text-slate-900 mb-3 text-sm uppercase tracking-wide">
                Related Tasks ({patientTasks.length})
              </h3>
              <div className="space-y-2">
                {patientTasks.slice(0, 5).map(task => (
                  <div 
                    key={task._id} 
                    className={`p-2 rounded-lg text-sm ${task.completed ? 'bg-green-50' : 'bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-2">
                      {task.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      )}
                      <span className={task.completed ? 'line-through text-slate-500' : 'text-slate-700'}>
                        {task.task_description}
                      </span>
                    </div>
                    {task.due_date && (
                      <div className="text-xs text-slate-500 ml-6 mt-0.5">
                        Due: {format(parseISO(task.due_date), 'MMM d')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {schedule?.notes && (
            <div className="px-4 py-4 md:px-6 border-b">
              <h3 className="font-semibold text-slate-900 mb-2 text-sm uppercase tracking-wide">Notes</h3>
              <p className="text-slate-600 text-sm whitespace-pre-wrap">{schedule.notes}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-4 py-4 md:px-6 border-t bg-slate-50 flex-shrink-0">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={() => onEdit && onEdit(schedule)}
              className="h-11 md:h-10 text-sm"
            >
              <Edit2 className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelCase}
              disabled={isLoading}
              className="h-11 md:h-10 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
            <Button
              onClick={() => onViewFullRecord && onViewFullRecord(patient)}
              className="h-11 md:h-10 text-sm bg-blue-500 hover:bg-blue-600"
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Full Record
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetailPanel;
