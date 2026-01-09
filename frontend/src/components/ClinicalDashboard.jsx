import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, parseISO, isToday, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Circle, AlertCircle, Calendar, LogOut, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import AddOnCasesView from './AddOnCasesView';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ReadinessIndicator = ({ status }) => {
  const colors = {
    confirmed: 'text-green-500',
    pending: 'text-yellow-500',
    deficient: 'text-red-500'
  };
  return <Circle className={`h-1.5 w-1.5 fill-current ${colors[status] || colors.pending}`} />;
};

const getInitials = (name) => {
  if (!name) return 'UN';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const VIEW_MODES = {
  FULL: 'full',
  CALENDAR: 'calendar',
  WEEKLY_CASES: 'weekly',
  ADDON: 'addon',
  TASKS: 'tasks',
  MEETINGS: 'meetings'
};

export const ClinicalDashboard = ({ user, onLogout }) => {
  const [viewMode, setViewMode] = useState(VIEW_MODES.FULL);
  const [showAddOnView, setShowAddOnView] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [patients, setPatients] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);

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
      const [patientsRes, schedulesRes, tasksRes, conferencesRes] = await Promise.all([
        fetch(`${API_URL}/api/patients`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/schedules`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/tasks`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/conferences`, { headers: getAuthHeaders() }),
      ]);

      const [patientsData, schedulesData, tasksData, conferencesData] = await Promise.all([
        patientsRes.json(),
        schedulesRes.json(),
        tasksRes.json(),
        conferencesRes.json(),
      ]);

      if (patientsRes.ok) setPatients(patientsData);
      if (schedulesRes.ok) setSchedules(schedulesData);
      if (tasksRes.ok) setTasks(tasksData);
      if (conferencesRes.ok) setConferences(conferencesData);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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

  const nonUrgentTasks = tasks.filter(t => {
    if (t.completed || !t.due_date) return false;
    const days = Math.ceil((new Date(t.due_date) - new Date()) / (1000 * 60 * 60 * 24));
    return days > 3 && days <= 7;
  });

  const handleQuickAdd = async () => {
    if (!intakeForm.patient_name || !intakeForm.mrn) {
      toast.error('Patient name and MRN required');
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

      toast.success('Patient added to add-on list');
      setIntakeForm({
        patient_name: '',
        dob: '',
        mrn: '',
        attending: '',
        diagnosis: '',
        procedures: '',
        procedure_code: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showAddOnView) {
    return (
      <AddOnCasesView
        addOnCases={addOnCases}
        patients={patients}
        onClose={() => setShowAddOnView(false)}
        onRefresh={fetchData}
      />
    );
  }

  const showLeftSidebar = viewMode === VIEW_MODES.FULL || viewMode === VIEW_MODES.WEEKLY_CASES || viewMode === VIEW_MODES.ADDON;
  const showRightSidebar = viewMode === VIEW_MODES.FULL;
  const showTopStrip = viewMode === VIEW_MODES.FULL || viewMode === VIEW_MODES.MEETINGS || viewMode === VIEW_MODES.TASKS;
  const showCalendar = viewMode !== VIEW_MODES.TASKS && viewMode !== VIEW_MODES.MEETINGS && viewMode !== VIEW_MODES.ADDON;
  const showTasksPanel = viewMode === VIEW_MODES.FULL || viewMode === VIEW_MODES.TASKS;

  return (
    <div className="h-screen flex flex-col bg-background text-xs">
      {/* Minimal Header */}
      <div className="h-8 border-b border-border flex items-center justify-between px-2 bg-card">
        <div className="flex items-center space-x-2">
          {/* View Dropdown */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
              className="h-6 px-2 text-xs font-semibold"
            >
              <Calendar className="h-3 w-3 mr-1" />
              {viewMode === VIEW_MODES.FULL && 'Full Dashboard'}
              {viewMode === VIEW_MODES.CALENDAR && 'Calendar Only'}
              {viewMode === VIEW_MODES.WEEKLY_CASES && 'Weekly Cases'}
              {viewMode === VIEW_MODES.ADDON && 'Add-On Cases'}
              {viewMode === VIEW_MODES.TASKS && 'Tasks'}
              {viewMode === VIEW_MODES.MEETINGS && 'Meetings'}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>

            {viewDropdownOpen && (
              <div className="absolute left-0 top-full mt-0.5 w-48 bg-popover border border-border rounded-md shadow-lg z-50">
                <div className="py-1">
                  <button
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                    onClick={() => { setViewMode(VIEW_MODES.FULL); setViewDropdownOpen(false); }}
                  >
                    Full Dashboard
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                    onClick={() => { setViewMode(VIEW_MODES.CALENDAR); setViewDropdownOpen(false); }}
                  >
                    Calendar Only
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                    onClick={() => { setViewMode(VIEW_MODES.WEEKLY_CASES); setViewDropdownOpen(false); }}
                  >
                    Weekly Cases
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center justify-between"
                    onClick={() => { setShowAddOnView(true); setViewDropdownOpen(false); }}
                  >
                    Add-On Cases (Detailed)
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                    onClick={() => { setViewMode(VIEW_MODES.TASKS); setViewDropdownOpen(false); }}
                  >
                    Tasks / Checklist
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                    onClick={() => { setViewMode(VIEW_MODES.MEETINGS); setViewDropdownOpen(false); }}
                  >
                    Meetings / VSP
                  </button>
                </div>
              </div>
            )}
          </div>

          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground text-xs">{user?.full_name}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout} className="h-6 px-2">
          <LogOut className="h-3 w-3 mr-1" />
          <span className="text-xs">Logout</span>
        </Button>
      </div>

      {/* Top Strip: Checklists + Meetings - Reduced height */}
      {showTopStrip && (
        <div className="h-14 border-b border-border flex bg-card">
          <div className="flex-1 border-r border-border p-1.5 overflow-y-auto">
            <div className="font-semibold text-destructive mb-0.5 text-xs">URGENT (1-3d)</div>
            <div className="space-y-0.5">
              {urgentTasks.slice(0, 2).map(task => (
                <div key={task._id} className="flex items-start text-xs">
                  <AlertCircle className="h-2.5 w-2.5 text-destructive mr-1 flex-shrink-0 mt-0.5" />
                  <span className="truncate leading-tight">{task.task_description}</span>
                </div>
              ))}
              {urgentTasks.length === 0 && <span className="text-muted-foreground text-xs">None</span>}
            </div>
          </div>
          <div className="flex-1 border-r border-border p-1.5 overflow-y-auto">
            <div className="font-semibold text-warning mb-0.5 text-xs">NON-URGENT (4-7d)</div>
            <div className="space-y-0.5">
              {nonUrgentTasks.slice(0, 2).map(task => (
                <div key={task._id} className="flex items-start text-xs">
                  <Circle className="h-2 w-2 text-warning mr-1 flex-shrink-0 mt-0.5" />
                  <span className="truncate leading-tight">{task.task_description}</span>
                </div>
              ))}
              {nonUrgentTasks.length === 0 && <span className="text-muted-foreground text-xs">None</span>}
            </div>
          </div>
          <div className="flex-1 p-1.5 overflow-y-auto">
            <div className="font-semibold mb-0.5 text-xs">MEETINGS / VSP</div>
            <div className="space-y-0.5">
              {conferences.slice(0, 2).map(conf => (
                <div key={conf._id} className="text-xs truncate leading-tight">
                  <span className="font-medium">{conf.title}</span>
                  <span className="text-muted-foreground ml-1">({format(parseISO(conf.date), 'M/d')})</span>
                </div>
              ))}
              {conferences.length === 0 && <span className="text-muted-foreground text-xs">None</span>}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR - Narrower */}
        {showLeftSidebar && (
          <div className={`${viewMode === VIEW_MODES.CALENDAR ? 'w-0' : 'w-48'} border-r border-border flex flex-col bg-card transition-all`}>
            <div className="flex-1 border-b border-border overflow-y-auto">
              <div className="sticky top-0 bg-muted px-1.5 py-1 border-b border-border">
                <span className="font-semibold text-xs">WEEKLY ({weeklySchedules.length})</span>
              </div>
              <div className="divide-y divide-border">
                {weeklySchedules.map(schedule => {
                  const patient = patients.find(p => p.mrn === schedule.patient_mrn);
                  return (
                    <div
                      key={schedule._id}
                      className="p-1.5 hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => setSelectedPatient(patient)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="font-medium text-xs">{getInitials(schedule.patient_name)}</div>
                        <ReadinessIndicator status={patient?.status || 'pending'} />
                      </div>
                      <div className="text-muted-foreground text-xs mt-0.5 leading-tight">{schedule.staff}</div>
                      <div className="text-muted-foreground text-xs truncate leading-tight">{schedule.procedure}</div>
                      <div className="text-muted-foreground text-xs leading-tight">
                        {schedule.scheduled_date && format(parseISO(schedule.scheduled_date), 'EEE M/d')}
                      </div>
                    </div>
                  );
                })}
                {weeklySchedules.length === 0 && (
                  <div className="p-1.5 text-muted-foreground text-xs">No cases</div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="sticky top-0 bg-muted px-1.5 py-1 border-b border-border flex items-center justify-between">
                <span className="font-semibold text-xs">ADD-ONS ({addOnCases.length})</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddOnView(true)}
                  className="h-5 px-1 text-xs"
                  title="Open detailed view"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                </Button>
              </div>
              <div className="divide-y divide-border">
                {addOnCases.slice(0, 10).map(addOn => (
                  <div key={addOn._id} className="p-1.5 hover:bg-accent cursor-pointer">
                    <div className="font-medium text-xs">{getInitials(addOn.patient_name)}</div>
                    <div className="text-muted-foreground text-xs leading-tight">{addOn.staff}</div>
                    <div className="text-muted-foreground text-xs truncate leading-tight">{addOn.procedure}</div>
                  </div>
                ))}
                {addOnCases.length === 0 && (
                  <div className="p-1.5 text-muted-foreground text-xs">No add-ons</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CENTER: Weekly Calendar Grid - Expanded */}
        {showCalendar && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-8 border-b border-border flex items-center justify-between px-2 bg-card">
              <div className="flex items-center space-x-1.5">
                <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addDays(currentDate, -7))} className="h-5 w-5 p-0">
                  <ChevronLeft className="h-2.5 w-2.5" />
                </Button>
                <span className="font-semibold text-xs">
                  Week of {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="h-5 px-1.5 text-xs">
                  Today
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addDays(currentDate, 7))} className="h-5 w-5 p-0">
                  <ChevronRight className="h-2.5 w-2.5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-7 h-full">
                {weekDays.map((day) => {
                  const daySchedules = getSchedulesForDate(day);
                  const today = isToday(day);
                  return (
                    <div key={day.toISOString()} className={`border-r border-border last:border-r-0 flex flex-col ${
                      today ? 'bg-primary/5' : ''
                    }`}>
                      <div className={`h-8 border-b border-border p-0.5 text-center ${
                        today ? 'bg-primary/10' : 'bg-muted/30'
                      }`}>
                        <div className="text-muted-foreground text-xs leading-tight">{format(day, 'EEE')}</div>
                        <div className={`text-sm font-semibold leading-tight ${
                          today ? 'text-primary' : 'text-foreground'
                        }`}>
                          {format(day, 'd')}
                        </div>
                      </div>

                      <div className="flex-1 p-0.5 space-y-0.5 overflow-y-auto">
                        {daySchedules.map(schedule => {
                          const patient = patients.find(p => p.mrn === schedule.patient_mrn);
                          return (
                            <div
                              key={schedule._id}
                              className="border border-border rounded p-1 bg-card hover:shadow-sm cursor-pointer transition-shadow"
                              onClick={() => setSelectedPatient(patient)}
                            >
                              <div className="flex items-start justify-between">
                                <span className="font-semibold text-xs leading-tight">{getInitials(schedule.patient_name)}</span>
                                <ReadinessIndicator status={patient?.status || 'pending'} />
                              </div>
                              <div className="text-muted-foreground text-xs mt-0.5 leading-tight">{schedule.staff}</div>
                              <div className="text-muted-foreground text-xs truncate leading-tight">{schedule.procedure}</div>
                              {schedule.scheduled_time && (
                                <div className="text-muted-foreground text-xs mt-0.5 leading-tight">{schedule.scheduled_time}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* RIGHT SIDEBAR - Narrower */}
        {showRightSidebar && (
          <div className="w-52 border-l border-border overflow-y-auto bg-card p-2 space-y-2">
            <div className="font-semibold text-xs border-b border-border pb-1">INTAKE</div>
            
            <div className="space-y-1.5">
              <div>
                <Label className="text-xs">Patient</Label>
                <Input
                  className="h-6 text-xs"
                  value={intakeForm.patient_name}
                  onChange={(e) => setIntakeForm({...intakeForm, patient_name: e.target.value})}
                />
              </div>

              <div>
                <Label className="text-xs">MRN</Label>
                <Input
                  className="h-6 text-xs"
                  value={intakeForm.mrn}
                  onChange={(e) => setIntakeForm({...intakeForm, mrn: e.target.value})}
                />
              </div>

              <div>
                <Label className="text-xs">DOB</Label>
                <Input
                  type="date"
                  className="h-6 text-xs"
                  value={intakeForm.dob}
                  onChange={(e) => setIntakeForm({...intakeForm, dob: e.target.value})}
                />
              </div>

              <div>
                <Label className="text-xs">Attending</Label>
                <Select value={intakeForm.attending} onValueChange={(v) => setIntakeForm({...intakeForm, attending: v})}>
                  <SelectTrigger className="h-6 text-xs">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dr. Anderson">Dr. Anderson</SelectItem>
                    <SelectItem value="Dr. Smith">Dr. Smith</SelectItem>
                    <SelectItem value="Dr. Jones">Dr. Jones</SelectItem>
                    <SelectItem value="Dr. Williams">Dr. Williams</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Diagnosis</Label>
                <Input
                  className="h-6 text-xs"
                  value={intakeForm.diagnosis}
                  onChange={(e) => setIntakeForm({...intakeForm, diagnosis: e.target.value})}
                />
              </div>

              <div>
                <Label className="text-xs">Procedure</Label>
                <Input
                  className="h-6 text-xs"
                  value={intakeForm.procedures}
                  onChange={(e) => setIntakeForm({...intakeForm, procedures: e.target.value})}
                />
              </div>

              <div>
                <Label className="text-xs">CPT</Label>
                <Input
                  className="h-6 text-xs"
                  value={intakeForm.procedure_code}
                  onChange={(e) => setIntakeForm({...intakeForm, procedure_code: e.target.value})}
                />
              </div>

              <Button onClick={handleQuickAdd} className="w-full h-6 text-xs" size="sm">
                Add to Add-On
              </Button>
            </div>

            {selectedPatient && (
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs">DETAILS</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)} className="h-4 w-4 p-0 text-xs">
                    ×
                  </Button>
                </div>
                <div className="space-y-0.5 text-xs">
                  <div className="flex"><span className="font-medium w-12">Name:</span> {selectedPatient.patient_name}</div>
                  <div className="flex"><span className="font-medium w-12">MRN:</span> {selectedPatient.mrn}</div>
                  <div className="flex"><span className="font-medium w-12">DOB:</span> {selectedPatient.dob}</div>
                  <div className="flex"><span className="font-medium w-12">Attend:</span> {selectedPatient.attending}</div>
                  <div className="flex"><span className="font-medium w-12">Dx:</span> {selectedPatient.diagnosis}</div>
                  <div className="flex items-center"><span className="font-medium w-12">Status:</span> <Badge variant="outline" className="text-xs h-4">{selectedPatient.status}</Badge></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM PANEL: Tasks - Collapsible */}
      {showTasksPanel && (
        <div className={`border-t border-border bg-card transition-all ${
          tasksExpanded ? 'h-32' : 'h-8'
        }`}>
          <div className="px-2 py-1 flex items-center justify-between cursor-pointer" onClick={() => setTasksExpanded(!tasksExpanded)}>
            <div className="font-semibold text-xs">TASKS CHECKLIST ({tasks.length})</div>
            {tasksExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </div>
          {tasksExpanded && (
            <div className="px-2 pb-1 overflow-y-auto" style={{maxHeight: '7rem'}}>
              <div className="grid grid-cols-4 gap-1.5">
                {tasks.slice(0, 12).map(task => (
                  <div key={task._id} className="flex items-start space-x-1">
                    <Checkbox className="h-3 w-3 mt-0.5" checked={task.completed} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs truncate leading-tight">{task.task_description}</div>
                      {task.due_date && (
                        <div className="text-muted-foreground text-xs leading-tight">
                          {format(parseISO(task.due_date), 'M/d')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClinicalDashboard;
