import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, parseISO, isToday, isSameDay } from 'date-fns';
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
  Settings as SettingsIcon
} from 'lucide-react';
import Settings from './Settings';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const getInitials = (name) => {
  if (!name) return 'UN';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Quick Stats Card Component
const StatsCard = ({ title, value, icon: Icon, gradient, trend }) => (
  <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105`}>
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
          <Icon className="h-6 w-6 text-white" />
        </div>
        {trend && (
          <span className="text-white/80 text-sm font-medium">{trend}</span>
        )}
      </div>
      <div className="text-5xl font-bold text-white mb-2">{value}</div>
      <div className="text-white/90 text-base font-medium">{title}</div>
    </div>
    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
  </div>
);

// Calendar Event Card Component
const EventCard = ({ schedule, patient, onClick }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'from-green-50 to-green-100 border-green-400';
      case 'pending': return 'from-blue-50 to-blue-100 border-blue-400';
      default: return 'from-gray-50 to-gray-100 border-gray-400';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br ${getStatusColor(patient?.status)} rounded-2xl p-4 mb-3 border-l-4 hover:scale-102 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-semibold text-gray-700 shadow-sm">
            {getInitials(schedule.patient_name)}
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-base">{schedule.patient_name}</div>
            <div className="text-gray-600 text-sm">{schedule.staff}</div>
          </div>
        </div>
        <Badge variant="outline" className="bg-white/60 backdrop-blur-sm border-0 text-xs font-medium">
          {patient?.status || 'pending'}
        </Badge>
      </div>
      <div className="text-gray-700 text-sm mt-2">{schedule.procedure}</div>
      {schedule.scheduled_time && (
        <div className="flex items-center text-gray-500 text-sm mt-2">
          <Clock className="h-3 w-3 mr-1" />
          {schedule.scheduled_time}
        </div>
      )}
    </div>
  );
};

export const AppleDashboard = ({ user, onLogout }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [patients, setPatients] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [residents, setResidents] = useState([]);
  const [attendings, setAtttendings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [intakeForm, setIntakeForm] = useState({
    patient_name: '',
    dob: '',
    mrn: '',
    attending: '',
    diagnosis: '',
    procedures: '',
    procedure_code: ''
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

    try {
      const patientData = {
        mrn: intakeForm.mrn,
        patient_name: intakeForm.patient_name,
        dob: intakeForm.dob,
        diagnosis: intakeForm.diagnosis,
        procedures: intakeForm.procedures,
        attending: intakeForm.attending,
        status: 'pending',
      };

      const response = await fetch(`${API_URL}/api/patients`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(patientData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to add patient');
      }

      const addOnData = {
        patient_mrn: intakeForm.mrn,
        patient_name: intakeForm.patient_name,
        procedure: intakeForm.procedures,
        staff: intakeForm.attending,
        scheduled_date: '',
        status: 'pending',
        is_addon: true,
        priority: 'medium'
      };

      await fetch(`${API_URL}/api/schedules`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(addOnData),
      });

      toast.success('Patient added successfully');
      setIntakeForm({
        patient_name: '',
        dob: '',
        mrn: '',
        attending: '',
        diagnosis: '',
        procedures: '',
        procedure_code: ''
      });
      setShowQuickAdd(false);
      fetchData();
    } catch (error) {
      toast.error(error.message);
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
                <button className="text-gray-900 font-semibold hover:text-blue-600 transition-colors text-base">
                  Dashboard
                </button>
                <button className="text-gray-500 hover:text-gray-900 transition-colors text-base">
                  Calendar
                </button>
                <button className="text-gray-500 hover:text-gray-900 transition-colors text-base">
                  Patients
                </button>
                <button className="text-gray-500 hover:text-gray-900 transition-colors text-base">
                  Tasks
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notifications Bell */}
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="hover:bg-gray-100 rounded-xl relative"
                >
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {notifications.length}
                    </span>
                  )}
                </Button>
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900 text-base">Notifications</h3>
                    </div>
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {notifications.map((notif) => (
                          <div key={notif._id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900 text-sm mb-1">{notif.title}</p>
                                <p className="text-gray-600 text-sm mb-2">{notif.message.substring(0, 100)}...</p>
                                <p className="text-xs text-gray-400">
                                  {format(parseISO(notif.created_at), 'MMM d, h:mm a')}
                                </p>
                              </div>
                            </div>
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

              {/* Settings Button */}
              <Button
                variant="ghost"
                onClick={() => setShowSettings(true)}
                className="hover:bg-gray-100 rounded-xl"
              >
                <SettingsIcon className="h-5 w-5" />
              </Button>

              <div className="text-right mr-4">
                <p className="text-sm text-gray-500">{getGreeting()}</p>
                <p className="font-semibold text-gray-900">{user?.full_name}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {user?.full_name ? getInitials(user.full_name) : 'U'}
              </div>
              <Button
                variant="ghost"
                onClick={onLogout}
                className="hover:bg-gray-100 rounded-xl px-4 py-2"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="text-base">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatsCard
            title="Today's Schedule"
            value={todaySchedules}
            icon={CalendarIcon}
            gradient="from-blue-500 to-blue-600"
            trend="+2 from yesterday"
          />
          <StatsCard
            title="This Week"
            value={weeklySchedules.length}
            icon={Clock}
            gradient="from-purple-500 to-purple-600"
          />
          <StatsCard
            title="Pending Cases"
            value={addOnCases.length}
            icon={Users}
            gradient="from-orange-500 to-orange-600"
          />
          <StatsCard
            title="Tasks Due"
            value={urgentTasks.length}
            icon={CheckCircle2}
            gradient="from-green-500 to-green-600"
          />
        </div>

        {/* Calendar Section */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">This Week</h2>
              <p className="text-gray-600 text-base">
                {format(weekStart, 'MMMM d')} - {format(addDays(weekStart, 6), 'MMMM d, yyyy')}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setCurrentDate(addDays(currentDate, -7))}
                variant="outline"
                className="rounded-full w-12 h-12 p-0 hover:bg-gray-100 border-gray-300"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                onClick={() => setCurrentDate(new Date())}
                variant="outline"
                className="rounded-full px-6 py-3 hover:bg-gray-100 border-gray-300 font-medium"
              >
                Today
              </Button>
              <Button
                onClick={() => setCurrentDate(addDays(currentDate, 7))}
                variant="outline"
                className="rounded-full w-12 h-12 p-0 hover:bg-gray-100 border-gray-300"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 py-3 font-medium ml-4 shadow-lg hover:shadow-xl transition-all">
                    <Plus className="h-5 w-5 mr-2" />
                    Add New
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-gray-900">Add New Patient</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label className="text-base font-medium text-gray-700 mb-2 block">Patient Name</Label>
                        <Input
                          className="h-12 text-base rounded-xl border-gray-300"
                          value={intakeForm.patient_name}
                          onChange={(e) => setIntakeForm({...intakeForm, patient_name: e.target.value})}
                          placeholder="Enter full name"
                        />
                      </div>
                      <div>
                        <Label className="text-base font-medium text-gray-700 mb-2 block">Patient ID</Label>
                        <Input
                          className="h-12 text-base rounded-xl border-gray-300"
                          value={intakeForm.mrn}
                          onChange={(e) => setIntakeForm({...intakeForm, mrn: e.target.value})}
                          placeholder="Enter ID number"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label className="text-base font-medium text-gray-700 mb-2 block">Date of Birth</Label>
                        <Input
                          type="date"
                          className="h-12 text-base rounded-xl border-gray-300"
                          value={intakeForm.dob}
                          onChange={(e) => setIntakeForm({...intakeForm, dob: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label className="text-base font-medium text-gray-700 mb-2 block">Attending Physician</Label>
                        <Select value={intakeForm.attending} onValueChange={(v) => setIntakeForm({...intakeForm, attending: v})}>
                          <SelectTrigger className="h-12 text-base rounded-xl border-gray-300">
                            <SelectValue placeholder="Select attending" />
                          </SelectTrigger>
                          <SelectContent>
                            {attendings.length > 0 ? (
                              attendings.map((attending) => (
                                <SelectItem key={attending._id} value={attending.name}>
                                  {attending.name} {attending.specialty && `- ${attending.specialty}`}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>No attendings available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-base font-medium text-gray-700 mb-2 block">Diagnosis</Label>
                      <Input
                        className="h-12 text-base rounded-xl border-gray-300"
                        value={intakeForm.diagnosis}
                        onChange={(e) => setIntakeForm({...intakeForm, diagnosis: e.target.value})}
                        placeholder="Enter diagnosis"
                      />
                    </div>

                    <div>
                      <Label className="text-base font-medium text-gray-700 mb-2 block">Procedure</Label>
                      <Input
                        className="h-12 text-base rounded-xl border-gray-300"
                        value={intakeForm.procedures}
                        onChange={(e) => setIntakeForm({...intakeForm, procedures: e.target.value})}
                        placeholder="Enter procedure"
                      />
                    </div>

                    <div>
                      <Label className="text-base font-medium text-gray-700 mb-2 block">Procedure Code (Optional)</Label>
                      <Input
                        className="h-12 text-base rounded-xl border-gray-300"
                        value={intakeForm.procedure_code}
                        onChange={(e) => setIntakeForm({...intakeForm, procedure_code: e.target.value})}
                        placeholder="Enter code"
                      />
                    </div>

                    <div className="flex space-x-4 pt-4">
                      <Button
                        onClick={handleQuickAdd}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-6 text-base font-medium shadow-lg hover:shadow-xl transition-all"
                      >
                        Add Patient
                      </Button>
                      <Button
                        onClick={() => setShowQuickAdd(false)}
                        variant="outline"
                        className="flex-1 rounded-xl py-6 text-base font-medium border-gray-300"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-4">
            {weekDays.map((day) => {
              const daySchedules = getSchedulesForDate(day);
              const today = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`rounded-2xl p-4 min-h-[400px] transition-all ${
                    today
                      ? 'bg-gradient-to-br from-blue-50 to-blue-100 ring-2 ring-blue-400'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="text-center mb-4">
                    <div className="text-gray-600 text-sm font-medium mb-1">
                      {format(day, 'EEE')}
                    </div>
                    <div className={`text-3xl font-bold ${
                      today ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {format(day, 'd')}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {daySchedules.map(schedule => {
                      const patient = patients.find(p => p.mrn === schedule.patient_mrn);
                      return (
                        <EventCard
                          key={schedule._id}
                          schedule={schedule}
                          patient={patient}
                          onClick={() => setSelectedPatient(patient)}
                        />
                      );
                    })}
                    {daySchedules.length === 0 && (
                      <div className="text-center text-gray-400 text-sm py-8">
                        No events
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Section: Pending Cases and Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pending Cases */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Pending Cases</h2>
              <Badge className="bg-orange-100 text-orange-700 text-base px-4 py-1 rounded-full font-medium">
                {addOnCases.length}
              </Badge>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {addOnCases.slice(0, 8).map(addOn => {
                const patient = patients.find(p => p.mrn === addOn.patient_mrn);
                return (
                  <div
                    key={addOn._id}
                    className="flex items-center justify-between p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-semibold text-gray-700 shadow-sm">
                        {getInitials(addOn.patient_name)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-base">{addOn.patient_name}</div>
                        <div className="text-gray-600 text-sm">{addOn.procedure}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-white/60 backdrop-blur-sm border-0">
                      {addOn.priority || 'medium'}
                    </Badge>
                  </div>
                );
              })}
              {addOnCases.length === 0 && (
                <div className="text-center text-gray-400 py-12">
                  <p className="text-base">No pending cases</p>
                </div>
              )}
            </div>
          </div>

          {/* Urgent Tasks */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Urgent Tasks</h2>
              <Badge className="bg-red-100 text-red-700 text-base px-4 py-1 rounded-full font-medium">
                {urgentTasks.length}
              </Badge>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {urgentTasks.map(task => (
                <div
                  key={task._id}
                  className="flex items-start space-x-3 p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl hover:shadow-md transition-all"
                >
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-5 h-5 rounded-full border-2 border-red-400"></div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-base mb-1">
                      {task.task_description}
                    </div>
                    {task.due_date && (
                      <div className="text-gray-600 text-sm">
                        Due {format(parseISO(task.due_date), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {urgentTasks.length === 0 && (
                <div className="text-center text-gray-400 py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-base">All caught up!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Patient Details Modal */}
      {selectedPatient && (
        <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
          <DialogContent className="max-w-2xl rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900">Patient Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-6">
              <div className="flex items-center space-x-4 pb-6 border-b border-gray-200">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {getInitials(selectedPatient.patient_name)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedPatient.patient_name}</h3>
                  <p className="text-gray-600 text-base">ID: {selectedPatient.mrn}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-1">Date of Birth</label>
                  <p className="text-base text-gray-900">{selectedPatient.dob || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-1">Doctor</label>
                  <p className="text-base text-gray-900">{selectedPatient.attending || 'Not assigned'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-1">Diagnosis</label>
                  <p className="text-base text-gray-900">{selectedPatient.diagnosis || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-1">Status</label>
                  <Badge className="bg-blue-100 text-blue-700 text-base px-4 py-1 rounded-full font-medium">
                    {selectedPatient.status}
                  </Badge>
                </div>
              </div>

              {selectedPatient.procedures && (
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-1">Procedures</label>
                  <p className="text-base text-gray-900">{selectedPatient.procedures}</p>
                </div>
              )}

              <Button
                onClick={() => setSelectedPatient(null)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-6 text-base font-medium shadow-lg hover:shadow-xl transition-all"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AppleDashboard;
