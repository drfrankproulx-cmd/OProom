import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { LogOut, UserPlus, AlertCircle, Clock, CheckSquare } from 'lucide-react';
import EnhancedWeeklyCalendar from './EnhancedWeeklyCalendar';
import EnhancedAddOnList from './EnhancedAddOnList';
import EnhancedTaskManager from './EnhancedTaskManager';
import PatientIntakeForm from './PatientIntakeForm';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export const SinglePageDashboard = ({ user, onLogout }) => {
  const [patients, setPatients] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isIntakeFormOpen, setIsIntakeFormOpen] = useState(false);

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

      if (!patientsRes.ok || !schedulesRes.ok || !tasksRes.ok || !conferencesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [patientsData, schedulesData, tasksData, conferencesData] = await Promise.all([
        patientsRes.json(),
        schedulesRes.json(),
        tasksRes.json(),
        conferencesRes.json(),
      ]);

      setPatients(patientsData);
      setSchedules(schedulesData);
      setTasks(tasksData);
      setConferences(conferencesData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = () => {
    toast.success('Logged out successfully');
    onLogout();
  };

  // Calculate urgent task count
  const urgentTasks = tasks.filter(t => {
    if (t.completed || !t.due_date) return false;
    const days = Math.ceil((new Date(t.due_date) - new Date()) / (1000 * 60 * 60 * 24));
    return days <= 3;
  }).length;

  const myTasks = tasks.filter(t => t.assigned_to_email === user?.email && !t.completed).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary rounded-lg shadow-md">
                  <svg className="h-5 w-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">OR Scheduler</h1>
                  <p className="text-xs text-muted-foreground">University of Minnesota</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="hidden lg:flex items-center space-x-4">
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-destructive/10 rounded-md">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-semibold text-foreground">{urgentTasks}</span>
                  <span className="text-xs text-muted-foreground">Urgent</span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-primary/10 rounded-md">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{myTasks}</span>
                  <span className="text-xs text-muted-foreground">My Tasks</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                size="sm"
                onClick={() => setIsIntakeFormOpen(true)}
                className="transition-smooth shadow-md"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                New Patient
              </Button>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{user?.full_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="transition-smooth"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Single Page Layout */}
      <main className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-12 gap-4">
          {/* Left Column - Calendar (8 columns) */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <EnhancedWeeklyCalendar 
              schedules={schedules} 
              conferences={conferences}
              onRefresh={fetchData} 
            />
          </div>

          {/* Right Column - Add-On List & Tasks (4 columns) */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            {/* Task Summary Widget */}
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <CardContent className="pt-4 pb-3">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Today's Priority</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-card rounded-lg p-2 border border-destructive/20">
                      <div className="flex items-center justify-between">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <div className="text-right">
                          <p className="text-xl font-bold text-foreground">{urgentTasks}</p>
                          <p className="text-xs text-muted-foreground">Urgent</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-card rounded-lg p-2 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <Clock className="h-5 w-5 text-primary" />
                        <div className="text-right">
                          <p className="text-xl font-bold text-foreground">{myTasks}</p>
                          <p className="text-xs text-muted-foreground">My Tasks</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compact Add-On List */}
            <EnhancedAddOnList 
              schedules={schedules} 
              onRefresh={fetchData}
            />
          </div>
        </div>

        {/* Full Width Task Manager Below */}
        <div className="mt-4">
          <EnhancedTaskManager 
            tasks={tasks} 
            patients={patients} 
            onRefresh={fetchData}
            currentUser={user}
          />
        </div>
      </main>

      {/* Global Patient Intake Form */}
      <PatientIntakeForm
        isOpen={isIntakeFormOpen}
        onClose={() => setIsIntakeFormOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default SinglePageDashboard;
