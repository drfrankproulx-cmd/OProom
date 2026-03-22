import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { format, parseISO, isPast, isToday, differenceInDays } from 'date-fns';
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

// Pre-op checklist item component - handles both regular items and imaging dropdown
const PreOpChecklistItem = ({ item, onToggle, onImagingChange, onDelete, disabled }) => {
  // Special handling for imaging dropdown
  if (item.type === 'dropdown' && item.id === 'imaging') {
    return (
      <div className="rounded-lg bg-slate-50 border border-slate-200">
        <ImagingDropdown
          selection={item.selection || []}
          onSelectionChange={onImagingChange}
          disabled={disabled}
        />
      </div>
    );
  }

  const isCustom = item.default === false;

  // Regular checkbox item
  return (
    <div 
      className={`flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors min-h-[44px] ${item.checked ? 'bg-green-50' : ''}`}
      onClick={() => !disabled && onToggle(item.id)}
      data-testid={`checklist-item-${item.id}`}
    >
      <Checkbox 
        checked={item.checked} 
        className="h-5 w-5 shrink-0"
        disabled={disabled}
      />
      <span className={`text-sm flex-1 ${item.checked ? 'text-green-700 line-through' : 'text-slate-700'}`}>
        {item.item}
      </span>
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
  checklistLoading 
}) => {
  const [showAddTask, setShowAddTask] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  
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
        <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-teal-600" />
          Patient Details
        </h4>
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
            <span className="text-slate-500">Surgery Date:</span>
            <span className="ml-2 font-medium text-slate-900">
              {patient.scheduled_date ? format(parseISO(patient.scheduled_date), 'MMM d, yyyy') : 
               patient.schedule?.scheduled_date ? format(parseISO(patient.schedule.scheduled_date), 'MMM d, yyyy') : 'Not scheduled'}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500">Diagnosis:</span>
            <span className="ml-2 font-medium text-slate-900">{patient.diagnosis || 'N/A'}</span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500">Procedure:</span>
            <span className="ml-2 font-medium text-slate-900">{patient.procedures || 'N/A'}</span>
          </div>
        </div>
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

      {/* Tasks Section */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-teal-600" />
            Tasks
            {pendingTasks.length > 0 && (
              <Badge className="bg-orange-100 text-orange-700 text-xs">{pendingTasks.length} pending</Badge>
            )}
          </h4>
          {!showAddTask && (
            <Button
              size="sm"
              onClick={() => setShowAddTask(true)}
              className="h-8 bg-teal-500 hover:bg-teal-600 text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
          )}
        </div>

        {showAddTask && (
          <div className="mb-4">
            <AddTaskForm 
              patient={patient} 
              onSubmit={(taskData) => {
                onAddTask(taskData);
                setShowAddTask(false);
              }}
              onCancel={() => setShowAddTask(false)}
            />
          </div>
        )}

        <div className="space-y-2">
          {pendingTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <ListTodo className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No tasks yet</p>
            </div>
          ) : (
            <>
              {pendingTasks.map(task => (
                <TaskItem 
                  key={task._id} 
                  task={task} 
                  onToggle={onToggleTask}
                  onDelete={onDeleteTask}
                />
              ))}
              {completedTasks.length > 0 && (
                <details className="mt-3">
                  <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700">
                    {completedTasks.length} completed task{completedTasks.length > 1 ? 's' : ''}
                  </summary>
                  <div className="space-y-2 mt-2">
                    {completedTasks.map(task => (
                      <TaskItem 
                        key={task._id} 
                        task={task} 
                        onToggle={onToggleTask}
                        onDelete={onDeleteTask}
                      />
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
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
              <div key={idx} className="text-xs text-slate-600 flex items-start gap-2">
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
  checklistLoading
}) => {
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
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Collapsed Row */}
      <div 
        className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggleExpand}
      >
        {/* Mobile Layout */}
        <div className="md:hidden space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
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
          <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
            {patient.patient_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'}
          </div>
          
          <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
            <div className="col-span-2">
              <div className="font-semibold text-slate-900 truncate">{patient.patient_name}</div>
              <div className="text-xs text-slate-500">MRN: {patient.mrn}</div>
            </div>
            
            <div className="col-span-3 text-sm text-slate-600 truncate" title={patient.diagnosis}>
              {patient.diagnosis || 'N/A'}
            </div>
            
            <div className="col-span-2 text-sm text-slate-600 truncate" title={patient.procedures}>
              {patient.procedures || 'N/A'}
            </div>
            
            <div className="col-span-1">
              {getStatusBadge()}
            </div>
            
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${progressPercent === 100 ? 'bg-green-500' : progressPercent >= 50 ? 'bg-teal-500' : 'bg-orange-500'}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs text-slate-600 w-10">{checkedCount}/{totalCount}</span>
              </div>
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
  const [sortBy, setSortBy] = useState('created_at');
  const [expandedPatient, setExpandedPatient] = useState(null);
  const [checklistLoading, setChecklistLoading] = useState(false);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const fetchData = async () => {
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
      console.error('Fetch error:', error);
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = useCallback(async () => {
    await fetchData();
    toast.success('Refreshed', { duration: 1500 });
  }, []);

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

    return matchesSearch && matchesStatus && matchesTasks && matchesAttending;
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
                <div className="col-span-3">Diagnosis</div>
                <div className="col-span-2">Procedure</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-2">Pre-Op</div>
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
