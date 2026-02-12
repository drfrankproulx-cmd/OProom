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
  LogOut,
  Plus,
  Clock,
  CheckCircle2,
  Users,
  Activity,
  Bell,
  Settings as SettingsIcon,
  X
} from 'lucide-react';
import Settings from './Settings';
import Patients from './Patients';
import Tasks from './Tasks';
import Calendar from './Calendar';
import PatientStatusList from './patient-status/PatientStatusList';
import SurgeryDashboard from './surgery-timeline/SurgeryDashboard';
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

// Quick Stats Card Component with click feedback
const StatsCard = ({ title, value, icon: Icon, gradient, trend, onClick, dataTestId, subtitle }) => {
  const [isClicked, setIsClicked] = React.useState(false);
  
  const handleClick = () => {
    if (onClick) {
      setIsClicked(true);
      setTimeout(() => setIsClicked(false), 200);
      onClick();
    }
  };
  
  return (
    <div 
      className={`relative overflow-hidden bg-gradient-to-br ${gradient} rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 ${onClick ? 'cursor-pointer' : ''} ${isClicked ? 'scale-95' : ''} group`}
      onClick={handleClick}
      data-testid={dataTestId}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl group-hover:bg-white/30 transition-colors">
            <Icon className="h-6 w-6 text-white" />
          </div>
          {trend && (
            <span className="text-white/80 text-sm font-medium">{trend}</span>
          )}
        </div>
        <div className="text-5xl font-bold text-white mb-2">{value}</div>
        <div className="text-white/90 text-base font-medium">{title}</div>
        {subtitle && onClick && (
          <div className="text-white/60 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {subtitle}
          </div>
        )}
      </div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
      {/* Ripple effect on click */}
      {isClicked && (
        <div className="absolute inset-0 bg-white/20 animate-pulse rounded-3xl"></div>
      )}
    </div>
  );
};

