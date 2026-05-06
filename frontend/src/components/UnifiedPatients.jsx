import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { format, parseISO, isPast, isToday, differenceInDays } from 'date-fns';
import { getAuthHeaders as getAuth } from '../utils/auth';
import DiagnosisAutocomplete from './DiagnosisAutocomplete';
import CPTCodeAutocomplete from './CPTCodeAutocomplete';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Download,
  Plus,
  User,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Trash2,
  Edit2,
  ListTodo,
  ClipboardCheck,
  Activity,
  MoreVertical
} from 'lucide-react';
import PageLayout from './PageLayout';
import PullToRefresh from './PullToRefresh';
import { TaskCategorySelect, TaskCategoryBadge } from './TaskCategorySelect';
import ImagingDropdown from './ImagingDropdown';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Patient category definitions — maps keywords in diagnosis/procedure to categories
const PATIENT_CATEGORIES = {
  oncology: {
    label: 'Oncology/Free Flaps',
    color: 'bg-rose-600',
    lightBg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-l-rose-600',
    avatar: 'from-rose-500 to-rose-700',
    keywords: ['malignancy', 'malignant', 'carcinoma', 'cancer', 'oncology', 'free flap', 'fibula free', 'radial forearm', 'scapula flap', 'osteocutaneous', 'osteoradionecrosis', 'orn', 'squamous cell', 'metastatic', 'lymphoma', 'sarcoma', 'reconstruction flap'],
  },
  feminization: {
    label: 'Facial Feminization',
    color: 'bg-fuchsia-500',
    lightBg: 'bg-fuchsia-50',
    text: 'text-fuchsia-700',
    border: 'border-l-fuchsia-500',
    avatar: 'from-fuchsia-400 to-fuchsia-600',
    keywords: ['feminization', 'ffs', 'forehead contouring', 'frontal sinus', 'brow bone', 'tracheal shave', 'jaw contouring', 'chin feminization', 'hairline lowering', 'facial feminization'],
  },
  orthognathic: {
    label: 'Orthognathic',
    color: 'bg-violet-500',
    lightBg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-l-violet-500',
    avatar: 'from-violet-400 to-violet-600',
    keywords: ['orthognathic', 'le fort', 'bsso', 'mandibular', 'maxillary osteotomy', 'jaw surgery', 'sagittal split', 'maxillary hypoplasia', 'mandibular hyperplasia', 'hypoplasia'],
  },
  dentoalveolar: {
    label: 'Dentoalveolar',
    color: 'bg-sky-500',
    lightBg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-l-sky-500',
    avatar: 'from-sky-400 to-sky-600',
    keywords: ['extraction', 'wisdom', 'third molar', 'impacted', 'dentoalveolar', 'exodontia', 'tooth removal'],
  },
  trauma: {
    label: 'Trauma',
    color: 'bg-red-500',
    lightBg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-l-red-500',
    avatar: 'from-red-400 to-red-600',
    keywords: ['fracture', 'trauma', 'orif', 'zygomatic', 'nasal', 'mandible fracture', 'orbital', 'lef ort'],
  },
  pathology: {
    label: 'Pathology',
    color: 'bg-amber-500',
    lightBg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-l-amber-500',
    avatar: 'from-amber-400 to-amber-600',
    keywords: ['biopsy', 'lesion', 'cyst', 'tumor', 'ameloblastoma', 'odontogenic', 'pathology', 'excision', 'benign'],
  },
  implants: {
    label: 'Implants',
    color: 'bg-emerald-500',
    lightBg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-l-emerald-500',
    avatar: 'from-emerald-400 to-emerald-600',
    keywords: ['implant', 'bone graft', 'sinus lift', 'ridge augmentation', 'alveolar graft'],
  },
  tmj: {
    label: 'TMJ',
    color: 'bg-pink-500',
    lightBg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-l-pink-500',
    avatar: 'from-pink-400 to-pink-600',
    keywords: ['tmj', 'temporomandibular', 'arthroplasty', 'arthroscopy', 'disc'],
  },
  cleft: {
    label: 'Cleft/Craniofacial',
    color: 'bg-indigo-500',
    lightBg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-l-indigo-500',
    avatar: 'from-indigo-400 to-indigo-600',
    keywords: ['cleft', 'palate', 'craniofacial', 'craniosynostosis', 'distraction'],
  },
  other: {
    label: 'Other',
    color: 'bg-slate-400',
    lightBg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-l-slate-400',
    avatar: 'from-teal-400 to-teal-600',
    keywords: [],
  },
};

function classifyPatient(patient) {
  const searchText = [
    patient.diagnosis,
    patient.procedures,
    patient.procedure_code,
  ].filter(Boolean).join(' ').toLowerCase();

  for (const [key, cat] of Object.entries(PATIENT_CATEGORIES)) {
    if (key === 'other') continue;
    if (cat.keywords.some(kw => searchText.includes(kw))) {
      return key;
    }
  }
  return 'other';
}

