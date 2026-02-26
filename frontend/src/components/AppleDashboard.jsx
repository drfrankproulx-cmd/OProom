import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, parseISO, isToday, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  CheckCircle2,
  Users,
  Activity,
  Bell,
  X,
  GripVertical
} from 'lucide-react';
import PageLayout from './PageLayout';
import Settings from './Settings';
import Patients from './Patients';
import Tasks from './Tasks';
import Calendar from './Calendar';
import PatientStatusList from './patient-status/PatientStatusList';
import SurgeryDashboard from './surgery-timeline/SurgeryDashboard';
import BulkImport from './BulkImport';
import CPTCodeAutocomplete from './CPTCodeAutocomplete';
import DiagnosisAutocomplete from './DiagnosisAutocomplete';
import { getCPTCodeByCode } from '../data/cptCodes';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const getInitials = (name) => {
  if (!name) return 'UN';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Quick Stats Card Component - Mobile optimized
const StatsCard = ({ title, value, icon: Icon, color, onClick, dataTestId, subtitle }) => {
  const colorClasses = {
    teal: 'bg-teal-50 border-teal-100 text-teal-700',
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    orange: 'bg-orange-50 border-orange-100 text-orange-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
  };
  
  const iconColorClasses = {
    teal: 'bg-teal-500 text-white',
    blue: 'bg-blue-500 text-white',
    orange: 'bg-orange-500 text-white',
    purple: 'bg-purple-500 text-white',
  };
  
  return (
    <div 
      className={`relative rounded-xl border p-3 md:p-5 transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-md active:scale-[0.98]' : ''} ${colorClasses[color]} group`}
      onClick={onClick}
      data-testid={dataTestId}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs md:text-sm font-medium opacity-80 mb-0.5 md:mb-1 truncate">{title}</p>
          <p className="text-2xl md:text-3xl font-bold">{value}</p>
          {subtitle && onClick && (
            <p className="text-[10px] md:text-xs mt-1 md:mt-2 opacity-0 group-hover:opacity-70 transition-opacity hidden md:block">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-1.5 md:p-2.5 rounded-lg md:rounded-xl ${iconColorClasses[color]} flex-shrink-0`}>
          <Icon className="h-4 w-4 md:h-5 md:w-5" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
};

export const AppleDashboard = ({ user, onLogout }) => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [viewFilter, setViewFilter] = useState(null); // For drill-down filtering
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthViewDate, setMonthViewDate] = useState(new Date());
  const [calendarViewMode, setCalendarViewMode] = useState('week'); // 'week' or 'month' toggle
  const [patients, setPatients] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [residents, setResidents] = useState([]);
  const [attendings, setAttendings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('residents');
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Drag and drop state
  const [draggedAddOn, setDraggedAddOn] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);

  // Helper to navigate with filter and toast
  const navigateWithFilter = (view, filter, toastMessage) => {
    setViewFilter(filter);
    setCurrentView(view);
    if (toastMessage) {
      toast.success(toastMessage, { duration: 2000 });
    }
  };

  // Central navigation handler
  const handleNavigation = (view) => {
    setViewFilter(null);
    if (view === 'settings') {
      setShowSettings(true);
    } else {
      setCurrentView(view);
    }
  };

  const [intakeForm, setIntakeForm] = useState({
    patient_name: '',
    dob: '',
    mrn: '',
    attending: '',
    diagnosis: '',
    procedures: '',
    procedure_code: '',
    scheduling_type: 'addon',
    scheduled_date: '',
    scheduled_time: ''
  });

  const [taskForm, setTaskForm] = useState({
    task_description: '',
    due_date: '',
    assigned_to: '',
    assigned_to_email: '',
    patient_mrn: '',
    urgency: 'medium'
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const fetchData = async () => {
    try {
      const [patientsRes, schedulesRes, tasksRes, conferencesRes, residentsRes, attendingsRes, notificationsRes] = await Promise.all([
        fetch(`${API_URL}/api/patients`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/schedules`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/tasks`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/conferences`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/residents/active`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/attendings/active`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/notifications/unread`, { headers: getAuthHeaders() }),
      ]);

      const [patientsData, schedulesData, tasksData, conferencesData, residentsData, attendingsData, notificationsData] = await Promise.all([
        patientsRes.json(),
        schedulesRes.json(),
        tasksRes.json(),
        conferencesRes.json(),
        residentsRes.json(),
        attendingsRes.json(),
        notificationsRes.json(),
      ]);

      if (patientsRes.ok) setPatients(patientsData);
      if (schedulesRes.ok) setSchedules(schedulesData);
      if (tasksRes.ok) setTasks(tasksData);
      if (conferencesRes.ok) setConferences(conferencesData);
      if (residentsRes.ok) setResidents(residentsData);
      if (attendingsRes.ok) setAttendings(attendingsData);
      if (notificationsRes.ok) setNotifications(notificationsData);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSchedulesForDate = (date) => {
    return schedules.filter(schedule => {
      if (!schedule.scheduled_date || schedule.is_addon) return false;
      try {
        return isSameDay(parseISO(schedule.scheduled_date), date);
      } catch {
        return false;
      }
    });
  };

  const todaySchedules = getSchedulesForDate(new Date()).length;
  const weeklySchedules = schedules.filter(s => {
    if (!s.scheduled_date || s.is_addon) return false;
    try {
      const schedDate = parseISO(s.scheduled_date);
      return schedDate >= weekStart && schedDate <= addDays(weekStart, 6);
    } catch {
      return false;
    }
  });
  const addOnCases = schedules.filter(s => s.is_addon);
  const urgentTasks = tasks.filter(t => {
    if (t.completed || !t.due_date) return false;
    const days = Math.ceil((new Date(t.due_date) - new Date()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 3;
  });

  const handleQuickAdd = async () => {
    if (!intakeForm.patient_name || !intakeForm.mrn) {
      toast.error('Patient name and ID required');
      return;
    }

    if (intakeForm.scheduling_type === 'scheduled' && !intakeForm.scheduled_date) {
      toast.error('Please select a scheduled date');
      return;
    }

    try {
      const patientData = {
        mrn: intakeForm.mrn,
        patient_name: intakeForm.patient_name,
        dob: intakeForm.dob,
        diagnosis: intakeForm.diagnosis,
        procedures: intakeForm.procedures,
        procedure_code: intakeForm.procedure_code,
        attending: intakeForm.attending,
        status: 'pending',
      };

      const patientResponse = await fetch(`${API_URL}/api/patients`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(patientData),
      });

      const patientResult = await patientResponse.json();

      if (!patientResponse.ok) {
        throw new Error(patientResult.detail || 'Failed to add patient');
      }

      const scheduleData = {
        patient_mrn: intakeForm.mrn,
        patient_name: intakeForm.patient_name,
        procedure: intakeForm.procedures,
        staff: intakeForm.attending,
        scheduled_date: intakeForm.scheduling_type === 'scheduled' ? intakeForm.scheduled_date : '',
        scheduled_time: intakeForm.scheduling_type === 'scheduled' ? intakeForm.scheduled_time : '',
        status: 'pending',
        is_addon: intakeForm.scheduling_type === 'addon',
        priority: 'medium'
      };

      const scheduleResponse = await fetch(`${API_URL}/api/schedules`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(scheduleData),
      });

      const scheduleResult = await scheduleResponse.json();

      if (!scheduleResponse.ok) {
        throw new Error(scheduleResult.detail || 'Failed to create schedule');
      }

      toast.success(
        intakeForm.scheduling_type === 'scheduled'
          ? 'Patient scheduled successfully'
          : 'Patient added to add-on list'
      );

      setIntakeForm({
        patient_name: '',
        dob: '',
        mrn: '',
        attending: '',
        diagnosis: '',
        procedures: '',
        procedure_code: '',
        scheduling_type: 'addon',
        scheduled_date: '',
        scheduled_time: ''
      });

      fetchData();
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    }
  };

  const handleTaskCreate = async () => {
    if (!taskForm.task_description || !taskForm.due_date) {
      toast.error('Task description and due date required');
      return;
    }

    try {
      const taskData = {
        task_description: taskForm.task_description,
        due_date: taskForm.due_date,
        assigned_to: taskForm.assigned_to || 'Others',
        assigned_to_email: taskForm.assigned_to_email,
        patient_mrn: taskForm.patient_mrn || '',
        urgency: taskForm.urgency,
        completed: false,
        created_by: user?.email || '',
      };

      const response = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(taskData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to create task');
      }

      toast.success('Task created successfully');
      setTaskForm({
        task_description: '',
        due_date: '',
        assigned_to: '',
        assigned_to_email: '',
        patient_mrn: '',
        urgency: 'medium'
      });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleChecklistUpdate = async (mrn, checklistItem, checked) => {
    try {
      const response = await fetch(`${API_URL}/api/patients/${mrn}/checklist?checklist_item=${checklistItem}&checked=${checked}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        toast.success('Checklist updated');
        setPatients(prevPatients =>
          prevPatients.map(p => {
            if (p.mrn === mrn) {
              return {
                ...p,
                prep_checklist: {
                  ...p.prep_checklist,
                  [checklistItem]: checked
                }
              };
            }
            return p;
          })
        );
        if (selectedPatient && selectedPatient.mrn === mrn) {
          setSelectedPatient(prev => ({
            ...prev,
            prep_checklist: {
              ...prev.prep_checklist,
              [checklistItem]: checked
            }
          }));
        }
      } else {
        toast.error('Failed to update checklist');
      }
    } catch (error) {
      toast.error('Failed to update checklist');
      console.error('Checklist update error:', error);
    }
  };

  // Drag and Drop handlers for Add-On to Calendar
  const handleDragStart = (e, addOn) => {
    setDraggedAddOn(addOn);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', addOn._id);
    // Add a slight delay to show drag effect
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedAddOn(null);
    setDragOverDate(null);
  };

  const handleDragOver = (e, date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(date.toISOString());
  };

  const handleDragLeave = (e) => {
    // Only clear if we're actually leaving the drop zone
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverDate(null);
    }
  };

  const handleDrop = async (e, date) => {
    e.preventDefault();
    setDragOverDate(null);
    
    if (!draggedAddOn) return;
    
    try {
      const token = localStorage.getItem('token');
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      // Update the schedule to remove add-on status and set the scheduled date
      const response = await fetch(`${API_URL}/api/schedules/${draggedAddOn._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          is_addon: false,
          scheduled_date: formattedDate,
          scheduled_time: '08:00' // Default time, can be adjusted later
        })
      });

      if (response.ok) {
        const updatedSchedule = await response.json();
        // Update local state
        setSchedules(prev => prev.map(s => 
          s._id === draggedAddOn._id 
            ? { ...s, is_addon: false, scheduled_date: formattedDate, scheduled_time: '08:00' }
            : s
        ));
        toast.success(`${draggedAddOn.patient_name} scheduled for ${format(date, 'MMMM d, yyyy')}`, {
          duration: 3000
        });
      } else {
        toast.error('Failed to schedule patient');
      }
    } catch (error) {
      console.error('Drop error:', error);
      toast.error('Failed to schedule patient');
    }
    
    setDraggedAddOn(null);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <PageLayout
        currentView="dashboard"
        onNavigate={handleNavigation}
        user={user}
        onLogout={onLogout}
        title="Dashboard"
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading your workspace...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (showSettings) {
    return <Settings onClose={() => { setShowSettings(false); setCurrentView('dashboard'); }} onNavigate={handleNavigation} initialTab={settingsInitialTab} user={user} onLogout={onLogout} />;
  }

  if (currentView === 'calendar') {
    return <Calendar onNavigate={handleNavigation} initialFilter={viewFilter} user={user} onLogout={onLogout} />;
  }

  if (currentView === 'patients') {
    return <Patients onNavigate={handleNavigation} initialFilter={viewFilter} user={user} onLogout={onLogout} />;
  }

  if (currentView === 'tasks') {
    return <Tasks onNavigate={handleNavigation} initialFilter={viewFilter} user={user} onLogout={onLogout} />;
  }

  if (currentView === 'patient-status') {
    return <PatientStatusList onNavigate={handleNavigation} user={user} onLogout={onLogout} />;
  }

  if (currentView === 'surgery-timeline') {
    return <SurgeryDashboard onNavigate={handleNavigation} user={user} onLogout={onLogout} />;
  }

  if (currentView === 'bulk-import') {
    return <BulkImport onNavigate={(view) => {
      if (view === 'residents' || view === 'attendings') {
        setSettingsInitialTab(view);
        setShowSettings(true);
        setCurrentView('dashboard');
      } else {
        handleNavigation(view);
      }
    }} user={user} onLogout={onLogout} />;
  }

  if (currentView === 'settings') {
    setShowSettings(true);
    return null;
  }

  if (currentView === 'residents' || currentView === 'attendings') {
    setSettingsInitialTab(currentView);
    setShowSettings(true);
    return null;
  }

  return (
    <PageLayout
      currentView="dashboard"
      onNavigate={handleNavigation}
      user={user}
      onLogout={onLogout}
      title="Dashboard"
      subtitle={`${getGreeting()}, ${user?.full_name || 'Doctor'}`}
      headerActions={
        <div className="relative">
          <Button 
            variant="ghost" 
            onClick={() => setShowNotifications(!showNotifications)} 
            className="hover:bg-slate-100 rounded-xl relative"
            data-testid="notifications-btn"
          >
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {notifications.length}
              </span>
            )}
          </Button>
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
              <div className="p-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
              </div>
              {notifications.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {notifications.map((notif) => (
                    <div key={notif._id} className="p-3 hover:bg-slate-50 transition-colors">
                      <p className="font-medium text-slate-900 text-sm mb-1">{notif.title}</p>
                      <p className="text-slate-500 text-xs mb-1">{notif.message.substring(0, 80)}...</p>
                      <p className="text-xs text-slate-400">{format(parseISO(notif.created_at), 'MMM d, h:mm a')}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No notifications</p>
                </div>
              )}
            </div>
          )}
        </div>
      }
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6" data-testid="dashboard-content">
        {/* Quick Stats - 2-col on mobile, 4-col on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
          <StatsCard 
            title="Today's Schedule" 
            value={todaySchedules} 
            icon={CalendarIcon} 
            color="teal"
            onClick={() => navigateWithFilter('calendar', { type: 'today' }, `Viewing today's ${todaySchedules} scheduled cases`)}
            dataTestId="stats-card-today-schedule"
            subtitle="Click to view today's cases →"
          />
          <StatsCard 
            title="This Week" 
            value={weeklySchedules.length} 
            icon={Clock} 
            color="blue"
            onClick={() => navigateWithFilter('calendar', { type: 'week' }, `Viewing ${weeklySchedules.length} cases this week`)}
            dataTestId="stats-card-this-week"
            subtitle="Click to view weekly schedule →"
          />
          <StatsCard 
            title="Pending Cases" 
            value={addOnCases.length} 
            icon={Users} 
            color="orange"
            onClick={() => navigateWithFilter('patients', { type: 'addon' }, `Showing ${addOnCases.length} add-on cases`)}
            dataTestId="stats-card-pending-cases"
            subtitle="Click to view add-on list →"
          />
          <StatsCard 
            title="Tasks Due" 
            value={urgentTasks.length} 
            icon={CheckCircle2} 
            color="purple"
            onClick={() => navigateWithFilter('tasks', { type: 'urgent' }, `Showing ${urgentTasks.length} urgent tasks`)}
            dataTestId="stats-card-tasks-due"
            subtitle="Click to view urgent tasks →"
          />
        </div>

        {/* Quick Add Patient Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5">
          <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-3 md:mb-4 flex items-center">
            <Plus className="h-4 w-4 md:h-5 md:w-5 mr-2 text-teal-500" />
            Quick Add Patient
          </h3>

          {/* Row 1: Patient Name, Patient ID, DOB - Stack on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
            <div>
              <Label className="text-xs md:text-sm font-medium text-slate-700 mb-1 block">Patient Name</Label>
              <Input
                className="h-11 md:h-10 text-base md:text-sm rounded-lg"
                value={intakeForm.patient_name}
                onChange={(e) => setIntakeForm({...intakeForm, patient_name: e.target.value})}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label className="text-xs md:text-sm font-medium text-slate-700 mb-1 block">Patient ID</Label>
              <Input
                className="h-11 md:h-10 text-base md:text-sm rounded-lg"
                value={intakeForm.mrn}
                onChange={(e) => setIntakeForm({...intakeForm, mrn: e.target.value})}
                placeholder="ID number"
              />
            </div>
            <div>
              <Label className="text-xs md:text-sm font-medium text-slate-700 mb-1 block">Date of Birth</Label>
              <Input
                type="date"
                className="h-11 md:h-10 text-base md:text-sm rounded-lg"
                value={intakeForm.dob}
                onChange={(e) => setIntakeForm({...intakeForm, dob: e.target.value})}
              />
            </div>
          </div>

          {/* Row 2: Attending, Diagnosis, Procedure/CPT - Stack on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
            <div>
              <Label className="text-xs md:text-sm font-medium text-slate-700 mb-1 block">Attending</Label>
              <Select value={intakeForm.attending} onValueChange={(v) => setIntakeForm({...intakeForm, attending: v})}>
                <SelectTrigger className="h-11 md:h-10 text-base md:text-sm rounded-lg">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {attendings.length > 0 ? (
                    attendings.map((attending) => (
                      <SelectItem key={attending._id} value={attending.name}>{attending.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No attendings</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <DiagnosisAutocomplete
              value={intakeForm.diagnosis}
              onChange={(diagnosis) => setIntakeForm({...intakeForm, diagnosis: diagnosis})}
              label="Diagnosis"
            />
            <CPTCodeAutocomplete
              value={intakeForm.procedure_code}
              onChange={(code, description) => {
                setIntakeForm({
                  ...intakeForm,
                  procedure_code: code,
                  procedures: description || ''
                });
              }}
              label="Procedure / CPT Code"
              diagnosis={intakeForm.diagnosis}
            />
          </div>

          {/* Row 3: Scheduling Options */}
          <div className="pt-3 md:pt-4 border-t border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 items-end">
              <div>
                <Label className="text-xs md:text-sm font-medium text-slate-700 mb-1 block">Scheduling</Label>
                <Select value={intakeForm.scheduling_type} onValueChange={(v) => setIntakeForm({...intakeForm, scheduling_type: v})}>
                  <SelectTrigger className="h-11 md:h-10 text-base md:text-sm rounded-lg">
                    <SelectValue placeholder="Select scheduling type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="addon">Add to Add-On List</SelectItem>
                    <SelectItem value="scheduled">Schedule for Specific Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {intakeForm.scheduling_type === 'scheduled' && (
                <>
                  <div>
                    <Label className="text-xs md:text-sm font-medium text-slate-700 mb-1 block">Scheduled Date</Label>
                    <Input type="date" className="h-11 md:h-10 text-base md:text-sm rounded-lg" value={intakeForm.scheduled_date} onChange={(e) => setIntakeForm({...intakeForm, scheduled_date: e.target.value})} />
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm font-medium text-slate-700 mb-1 block">Scheduled Time</Label>
                    <Input type="time" className="h-11 md:h-10 text-base md:text-sm rounded-lg" value={intakeForm.scheduled_time} onChange={(e) => setIntakeForm({...intakeForm, scheduled_time: e.target.value})} />
                  </div>
                </>
              )}

              <div className={intakeForm.scheduling_type === 'scheduled' ? '' : 'md:col-span-3'}>
                <Button onClick={handleQuickAdd} className="w-full bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white rounded-lg h-11 md:h-10 text-sm font-medium" data-testid="add-patient-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  {intakeForm.scheduling_type === 'scheduled' ? 'Schedule Patient' : 'Add to Add-On List'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-12 gap-5">
          {/* LEFT COLUMN: Weekly Cases + Add-on Cases + Urgent Tasks */}
          <div className="col-span-12 lg:col-span-2 space-y-4">
            {/* Weekly Cases */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 text-sm mb-3">WEEKLY ({weeklySchedules.length})</h3>
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {weeklySchedules.map(schedule => {
                  const patient = patients.find(p => p.mrn === schedule.patient_mrn);
                  return (
                    <div key={schedule._id} className="p-2 bg-teal-50 rounded-lg hover:bg-teal-100 cursor-pointer transition-colors text-xs" onClick={() => setSelectedPatient(patient)}>
                      <div className="font-semibold text-slate-900">{getInitials(schedule.patient_name)}</div>
                      <div className="text-slate-600 truncate">{schedule.staff}</div>
                      <div className="text-slate-500 text-xs">{schedule.scheduled_date && format(parseISO(schedule.scheduled_date), 'MMM d')}</div>
                    </div>
                  );
                })}
                {weeklySchedules.length === 0 && <div className="text-center text-slate-400 text-xs py-4">No cases</div>}
              </div>
            </div>

            {/* Add-on Cases - Draggable */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 text-sm">ADD-ONS ({addOnCases.length})</h3>
                {addOnCases.length > 0 && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <GripVertical className="h-3 w-3" />
                    Drag to calendar
                  </span>
                )}
              </div>
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {addOnCases.map(addOn => {
                  const patient = patients.find(p => p.mrn === addOn.patient_mrn);
                  const checklist = patient?.prep_checklist || {};
                  const completed = Object.values(checklist).filter(Boolean).length;
                  const isDragging = draggedAddOn?._id === addOn._id;
                  return (
                    <div 
                      key={addOn._id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, addOn)}
                      onDragEnd={handleDragEnd}
                      className={`p-2 bg-orange-50 rounded-lg hover:bg-orange-100 cursor-grab active:cursor-grabbing transition-all text-xs group ${
                        isDragging ? 'opacity-50 scale-95 ring-2 ring-orange-400' : ''
                      }`}
                      data-testid={`addon-drag-item-${addOn._id}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
                          <GripVertical className="h-3 w-3 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0" onClick={() => setSelectedPatient(patient)}>
                          <div className="font-semibold text-slate-900">{addOn.patient_name}</div>
                          <div className="text-slate-600 truncate">{addOn.procedure}</div>
                          <div className="flex items-center justify-between mt-1">
                            <Badge variant="outline" className="bg-white text-xs px-2 py-0">{addOn.priority || 'medium'}</Badge>
                            <span className="text-xs text-slate-500">{completed}/4</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {addOnCases.length === 0 && <div className="text-center text-slate-400 text-xs py-4">No add-ons</div>}
              </div>
            </div>

            {/* Urgent Tasks */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 text-sm mb-3">URGENT ({urgentTasks.length})</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {urgentTasks.map(task => (
                  <div key={task._id} className="p-2 bg-red-50 rounded-lg text-xs">
                    <div className="font-medium text-slate-900 leading-tight">{task.task_description}</div>
                    {task.due_date && <div className="text-slate-500 text-xs mt-1">{format(parseISO(task.due_date), 'MMM d')}</div>}
                  </div>
                ))}
                {urgentTasks.length === 0 && <div className="text-center text-slate-400 text-xs py-4">All caught up!</div>}
              </div>
            </div>
          </div>

          {/* CENTER COLUMN: Calendar with Toggle */}
          <div className="col-span-12 lg:col-span-7">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {calendarViewMode === 'week' ? 'This Week' : 'Monthly View'}
                  </h2>
                  <p className="text-slate-500 text-sm">
                    {calendarViewMode === 'week' 
                      ? `${format(weekStart, 'MMMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
                      : format(monthViewDate, 'MMMM yyyy')
                    }
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* View Toggle */}
                  <div className="flex bg-slate-100 rounded-lg p-1" data-testid="calendar-view-toggle">
                    <button
                      onClick={() => setCalendarViewMode('week')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        calendarViewMode === 'week' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
                      }`}
                      data-testid="toggle-week-view"
                    >
                      Week
                    </button>
                    <button
                      onClick={() => setCalendarViewMode('month')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        calendarViewMode === 'month' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
                      }`}
                      data-testid="toggle-month-view"
                    >
                      Month
                    </button>
                  </div>
                  
                  {/* Navigation */}
                  <div className="flex items-center gap-1">
                    <Button 
                      onClick={() => calendarViewMode === 'week' ? setCurrentDate(addDays(currentDate, -7)) : setMonthViewDate(subMonths(monthViewDate, 1))} 
                      variant="outline" 
                      size="sm" 
                      className="rounded-lg w-8 h-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={() => calendarViewMode === 'week' ? setCurrentDate(new Date()) : setMonthViewDate(new Date())} 
                      variant="outline" 
                      size="sm" 
                      className="rounded-lg px-3 text-xs"
                    >
                      Today
                    </Button>
                    <Button 
                      onClick={() => calendarViewMode === 'week' ? setCurrentDate(addDays(currentDate, 7)) : setMonthViewDate(addMonths(monthViewDate, 1))} 
                      variant="outline" 
                      size="sm" 
                      className="rounded-lg w-8 h-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Week View */}
              {calendarViewMode === 'week' && (
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const daySchedules = getSchedulesForDate(day);
                    const today = isToday(day);
                    const isDropTarget = dragOverDate === day.toISOString();
                    return (
                      <div 
                        key={day.toISOString()} 
                        onDragOver={(e) => handleDragOver(e, day)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, day)}
                        className={`rounded-xl p-2 min-h-[400px] transition-all ${
                          today ? 'bg-gradient-to-br from-teal-50 to-teal-100 ring-2 ring-teal-400' : 'bg-slate-50'
                        } ${isDropTarget ? 'ring-2 ring-orange-400 bg-orange-50 scale-[1.02]' : ''} ${
                          draggedAddOn ? 'hover:ring-2 hover:ring-orange-300' : ''
                        }`}
                        data-testid={`calendar-day-drop-${format(day, 'yyyy-MM-dd')}`}
                      >
                        <div className="text-center mb-2">
                          <div className="text-slate-500 text-xs font-medium mb-1">{format(day, 'EEE')}</div>
                          <div className={`text-xl font-bold ${today ? 'text-teal-600' : 'text-slate-900'}`}>{format(day, 'd')}</div>
                          {isDropTarget && (
                            <div className="text-xs text-orange-600 font-medium mt-1 animate-pulse">
                              Drop here
                            </div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {daySchedules.map(schedule => {
                            const patient = patients.find(p => p.mrn === schedule.patient_mrn);
                            const checklist = patient?.prep_checklist || {};
                            const completed = Object.values(checklist).filter(Boolean).length;
                            const percentage = (completed / 4) * 100;
                            return (
                              <div key={schedule._id} onClick={() => setSelectedPatient(patient)} className="bg-white rounded-lg p-2 border-l-2 border-teal-400 hover:shadow-md transition-all cursor-pointer text-xs">
                                <div className="font-semibold text-slate-900 truncate">{schedule.patient_name}</div>
                                <div className="text-slate-500 text-xs truncate">{schedule.staff}</div>
                                {schedule.scheduled_time && <div className="flex items-center text-slate-400 text-xs mt-1"><Clock className="h-2.5 w-2.5 mr-1" />{schedule.scheduled_time}</div>}
                                <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-slate-400">Prep</span>
                                    <span className="text-xs text-slate-500 font-medium">{completed}/4</span>
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-1">
                                    <div className={`h-1 rounded-full transition-all ${percentage === 100 ? 'bg-green-500' : percentage >= 50 ? 'bg-teal-500' : 'bg-orange-500'}`} style={{ width: `${percentage}%` }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {daySchedules.length === 0 && <div className="text-center text-slate-400 text-xs py-6">No events</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Month View */}
              {calendarViewMode === 'month' && (
                <div>
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {(() => {
                      const monthStart = startOfMonth(monthViewDate);
                      const monthEnd = endOfMonth(monthViewDate);
                      const startDate = startOfWeek(monthStart);
                      const endDate = startOfWeek(monthEnd);
                      const daysToShow = eachDayOfInterval({ start: startDate, end: addDays(endDate, 6) });

                      return daysToShow.map((day) => {
                        const daySchedules = getSchedulesForDate(day);
                        const today = isToday(day);
                        const currentMonth = isSameMonth(day, monthViewDate);
                        const isDropTarget = dragOverDate === day.toISOString();

                        return (
                          <div 
                            key={day.toISOString()} 
                            onDragOver={(e) => currentMonth && handleDragOver(e, day)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => currentMonth && handleDrop(e, day)}
                            className={`min-h-[70px] p-1.5 rounded-lg border transition-all ${
                              today ? 'bg-teal-50 border-teal-400 ring-1 ring-teal-400' 
                              : currentMonth ? 'bg-white border-slate-200 hover:bg-slate-50' 
                              : 'bg-slate-50 border-slate-100 opacity-50'
                            } ${isDropTarget && currentMonth ? 'ring-2 ring-orange-400 bg-orange-50 scale-105' : ''} ${
                              draggedAddOn && currentMonth ? 'hover:ring-2 hover:ring-orange-300' : ''
                            }`}
                            data-testid={`calendar-month-day-${format(day, 'yyyy-MM-dd')}`}
                          >
                            <div className="text-right mb-1">
                              <span className={`text-xs font-semibold ${today ? 'text-teal-600' : currentMonth ? 'text-slate-900' : 'text-slate-400'}`}>{format(day, 'd')}</span>
                              {isDropTarget && currentMonth && (
                                <div className="text-xs text-orange-600 font-medium animate-pulse text-left">Drop</div>
                              )}
                            </div>
                            {currentMonth && (
                              <div className="space-y-0.5">
                                {daySchedules.slice(0, 2).map(schedule => {
                                  const patient = patients.find(p => p.mrn === schedule.patient_mrn);
                                  const checklist = patient?.prep_checklist || {};
                                  const completed = Object.values(checklist).filter(Boolean).length;
                                  const percentage = (completed / 4) * 100;
                                  return (
                                    <div key={schedule._id} onClick={() => setSelectedPatient(patient)} className="bg-teal-100 rounded px-1 py-0.5 cursor-pointer hover:bg-teal-200 transition-colors text-xs truncate" title={`${schedule.patient_name} - ${schedule.procedure}`}>
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-slate-900 truncate">{getInitials(schedule.patient_name)}</span>
                                        <div className={`w-1.5 h-1.5 rounded-full ${percentage === 100 ? 'bg-green-500' : percentage >= 50 ? 'bg-teal-500' : 'bg-orange-500'}`} />
                                      </div>
                                    </div>
                                  );
                                })}
                                {daySchedules.length > 2 && <div className="text-xs text-slate-500 text-center">+{daySchedules.length - 2}</div>}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Task Assignment + Patient Details */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            {/* Task Assignment Form */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
                Create Task
              </h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1 block">Task Description</Label>
                  <Input className="h-9 text-sm rounded-lg" value={taskForm.task_description} onChange={(e) => setTaskForm({...taskForm, task_description: e.target.value})} placeholder="Describe the task..." />
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1 block">Due Date</Label>
                  <Input type="date" className="h-9 text-sm rounded-lg" value={taskForm.due_date} onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})} />
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1 block">Assign To</Label>
                  <Select value={taskForm.assigned_to} onValueChange={(value) => { const selectedResident = residents.find(r => r.name === value); setTaskForm({...taskForm, assigned_to: value, assigned_to_email: selectedResident?.email || ''}); }}>
                    <SelectTrigger className="h-9 text-sm rounded-lg"><SelectValue placeholder="Select resident" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Others">Others</SelectItem>
                      {residents.length > 0 ? residents.map((resident) => (<SelectItem key={resident._id} value={resident.name}>{resident.name}</SelectItem>)) : <SelectItem value="none" disabled>No active residents</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1 block">Urgency</Label>
                  <Select value={taskForm.urgency} onValueChange={(v) => setTaskForm({...taskForm, urgency: v})}>
                    <SelectTrigger className="h-9 text-sm rounded-lg"><SelectValue placeholder="Select urgency" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1 block">Link to Patient</Label>
                  <Input className="h-9 text-sm rounded-lg" value={taskForm.patient_mrn} onChange={(e) => setTaskForm({...taskForm, patient_mrn: e.target.value})} placeholder="Patient ID (optional)" />
                </div>
                <Button onClick={handleTaskCreate} className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg h-10 text-sm font-medium" data-testid="create-task-btn">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </div>
            </div>

            {/* Patient Details */}
            {selectedPatient && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-slate-900">Patient Details</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)} className="h-8 w-8 p-0 rounded-full"><X className="h-4 w-4" /></Button>
                </div>

                <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-slate-100">
                  <div className="w-11 h-11 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">{getInitials(selectedPatient.patient_name)}</div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{selectedPatient.patient_name}</h4>
                    <p className="text-slate-500 text-sm">ID: {selectedPatient.mrn}</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div><label className="text-xs font-medium text-slate-400 block mb-0.5">DOB</label><p className="text-slate-900">{selectedPatient.dob || 'Not provided'}</p></div>
                  <div><label className="text-xs font-medium text-slate-400 block mb-0.5">Attending</label><p className="text-slate-900">{selectedPatient.attending || 'Not assigned'}</p></div>
                  <div><label className="text-xs font-medium text-slate-400 block mb-0.5">Diagnosis</label><p className="text-slate-900">{selectedPatient.diagnosis || 'Not provided'}</p></div>
                  <div><label className="text-xs font-medium text-slate-400 block mb-0.5">Procedure</label><p className="text-slate-900">{selectedPatient.procedures || 'Not provided'}</p></div>
                  <div><label className="text-xs font-medium text-slate-400 block mb-0.5">Status</label><Badge className="bg-teal-100 text-teal-700 text-xs px-2 py-0.5 rounded-full">{selectedPatient.status}</Badge></div>

                  {/* Prep Checklist */}
                  <div className="pt-3 border-t border-slate-100">
                    <label className="text-xs font-medium text-slate-400 block mb-2">Prep Checklist</label>
                    <div className="space-y-2">
                      {['xrays', 'lab_tests', 'insurance_approval', 'medical_optimization'].map(item => (
                        <div key={item} className="flex items-center space-x-2">
                          <Checkbox id={`${item}-${selectedPatient.mrn}`} checked={selectedPatient.prep_checklist?.[item] || false} onCheckedChange={(checked) => handleChecklistUpdate(selectedPatient.mrn, item, checked)} className="h-4 w-4" />
                          <label htmlFor={`${item}-${selectedPatient.mrn}`} className="text-sm text-slate-700 cursor-pointer capitalize">{item.replace('_', ' ')}</label>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100">
                      {(() => {
                        const checklist = selectedPatient.prep_checklist || {};
                        const completed = Object.values(checklist).filter(Boolean).length;
                        const percentage = (completed / 4) * 100;
                        return (
                          <div>
                            <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Prep Progress</span><span className="font-medium">{completed}/4</span></div>
                            <div className="w-full bg-slate-200 rounded-full h-2"><div className="bg-teal-500 h-2 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }} /></div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default AppleDashboard;
