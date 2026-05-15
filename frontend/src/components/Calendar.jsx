import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { getAuthHeaders as getAuth } from '../utils/auth';
import {
  format,
  startOfWeek,
  addDays,
  parseISO,
  isToday,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  X,
  Plus,
  Search,
  ArrowLeftRight,
  Ban,
  CornerDownLeft,
  GripVertical,
  MoreVertical,
} from 'lucide-react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import PageLayout from './PageLayout';
import PullToRefresh from './PullToRefresh';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 6); // 6 AM to 6 PM
const TIME_OPTIONS = [];
for (let h = 6; h <= 18; h++) {
  for (let m = 0; m < 60; m += 30) {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    TIME_OPTIONS.push(`${hour}:${m === 0 ? '00' : '30'} ${ampm}`);
  }
}
const OR_ROOMS = ['OR 1', 'OR 2', 'OR 3', 'OR 4'];
const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180, 240, 300, 360];

const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.split(/[\s,]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAuthHeaders = () => ({
  ...getAuth(),
  'Content-Type': 'application/json',
});

const parseScheduleTime = (timeStr) => {
  if (!timeStr) return 8; // Default to 8 AM
  // Handle "HH:MM AM/PM" format
  const ampmMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1]);
    const m = parseInt(ampmMatch[2]);
    if (ampmMatch[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (ampmMatch[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return h + m / 60;
  }
  // Handle "HH:MM" 24-hour format
  const h24Match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (h24Match) {
    return parseInt(h24Match[1]) + parseInt(h24Match[2]) / 60;
  }
  return 8;
};

const formatDuration = (mins) => {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

// ─── Draggable Add-On Card ──────────────────────────────────────────
const DraggableAddOn = ({ schedule, patient }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `addon-${schedule._id}`,
    data: { type: 'addon', schedule, patient },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-testid={`addon-card-${schedule._id}`}
      className={`p-3 rounded-xl border border-slate-200 bg-white cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:border-teal-300 ${
        isDragging ? 'opacity-40 scale-95' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-slate-900 text-sm truncate">{schedule.patient_name}</div>
          <div className="text-xs text-slate-500 truncate">{schedule.procedure || 'No procedure'}</div>
          {schedule.staff && (
            <div className="text-xs text-slate-400 mt-1 truncate">{schedule.staff}</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Draggable Schedule Block (for rescheduling) ──────────────────
const DraggableScheduleBlock = ({ schedule, patient, onClick, onContextMenu, style }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sched-${schedule._id}`,
    data: { type: 'scheduled', schedule, patient },
  });

  const statusColor = {
    scheduled: 'bg-blue-50 border-blue-300 text-blue-900',
    'in-progress': 'bg-green-50 border-green-300 text-green-900',
    completed: 'bg-gray-100 border-gray-300 text-gray-600',
  }[schedule.status] || 'bg-blue-50 border-blue-300 text-blue-900';

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-testid={`sched-block-${schedule._id}`}
      className={`absolute left-1 right-1 border-l-4 rounded-lg px-2 py-1 cursor-grab active:cursor-grabbing overflow-hidden transition-all hover:shadow-lg hover:z-20 ${statusColor} ${
        isDragging ? 'opacity-40 scale-95' : ''
      }`}
      style={style}
      onClick={(e) => { e.stopPropagation(); onClick(schedule, patient); }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, schedule, patient); }}
    >
      <div className="font-semibold text-xs truncate">{schedule.patient_name}</div>
      <div className="text-[10px] opacity-80 truncate">{schedule.procedure || ''}</div>
      {schedule.or_room && <div className="text-[10px] opacity-70">{schedule.or_room}</div>}
    </div>
  );
};

