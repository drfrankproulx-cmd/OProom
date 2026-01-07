import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LogOut, Calendar, Users, CheckSquare, Video, UserPlus } from 'lucide-react';
import EnhancedWeeklyCalendar from './EnhancedWeeklyCalendar';
import MonthlyCalendar from './MonthlyCalendar';
import PatientManagement from './PatientManagement';
import TaskManager from './TaskManager';
import ConferenceManager from './ConferenceManager';
import AddOnList from './AddOnList';
import PatientIntakeForm from './PatientIntakeForm';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('weekly');
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
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary rounded-lg shadow-md">
                <Calendar className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">OR Scheduler</h1>
                <p className="text-sm text-muted-foreground">Surgical Resident Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsIntakeFormOpen(true)}
                className="hidden sm:flex transition-smooth shadow-md"
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
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto gap-2 bg-muted/50 p-1">
            <TabsTrigger value="weekly" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-smooth">
              <Calendar className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Weekly</span>
            </TabsTrigger>
            <TabsTrigger value="monthly" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-smooth">
              <Calendar className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Monthly</span>
            </TabsTrigger>
            <TabsTrigger value="patients" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-smooth">
              <Users className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Patients</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-smooth">
              <CheckSquare className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="conferences" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-smooth">
              <Video className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Meetings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="space-y-6">
            <WeeklyCalendar schedules={schedules} onRefresh={fetchData} />
            <AddOnList schedules={schedules} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="monthly">
            <MonthlyCalendar schedules={schedules} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="patients">
            <PatientManagement patients={patients} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="tasks">
            <TaskManager tasks={tasks} patients={patients} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="conferences">
            <ConferenceManager conferences={conferences} onRefresh={fetchData} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
