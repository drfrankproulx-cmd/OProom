import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, parseISO, isToday, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Circle, AlertCircle, Calendar, LogOut } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Compact readiness indicator
const ReadinessIndicator = ({ status }) => {
  const colors = {
    confirmed: 'text-green-500',
    pending: 'text-yellow-500',
    deficient: 'text-red-500'
  };
  return <Circle className={`h-2 w-2 fill-current ${colors[status] || colors.pending}`} />;
};

// Get patient initials
const getInitials = (name) => {
  if (!name) return 'UN';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const ClinicalDashboard = ({ user, onLogout }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [patients, setPatients] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Form state for right sidebar intake
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

      // Add to add-on list
      const addOnData = {
        patient_mrn: intakeForm.mrn,
        patient_name: intakeForm.patient_name,
        procedure: intakeForm.procedures,
        staff: intakeForm.attending,
        scheduled_date: '',
        status: 'pending',
        is_addon: true,
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

  return (
    <div className="h-screen flex flex-col bg-background text-xs">
      {/* Minimal Header */}
      <div className="h-10 border-b border-border flex items-center justify-between px-3 bg-card">
        <div className="flex items-center space-x-3">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">OR Scheduler</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">{user?.full_name}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout} className="h-7 px-2">
          <LogOut className="h-3 w-3 mr-1" />
          <span className="text-xs">Logout</span>
        </Button>
      </div>

      {/* Top Strip: Checklists + Meetings */}
      <div className="h-20 border-b border-border flex bg-card">
        <div className="flex-1 border-r border-border p-2 overflow-y-auto">
          <div className="font-semibold text-destructive mb-1 text-xs">URGENT (1-3 days)</div>
          <div className="space-y-0.5">
            {urgentTasks.slice(0, 3).map(task => (
              <div key={task._id} className="flex items-start text-xs">
                <AlertCircle className="h-3 w-3 text-destructive mr-1 flex-shrink-0 mt-0.5" />
                <span className="truncate">{task.task_description}</span>
              </div>
            ))}
            {urgentTasks.length === 0 && <span className="text-muted-foreground">None</span>}
          </div>
        </div>
        <div className="flex-1 border-r border-border p-2 overflow-y-auto">
          <div className="font-semibold text-warning mb-1 text-xs">NON-URGENT (4-7 days)</div>
          <div className="space-y-0.5">
            {nonUrgentTasks.slice(0, 3).map(task => (
              <div key={task._id} className="flex items-start text-xs">
                <Circle className="h-2 w-2 text-warning mr-1 flex-shrink-0 mt-1" />
                <span className="truncate">{task.task_description}</span>
              </div>
            ))}
            {nonUrgentTasks.length === 0 && <span className="text-muted-foreground">None</span>}
          </div>
        </div>
        <div className="flex-1 p-2 overflow-y-auto">
          <div className="font-semibold mb-1 text-xs">MEETINGS / VSP</div>
          <div className="space-y-0.5">
            {conferences.slice(0, 3).map(conf => (
              <div key={conf._id} className="text-xs truncate">
                <span className="font-medium">{conf.title}</span>
                <span className="text-muted-foreground ml-1">({conf.date})</span>
              </div>
            ))}
            {conferences.length === 0 && <span className="text-muted-foreground">None</span>}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR: Weekly Cases + Add-Ons */}
        <div className="w-56 border-r border-border flex flex-col bg-card">
          {/* Weekly Cases */}
          <div className="flex-1 border-b border-border overflow-y-auto">
            <div className="sticky top-0 bg-muted px-2 py-1 border-b border-border">
              <span className="font-semibold text-xs">WEEKLY CASES ({weeklySchedules.length})</span>
            </div>
            <div className="divide-y divide-border">
              {weeklySchedules.map(schedule => {
                const patient = patients.find(p => p.mrn === schedule.patient_mrn);
                return (
                  <div
                    key={schedule._id}
                    className="p-2 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-medium">{getInitials(schedule.patient_name)}</div>
                      <ReadinessIndicator status={patient?.status || 'pending'} />
                    </div>
                    <div className="text-muted-foreground mt-0.5">{schedule.staff}</div>
                    <div className="text-muted-foreground truncate">{schedule.procedure}</div>
                    <div className="text-muted-foreground">
                      {schedule.scheduled_date && format(parseISO(schedule.scheduled_date), 'EEE M/d')}
                    </div>
                  </div>
                );
              })}
              {weeklySchedules.length === 0 && (
                <div className="p-2 text-muted-foreground">No cases</div>
              )}
            </div>
          </div>

          {/* Add-On Cases */}
          <div className="flex-1 overflow-y-auto">
            <div className="sticky top-0 bg-muted px-2 py-1 border-b border-border">
              <span className="font-semibold text-xs">ADD-ONS ({addOnCases.length})</span>
            </div>
            <div className="divide-y divide-border">
              {addOnCases.map(addOn => (
                <div key={addOn._id} className="p-2 hover:bg-accent cursor-pointer">
                  <div className="font-medium">{getInitials(addOn.patient_name)}</div>
                  <div className="text-muted-foreground">{addOn.staff}</div>
                  <div className="text-muted-foreground truncate">{addOn.procedure}</div>
                </div>
              ))}
              {addOnCases.length === 0 && (
                <div className="p-2 text-muted-foreground">No add-ons</div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER: Weekly Calendar Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Calendar Header */}
          <div className="h-10 border-b border-border flex items-center justify-between px-3 bg-card">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addDays(currentDate, -7))} className="h-6 w-6 p-0">
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="font-semibold text-sm">
                Week of {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="h-6 px-2 text-xs">
                Today
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addDays(currentDate, 7))} className="h-6 w-6 p-0">
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-7 h-full">
              {weekDays.map((day) => {
                const daySchedules = getSchedulesForDate(day);
                const today = isToday(day);
                return (
                  <div key={day.toISOString()} className={`border-r border-border last:border-r-0 flex flex-col ${
                    today ? 'bg-primary/5' : ''
                  }`}>
                    {/* Day Header */}
                    <div className={`h-10 border-b border-border p-1 text-center ${
                      today ? 'bg-primary/10' : 'bg-muted/30'
                    }`}>
                      <div className="text-muted-foreground text-xs">{format(day, 'EEE')}</div>
                      <div className={`text-sm font-semibold ${
                        today ? 'text-primary' : 'text-foreground'
                      }`}>
                        {format(day, 'd')}
                      </div>
                    </div>

                    {/* Cases */}
                    <div className="flex-1 p-1 space-y-1 overflow-y-auto">
                      {daySchedules.map(schedule => {
                        const patient = patients.find(p => p.mrn === schedule.patient_mrn);
                        return (
                          <div
                            key={schedule._id}
                            className="border border-border rounded p-1.5 bg-card hover:shadow-sm cursor-pointer transition-shadow"
                            onClick={() => setSelectedPatient(patient)}
                          >
                            <div className="flex items-start justify-between">
                              <span className="font-semibold text-xs">{getInitials(schedule.patient_name)}</span>
                              <ReadinessIndicator status={patient?.status || 'pending'} />
                            </div>
                            <div className="text-muted-foreground text-xs mt-0.5">{schedule.staff}</div>
                            <div className="text-muted-foreground text-xs truncate">{schedule.procedure}</div>
                            {schedule.scheduled_time && (
                              <div className="text-muted-foreground text-xs mt-0.5">{schedule.scheduled_time}</div>
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

        {/* RIGHT SIDEBAR: Patient Intake */}
        <div className="w-64 border-l border-border overflow-y-auto bg-card p-3 space-y-3">
          <div className="font-semibold text-sm border-b border-border pb-2">PATIENT INTAKE</div>
          
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Patient Name</Label>
              <Input
                className="h-7 text-xs"
                value={intakeForm.patient_name}
                onChange={(e) => setIntakeForm({...intakeForm, patient_name: e.target.value})}
              />
            </div>

            <div>
              <Label className="text-xs">MRN</Label>
              <Input
                className="h-7 text-xs"
                value={intakeForm.mrn}
                onChange={(e) => setIntakeForm({...intakeForm, mrn: e.target.value})}
              />
            </div>

            <div>
              <Label className="text-xs">DOB</Label>
              <Input
                type="date"
                className="h-7 text-xs"
                value={intakeForm.dob}
                onChange={(e) => setIntakeForm({...intakeForm, dob: e.target.value})}
              />
            </div>

            <div>
              <Label className="text-xs">Attending</Label>
              <Select value={intakeForm.attending} onValueChange={(v) => setIntakeForm({...intakeForm, attending: v})}>
                <SelectTrigger className="h-7 text-xs">
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
                className="h-7 text-xs"
                value={intakeForm.diagnosis}
                onChange={(e) => setIntakeForm({...intakeForm, diagnosis: e.target.value})}
              />
            </div>

            <div>
              <Label className="text-xs">Procedure</Label>
              <Input
                className="h-7 text-xs"
                value={intakeForm.procedures}
                onChange={(e) => setIntakeForm({...intakeForm, procedures: e.target.value})}
              />
            </div>

            <div>
              <Label className="text-xs">CPT Code</Label>
              <Input
                className="h-7 text-xs"
                value={intakeForm.procedure_code}
                onChange={(e) => setIntakeForm({...intakeForm, procedure_code: e.target.value})}
              />
            </div>

            <Button onClick={handleQuickAdd} className="w-full h-7 text-xs" size="sm">
              Add to Add-On List
            </Button>
          </div>

          {/* Patient Details Drawer */}
          {selectedPatient && (
            <div className="border-t border-border pt-3 mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">PATIENT DETAILS</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)} className="h-5 w-5 p-0">
                  ×
                </Button>
              </div>
              <div className="space-y-1 text-xs">
                <div><span className="font-medium">Name:</span> {selectedPatient.patient_name}</div>
                <div><span className="font-medium">MRN:</span> {selectedPatient.mrn}</div>
                <div><span className="font-medium">DOB:</span> {selectedPatient.dob}</div>
                <div><span className="font-medium">Attending:</span> {selectedPatient.attending}</div>
                <div><span className="font-medium">Diagnosis:</span> {selectedPatient.diagnosis}</div>
                <div><span className="font-medium">Status:</span> <Badge variant="outline" className="text-xs">{selectedPatient.status}</Badge></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM PANEL: Tasks */}
      <div className="h-32 border-t border-border overflow-y-auto bg-card">
        <div className="px-3 py-2">
          <div className="font-semibold text-xs mb-2">TASKS CHECKLIST</div>
          <div className="grid grid-cols-4 gap-2">
            {tasks.slice(0, 12).map(task => (
              <div key={task._id} className="flex items-start space-x-1.5">
                <Checkbox className="h-3 w-3 mt-0.5" checked={task.completed} />
                <div className="flex-1">
                  <div className="text-xs truncate">{task.task_description}</div>
                  {task.due_date && (
                    <div className="text-muted-foreground text-xs">
                      {format(parseISO(task.due_date), 'M/d')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicalDashboard;