export const AppleDashboard = ({ user, onLogout }) => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [viewFilter, setViewFilter] = useState(null); // For drill-down filtering
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthViewDate, setMonthViewDate] = useState(new Date());
  const [patients, setPatients] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [residents, setResidents] = useState([]);
  const [attendings, setAtttendings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Helper to navigate with filter and toast
  const navigateWithFilter = (view, filter, toastMessage) => {
    setViewFilter(filter);
    setCurrentView(view);
    if (toastMessage) {
      toast.success(toastMessage, { duration: 2000 });
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
      if (attendingsRes.ok) setAtttendings(attendingsData);
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (showSettings) {
    return <Settings onClose={() => setShowSettings(false)} />;
  }

  if (currentView === 'calendar') {
    return <Calendar onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'patients') {
    return <Patients onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'tasks') {
    return <Tasks onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'patient-status') {
    return <PatientStatusList onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'surgery-timeline') {
    return <SurgeryDashboard onBack={() => setCurrentView('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">OProom</h1>
                </div>
              </div>
              <div className="hidden md:flex items-center space-x-6 ml-12">
                <button onClick={() => setCurrentView('dashboard')} className={`${currentView === 'dashboard' ? 'text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-900'} transition-colors text-base`}>Dashboard</button>
                <button onClick={() => setCurrentView('calendar')} className={`${currentView === 'calendar' ? 'text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-900'} transition-colors text-base`}>Calendar</button>
                <button onClick={() => setCurrentView('patients')} className={`${currentView === 'patients' ? 'text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-900'} transition-colors text-base`}>Patients</button>
                <button onClick={() => setCurrentView('tasks')} className={`${currentView === 'tasks' ? 'text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-900'} transition-colors text-base`}>Tasks</button>
                <button onClick={() => setCurrentView('patient-status')} className={`${currentView === 'patient-status' ? 'text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-900'} transition-colors text-base`}>Pre-Op Status</button>
                <button onClick={() => setCurrentView('surgery-timeline')} className={`${currentView === 'surgery-timeline' ? 'text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-900'} transition-colors text-base`}>Surgery Timeline</button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Button variant="ghost" onClick={() => setShowNotifications(!showNotifications)} className="hover:bg-gray-100 rounded-xl relative">
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{notifications.length}</span>
                  )}
                </Button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900 text-base">Notifications</h3>
                    </div>
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {notifications.map((notif) => (
                          <div key={notif._id} className="p-4 hover:bg-gray-50 transition-colors">
                            <p className="font-semibold text-gray-900 text-sm mb-1">{notif.title}</p>
                            <p className="text-gray-600 text-sm mb-2">{notif.message.substring(0, 100)}...</p>
                            <p className="text-xs text-gray-400">{format(parseISO(notif.created_at), 'MMM d, h:mm a')}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-400">
                        <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-base">No notifications</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Button variant="ghost" onClick={() => setShowSettings(true)} className="hover:bg-gray-100 rounded-xl">
                <SettingsIcon className="h-5 w-5" />
              </Button>
              <div className="text-right mr-4">
                <p className="text-sm text-gray-500">{getGreeting()}</p>
                <p className="font-semibold text-gray-900">{user?.full_name}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {user?.full_name ? getInitials(user.full_name) : 'U'}
              </div>
              <Button variant="ghost" onClick={onLogout} className="hover:bg-gray-100 rounded-xl px-4 py-2">
                <LogOut className="h-4 w-4 mr-2" />
                <span className="text-base">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4">
        {/* Quick Stats - Compact & Clickable */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatsCard 
            title="Today's Schedule" 
            value={todaySchedules} 
            icon={CalendarIcon} 
            gradient="from-blue-500 to-blue-600" 
            onClick={() => navigateWithFilter('calendar', { type: 'today' }, `Viewing today's ${todaySchedules} scheduled cases`)}
            dataTestId="stats-card-today-schedule"
            subtitle="Click to view today's cases →"
          />
          <StatsCard 
            title="This Week" 
            value={weeklySchedules.length} 
            icon={Clock} 
            gradient="from-purple-500 to-purple-600" 
            onClick={() => navigateWithFilter('calendar', { type: 'week' }, `Viewing ${weeklySchedules.length} cases this week`)}
            dataTestId="stats-card-this-week"
            subtitle="Click to view weekly schedule →"
          />
          <StatsCard 
            title="Pending Cases" 
            value={addOnCases.length} 
            icon={Users} 
            gradient="from-orange-500 to-orange-600" 
            onClick={() => navigateWithFilter('patients', { type: 'addon' }, `Showing ${addOnCases.length} add-on cases`)}
            dataTestId="stats-card-pending-cases"
            subtitle="Click to view add-on list →"
          />
          <StatsCard 
            title="Tasks Due" 
            value={urgentTasks.length} 
            icon={CheckCircle2} 
            gradient="from-green-500 to-green-600" 
            onClick={() => navigateWithFilter('tasks', { type: 'urgent' }, `Showing ${urgentTasks.length} urgent tasks`)}
            dataTestId="stats-card-tasks-due"
            subtitle="Click to view urgent tasks →"
          />
        </div>

        {/* Quick Add Patient Form - Full Width at Top */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-4">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Plus className="h-6 w-6 mr-2 text-blue-500" />
            Quick Add Patient
          </h3>

          {/* Row 1: Patient Name, Patient ID, DOB */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1 block">Patient Name</Label>
              <Input
                className="h-10 text-sm rounded-lg"
                value={intakeForm.patient_name}
                onChange={(e) => setIntakeForm({...intakeForm, patient_name: e.target.value})}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1 block">Patient ID</Label>
              <Input
                className="h-10 text-sm rounded-lg"
                value={intakeForm.mrn}
                onChange={(e) => setIntakeForm({...intakeForm, mrn: e.target.value})}
                placeholder="ID number"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1 block">Date of Birth</Label>
              <Input
                type="date"
                className="h-10 text-sm rounded-lg"
                value={intakeForm.dob}
                onChange={(e) => setIntakeForm({...intakeForm, dob: e.target.value})}
              />
            </div>
          </div>

          {/* Row 2: Attending, Diagnosis, Procedure/CPT */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1 block">Attending</Label>
              <Select value={intakeForm.attending} onValueChange={(v) => setIntakeForm({...intakeForm, attending: v})}>
                <SelectTrigger className="h-10 text-sm rounded-lg">
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
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Scheduling</Label>
                <Select value={intakeForm.scheduling_type} onValueChange={(v) => setIntakeForm({...intakeForm, scheduling_type: v})}>
                  <SelectTrigger className="h-10 text-sm rounded-lg">
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
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">Scheduled Date</Label>
                    <Input type="date" className="h-10 text-sm rounded-lg" value={intakeForm.scheduled_date} onChange={(e) => setIntakeForm({...intakeForm, scheduled_date: e.target.value})} />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">Scheduled Time (Optional)</Label>
                    <Input type="time" className="h-10 text-sm rounded-lg" value={intakeForm.scheduled_time} onChange={(e) => setIntakeForm({...intakeForm, scheduled_time: e.target.value})} placeholder="HH:MM" />
                  </div>
                </>
              )}

              <div className={intakeForm.scheduling_type === 'scheduled' ? '' : 'md:col-span-3'}>
                <Button onClick={handleQuickAdd} className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg h-10 text-sm font-medium shadow-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  {intakeForm.scheduling_type === 'scheduled' ? 'Schedule Patient' : 'Add to Add-On List'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column Layout: Left Sidebar | Calendar | Right Sidebar */}
        <div className="grid grid-cols-12 gap-4">
          {/* LEFT COLUMN: Weekly Cases + Add-on Cases + Urgent Tasks */}
          <div className="col-span-2 space-y-4">
            {/* Weekly Cases */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4">
              <h3 className="font-bold text-gray-900 text-sm mb-3">WEEKLY ({weeklySchedules.length})</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {weeklySchedules.map(schedule => {
                  const patient = patients.find(p => p.mrn === schedule.patient_mrn);
                  return (
                    <div key={schedule._id} className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors text-xs" onClick={() => setSelectedPatient(patient)}>
                      <div className="font-semibold text-gray-900">{getInitials(schedule.patient_name)}</div>
                      <div className="text-gray-600 truncate">{schedule.staff}</div>
                      <div className="text-gray-500 text-xs">{schedule.scheduled_date && format(parseISO(schedule.scheduled_date), 'MMM d')}</div>
                    </div>
                  );
                })}
                {weeklySchedules.length === 0 && <div className="text-center text-gray-400 text-xs py-4">No cases</div>}
              </div>
            </div>

            {/* Add-on Cases */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4">
              <h3 className="font-bold text-gray-900 text-sm mb-3">ADD-ONS ({addOnCases.length})</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {addOnCases.map(addOn => {
                  const patient = patients.find(p => p.mrn === addOn.patient_mrn);
                  const checklist = patient?.prep_checklist || {};
                  const completed = Object.values(checklist).filter(Boolean).length;
                  return (
                    <div key={addOn._id} className="p-2 bg-orange-50 rounded-lg hover:bg-orange-100 cursor-pointer transition-colors text-xs" onClick={() => setSelectedPatient(patient)}>
                      <div className="font-semibold text-gray-900">{getInitials(addOn.patient_name)}</div>
                      <div className="text-gray-600 truncate">{addOn.procedure}</div>
                      <div className="flex items-center justify-between mt-1">
                        <Badge variant="outline" className="bg-white text-xs px-2 py-0">{addOn.priority || 'medium'}</Badge>
                        <span className="text-xs text-gray-500">{completed}/4</span>
                      </div>
                    </div>
                  );
                })}
                {addOnCases.length === 0 && <div className="text-center text-gray-400 text-xs py-4">No add-ons</div>}
              </div>
            </div>

            {/* Urgent Tasks */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4">
              <h3 className="font-bold text-gray-900 text-sm mb-3">URGENT ({urgentTasks.length})</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {urgentTasks.map(task => (
                  <div key={task._id} className="p-2 bg-red-50 rounded-lg text-xs">
                    <div className="font-medium text-gray-900 leading-tight">{task.task_description}</div>
                    {task.due_date && <div className="text-gray-500 text-xs mt-1">{format(parseISO(task.due_date), 'MMM d')}</div>}
                  </div>
                ))}
                {urgentTasks.length === 0 && <div className="text-center text-gray-400 text-xs py-4">All caught up!</div>}
              </div>
            </div>
          </div>

          {/* CENTER COLUMN: Calendar */}
          <div className="col-span-7">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">This Week</h2>
                  <p className="text-gray-600 text-sm">{format(weekStart, 'MMMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button onClick={() => setCurrentDate(addDays(currentDate, -7))} variant="outline" size="sm" className="rounded-full w-10 h-10 p-0"><ChevronLeft className="h-4 w-4" /></Button>
                  <Button onClick={() => setCurrentDate(new Date())} variant="outline" size="sm" className="rounded-full px-4">Today</Button>
                  <Button onClick={() => setCurrentDate(addDays(currentDate, 7))} variant="outline" size="sm" className="rounded-full w-10 h-10 p-0"><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const daySchedules = getSchedulesForDate(day);
                  const today = isToday(day);
                  return (
                    <div key={day.toISOString()} className={`rounded-xl p-3 min-h-[450px] transition-all ${today ? 'bg-gradient-to-br from-blue-50 to-blue-100 ring-2 ring-blue-400' : 'bg-gray-50'}`}>
                      <div className="text-center mb-3">
                        <div className="text-gray-600 text-xs font-medium mb-1">{format(day, 'EEE')}</div>
                        <div className={`text-2xl font-bold ${today ? 'text-blue-600' : 'text-gray-900'}`}>{format(day, 'd')}</div>
                      </div>
                      <div className="space-y-2">
                        {daySchedules.map(schedule => {
                          const patient = patients.find(p => p.mrn === schedule.patient_mrn);
                          const checklist = patient?.prep_checklist || {};
                          const completed = Object.values(checklist).filter(Boolean).length;
                          const percentage = (completed / 4) * 100;
                          return (
                            <div key={schedule._id} onClick={() => setSelectedPatient(patient)} className="bg-white rounded-lg p-2 border-l-2 border-blue-400 hover:shadow-md transition-all cursor-pointer text-xs">
                              <div className="font-semibold text-gray-900 truncate">{schedule.patient_name}</div>
                              <div className="text-gray-600 text-xs truncate">{schedule.staff}</div>
                              {schedule.scheduled_time && <div className="flex items-center text-gray-500 text-xs mt-1"><Clock className="h-2.5 w-2.5 mr-1" />{schedule.scheduled_time}</div>}
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-gray-500">Prep</span>
                                  <span className="text-xs text-gray-600 font-medium">{completed}/4</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div className={`h-1.5 rounded-full transition-all ${percentage === 100 ? 'bg-green-500' : percentage >= 50 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${percentage}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {daySchedules.length === 0 && <div className="text-center text-gray-400 text-xs py-8">No events</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monthly Calendar */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 mt-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Monthly View</h2>
                  <p className="text-gray-600 text-sm">{format(monthViewDate, 'MMMM yyyy')}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button onClick={() => setMonthViewDate(subMonths(monthViewDate, 1))} variant="outline" size="sm" className="rounded-full w-10 h-10 p-0"><ChevronLeft className="h-4 w-4" /></Button>
                  <Button onClick={() => setMonthViewDate(new Date())} variant="outline" size="sm" className="rounded-full px-4">This Month</Button>
                  <Button onClick={() => setMonthViewDate(addMonths(monthViewDate, 1))} variant="outline" size="sm" className="rounded-full w-10 h-10 p-0"><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">{day}</div>
                ))}

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

                    return (
                      <div key={day.toISOString()} className={`min-h-[80px] p-2 rounded-lg border transition-all ${today ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : currentMonth ? 'bg-white border-gray-200 hover:bg-gray-50' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
                        <div className="text-right mb-1">
                          <span className={`text-xs font-semibold ${today ? 'text-blue-600' : currentMonth ? 'text-gray-900' : 'text-gray-400'}`}>{format(day, 'd')}</span>
                        </div>
                        {currentMonth && (
                          <div className="space-y-1">
                            {daySchedules.slice(0, 2).map(schedule => {
                              const patient = patients.find(p => p.mrn === schedule.patient_mrn);
                              const checklist = patient?.prep_checklist || {};
                              const completed = Object.values(checklist).filter(Boolean).length;
                              const percentage = (completed / 4) * 100;
                              return (
                                <div key={schedule._id} onClick={() => setSelectedPatient(patient)} className="bg-blue-100 rounded px-1 py-0.5 cursor-pointer hover:bg-blue-200 transition-colors text-xs truncate" title={`${schedule.patient_name} - ${schedule.procedure}`}>
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900 truncate">{getInitials(schedule.patient_name)}</span>
                                    <div className={`w-1.5 h-1.5 rounded-full ${percentage === 100 ? 'bg-green-500' : percentage >= 50 ? 'bg-blue-500' : 'bg-orange-500'}`} />
                                  </div>
                                </div>
                              );
                            })}
                            {daySchedules.length > 2 && <div className="text-xs text-gray-500 text-center">+{daySchedules.length - 2} more</div>}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Task Assignment + Patient Details */}
          <div className="col-span-3 space-y-4">
            {/* Task Assignment Form */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
                Create Task
              </h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Task Description</Label>
                  <Input className="h-10 text-sm rounded-lg" value={taskForm.task_description} onChange={(e) => setTaskForm({...taskForm, task_description: e.target.value})} placeholder="Describe the task..." />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Due Date</Label>
                  <Input type="date" className="h-10 text-sm rounded-lg" value={taskForm.due_date} onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})} />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Assign To</Label>
                  <Select value={taskForm.assigned_to} onValueChange={(value) => { const selectedResident = residents.find(r => r.name === value); setTaskForm({...taskForm, assigned_to: value, assigned_to_email: selectedResident?.email || ''}); }}>
                    <SelectTrigger className="h-10 text-sm rounded-lg"><SelectValue placeholder="Select resident" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Others">Others</SelectItem>
                      {residents.length > 0 ? residents.map((resident) => (<SelectItem key={resident._id} value={resident.name}>{resident.name}</SelectItem>)) : <SelectItem value="none" disabled>No active residents</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Urgency</Label>
                  <Select value={taskForm.urgency} onValueChange={(v) => setTaskForm({...taskForm, urgency: v})}>
                    <SelectTrigger className="h-10 text-sm rounded-lg"><SelectValue placeholder="Select urgency" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Link to Patient (Optional)</Label>
                  <Input className="h-10 text-sm rounded-lg" value={taskForm.patient_mrn} onChange={(e) => setTaskForm({...taskForm, patient_mrn: e.target.value})} placeholder="Patient ID" />
                </div>
                <Button onClick={handleTaskCreate} className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg py-5 text-sm font-medium shadow-lg">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </div>
            </div>

            {/* Patient Details */}
            {selectedPatient && (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Patient Details</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)} className="h-8 w-8 p-0 rounded-full"><X className="h-4 w-4" /></Button>
                </div>

                <div className="flex items-center space-x-3 mb-4 pb-4 border-b">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">{getInitials(selectedPatient.patient_name)}</div>
                  <div>
                    <h4 className="font-bold text-gray-900">{selectedPatient.patient_name}</h4>
                    <p className="text-gray-600 text-sm">ID: {selectedPatient.mrn}</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div><label className="text-xs font-medium text-gray-500 block mb-1">DOB</label><p className="text-gray-900">{selectedPatient.dob || 'Not provided'}</p></div>
                  <div><label className="text-xs font-medium text-gray-500 block mb-1">Attending</label><p className="text-gray-900">{selectedPatient.attending || 'Not assigned'}</p></div>
                  <div><label className="text-xs font-medium text-gray-500 block mb-1">Diagnosis</label><p className="text-gray-900">{selectedPatient.diagnosis || 'Not provided'}</p></div>
                  <div><label className="text-xs font-medium text-gray-500 block mb-1">Procedure</label><p className="text-gray-900">{selectedPatient.procedures || 'Not provided'}</p></div>
                  <div><label className="text-xs font-medium text-gray-500 block mb-1">Status</label><Badge className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full">{selectedPatient.status}</Badge></div>

                  {/* Prep Checklist */}
                  <div className="pt-3 border-t border-gray-200">
                    <label className="text-xs font-medium text-gray-500 block mb-3">Prep Checklist</label>
                    <div className="space-y-2">
                      {['xrays', 'lab_tests', 'insurance_approval', 'medical_optimization'].map(item => (
                        <div key={item} className="flex items-center space-x-2">
                          <Checkbox id={`${item}-${selectedPatient.mrn}`} checked={selectedPatient.prep_checklist?.[item] || false} onCheckedChange={(checked) => handleChecklistUpdate(selectedPatient.mrn, item, checked)} className="h-4 w-4" />
                          <label htmlFor={`${item}-${selectedPatient.mrn}`} className="text-sm text-gray-700 cursor-pointer capitalize">{item.replace('_', ' ')}</label>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {(() => {
                        const checklist = selectedPatient.prep_checklist || {};
                        const completed = Object.values(checklist).filter(Boolean).length;
                        const percentage = (completed / 4) * 100;
                        return (
                          <div>
                            <div className="flex justify-between text-xs text-gray-600 mb-1"><span>Prep Progress</span><span className="font-medium">{completed}/4</span></div>
                            <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }} /></div>
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
      </main>
    </div>
  );
};

export default AppleDashboard;