// Pre-op checklist item component - handles both regular items and imaging dropdown
const PreOpChecklistItem = ({ item, onToggle, onImagingChange, onDelete, onUpdateDetails, disabled }) => {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(item.notes || '');
  const [dateVal, setDateVal] = useState(item.date || '');

  // Special handling for imaging dropdown
  if (item.type === 'dropdown' && item.id === 'imaging') {
    return (
      <div className="space-y-1">
        <div className="rounded-lg bg-slate-50 border border-slate-200">
          <ImagingDropdown
            selection={item.selection || []}
            onSelectionChange={onImagingChange}
            disabled={disabled}
          />
        </div>
        <div className="flex items-center gap-2 pl-2">
          <input
            type="date"
            value={dateVal}
            onChange={(e) => setDateVal(e.target.value)}
            onBlur={() => {
              if (dateVal !== (item.date || '')) {
                onUpdateDetails(item.id, { date: dateVal || null });
              }
            }}
            className="h-8 px-2 rounded border border-slate-200 text-xs text-slate-700 w-[140px]"
            placeholder="Date taken"
            title="Date imaging taken"
          />
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              if (notes !== (item.notes || '')) {
                onUpdateDetails(item.id, { notes });
              }
            }}
            className="h-8 px-2 rounded border border-slate-200 text-xs text-slate-600 flex-1"
            placeholder="Add notes..."
          />
        </div>
      </div>
    );
  }

  const isCustom = item.default === false;

  // Date label based on item type
  const getDatePlaceholder = () => {
    if (item.id === 'prior_auth') return 'Approval/expiry date';
    if (item.id === 'or_scheduled') return 'Scheduled date';
    if (item.id === 'vsp_complete') return 'Completion date';
    if (item.id === 'ortho_approval') return 'Approval date';
    return 'Date';
  };

  // Regular checkbox item with expandable details
  return (
    <div className="rounded-lg hover:bg-slate-50 transition-colors">
      <div 
        className={`flex items-center gap-3 p-2 cursor-pointer min-h-[44px] ${item.checked ? 'bg-green-50 rounded-lg' : ''}`}
        data-testid={`checklist-item-${item.id}`}
      >
        <div onClick={(e) => { e.stopPropagation(); !disabled && onToggle(item.id); }}>
          <Checkbox 
            checked={item.checked} 
            className="h-5 w-5 shrink-0"
            disabled={disabled}
          />
        </div>
        <span 
          className={`text-sm flex-1 ${item.checked ? 'text-green-700 line-through' : 'text-slate-700'}`}
          onClick={() => setExpanded(!expanded)}
        >
          {item.item}
        </span>
        {(item.date || item.notes) && !expanded && (
          <span className="text-xs text-slate-400 truncate max-w-[200px]">
            {item.date && format(parseISO(item.date), 'MM/dd/yy')}
            {item.date && item.notes && ' • '}
            {item.notes}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200 text-slate-400 transition-colors"
          title="Edit details"
          data-testid={`checklist-expand-${item.id}`}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        {isCustom && (
          <button
            data-testid={`checklist-delete-${item.id}`}
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
            title="Remove item"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {expanded && (
        <div className="flex items-center gap-2 px-2 pb-2 pt-1 ml-8">
          <input
            type="date"
            value={dateVal}
            onChange={(e) => setDateVal(e.target.value)}
            onBlur={() => {
              if (dateVal !== (item.date || '')) {
                onUpdateDetails(item.id, { date: dateVal || null });
              }
            }}
            className="h-8 px-2 rounded border border-slate-200 text-xs text-slate-700 w-[140px]"
            placeholder={getDatePlaceholder()}
            title={getDatePlaceholder()}
            data-testid={`checklist-date-${item.id}`}
          />
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              if (notes !== (item.notes || '')) {
                onUpdateDetails(item.id, { notes });
              }
            }}
            className="h-8 px-2 rounded border border-slate-200 text-xs text-slate-600 flex-1"
            placeholder="Add notes..."
            data-testid={`checklist-notes-${item.id}`}
          />
        </div>
      )}
    </div>
  );
};

// Task status helpers
const getTaskStatus = (task) => {
  if (task.completed) return 'completed';
  if (!task.due_date) return 'pending';
  const dueDate = parseISO(task.due_date);
  if (isPast(dueDate) && !isToday(dueDate)) return 'overdue';
  if (isToday(dueDate)) return 'due-today';
  const daysUntilDue = differenceInDays(dueDate, new Date());
  if (daysUntilDue <= 3) return 'urgent';
  return 'pending';
};

const getStatusInfo = (status) => {
  switch (status) {
    case 'completed': return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: 'Done' };
    case 'overdue': return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Overdue' };
    case 'due-today': return { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Today' };
    case 'urgent': return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Soon' };
    default: return { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Pending' };
  }
};

// Task item within patient expanded view
const TaskItem = ({ task, onToggle, onDelete }) => {
  const status = getTaskStatus(task);
  const statusInfo = getStatusInfo(status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${task.completed ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}`}>
      <Checkbox 
        checked={task.completed} 
        onCheckedChange={() => onToggle(task._id)}
        className="h-5 w-5"
      />
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${task.completed ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
          {task.task_description}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge className={`${statusInfo.bg} ${statusInfo.color} px-1.5 py-0 text-[10px] rounded-full flex items-center gap-0.5`}>
            <StatusIcon className="h-3 w-3" />
            {statusInfo.label}
          </Badge>
          <TaskCategoryBadge category={task.task_category} taskType={task.task_type} />
          {task.due_date && (
            <span className="text-xs text-slate-500">
              Due: {format(parseISO(task.due_date), 'MMM d')}
            </span>
          )}
          {task.assigned_to && (
            <span className="text-xs text-slate-500">• {task.assigned_to}</span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(task._id)}
        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

// Add Task Form (inline) — free-text task name, optional category
const AddTaskForm = ({ patient, onSubmit, onCancel }) => {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [taskType, setTaskType] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Task name is required');
      return;
    }
    onSubmit({
      patient_mrn: patient.mrn,
      patient_name: patient.patient_name,
      task_description: description,
      task_category: category || 'other',
      task_type: taskType || description,
      due_date: dueDate || null,
      urgency,
      notes: notes || null,
    });
    setDescription('');
    setCategory('');
    setTaskType('');
    setDueDate('');
    setNotes('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3" data-testid="add-task-form">
      <div className="flex items-center gap-2">
        <Plus className="h-4 w-4 text-teal-600" />
        <span className="text-sm font-medium text-slate-700">Add Task for {patient.patient_name}</span>
      </div>
      <Input
        data-testid="task-name-input"
        placeholder="Task name — type anything: Clear with PCP, Order coags, etc."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="h-11 md:h-10"
        autoFocus
      />
      <div className="grid grid-cols-2 gap-2">
        <TaskCategorySelect
          value={{ category, taskType }}
          onChange={({ category: c, taskType: t }) => {
            setCategory(c);
            setTaskType(t);
          }}
        />
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="h-11 md:h-10"
        />
      </div>
      <div className="flex items-center gap-2">
        <select
          value={urgency}
          onChange={(e) => setUrgency(e.target.value)}
          className="h-11 md:h-10 px-3 rounded-lg border border-slate-200 text-sm flex-1"
        >
          <option value="low">Routine</option>
          <option value="medium">Medium</option>
          <option value="high">Urgent</option>
          <option value="urgent">STAT</option>
        </select>
        <Button type="button" variant="outline" onClick={onCancel} className="h-11 md:h-10">Cancel</Button>
        <Button type="submit" className="h-11 md:h-10 bg-teal-500 hover:bg-teal-600 text-white" data-testid="add-task-submit">Add</Button>
      </div>
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none h-16"
      />
    </form>
  );
};

// Expanded Patient Detail Panel
const PatientExpandedView = ({ 
  patient, 
  onToggleChecklistItem,
  onUpdateImagingSelection, 
  onToggleTask, 
  onDeleteTask, 
  onAddTask,
  onAddChecklistItem,
  onDeleteChecklistItem,
  onUpdateAppointmentDates,
  onUpdatePatientDetails,
  onUpdateChecklistDetails,
  onScheduleOR,
  checklistLoading 
}) => {
  const [showAddTask, setShowAddTask] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [lastClinicDate, setLastClinicDate] = useState(patient.last_clinic_appointment || '');
  const [recordsDate, setRecordsDate] = useState(patient.records_appointment || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    patient_name: patient.patient_name || '',
    dob: patient.dob || '',
    attending: patient.attending || '',
    orthodontist: patient.orthodontist || '',
    phone_number: patient.phone_number || '',
    diagnosis: patient.diagnosis || '',
    procedures: patient.procedures || '',
  });
  
  // Get preop checklist
  const preopChecklist = Array.isArray(patient.preop_checklist) 
    ? patient.preop_checklist 
    : [];
  
  // Calculate progress dynamically (default + custom items)
  const checkedCount = preopChecklist.filter(item => item.checked).length;
  const totalCount = preopChecklist.length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const tasks = patient.tasks || [];
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  const handleAddChecklistItem = () => {
    const text = newChecklistItem.trim();
    if (!text) return;
    onAddChecklistItem(patient.mrn, text);
    setNewChecklistItem('');
  };

  return (
    <div className="bg-slate-50 border-t border-slate-200 p-4 md:p-6 space-y-6">
      {/* Patient Details Section */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <User className="h-4 w-4 text-teal-600" />
            Patient Details
          </h4>
          {!isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              data-testid="edit-patient-btn"
              className="h-8 px-3 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50"
            >
              <Edit2 className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({
                    patient_name: patient.patient_name || '',
                    dob: patient.dob || '',
                    attending: patient.attending || '',
                    orthodontist: patient.orthodontist || '',
                    phone_number: patient.phone_number || '',
                    diagnosis: patient.diagnosis || '',
                    procedures: patient.procedures || '',
                  });
                }}
                className="h-8 px-3 text-xs text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onUpdatePatientDetails(patient.mrn, editForm);
                  setIsEditing(false);
                }}
                data-testid="save-patient-btn"
                className="h-8 px-3 text-xs bg-teal-500 hover:bg-teal-600 text-white"
              >
                Save
              </Button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <label className="text-slate-500 text-xs block mb-1">Patient Name</label>
              <input
                type="text"
                value={editForm.patient_name}
                onChange={(e) => setEditForm({ ...editForm, patient_name: e.target.value })}
                className="h-9 px-3 rounded-md border border-slate-200 text-sm w-full"
                data-testid="edit-patient-name"
              />
            </div>
            <div>
              <label className="text-slate-500 text-xs block mb-1">Date of Birth</label>
              <input
                type="date"
                value={editForm.dob}
                onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                className="h-9 px-3 rounded-md border border-slate-200 text-sm w-full"
                data-testid="edit-patient-dob"
              />
            </div>
            <div>
              <label className="text-slate-500 text-xs block mb-1">Attending</label>
              <input
                type="text"
                value={editForm.attending}
                onChange={(e) => setEditForm({ ...editForm, attending: e.target.value })}
                className="h-9 px-3 rounded-md border border-slate-200 text-sm w-full"
                data-testid="edit-patient-attending"
              />
            </div>
            <div>
              <label className="text-slate-500 text-xs block mb-1">Orthodontist</label>
              <input
                type="text"
                value={editForm.orthodontist}
                onChange={(e) => setEditForm({ ...editForm, orthodontist: e.target.value })}
                className="h-9 px-3 rounded-md border border-slate-200 text-sm w-full"
                data-testid="edit-patient-orthodontist"
              />
            </div>
            <div>
              <label className="text-slate-500 text-xs block mb-1">Phone Number</label>
              <input
                type="tel"
                value={editForm.phone_number}
                onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                className="h-9 px-3 rounded-md border border-slate-200 text-sm w-full"
                placeholder="(555) 123-4567"
                data-testid="edit-patient-phone"
              />
            </div>
            <div className="md:col-span-2 relative z-30">
              <label className="text-slate-500 text-xs block mb-1">Diagnosis</label>
              <DiagnosisAutocomplete
                value={editForm.diagnosis}
                onChange={(diagObj) => setEditForm({ ...editForm, diagnosis: typeof diagObj === 'string' ? diagObj : (diagObj?.name || '') })}
                data-testid="edit-patient-diagnosis"
              />
            </div>
            <div className="md:col-span-2 relative z-20">
              <label className="text-slate-500 text-xs block mb-1">Procedure / CPT Code</label>
              {/* Show existing procedures as editable list */}
              {editForm.procedures && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {editForm.procedures.split(';').map((proc, idx) => {
                    const trimmed = proc.trim();
                    if (!trimmed) return null;
                    return (
                      <span key={`${trimmed}-${idx}`} className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded-full border border-teal-200">
                        {trimmed}
                        <button
                          type="button"
                          onClick={() => {
                            const procs = editForm.procedures.split(';').map(p => p.trim()).filter(p => p);
                            procs.splice(idx, 1);
                            setEditForm({ ...editForm, procedures: procs.join('; ') });
                          }}
                          className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-teal-200 text-teal-600"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <CPTCodeAutocomplete
                value=""
                onChange={(code, description) => {
                  const newProc = description || code || '';
                  if (!newProc) return;
                  const existing = editForm.procedures;
                  if (existing) {
                    const procs = existing.split(';').map(p => p.trim()).filter(p => p);
                    if (!procs.includes(newProc)) {
                      setEditForm({ ...editForm, procedures: [...procs, newProc].join('; ') });
                    }
                  } else {
                    setEditForm({ ...editForm, procedures: newProc });
                  }
                }}
                diagnosis={editForm.diagnosis}
                data-testid="edit-patient-procedures"
              />
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-slate-500">MRN:</span>
            <span className="ml-2 font-medium text-slate-900">{patient.mrn}</span>
          </div>
          <div>
            <span className="text-slate-500">DOB:</span>
            <span className="ml-2 font-medium text-slate-900">
              {patient.dob ? format(parseISO(patient.dob), 'MM/dd/yyyy') : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Attending:</span>
            <span className="ml-2 font-medium text-slate-900">{patient.attending || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-500">Orthodontist:</span>
            <span className="ml-2 font-medium text-slate-900">{patient.orthodontist || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-500">Phone:</span>
            <span className="ml-2 font-medium text-slate-900">{patient.phone_number || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-500">Surgery Date:</span>
            <span className="ml-2 font-medium text-slate-900">
              {patient.scheduled_date ? format(parseISO(patient.scheduled_date), 'MMM d, yyyy') : 
               patient.schedule?.scheduled_date ? format(parseISO(patient.schedule.scheduled_date), 'MMM d, yyyy') : 'Not scheduled'}
            </span>
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className="text-slate-500 block mb-1">OR Date (linked to Calendar):</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                data-testid="or-date-picker"
                value={patient.scheduled_date || patient.schedule?.scheduled_date || ''}
                onChange={(e) => {
                  onScheduleOR(patient.mrn, patient.patient_name, e.target.value, patient.procedures);
                }}
                className="h-9 px-2 rounded-md border border-slate-200 text-sm text-slate-900 w-[180px]"
              />
              <CalendarIcon className="h-4 w-4 text-teal-500" />
              <span className="text-xs text-slate-400">Sets date on Calendar</span>
            </div>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500">Diagnosis:</span>
            <span className="ml-2 font-medium text-slate-900">{patient.diagnosis || 'N/A'}</span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500">Procedure:</span>
            <span className="ml-2 font-medium text-slate-900">{patient.procedures || 'N/A'}</span>
          </div>
          <div className="col-span-2">
            <label className="text-slate-500 block mb-1">Last Clinic Appointment:</label>
            <input
              type="date"
              data-testid="last-clinic-appointment"
              value={lastClinicDate}
              onChange={(e) => setLastClinicDate(e.target.value)}
              onBlur={() => {
                if (lastClinicDate !== (patient.last_clinic_appointment || '')) {
                  onUpdateAppointmentDates(patient.mrn, { last_clinic_appointment: lastClinicDate || null });
                }
              }}
              className="h-9 px-2 rounded-md border border-slate-200 text-sm text-slate-900 w-full max-w-[200px]"
            />
          </div>
          <div className="col-span-2">
            <label className="text-slate-500 block mb-1">Records Appointment (VSP):</label>
            <input
              type="date"
              data-testid="records-appointment"
              value={recordsDate}
              onChange={(e) => setRecordsDate(e.target.value)}
              onBlur={() => {
                if (recordsDate !== (patient.records_appointment || '')) {
                  onUpdateAppointmentDates(patient.mrn, { records_appointment: recordsDate || null });
                }
              }}
              className="h-9 px-2 rounded-md border border-slate-200 text-sm text-slate-900 w-full max-w-[200px]"
            />
          </div>
        </div>
        )}
      </div>

      {/* Pre-Op Checklist Section */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-teal-600" />
            Pre-Op Checklist
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">{checkedCount}/{totalCount}</span>
            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${progressPercent === 100 ? 'bg-green-500' : progressPercent >= 50 ? 'bg-teal-500' : 'bg-orange-500'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-sm font-medium text-slate-700">{progressPercent}%</span>
          </div>
        </div>
        
        {preopChecklist.length > 0 ? (
          <div className="space-y-1">
            {preopChecklist.map((item) => (
              <PreOpChecklistItem
                key={item.id}
                item={item}
                onToggle={onToggleChecklistItem}
                onImagingChange={(selection) => onUpdateImagingSelection(patient.mrn, selection)}
                onDelete={(itemId) => onDeleteChecklistItem(patient.mrn, itemId)}
                onUpdateDetails={(itemId, updates) => onUpdateChecklistDetails(patient.mrn, itemId, updates)}
                disabled={checklistLoading}
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500 italic">
            No checklist items available
          </div>
        )}

        {/* Add custom checklist item */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <Input
            data-testid="add-checklist-item-input"
            placeholder="+ Add checklist item"
            value={newChecklistItem}
            onChange={(e) => setNewChecklistItem(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddChecklistItem(); } }}
            className="h-11 md:h-9 flex-1 text-sm"
          />
          <Button
            data-testid="add-checklist-item-btn"
            type="button"
            size="sm"
            disabled={!newChecklistItem.trim() || checklistLoading}
            onClick={handleAddChecklistItem}
            className="h-11 md:h-9 px-4 bg-teal-500 hover:bg-teal-600 text-white shrink-0"
          >
            Add
          </Button>
        </div>
      </div>

      {/* Activity Log Section */}
      {patient.activity_log && patient.activity_log.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-600" />
            Activity Log
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {patient.activity_log.slice(-5).reverse().map((log, idx) => (
              <div key={`${log.timestamp}-${idx}`} className="text-xs text-slate-600 flex items-start gap-2">
                <span className="text-slate-400 whitespace-nowrap">
                  {log.timestamp ? format(parseISO(log.timestamp), 'MMM d, h:mm a') : 'N/A'}
                </span>
                <span>{log.details} — {log.user}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Patient Row Component
const PatientRow = ({ 
  patient, 
  isExpanded, 
  onToggleExpand, 
  onDelete,
  onToggleChecklistItem,
  onUpdateImagingSelection,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  onAddChecklistItem,
  onDeleteChecklistItem,
  onUpdateAppointmentDates,
  onUpdatePatientDetails,
  onUpdateChecklistDetails,
  onScheduleOR,
  checklistLoading
}) => {
  const categoryKey = classifyPatient(patient);
  const catStyle = PATIENT_CATEGORIES[categoryKey];
  const tasks = patient.tasks || [];
  const pendingTaskCount = tasks.filter(t => !t.completed).length;
  
  // Calculate progress dynamically
  const preopChecklist = Array.isArray(patient.preop_checklist) ? patient.preop_checklist : [];
  const checkedCount = preopChecklist.filter(item => item.checked).length;
  const totalCount = preopChecklist.length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  // Get surgery date
  const surgeryDate = patient.scheduled_date || patient.schedule?.scheduled_date;

  // Status badge
  const getStatusBadge = () => {
    const status = patient.status || 'pending';
    const statusMap = {
      'add-on': { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Add-On' },
      'scheduled': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled' },
      'pending': { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Pending' },
      'confirmed': { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmed' },
      'completed': { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Completed' },
      'in_or': { bg: 'bg-purple-100', text: 'text-purple-700', label: 'In OR' },
    };
    const s = statusMap[status] || statusMap.pending;
    return <Badge className={`${s.bg} ${s.text} text-xs px-2 py-0.5`}>{s.label}</Badge>;
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm border-l-4 ${catStyle.border}`}>
      {/* Collapsed Row */}
      <div 
        className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggleExpand}
      >
        {/* Mobile Layout */}
        <div className="md:hidden space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-gradient-to-br ${catStyle.avatar} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0`}>
                {patient.patient_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'}
              </div>
              <div>
                <div className="font-semibold text-slate-900">{patient.patient_name}</div>
                <div className="text-xs text-slate-500">MRN: {patient.mrn}</div>
              </div>
            </div>
            {getStatusBadge()}
          </div>
          
          <div className="text-sm text-slate-600 truncate">
            {patient.diagnosis ? `${patient.diagnosis} → ` : ''}{patient.procedures || 'No procedure'}
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${progressPercent === 100 ? 'bg-green-500' : progressPercent >= 50 ? 'bg-teal-500' : 'bg-orange-500'}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-slate-600">{checkedCount}/{totalCount}</span>
              </div>
              {pendingTaskCount > 0 && (
                <Badge className="bg-orange-100 text-orange-700 text-[10px] px-1.5">{pendingTaskCount} tasks</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {surgeryDate && (
                <span className="text-slate-500">{format(parseISO(surgeryDate), 'MMM d')}</span>
              )}
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex items-center gap-4">
          <div className={`w-10 h-10 bg-gradient-to-br ${catStyle.avatar} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0`}>
            {patient.patient_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'}
          </div>
          
          <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
            <div className="col-span-2">
              <div className="font-semibold text-slate-900 truncate">{patient.patient_name}</div>
              <div className="text-xs text-slate-500">MRN: {patient.mrn}</div>
            </div>
            
            <div className="col-span-2 text-sm text-slate-600 truncate" title={patient.diagnosis}>
              {patient.diagnosis || 'N/A'}
            </div>
            
            <div className="col-span-2 text-sm text-slate-600 truncate" title={patient.procedures}>
              {patient.procedures || 'N/A'}
            </div>
            
            <div className="col-span-1">
              {getStatusBadge()}
            </div>
            
            <div className="col-span-1">
              <div className="flex items-center gap-1">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${progressPercent === 100 ? 'bg-green-500' : progressPercent >= 50 ? 'bg-teal-500' : 'bg-orange-500'}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs text-slate-600">{checkedCount}/{totalCount}</span>
              </div>
            </div>

            <div className="col-span-1 text-xs text-slate-600">
              {patient.last_clinic_appointment ? format(parseISO(patient.last_clinic_appointment), 'MM/dd') : '—'}
            </div>

            <div className="col-span-1 text-xs text-slate-600">
              {patient.records_appointment ? format(parseISO(patient.records_appointment), 'MM/dd') : '—'}
            </div>
            
            <div className="col-span-1 text-center">
              {pendingTaskCount > 0 ? (
                <Badge className="bg-orange-100 text-orange-700 text-xs">{pendingTaskCount}</Badge>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )}
            </div>
            
            <div className="col-span-1 text-sm text-slate-600">
              {surgeryDate ? format(parseISO(surgeryDate), 'MMM d') : '—'}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {/* Expanded Panel */}
      {isExpanded && (
        <PatientExpandedView
          patient={patient}
          onToggleChecklistItem={onToggleChecklistItem}
          onUpdateImagingSelection={onUpdateImagingSelection}
          onToggleTask={onToggleTask}
          onDeleteTask={onDeleteTask}
          onAddTask={onAddTask}
          onAddChecklistItem={onAddChecklistItem}
          onDeleteChecklistItem={onDeleteChecklistItem}
          onUpdateAppointmentDates={onUpdateAppointmentDates}
          onUpdatePatientDetails={onUpdatePatientDetails}
          onUpdateChecklistDetails={onUpdateChecklistDetails}
          onScheduleOR={onScheduleOR}
          checklistLoading={checklistLoading}
        />
      )}
    </div>
  );
};

// Main Component
export const UnifiedPatients = ({ onNavigate, initialFilter, user, onLogout }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState(initialFilter?.status || 'all');
  const [filterTasks, setFilterTasks] = useState(initialFilter?.hasTasks ? 'has-tasks' : 'all');
  const [filterAttending, setFilterAttending] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterProcedure, setFilterProcedure] = useState('all');
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [sortBy, setSortBy] = useState('created_at');
  const [expandedPatient, setExpandedPatient] = useState(null);
  const [checklistLoading, setChecklistLoading] = useState(false);

  const getAuthHeaders = () => ({
    ...getAuth(),
    'Content-Type': 'application/json',
  });

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/patients/with-tasks`, { 
        headers: getAuthHeaders() 
      });
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      } else {
        toast.error('Failed to load patients');
      }
    } catch (error) {
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    await fetchData();
    toast.success('Refreshed', { duration: 1500 });
  }, [fetchData]);

  // Toggle pre-op checklist item
  const handleToggleChecklistItem = async (patientMrn, itemId) => {
    setChecklistLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/patients/${patientMrn}/preop-checklist/${itemId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const result = await response.json();
        // Update local state
        setPatients(prev => prev.map(p => {
          if (p.mrn === patientMrn && Array.isArray(p.preop_checklist)) {
            return {
              ...p,
              preop_checklist: p.preop_checklist.map(item => 
                item.id === itemId ? { ...item, checked: result.checked } : item
              )
            };
          }
          return p;
        }));
      } else {
        toast.error('Failed to update checklist');
      }
    } catch (error) {
      toast.error('Failed to update checklist');
    } finally {
      setChecklistLoading(false);
    }
  };

  // Toggle task completion
  const handleToggleTask = async (taskId) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}/toggle`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const result = await response.json();
        setPatients(prev => prev.map(p => ({
          ...p,
          tasks: p.tasks?.map(t => 
            t._id === taskId ? { ...t, completed: result.completed } : t
          )
        })));
        toast.success(result.completed ? 'Task completed!' : 'Task reopened');
      }
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        setPatients(prev => prev.map(p => ({
          ...p,
          tasks: p.tasks?.filter(t => t._id !== taskId)
        })));
        toast.success('Task deleted');
      }
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  // Add task
  const handleAddTask = async (taskData) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...taskData,
          assigned_to: user?.full_name || 'Unassigned',
          assigned_to_email: user?.email,
          status: 'pending',
          completed: false
        }),
      });
      if (response.ok) {
        const newTask = await response.json();
        setPatients(prev => prev.map(p => 
          p.mrn === taskData.patient_mrn 
            ? { ...p, tasks: [...(p.tasks || []), newTask] }
            : p
        ));
        toast.success('Task added');
      }
    } catch (error) {
      toast.error('Failed to add task');
    }
  };

  // Add custom checklist item
  const handleAddChecklistItem = async (patientMrn, itemText) => {
    setChecklistLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/patients/${patientMrn}/preop-checklist/custom-item`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ item: itemText }),
      });
      if (response.ok) {
        const result = await response.json();
        setPatients(prev => prev.map(p => {
          if (p.mrn === patientMrn) {
            return { ...p, preop_checklist: [...(p.preop_checklist || []), result.item] };
          }
          return p;
        }));
        toast.success('Checklist item added');
      } else {
        toast.error('Failed to add checklist item');
      }
    } catch (error) {
      toast.error('Failed to add checklist item');
    } finally {
      setChecklistLoading(false);
    }
  };

  // Delete custom checklist item
  const handleDeleteChecklistItem = async (patientMrn, itemId) => {
    setChecklistLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/patients/${patientMrn}/preop-checklist/custom-item/${itemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        setPatients(prev => prev.map(p => {
          if (p.mrn === patientMrn) {
            return { ...p, preop_checklist: (p.preop_checklist || []).filter(i => i.id !== itemId) };
          }
          return p;
        }));
        toast.success('Checklist item removed');
      } else {
        toast.error('Failed to remove checklist item');
      }
    } catch (error) {
      toast.error('Failed to remove checklist item');
    } finally {
      setChecklistLoading(false);
    }
  };

  // Delete patient
  const handleDeletePatient = async (mrn, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      const response = await fetch(`${API_URL}/api/patients/${mrn}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        setPatients(prev => prev.filter(p => p.mrn !== mrn));
        toast.success(`${name} deleted`);
      }
    } catch (error) {
      toast.error('Failed to delete patient');
    }
  };

  // Update appointment dates
  const handleUpdateAppointmentDates = async (patientMrn, dateUpdates) => {
    try {
      const response = await fetch(`${API_URL}/api/patients/${patientMrn}/appointment-dates`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(dateUpdates),
      });
      if (response.ok) {
        setPatients(prev => prev.map(p => {
          if (p.mrn === patientMrn) {
            return { ...p, ...dateUpdates };
          }
          return p;
        }));
        toast.success('Appointment date updated');
      } else {
        toast.error('Failed to update appointment date');
      }
    } catch (error) {
      toast.error('Failed to update appointment date');
    }
  };

  // Update patient details (name, dob, attending, orthodontist, diagnosis, procedures)
  const handleUpdatePatientDetails = async (patientMrn, updates) => {
    try {
      const response = await fetch(`${API_URL}/api/patients/${patientMrn}/details`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        setPatients(prev => prev.map(p => {
          if (p.mrn === patientMrn) {
            return { ...p, ...updates };
          }
          return p;
        }));
        toast.success('Patient details updated');
      } else {
        toast.error('Failed to update patient details');
      }
    } catch (error) {
      toast.error('Failed to update patient details');
    }
  };

  // Update checklist item details (date, notes)
  const handleUpdateChecklistDetails = async (patientMrn, itemId, updates) => {
    try {
      const response = await fetch(`${API_URL}/api/patients/${patientMrn}/checklist-item-details`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ item_id: itemId, ...updates }),
      });
      if (response.ok) {
        setPatients(prev => prev.map(p => {
          if (p.mrn === patientMrn) {
            const updatedChecklist = (p.preop_checklist || []).map(item => {
              if (item.id === itemId) {
                return { ...item, ...updates };
              }
              return item;
            });
            return { ...p, preop_checklist: updatedChecklist };
          }
          return p;
        }));
        toast.success('Checklist details updated', { duration: 1500 });
      } else {
        toast.error('Failed to update checklist details');
      }
    } catch (error) {
      toast.error('Failed to update checklist details');
    }
  };

  // Schedule OR — creates/updates a calendar schedule entry and updates patient
  const handleScheduleOR = async (patientMrn, patientName, orDate, procedure) => {
    if (!orDate) return;
    try {
      // Create schedule entry linked to calendar
      const scheduleRes = await fetch(`${API_URL}/api/schedules`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          patient_mrn: patientMrn,
          patient_name: patientName,
          scheduled_date: orDate,
          procedure_description: procedure || '',
          or_number: '',
          status: 'scheduled',
        }),
      });
      
      // Also update the patient's scheduled_date
      await fetch(`${API_URL}/api/patients/${patientMrn}/details`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ scheduled_date: orDate }),
      });

      if (scheduleRes.ok) {
        setPatients(prev => prev.map(p => {
          if (p.mrn === patientMrn) {
            return { ...p, scheduled_date: orDate };
          }
          return p;
        }));
        toast.success(`OR scheduled for ${format(parseISO(orDate), 'MMM d, yyyy')}`);
      } else {
        toast.error('Failed to schedule OR');
      }
    } catch (error) {
      toast.error('Failed to schedule OR');
    }
  };


  // Update imaging selection
  const handleUpdateImagingSelection = async (patientMrn, selection) => {
    setChecklistLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/patients/${patientMrn}/preop-checklist/imaging`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ selection }),
      });
      if (response.ok) {
        const result = await response.json();
        // Update local state
        setPatients(prev => prev.map(p => {
          if (p.mrn === patientMrn && Array.isArray(p.preop_checklist)) {
            return {
              ...p,
              preop_checklist: p.preop_checklist.map(item => 
                item.id === 'imaging' 
                  ? { ...item, selection: result.selection, checked: result.checked } 
                  : item
              )
            };
          }
          return p;
        }));
        toast.success(selection.length > 0 ? 'Imaging studies updated' : 'Imaging studies cleared');
      } else {
        toast.error('Failed to update imaging');
      }
    } catch (error) {
      toast.error('Failed to update imaging');
    } finally {
      setChecklistLoading(false);
    }
  };

  // Unique attendings derived from patient data
  const uniqueAttendings = [...new Set(patients.map(p => p.attending).filter(Boolean))].sort();

  // Unique procedures derived from patient data
  const uniqueProcedures = [...new Set(patients.map(p => p.procedures).filter(Boolean))].sort();

  // Severity classification based on diagnosis
  const classifySeverity = (patient) => {
    const diag = (patient.diagnosis || '').toLowerCase();
    if (!diag || diag === 'n/a') return 'unspecified';
    if (/malignancy|malignant|carcinoma|squamous cell|cancer|metastatic|sarcoma|lymphoma/.test(diag)) return 'severe';
    if (/fracture|trauma|cyst|ameloblastoma|tumor|pathology|osteomyelitis|necrosis|abscess/.test(diag)) return 'moderate';
    return 'mild';
  };

  const SEVERITY_LABELS = {
    severe: { label: 'Severe / Malignant', color: 'text-red-700 bg-red-50' },
    moderate: { label: 'Moderate', color: 'text-amber-700 bg-amber-50' },
    mild: { label: 'Mild / Cosmetic', color: 'text-green-700 bg-green-50' },
    unspecified: { label: 'Unspecified', color: 'text-slate-500 bg-slate-50' },
  };

  // Category counts
  const categoryCounts = {};
  patients.forEach(p => {
    const cat = classifyPatient(p);
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  // Filter and sort
  const filteredPatients = patients.filter(p => {
    const matchesSearch = 
      p.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mrn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.procedures?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      filterStatus === 'all' ||
      p.status === filterStatus ||
      (filterStatus === 'add-on' && (p.status === 'add-on' || p.schedule?.is_addon));

    const pendingTasks = (p.tasks || []).filter(t => !t.completed);
    const matchesTasks = 
      filterTasks === 'all' ||
      (filterTasks === 'has-tasks' && pendingTasks.length > 0);

    const matchesAttending = 
      filterAttending === 'all' ||
      p.attending === filterAttending;

    const matchesCategory =
      filterCategory === 'all' ||
      classifyPatient(p) === filterCategory;

    const matchesSeverity =
      filterSeverity === 'all' ||
      classifySeverity(p) === filterSeverity;

    const matchesProcedure =
      filterProcedure === 'all' ||
      p.procedures === filterProcedure;

    return matchesSearch && matchesStatus && matchesTasks && matchesAttending && matchesCategory && matchesSeverity && matchesProcedure;
  });

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.patient_name || '').localeCompare(b.patient_name || '');
      case 'surgery_date':
        const dateA = a.scheduled_date || a.schedule?.scheduled_date || '';
        const dateB = b.scheduled_date || b.schedule?.scheduled_date || '';
        return dateA.localeCompare(dateB);
      case 'progress':
        const progressA = a.preop_progress?.checked || 0;
        const progressB = b.preop_progress?.checked || 0;
        return progressB - progressA;
      default: // created_at
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    }
  });

  // Stats
  const stats = {
    total: patients.length,
    addOn: patients.filter(p => p.status === 'add-on' || p.schedule?.is_addon).length,
    scheduled: patients.filter(p => p.status === 'scheduled').length,
    withTasks: patients.filter(p => (p.tasks || []).some(t => !t.completed)).length,
  };

  if (loading) {
    return (
      <PageLayout currentView="patients" onNavigate={onNavigate} user={user} onLogout={onLogout} title="Patients">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      currentView="patients"
      onNavigate={onNavigate}
      user={user}
      onLogout={onLogout}
      title="Patients"
      subtitle={`${sortedPatients.length} patient${sortedPatients.length !== 1 ? 's' : ''}`}
    >
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4 md:p-6 space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Search by name, MRN, diagnosis..."
                  className="pl-10 h-11"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                  </button>
                )}
              </div>
              
              {/* Filter dropdowns */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={filterAttending}
                  onChange={(e) => setFilterAttending(e.target.value)}
                  data-testid="filter-attending"
                  className="h-11 px-3 rounded-lg border border-slate-200 text-sm bg-white min-w-[140px]"
                >
                  <option value="all">All Attendings</option>
                  {uniqueAttendings.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-11 px-3 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="add-on">Add-On</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                </select>
                
                <select
                  value={filterTasks}
                  onChange={(e) => setFilterTasks(e.target.value)}
                  className="h-11 px-3 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  <option value="all">All Patients</option>
                  <option value="has-tasks">Has Pending Tasks</option>
                </select>

                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  data-testid="filter-severity"
                  className="h-11 px-3 rounded-lg border border-slate-200 text-sm bg-white min-w-[140px]"
                >
                  <option value="all">All Severity</option>
                  <option value="severe">Severe / Malignant</option>
                  <option value="moderate">Moderate</option>
                  <option value="mild">Mild / Cosmetic</option>
                  <option value="unspecified">Unspecified</option>
                </select>

                <select
                  value={filterProcedure}
                  onChange={(e) => setFilterProcedure(e.target.value)}
                  data-testid="filter-procedure"
                  className="h-11 px-3 rounded-lg border border-slate-200 text-sm bg-white min-w-[160px]"
                >
                  <option value="all">All Procedures</option>
                  {uniqueProcedures.map(proc => (
                    <option key={proc} value={proc}>{proc.length > 30 ? proc.substring(0, 30) + '...' : proc}</option>
                  ))}
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-11 px-3 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  <option value="created_at">Newest First</option>
                  <option value="name">Name A-Z</option>
                  <option value="surgery_date">Surgery Date</option>
                  <option value="progress">Pre-Op Progress</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1">Category:</span>
              <button
                onClick={() => setFilterCategory('all')}
                data-testid="filter-category-all"
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filterCategory === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({patients.length})
              </button>
              {Object.entries(PATIENT_CATEGORIES).map(([key, cat]) => {
                const count = categoryCounts[key] || 0;
                if (count === 0 && key !== 'other') return null;
                return (
                  <button
                    key={key}
                    onClick={() => setFilterCategory(key)}
                    data-testid={`filter-category-${key}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                      filterCategory === key
                        ? `${cat.color} text-white shadow-sm`
                        : `${cat.lightBg} ${cat.text} hover:opacity-80`
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${filterCategory === key ? 'bg-white/60' : cat.color}`} />
                    {cat.label} ({count})
                  </button>
                );
              })}
              <div className="ml-auto">
                <button
                  onClick={() => setGroupByCategory(!groupByCategory)}
                  data-testid="toggle-group-by-category"
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    groupByCategory
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {groupByCategory ? 'Grouped' : 'Group by Category'}
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 md:gap-4">
            <div className="bg-white rounded-xl p-3 border border-slate-200 border-l-4 border-l-teal-500">
              <div className="text-xs text-slate-500">Total</div>
              <div className="text-xl font-bold text-slate-900">{stats.total}</div>
            </div>
            <div className="bg-white rounded-xl p-3 border border-slate-200 border-l-4 border-l-orange-500">
              <div className="text-xs text-slate-500">Add-On</div>
              <div className="text-xl font-bold text-slate-900">{stats.addOn}</div>
            </div>
            <div className="bg-white rounded-xl p-3 border border-slate-200 border-l-4 border-l-blue-500">
              <div className="text-xs text-slate-500">Scheduled</div>
              <div className="text-xl font-bold text-slate-900">{stats.scheduled}</div>
            </div>
            <div className="bg-white rounded-xl p-3 border border-slate-200 border-l-4 border-l-purple-500">
              <div className="text-xs text-slate-500">With Tasks</div>
              <div className="text-xl font-bold text-slate-900">{stats.withTasks}</div>
            </div>
          </div>

          {/* Desktop Table Header */}
          <div className="hidden md:block bg-slate-100 rounded-t-xl px-4 py-3 border border-slate-200 border-b-0">
            <div className="flex items-center gap-4">
              <div className="w-10" /> {/* Avatar spacer */}
              <div className="flex-1 grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-2">Patient</div>
                <div className="col-span-2">Diagnosis</div>
                <div className="col-span-2">Procedure</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1">Pre-Op</div>
                <div className="col-span-1">Last Apt</div>
                <div className="col-span-1">Records</div>
                <div className="col-span-1 text-center">Tasks</div>
                <div className="col-span-1">Surgery</div>
              </div>
              <div className="w-20" /> {/* Actions spacer */}
            </div>
          </div>

          {/* Patient List */}
          <div className="space-y-3 md:space-y-0 md:-mt-3">
            {sortedPatients.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
                <User className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="text-lg font-medium text-slate-500">No patients found</p>
                <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
              </div>
            ) : groupByCategory ? (
              // Grouped by category view
              Object.entries(PATIENT_CATEGORIES).map(([catKey, cat]) => {
                const catPatients = sortedPatients.filter(p => classifyPatient(p) === catKey);
                if (catPatients.length === 0) return null;
                return (
                  <div key={catKey} className="mb-6">
                    <div className={`flex items-center gap-2 mb-2 px-1`}>
                      <span className={`w-3 h-3 rounded-full ${cat.color}`} />
                      <h3 className={`text-sm font-bold ${cat.text} uppercase tracking-wide`}>{cat.label}</h3>
                      <span className="text-xs text-slate-400 font-medium">({catPatients.length})</span>
                    </div>
                    <div className="space-y-3 md:space-y-0">
                      {catPatients.map((patient) => (
                        <PatientRow
                          key={patient.mrn}
                          patient={patient}
                          isExpanded={expandedPatient === patient.mrn}
                          onToggleExpand={() => setExpandedPatient(expandedPatient === patient.mrn ? null : patient.mrn)}
                          onDelete={() => handleDeletePatient(patient.mrn, patient.patient_name)}
                          onToggleChecklistItem={(itemId) => handleToggleChecklistItem(patient.mrn, itemId)}
                          onUpdateImagingSelection={handleUpdateImagingSelection}
                          onToggleTask={handleToggleTask}
                          onDeleteTask={handleDeleteTask}
                          onAddTask={handleAddTask}
                          onAddChecklistItem={handleAddChecklistItem}
                          onDeleteChecklistItem={handleDeleteChecklistItem}
                          onUpdateAppointmentDates={handleUpdateAppointmentDates}
                          onUpdatePatientDetails={handleUpdatePatientDetails}
                          onUpdateChecklistDetails={handleUpdateChecklistDetails}
                          onScheduleOR={handleScheduleOR}
                          checklistLoading={checklistLoading}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              sortedPatients.map((patient) => (
                <PatientRow
                  key={patient.mrn}
                  patient={patient}
                  isExpanded={expandedPatient === patient.mrn}
                  onToggleExpand={() => setExpandedPatient(expandedPatient === patient.mrn ? null : patient.mrn)}
                  onDelete={() => handleDeletePatient(patient.mrn, patient.patient_name)}
                  onToggleChecklistItem={(itemId) => handleToggleChecklistItem(patient.mrn, itemId)}
                  onUpdateImagingSelection={handleUpdateImagingSelection}
                  onToggleTask={handleToggleTask}
                  onDeleteTask={handleDeleteTask}
                  onAddTask={handleAddTask}
                  onAddChecklistItem={handleAddChecklistItem}
                  onDeleteChecklistItem={handleDeleteChecklistItem}
                  onUpdateAppointmentDates={handleUpdateAppointmentDates}
                  onUpdatePatientDetails={handleUpdatePatientDetails}
                  onUpdateChecklistDetails={handleUpdateChecklistDetails}
                  onScheduleOR={handleScheduleOR}
                  checklistLoading={checklistLoading}
                />
              ))
            )}
          </div>
        </div>
      </PullToRefresh>
    </PageLayout>
  );
};

export default UnifiedPatients;
