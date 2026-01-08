import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { UserPlus, Video, CheckSquare, Calendar as CalendarIcon, AlertCircle, Clock, Users, ListPlus } from 'lucide-react';
import { format, parseISO, isToday, isSameWeek, startOfWeek, endOfWeek } from 'date-fns';
import PatientIntakeForm from './PatientIntakeForm';
import ConferenceManager from './ConferenceManager';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export const DashboardHome = ({ schedules, conferences, tasks, patients, onRefresh, currentUser, onNavigate }) => {
  const [isIntakeFormOpen, setIsIntakeFormOpen] = useState(false);
  const [isConferenceDialogOpen, setIsConferenceDialogOpen] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);

  // Today's OR schedule
  const todaySchedule = schedules
    .filter(s => {
      if (!s.scheduled_date || s.is_addon) return false;
      try {
        return isToday(parseISO(s.scheduled_date));
      } catch {
        return false;
      }
    })
    .sort((a, b) => {
      const timeA = a.scheduled_time || '00:00';
      const timeB = b.scheduled_time || '00:00';
      return timeA.localeCompare(timeB);
    });

  // Upcoming conferences this week
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const thisWeekEnd = endOfWeek(new Date());
  const upcomingConferences = conferences
    .filter(c => {
      if (!c.date) return false;
      try {
        const confDate = parseISO(c.date);
        return confDate >= thisWeekStart && confDate <= thisWeekEnd;
      } catch {
        return false;
      }
    })
    .sort((a, b) => {
      try {
        return parseISO(a.date).getTime() - parseISO(b.date).getTime();
      } catch {
        return 0;
      }
    })
    .slice(0, 5);

  // Add-on list count
  const addOnCount = schedules.filter(s => s.is_addon).length;

  // My urgent tasks (due in 1-3 days)
  const urgentTasks = tasks
    .filter(t => {
      if (t.completed || !t.due_date) return false;
      if (t.assigned_to_email !== currentUser?.email) return false;
      try {
        const dueDate = parseISO(t.due_date);
        const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue >= 0 && daysUntilDue <= 3;
      } catch {
        return false;
      }
    })
    .sort((a, b) => {
      try {
        return parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime();
      } catch {
        return 0;
      }
    });

  const getSurgeonColor = (surgeon) => {
    const colors = {
      'Dr. Anderson': 'bg-blue-50 text-blue-700 border-blue-200',
      'Dr. Smith': 'bg-green-50 text-green-700 border-green-200',
      'Dr. Jones': 'bg-purple-50 text-purple-700 border-purple-200',
      'Dr. Williams': 'bg-orange-50 text-orange-700 border-orange-200',
      'Dr. Brown': 'bg-pink-50 text-pink-700 border-pink-200',
      'Dr. Davis': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'Dr. Martinez': 'bg-teal-50 text-teal-700 border-teal-200',
      'Dr. Garcia': 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return colors[surgeon] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome back, {currentUser?.full_name?.split(' ')[0]}</h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary transition-smooth hover:shadow-md cursor-pointer" onClick={() => onNavigate('calendar')}>
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Cases</p>
                <p className="text-3xl font-bold text-foreground mt-1">{todaySchedule.length}</p>
              </div>
              <CalendarIcon className="h-10 w-10 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning transition-smooth hover:shadow-md cursor-pointer" onClick={() => onNavigate('addon')}>
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Add-On List</p>
                <p className="text-3xl font-bold text-foreground mt-1">{addOnCount}</p>
              </div>
              <ListPlus className="h-10 w-10 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive transition-smooth hover:shadow-md cursor-pointer" onClick={() => onNavigate('tasks')}>
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Urgent Tasks</p>
                <p className="text-3xl font-bold text-foreground mt-1">{urgentTasks.length}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-info transition-smooth hover:shadow-md cursor-pointer" onClick={() => onNavigate('calendar')}>
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Meetings</p>
                <p className="text-3xl font-bold text-foreground mt-1">{upcomingConferences.length}</p>
              </div>
              <Video className="h-10 w-10 text-info" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button 
              className="h-auto py-4 flex flex-col items-center space-y-2"
              onClick={() => setIsIntakeFormOpen(true)}
            >
              <UserPlus className="h-6 w-6" />
              <span className="text-sm">Add Patient</span>
            </Button>
            <Button 
              className="h-auto py-4 flex flex-col items-center space-y-2"
              onClick={() => setIsConferenceDialogOpen(true)}
            >
              <Video className="h-6 w-6" />
              <span className="text-sm">Add Meeting</span>
            </Button>
            <Button 
              className="h-auto py-4 flex flex-col items-center space-y-2"
              onClick={() => onNavigate('tasks')}
            >
              <CheckSquare className="h-6 w-6" />
              <span className="text-sm">Create Task</span>
            </Button>
            <Button 
              className="h-auto py-4 flex flex-col items-center space-y-2"
              onClick={() => onNavigate('calendar')}
            >
              <CalendarIcon className="h-6 w-6" />
              <span className="text-sm">View Calendar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's OR Schedule */}
        <Card className="shadow-elegant">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Today's OR Schedule</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('calendar')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {todaySchedule.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No cases scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySchedule.map((schedule) => (
                  <div
                    key={schedule._id}
                    className={`border-l-4 rounded-r-lg p-3 transition-smooth hover:shadow-md ${getSurgeonColor(schedule.staff)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Clock className="h-4 w-4" />
                          <span className="font-semibold">{schedule.scheduled_time || '08:00'}</span>
                        </div>
                        <p className="font-medium text-foreground">{schedule.patient_name}</p>
                        <p className="text-sm text-muted-foreground mt-1">{schedule.procedure}</p>
                        <p className="text-sm font-medium mt-1">{schedule.staff}</p>
                      </div>
                      <Badge variant="outline" className="bg-card">
                        {schedule.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Conferences */}
        <Card className="shadow-elegant">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Upcoming Meetings</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setIsConferenceDialogOpen(true)}>
                Add New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingConferences.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No meetings scheduled this week</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingConferences.map((conf) => (
                  <div
                    key={conf._id}
                    className="border border-border rounded-lg p-3 hover:border-primary transition-smooth"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{conf.title}</p>
                        <div className="flex items-center space-x-3 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {format(parseISO(conf.date), 'MMM d')}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {conf.time}
                          </div>
                          {conf.attendees && conf.attendees.length > 0 && (
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {conf.attendees.length}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* My Urgent Tasks */}
      <Card className="shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">My Urgent Tasks (1-3 Days)</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('tasks')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {urgentTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No urgent tasks at this time</p>
            </div>
          ) : (
            <div className="space-y-2">
              {urgentTasks.map((task) => {
                const daysUntilDue = Math.ceil(
                  (parseISO(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={task._id}
                    className="border-l-4 border-l-destructive bg-destructive/5 rounded-r-lg p-3 transition-smooth hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{task.task_description}</p>
                        <div className="flex items-center space-x-3 mt-2 text-sm text-muted-foreground">
                          <span>
                            Due: <strong className="text-destructive">
                              {format(parseISO(task.due_date), 'MMM d')}
                            </strong>
                          </span>
                          <span className="text-destructive font-semibold">
                            {daysUntilDue === 0 ? 'Today' : `${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`}
                          </span>
                        </div>
                      </div>
                      <Badge variant="destructive">Urgent</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PatientIntakeForm
        isOpen={isIntakeFormOpen}
        onClose={() => setIsIntakeFormOpen(false)}
        onSuccess={onRefresh}
      />
    </div>
  );
};

export default DashboardHome;