// ─── Draggable Month Chip (small chip in month-view day cell) ───────
const DraggableMonthChip = ({ schedule, patient, onClick, onContextMenu }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sched-${schedule._id}`,
    data: { type: 'scheduled', schedule, patient },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-testid={`month-chip-${schedule._id}`}
      className={`text-[10px] px-1 py-0.5 bg-blue-50 text-blue-700 rounded truncate cursor-grab active:cursor-grabbing hover:bg-blue-100 ${
        isDragging ? 'opacity-40' : ''
      }`}
      onClick={(e) => { e.stopPropagation(); onClick(schedule, patient); }}
      onContextMenu={(e) => onContextMenu(e, schedule, patient)}
    >
      {schedule.patient_name?.split(',')[0] || 'Patient'}
      {schedule.scheduled_time && <span className="ml-1 opacity-70">{schedule.scheduled_time}</span>}
    </div>
  );
};

// ─── Droppable Time Slot (Week View) ────────────────────────────────
const DroppableTimeSlot = ({ id, day, hour, halfHour, children, onClick }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      data-testid={`slot-${format(day, 'yyyy-MM-dd')}-${hour}-${halfHour ? '30' : '00'}`}
      className={`relative h-10 border-b border-slate-100 transition-colors ${
        isOver ? 'bg-teal-100/60' : 'hover:bg-slate-50'
      } ${halfHour ? '' : 'border-t border-slate-200'}`}
      onClick={() => onClick(day, hour, halfHour)}
    >
      {children}
    </div>
  );
};

// ─── Droppable Day Cell (Month View) ────────────────────────────────
const DroppableDayCell = ({ id, day, isCurrentMonth, children, onClick }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  const today = isToday(day);
  return (
    <div
      ref={setNodeRef}
      data-testid={`month-cell-${format(day, 'yyyy-MM-dd')}`}
      className={`min-h-[100px] md:min-h-[120px] p-1.5 md:p-2 rounded-lg transition-all border ${
        isOver ? 'bg-teal-50 border-teal-300 ring-2 ring-teal-200' :
        !isCurrentMonth ? 'bg-slate-50/50 border-transparent opacity-40' :
        today ? 'bg-blue-50/80 border-blue-200' :
        'bg-white border-slate-100 hover:border-slate-200'
      }`}
      onClick={(e) => { if (e.target === e.currentTarget || e.target.closest('[data-day-header]')) onClick(day); }}
    >
      {children}
    </div>
  );
};

// ─── Schedule Form Modal ────────────────────────────────────────────
const ScheduleFormModal = ({ isOpen, onClose, onSubmit, defaultDate, defaultTime, patients, schedules, title }) => {
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [date, setDate] = useState(defaultDate || '');
  const [time, setTime] = useState(defaultTime || '7:30 AM');
  const [room, setRoom] = useState('OR 1');
  const [duration, setDuration] = useState(120);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (defaultDate) setDate(defaultDate);
    if (defaultTime) setTime(defaultTime);
  }, [defaultDate, defaultTime]);

  if (!isOpen) return null;

  const filtered = search.trim().length > 0
    ? patients.filter(p =>
        p.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.mrn?.includes(search)
      ).slice(0, 8)
    : [];

  const handleSelect = (p) => {
    setSelectedPatient(p);
    setSearch(p.patient_name);
    setShowResults(false);
    // Check if already scheduled
    const existing = schedules.find(s => s.patient_mrn === p.mrn && !s.is_addon && s.scheduled_date);
    if (existing) {
      toast.warning(`${p.patient_name} is already scheduled for ${existing.scheduled_date}. This will reschedule them.`);
    }
  };

  const handleSubmit = () => {
    if (!selectedPatient) { toast.error('Select a patient'); return; }
    if (!date) { toast.error('Select a date'); return; }
    onSubmit({ mrn: selectedPatient.mrn, name: selectedPatient.patient_name, date, time, room, duration });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()} data-testid="schedule-form-modal">
        <h3 className="text-lg font-bold text-slate-900 mb-4">{title || 'Schedule a Case'}</h3>
        <div className="space-y-3">
          <div className="relative">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Patient</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                data-testid="schedule-patient-search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowResults(true); setSelectedPatient(null); }}
                onFocus={() => setShowResults(true)}
                placeholder="Search by name or MRN..."
                className="pl-9 h-11"
              />
            </div>
            {showResults && filtered.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {filtered.map(p => (
                  <div key={p.mrn} onClick={() => handleSelect(p)} className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-slate-900">{p.patient_name}</div>
                      <div className="text-xs text-slate-500">MRN: {p.mrn}</div>
                    </div>
                    {p.status === 'add-on' && <Badge className="bg-orange-100 text-orange-700 text-[10px]">Add-On</Badge>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Date</label>
            <Input data-testid="schedule-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Time</label>
              <select data-testid="schedule-time" value={time} onChange={e => setTime(e.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm">
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">OR Room</label>
              <select data-testid="schedule-room" value={room} onChange={e => setRoom(e.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm">
                {OR_ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Duration</label>
            <select data-testid="schedule-duration" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm">
              {DURATION_OPTIONS.map(d => <option key={d} value={d}>{formatDuration(d)}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1 h-11">Cancel</Button>
          <Button onClick={handleSubmit} className="flex-1 h-11 bg-teal-500 hover:bg-teal-600 text-white" data-testid="schedule-confirm-btn">Schedule</Button>
        </div>
      </div>
    </div>
  );
};

// ─── Drop Confirm Popover ───────────────────────────────────────────
const DropConfirmModal = ({ isOpen, onClose, onConfirm, patientName, date, isReschedule }) => {
  const [time, setTime] = useState('7:30 AM');
  const [room, setRoom] = useState('OR 1');
  const [duration, setDuration] = useState(120);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()} data-testid="drop-confirm-modal">
        <h3 className="text-lg font-bold text-slate-900 mb-1">
          {isReschedule ? 'Reschedule' : 'Schedule'} {patientName}
        </h3>
        <p className="text-sm text-slate-500 mb-4">Date: {date}</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Time</label>
              <select value={time} onChange={e => setTime(e.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" data-testid="drop-confirm-time">
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">OR Room</label>
              <select value={room} onChange={e => setRoom(e.target.value)} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm" data-testid="drop-confirm-room">
                {OR_ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Duration</label>
            <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm">
              {DURATION_OPTIONS.map(d => <option key={d} value={d}>{formatDuration(d)}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="outline" onClick={onClose} className="flex-1 h-11">Cancel</Button>
          <Button onClick={() => { onConfirm({ time, room, duration }); onClose(); }} className="flex-1 h-11 bg-teal-500 hover:bg-teal-600 text-white" data-testid="drop-confirm-btn">Confirm</Button>
        </div>
      </div>
    </div>
  );
};

// ─── Patient Detail Panel ───────────────────────────────────────────
const DetailPanel = ({ schedule, patient, onClose, onMoveToAddon, onCancel, onEdit }) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  if (!schedule) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl w-full max-w-lg md:mx-4 p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="detail-panel">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
              {getInitials(schedule.patient_name)}
            </div>
            <div>
              <div className="font-bold text-lg text-slate-900">{schedule.patient_name}</div>
              <div className="text-sm text-slate-500">MRN: {schedule.patient_mrn}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500">Procedure</div>
            <div className="text-sm font-medium">{schedule.procedure || 'TBD'}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500">Attending</div>
            <div className="text-sm font-medium">{schedule.staff || 'Unassigned'}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500">Date</div>
            <div className="text-sm font-medium">{schedule.scheduled_date || 'Not set'}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500">Time</div>
            <div className="text-sm font-medium">{schedule.scheduled_time || 'TBD'}</div>
          </div>
          {schedule.or_room && (
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500">OR Room</div>
              <div className="text-sm font-medium">{schedule.or_room}</div>
            </div>
          )}
          {schedule.duration_minutes && (
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500">Duration</div>
              <div className="text-sm font-medium">{formatDuration(schedule.duration_minutes)}</div>
            </div>
          )}
        </div>

        {!showCancelConfirm ? (
          <div className="space-y-2">
            <Button onClick={onEdit} variant="outline" className="w-full h-12 justify-start gap-3 text-slate-700" data-testid="detail-edit-btn">
              <ArrowLeftRight className="h-4 w-4" /> Edit / Reschedule
            </Button>
            <Button onClick={onMoveToAddon} variant="outline" className="w-full h-12 justify-start gap-3 text-orange-600 border-orange-200 hover:bg-orange-50" data-testid="detail-move-addon-btn">
              <CornerDownLeft className="h-4 w-4" /> Move to Add-On List
            </Button>
            <Button onClick={() => setShowCancelConfirm(true)} variant="outline" className="w-full h-12 justify-start gap-3 text-red-600 border-red-200 hover:bg-red-50" data-testid="detail-cancel-btn">
              <Ban className="h-4 w-4" /> Cancel Case
            </Button>
          </div>
        ) : (
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <p className="text-sm text-red-800 mb-4">Cancel this case? This will remove <strong>{schedule.patient_name}</strong> from the schedule.</p>
            <div className="flex gap-3">
              <Button onClick={() => setShowCancelConfirm(false)} variant="outline" className="flex-1 h-11">Go Back</Button>
              <Button onClick={onCancel} className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white" data-testid="detail-confirm-cancel-btn">Yes, Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Context Menu ───────────────────────────────────────────────────
const ContextMenu = ({ x, y, onClose, onViewDetails, onEdit, onMoveToAddon, onCancel }) => {
  const ref = useRef(null);
  useEffect(() => {
    const handler = () => onClose();
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-[60] bg-white rounded-xl shadow-2xl border border-slate-200 py-1 min-w-[180px]"
      style={{ top: y, left: x }}
      data-testid="context-menu"
    >
      <button onClick={onViewDetails} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">View Details</button>
      <button onClick={onEdit} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">Edit Case</button>
      <div className="border-t border-slate-100 my-1" />
      <button onClick={onMoveToAddon} className="w-full text-left px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50">Move to Add-On List</button>
      <button onClick={onCancel} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">Cancel Case</button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// ─── MAIN CALENDAR COMPONENT ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
const Calendar = ({ onNavigate, initialFilter, user, onLogout }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week');
  const [schedules, setSchedules] = useState([]);
  const [patients, setPatients] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addonOpen, setAddonOpen] = useState(true);

  // Modals / overlays
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [scheduleForm, setScheduleForm] = useState(null);
  const [dropConfirm, setDropConfirm] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [dragOverlay, setDragOverlay] = useState(null);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
  const sensors = useSensors(pointerSensor, touchSensor);

  const fetchData = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const [sRes, pRes, cRes] = await Promise.all([
        fetch(`${API_URL}/api/schedules`, { headers }),
        fetch(`${API_URL}/api/patients`, { headers }),
        fetch(`${API_URL}/api/conferences`, { headers }),
      ]);
      if (sRes.ok) setSchedules(await sRes.json());
      if (pRes.ok) setPatients(await pRes.json());
      if (cRes.ok) setConferences(await cRes.json());
    } catch {
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived data ─────────────────────────────────────────────────
  const addOnCases = schedules.filter(s => s.is_addon);
  const scheduledCases = schedules.filter(s => !s.is_addon && s.scheduled_date);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthStart = startOfMonth(currentDate);
  const monthDays = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: addDays(endOfMonth(currentDate), 6 - endOfMonth(currentDate).getDay()),
  });

  const getSchedulesForDate = (date) =>
    scheduledCases.filter(s => {
      try { return isSameDay(parseISO(s.scheduled_date), date); } catch { return false; }
    });

  const getConferencesForDate = (date) =>
    conferences.filter(c => { try { return isSameDay(parseISO(c.date), date); } catch { return false; } });

  // ── Calendar actions (API) ───────────────────────────────────────
  const calendarAction = async (mrn, action, extras = {}) => {
    try {
      const res = await fetch(`${API_URL}/api/patients/${mrn}/calendar`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, ...extras }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Action failed');
      toast.success(data.message);
      await fetchData();
      return data;
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSchedulePatient = async ({ mrn, date, time, room, duration }) => {
    await calendarAction(mrn, 'schedule', { or_date: date, or_time: time, or_room: room, duration_minutes: duration });
  };

  const handleMoveToAddon = async (mrn) => {
    await calendarAction(mrn, 'move_to_addon');
    setSelectedDetail(null);
    setContextMenu(null);
  };

  const handleCancelCase = async (mrn) => {
    await calendarAction(mrn, 'cancel');
    setSelectedDetail(null);
    setContextMenu(null);
  };

  const handleReschedule = async (mrn, { date, time, room, duration }) => {
    await calendarAction(mrn, 'reschedule', { or_date: date, or_time: time, or_room: room, duration_minutes: duration });
  };

  // ── DnD handlers ─────────────────────────────────────────────────
  const handleDragStart = (event) => {
    const { active } = event;
    setDragOverlay(active.data.current);
  };

  const handleDragEnd = (event) => {
    setDragOverlay(null);
    const { active, over } = event;
    if (!over) return;

    const dropId = over.id;
    const dragData = active.data.current;

    // Parse the drop target
    let dropDate = null;
    let dropTime = null;

    if (typeof dropId === 'string' && dropId.startsWith('slot-')) {
      // Week view slot: slot-2026-03-20-14-30
      const parts = dropId.replace('slot-', '').split('-');
      dropDate = `${parts[0]}-${parts[1]}-${parts[2]}`;
      const hour = parseInt(parts[3]);
      const min = parts[4];
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      dropTime = `${h12}:${min} ${ampm}`;
    } else if (typeof dropId === 'string' && dropId.startsWith('month-')) {
      // Month view: month-2026-03-20
      dropDate = dropId.replace('month-', '');
    }

    if (!dropDate) return;

    const patientName = dragData.schedule?.patient_name || 'Patient';
    const mrn = dragData.schedule?.patient_mrn;

    if (dragData.type === 'addon') {
      // Dropping add-on onto calendar → show confirm
      setDropConfirm({
        mrn,
        patientName,
        date: dropDate,
        defaultTime: dropTime || '7:30 AM',
        isReschedule: false,
      });
    } else if (dragData.type === 'scheduled') {
      // Rescheduling
      setDropConfirm({
        mrn,
        patientName,
        date: dropDate,
        defaultTime: dropTime || dragData.schedule?.scheduled_time || '7:30 AM',
        isReschedule: true,
      });
    }
  };

  const handleDropConfirm = ({ time, room, duration }) => {
    if (!dropConfirm) return;
    const action = dropConfirm.isReschedule ? 'reschedule' : 'schedule';
    calendarAction(dropConfirm.mrn, action, {
      or_date: dropConfirm.date,
      or_time: time,
      or_room: room,
      duration_minutes: duration,
    });
    setDropConfirm(null);
  };

  // ── Event click / context menu handlers ──────────────────────────
  const handleEventClick = (schedule, patient) => {
    setSelectedDetail({ schedule, patient });
  };

  const handleContextMenu = (e, schedule, patient) => {
    e.preventDefault();
    setContextMenu({ x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 200), schedule, patient });
  };

  const handleSlotClick = (day, hour, halfHour) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const timeStr = `${h12}:${halfHour ? '30' : '00'} ${ampm}`;
    setScheduleForm({ date: format(day, 'yyyy-MM-dd'), time: timeStr });
  };

  const handleMonthDayClick = (day) => {
    setScheduleForm({ date: format(day, 'yyyy-MM-dd'), time: '7:30 AM' });
  };

  // ── Navigation ───────────────────────────────────────────────────
  const navigatePrev = () => setCurrentDate(viewMode === 'week' ? subWeeks(currentDate, 1) : subMonths(currentDate, 1));
  const navigateNext = () => setCurrentDate(viewMode === 'week' ? addWeeks(currentDate, 1) : addMonths(currentDate, 1));

  if (loading) {
    return (
      <PageLayout currentView="calendar" onNavigate={onNavigate} user={user} onLogout={onLogout} title="OR Calendar">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto" />
        </div>
      </PageLayout>
    );
  }

  // ── RENDER ───────────────────────────────────────────────────────
  return (
    <PageLayout
      currentView="calendar"
      onNavigate={onNavigate}
      user={user}
      onLogout={onLogout}
      title="OR Calendar"
      subtitle={viewMode === 'week'
        ? `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
        : format(currentDate, 'MMMM yyyy')
      }
      headerActions={
        <div className="flex items-center gap-1 md:gap-2 flex-nowrap">
          <div className="flex bg-slate-100 rounded-lg p-0.5 md:p-1" data-testid="calendar-view-toggle">
            <button onClick={() => setViewMode('week')} className={`px-2 md:px-3 py-1 md:py-1.5 rounded-md text-[11px] md:text-xs font-medium transition-colors ${viewMode === 'week' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`} data-testid="calendar-toggle-week">Week</button>
            <button onClick={() => setViewMode('month')} className={`px-2 md:px-3 py-1 md:py-1.5 rounded-md text-[11px] md:text-xs font-medium transition-colors ${viewMode === 'month' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`} data-testid="calendar-toggle-month">Month</button>
          </div>
          <div className="flex items-center gap-0.5 md:gap-1">
            <Button variant="outline" onClick={navigatePrev} className="rounded-lg w-9 h-9 p-0"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => setCurrentDate(new Date())} className="rounded-lg px-3 h-9 text-xs hidden sm:flex">Today</Button>
            <Button variant="outline" onClick={navigateNext} className="rounded-lg w-9 h-9 p-0"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      }
    >
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <PullToRefresh onRefresh={fetchData}>
          <div className="p-3 md:p-6">
            {/* Stats row — compact on mobile */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-3 md:mb-4">
              <div className="bg-white rounded-xl p-2 md:p-3 shadow-sm"><div className="text-base md:text-xl font-bold text-blue-600 leading-tight">{scheduledCases.length}</div><div className="text-slate-500 text-[10px] md:text-xs">Scheduled</div></div>
              <div className="bg-white rounded-xl p-2 md:p-3 shadow-sm"><div className="text-base md:text-xl font-bold text-green-600 leading-tight">{getSchedulesForDate(new Date()).length}</div><div className="text-slate-500 text-[10px] md:text-xs">Today</div></div>
              <div className="bg-white rounded-xl p-2 md:p-3 shadow-sm"><div className="text-base md:text-xl font-bold text-orange-600 leading-tight">{addOnCases.length}</div><div className="text-slate-500 text-[10px] md:text-xs">Add-Ons</div></div>
            </div>

            <div className="flex gap-4">
              {/* ─── Add-On Sidebar (desktop) / Collapsible (mobile) ─── */}
              <div className={`${addonOpen ? 'w-64 min-w-[16rem]' : 'w-0 min-w-0 overflow-hidden'} hidden md:block shrink-0 transition-all duration-300`}>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sticky top-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-800 text-sm">Add-On List</h3>
                    <Badge className="bg-orange-100 text-orange-700 text-xs">{addOnCases.length}</Badge>
                  </div>
                  <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
                    {addOnCases.map(s => {
                      const p = patients.find(pt => pt.mrn === s.patient_mrn);
                      return <DraggableAddOn key={s._id} schedule={s} patient={p} />;
                    })}
                    {addOnCases.length === 0 && (
                      <div className="text-sm text-slate-400 text-center py-8">No add-ons</div>
                    )}
                  </div>
                </div>
              </div>

              {/* ─── Mobile Add-On Toggle ─── */}
              <button
                onClick={() => setAddonOpen(!addonOpen)}
                className="md:hidden fixed right-4 z-40 bg-orange-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg mobile-fab-offset"
                data-testid="addon-toggle-mobile"
              >
                <span className="text-xs font-bold">{addOnCases.length}</span>
              </button>

              {/* Mobile Add-On Sheet */}
              {addonOpen && (
                <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setAddonOpen(false)}>
                  <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 max-h-[60vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-slate-800">Add-On List ({addOnCases.length})</h3>
                      <button onClick={() => setAddonOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
                    </div>
                    <div className="space-y-2">
                      {addOnCases.map(s => {
                        const p = patients.find(pt => pt.mrn === s.patient_mrn);
                        return (
                          <div key={s._id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                            onClick={() => {
                              setAddonOpen(false);
                              setScheduleForm({ date: format(currentDate, 'yyyy-MM-dd'), time: '7:30 AM', prefillMrn: s.patient_mrn });
                            }}>
                            <div>
                              <div className="font-semibold text-sm">{s.patient_name}</div>
                              <div className="text-xs text-slate-500">{s.procedure || 'No procedure'}</div>
                            </div>
                            <Plus className="h-5 w-5 text-teal-500" />
                          </div>
                        );
                      })}
                      {addOnCases.length === 0 && <div className="text-center text-slate-400 py-8">No add-ons</div>}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Calendar Grid ─── */}
              <div className="flex-1 min-w-0">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  {viewMode === 'week' ? (
                    /* ─── WEEK VIEW ─── */
                    <div className="md:overflow-x-auto">
                      <div className="md:min-w-[800px]">
                        {/* Header */}
                        <div className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))] md:grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50">
                          <div className="p-1 md:p-2 text-[10px] md:text-xs text-slate-400 text-center">Time</div>
                          {weekDays.map(day => {
                            const dayCount = getSchedulesForDate(day).length;
                            const today = isToday(day);
                            return (
                              <div key={day.toISOString()} className={`p-1 md:p-2 text-center border-l border-slate-200 ${today ? 'bg-blue-50' : ''}`}>
                                <div className="text-[10px] md:text-xs text-slate-500">
                                  <span className="md:hidden">{format(day, 'EEEEE')}</span>
                                  <span className="hidden md:inline">{format(day, 'EEE')}</span>
                                </div>
                                <div className={`text-sm md:text-lg font-bold ${today ? 'text-blue-600' : 'text-slate-900'}`}>{format(day, 'd')}</div>
                                {dayCount > 0 && <Badge className="bg-blue-100 text-blue-700 text-[9px] md:text-[10px] mt-0.5 px-1">{dayCount}</Badge>}
                              </div>
                            );
                          })}
                        </div>
                        {/* Time grid */}
                        <div className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))] md:grid-cols-[60px_repeat(7,1fr)]">
                          {/* Time labels */}
                          <div>
                            {HOURS.map(h => (
                              <div key={h} className="h-20 border-b border-slate-100 flex items-start justify-center pt-1">
                                <span className="text-[9px] md:text-[10px] text-slate-400 leading-tight text-center">{h > 12 ? h - 12 : h}<span className="hidden md:inline"> </span><span className="md:hidden"><br/></span>{h >= 12 ? 'PM' : 'AM'}</span>
                              </div>
                            ))}
                          </div>
                          {/* Day columns */}
                          {weekDays.map(day => {
                            const daySchedules = getSchedulesForDate(day);
                            return (
                              <div key={day.toISOString()} className="relative border-l border-slate-200">
                                {HOURS.map(h => (
                                  <React.Fragment key={h}>
                                    <DroppableTimeSlot
                                      id={`slot-${format(day, 'yyyy-MM-dd')}-${h}-00`}
                                      day={day} hour={h} halfHour={false}
                                      onClick={handleSlotClick}
                                    />
                                    <DroppableTimeSlot
                                      id={`slot-${format(day, 'yyyy-MM-dd')}-${h}-30`}
                                      day={day} hour={h} halfHour={true}
                                      onClick={handleSlotClick}
                                    />
                                  </React.Fragment>
                                ))}
                                {/* Render scheduled blocks */}
                                {daySchedules.map(sched => {
                                  const timeVal = parseScheduleTime(sched.scheduled_time);
                                  const topPx = (timeVal - 6) * 40; // Each half-hour = 20px, each hour = 40px
                                  const durationMins = sched.duration_minutes || 120;
                                  const heightPx = Math.max((durationMins / 60) * 40, 20);
                                  const p = patients.find(pt => pt.mrn === sched.patient_mrn);
                                  return (
                                    <DraggableScheduleBlock
                                      key={sched._id}
                                      schedule={sched}
                                      patient={p}
                                      onClick={handleEventClick}
                                      onContextMenu={handleContextMenu}
                                      style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                                    />
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ─── MONTH VIEW ─── */
                    <div className="p-3 md:p-5">
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                          <div key={d} className="text-center text-xs font-medium text-slate-400 py-2">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {monthDays.map(day => {
                          const daySchedules = getSchedulesForDate(day);
                          const dayConferences = getConferencesForDate(day);
                          const isCurrentMo = isSameMonth(day, currentDate);
                          return (
                            <DroppableDayCell
                              key={day.toISOString()}
                              id={`month-${format(day, 'yyyy-MM-dd')}`}
                              day={day}
                              isCurrentMonth={isCurrentMo}
                              onClick={handleMonthDayClick}
                            >
                              <div data-day-header className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-blue-600 font-bold' : 'text-slate-700'}`}>
                                {format(day, 'd')}
                              </div>
                              <div className="space-y-0.5">
                                {dayConferences.slice(0, 1).map(c => (
                                  <div key={c._id} className="text-[10px] px-1 py-0.5 bg-purple-100 text-purple-700 rounded truncate">{c.title}</div>
                                ))}
                                {daySchedules.slice(0, 2).map(s => (
                                  <DraggableMonthChip
                                    key={s._id}
                                    schedule={s}
                                    patient={patients.find(p => p.mrn === s.patient_mrn)}
                                    onClick={handleEventClick}
                                    onContextMenu={handleContextMenu}
                                  />
                                ))}
                                {(daySchedules.length + dayConferences.length) > 3 && (
                                  <div className="text-[9px] text-slate-400 text-center">+{daySchedules.length + dayConferences.length - 3} more</div>
                                )}
                              </div>
                            </DroppableDayCell>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </PullToRefresh>

        {/* Drag Overlay */}
        <DragOverlay>
          {dragOverlay && (
            <div className="bg-white rounded-xl shadow-xl border-2 border-teal-400 p-3 w-56 opacity-90">
              <div className="font-semibold text-sm text-slate-900">{dragOverlay.schedule?.patient_name}</div>
              <div className="text-xs text-slate-500">{dragOverlay.schedule?.procedure || 'No procedure'}</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* ─── Modals ─── */}
      <ScheduleFormModal
        isOpen={!!scheduleForm}
        onClose={() => setScheduleForm(null)}
        onSubmit={handleSchedulePatient}
        defaultDate={scheduleForm?.date}
        defaultTime={scheduleForm?.time}
        patients={patients}
        schedules={schedules}
        title="Schedule a Case"
      />

      <DropConfirmModal
        isOpen={!!dropConfirm}
        onClose={() => setDropConfirm(null)}
        onConfirm={handleDropConfirm}
        patientName={dropConfirm?.patientName}
        date={dropConfirm?.date}
        isReschedule={dropConfirm?.isReschedule}
      />

      <DetailPanel
        schedule={selectedDetail?.schedule}
        patient={selectedDetail?.patient}
        onClose={() => setSelectedDetail(null)}
        onMoveToAddon={() => handleMoveToAddon(selectedDetail?.schedule?.patient_mrn)}
        onCancel={() => handleCancelCase(selectedDetail?.schedule?.patient_mrn)}
        onEdit={() => {
          const s = selectedDetail?.schedule;
          setSelectedDetail(null);
          setScheduleForm({ date: s?.scheduled_date || format(new Date(), 'yyyy-MM-dd'), time: s?.scheduled_time || '7:30 AM' });
        }}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onViewDetails={() => { setContextMenu(null); handleEventClick(contextMenu.schedule, contextMenu.patient); }}
          onEdit={() => {
            const s = contextMenu.schedule;
            setContextMenu(null);
            setScheduleForm({ date: s?.scheduled_date || format(new Date(), 'yyyy-MM-dd'), time: s?.scheduled_time || '7:30 AM' });
          }}
          onMoveToAddon={() => handleMoveToAddon(contextMenu.schedule?.patient_mrn)}
          onCancel={() => handleCancelCase(contextMenu.schedule?.patient_mrn)}
        />
      )}
    </PageLayout>
  );
};

export default Calendar;
