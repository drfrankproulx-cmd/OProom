import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ChevronLeft, ChevronRight, Clock, User, Calendar as CalendarIcon, FileText, Stethoscope } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const MonthlyCalendar = ({ schedules, onRefresh }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const handlePatientClick = (schedule) => {
    setSelectedPatient(schedule);
    setIsDialogOpen(true);
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const sourceDate = result.source.droppableId;
    const destinationDate = result.destination.droppableId;

    if (sourceDate === destinationDate) return;

    const scheduleId = result.draggableId;
    const schedule = schedules.find(s => s._id === scheduleId);

    if (!schedule) return;

    try {
      const response = await fetch(`${API_URL}/api/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...schedule,
          scheduled_date: destinationDate,
        }),
      });

      if (response.ok) {
        toast.success('Patient moved successfully');
        if (onRefresh) onRefresh();
      } else {
        toast.error('Failed to move patient');
      }
    } catch (error) {
      console.error('Move error:', error);
      toast.error('Failed to move patient');
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

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
    <>
      <Card className="shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid with drag-and-drop */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day) => {
                const daySchedules = getSchedulesForDate(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());
                const dateString = format(day, 'yyyy-MM-dd');

                return (
                  <Droppable droppableId={dateString} key={dateString}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[120px] rounded-lg border-2 p-2 transition-smooth ${
                          !isCurrentMonth
                            ? 'bg-muted/30 border-transparent'
                            : isToday
                            ? 'border-primary bg-primary/5'
                            : snapshot.isDraggingOver
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-card hover:border-primary/50'
                        }`}
                      >
                        <div className={`text-sm font-semibold mb-2 ${
                          !isCurrentMonth
                            ? 'text-muted-foreground/50'
                            : isToday
                            ? 'text-primary'
                            : 'text-foreground'
                        }`}>
                          {format(day, 'd')}
                        </div>

                        <div className="space-y-1">
                          {daySchedules.slice(0, 3).map((schedule, index) => (
                            <Draggable
                              key={schedule._id}
                              draggableId={schedule._id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => handlePatientClick(schedule)}
                                  className={`bg-card border border-border rounded px-1.5 py-1 text-xs hover:shadow-md transition-smooth cursor-pointer ${
                                    snapshot.isDragging ? 'shadow-lg opacity-90 rotate-2' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-0.5">
                                    <p className="font-semibold text-foreground truncate flex-1">
                                      {schedule.patient_name}
                                    </p>
                                    {schedule.scheduled_time && (
                                      <Clock className="h-3 w-3 text-muted-foreground ml-1" />
                                    )}
                                  </div>
                                  <p className="text-muted-foreground truncate">
                                    {schedule.procedure}
                                  </p>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {daySchedules.length > 3 && (
                            <div className="text-xs text-muted-foreground text-center">
                              +{daySchedules.length - 3} more
                            </div>
                          )}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        </CardContent>
      </Card>

      {/* Patient Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Patient Details</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="h-4 w-4 mr-2" />
                    <span>Patient Name</span>
                  </div>
                  <p className="font-semibold text-lg">{selectedPatient.patient_name}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <FileText className="h-4 w-4 mr-2" />
                    <span>MRN</span>
                  </div>
                  <p className="font-semibold text-lg">{selectedPatient.patient_mrn || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span>Scheduled Date</span>
                  </div>
                  <p className="font-semibold">
                    {selectedPatient.scheduled_date
                      ? format(parseISO(selectedPatient.scheduled_date), 'MMMM dd, yyyy')
                      : 'Not scheduled'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Time</span>
                  </div>
                  <p className="font-semibold">{selectedPatient.scheduled_time || 'Not set'}</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Stethoscope className="h-4 w-4 mr-2" />
                  <span>Procedure</span>
                </div>
                <p className="font-semibold">{selectedPatient.procedure || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <User className="h-4 w-4 mr-2" />
                  <span>Attending Physician</span>
                </div>
                <p className="font-semibold">{selectedPatient.attending || 'Not assigned'}</p>
              </div>

              {selectedPatient.diagnosis && (
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <FileText className="h-4 w-4 mr-2" />
                    <span>Diagnosis</span>
                  </div>
                  <p className="font-semibold">{selectedPatient.diagnosis}</p>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MonthlyCalendar;
