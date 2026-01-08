import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { 
  LogOut, Menu, Home, Calendar, ListPlus, CheckSquare, 
  Settings 
} from 'lucide-react';
import { Badge } from './ui/badge';
import DashboardHome from './DashboardHome';
import EnhancedWeeklyCalendar from './EnhancedWeeklyCalendar';
import EnhancedAddOnList from './EnhancedAddOnList';
import EnhancedTaskManager from './EnhancedTaskManager';
import PatientManagement from './PatientManagement';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'addon', label: 'Add-On List', icon: ListPlus },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'patients', label: 'Patients', icon: Settings },
];

export const ResponsiveDashboard = ({ user, onLogout }) => {
  const [activeView, setActiveView] = useState('dashboard');
  const [patients, setPatients] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

      // Read JSON first, then check status
      const [patientsData, schedulesData, tasksData, conferencesData] = await Promise.all([
        patientsRes.json(),
        schedulesRes.json(),
        tasksRes.json(),
        conferencesRes.json(),
      ]);

      // Check status after reading JSON
      if (!patientsRes.ok || !schedulesRes.ok || !tasksRes.ok || !conferencesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      setPatients(patientsData);
      setSchedules(schedulesData);
      setTasks(tasksData);
      setConferences(conferencesData);
    } catch (error) {
      console.error('Fetch error:', error);
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

  const handleNavigate = (view) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  const urgentTasks = tasks.filter(t => {
    if (t.completed || !t.due_date) return false;
    const days = Math.ceil((new Date(t.due_date) - new Date()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 3;
  }).length;

  const myTasks = tasks.filter(t => t.assigned_to_email === user?.email && !t.completed).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary rounded-lg">
            <Calendar className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">OR Scheduler</h1>
            <p className="text-xs text-muted-foreground">UMN Residency</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-border bg-muted/30">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">{user?.full_name}</p>
          <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          {user?.email && (
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-destructive/10 rounded-md p-2 text-center">
            <p className="text-lg font-bold text-foreground">{urgentTasks}</p>
            <p className="text-xs text-muted-foreground">Urgent</p>
          </div>
          <div className="bg-primary/10 rounded-md p-2 text-center">
            <p className="text-lg font-bold text-foreground">{myTasks}</p>
            <p className="text-xs text-muted-foreground">My Tasks</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-smooth ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <Button variant="outline" className="w-full" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:block w-64 border-r border-border bg-card">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="lg:hidden sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <SidebarContent mobile />
                </SheetContent>
              </Sheet>
              <div>
                <h1 className="text-lg font-bold text-foreground">OR Scheduler</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {urgentTasks > 0 && (
                <Badge variant="destructive" className="px-2 py-1">
                  {urgentTasks}
                </Badge>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            {activeView === 'dashboard' && (
              <DashboardHome
                schedules={schedules}
                conferences={conferences}
                tasks={tasks}
                patients={patients}
                onRefresh={fetchData}
                currentUser={user}
                onNavigate={handleNavigate}
              />
            )}
            {activeView === 'calendar' && (
              <div className="space-y-6">
                <EnhancedWeeklyCalendar
                  schedules={schedules}
                  conferences={conferences}
                  onRefresh={fetchData}
                />
              </div>
            )}
            {activeView === 'addon' && (
              <EnhancedAddOnList schedules={schedules} onRefresh={fetchData} />
            )}
            {activeView === 'tasks' && (
              <EnhancedTaskManager
                tasks={tasks}
                patients={patients}
                onRefresh={fetchData}
                currentUser={user}
              />
            )}
            {activeView === 'patients' && (
              <PatientManagement patients={patients} onRefresh={fetchData} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ResponsiveDashboard;
