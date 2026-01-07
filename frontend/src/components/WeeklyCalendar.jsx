import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const WeeklyCalendar = ({ schedules, onRefresh }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const getSchedulesForDate = (date) => {
    return schedules.filter(schedule => {
      if (!schedule.scheduled_date) return false;
      try {
        const scheduleDate = parseISO(schedule.scheduled_date);
        return isSameDay(scheduleDate, date) && !schedule.is_addon;
      } catch {
        return false;
      }
    });
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
      patient_mrn: formData.get('patient_mrn'),
      patient_name: formData.get('patient_name'),
      procedure: formData.get('procedure'),
      staff: formData.get('staff'),
      scheduled_date: formData.get('scheduled_date'),
      scheduled_time: formData.get('scheduled_time') || '08:00',
      status: 'scheduled',
      is_addon: false,
    };

    try {
      const response = await fetch(`${API_URL}/api/schedules`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to add schedule');

      toast.success('Case scheduled successfully!');
      setIsDialogOpen(false);
      onRefresh();
      e.target.reset();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-primary/10 text-primary border-primary/20',
      confirmed: 'bg-success/10 text-success border-success/20',
      pending: 'bg-warning/10 text-warning border-warning/20',
      cancelled: 'bg-muted text-muted-foreground border-border',
    };
    return colors[status] || colors.scheduled;
  };

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">Weekly Schedule</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addDays(currentDate, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="ml-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Case
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Schedule New Case</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddSchedule} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="patient_mrn">Patient MRN</Label>
                    <Input id="patient_mrn" name="patient_mrn" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patient_name">Patient Name</Label>
                    <Input id="patient_name" name="patient_name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="procedure">Procedure</Label>
                    <Input id="procedure" name="procedure" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff">Staff/Attending</Label>
                    <Input id="staff" name="staff" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scheduled_date">Date</Label>
                      <Input
                        id="scheduled_date"
                        name="scheduled_date"
                        type="date"
                        defaultValue={selectedDate || format(new Date(), 'yyyy-MM-dd')}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduled_time">Time</Label>
                      <Input
                        id="scheduled_time"
                        name="scheduled_time"
                        type="time"
                        defaultValue="08:00"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    Schedule Case
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <p className="text-muted-foreground">
          Week of {format(weekStart, 'MMMM d, yyyy')}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const daySchedules = getSchedulesForDate(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[200px] rounded-lg border-2 p-3 transition-smooth ${
                  isToday
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <div className="flex flex-col">
                  <div className="font-semibold text-sm text-muted-foreground">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-2xl font-bold ${
                    isToday ? 'text-primary' : 'text-foreground'
                  }`}>
                    {format(day, 'd')}
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {daySchedules.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      No cases scheduled
                    </div>
                  ) : (
                    daySchedules.map((schedule) => (
                      <div
                        key={schedule._id}
                        className="bg-card border border-border rounded-md p-2 space-y-1 hover:shadow-md transition-smooth cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {schedule.patient_name}
                          </p>
                          {schedule.scheduled_time && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              {schedule.scheduled_time}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {schedule.procedure}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground truncate">
                            {schedule.staff}
                          </p>
                          <Badge variant="outline" className={`text-xs ${getStatusColor(schedule.status)}`}>
                            {schedule.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyCalendar;
