import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ChevronLeft, ChevronRight, Plus, Grid3x3 } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, isSameDay, parseISO, setHours, setMinutes } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import PatientIntakeForm from './PatientIntakeForm';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Generate time slots from 6 AM to 8 PM in 30-minute increments
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 6; hour <= 20; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 20) {
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

// Color palette for different surgeons
const SURGEON_COLORS = {
  'Dr. Anderson': { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  'Dr. Smith': { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
  'Dr. Jones': { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
  'Dr. Williams': { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
  'Dr. Brown': { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700' },
  'Dr. Davis': { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700' },
  'Dr. Martinez': { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-700' },
  'Dr. Garcia': { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' },
};

const DEFAULT_COLOR = { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700' };

const EnhancedWeeklyCalendar = ({ schedules, conferences, onRefresh }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isIntakeFormOpen, setIsIntakeFormOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const getSurgeonColor = (surgeon) => {
    return SURGEON_COLORS[surgeon] || DEFAULT_COLOR;
  };

  const getEventsForDateAndTime = (date, timeSlot) => {
    const events = [];

    // Get scheduled cases
    const cases = schedules.filter(schedule => {
      if (!schedule.scheduled_date || schedule.is_addon) return false;
      try {
        const scheduleDate = parseISO(schedule.scheduled_date);
        const scheduleTime = schedule.scheduled_time || '08:00';
        return isSameDay(scheduleDate, date) && scheduleTime === timeSlot;
      } catch {
        return false;
      }
    });

    // Get conferences
    const dayConferences = conferences.filter(conf => {
      if (!conf.date) return false;
      try {
        const confDate = parseISO(conf.date);
        const confTime = conf.time || '08:00';
        return isSameDay(confDate, date) && confTime === timeSlot;
      } catch {
        return false;
      }
    });

    return [...cases, ...dayConferences];
  };

  const handleTimeSlotClick = (date, timeSlot) => {
    setSelectedSlot({ date: format(date, 'yyyy-MM-dd'), time: timeSlot });
    setIsIntakeFormOpen(true);
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // Parse source and destination
    const [, sourceDate, sourceTime] = source.droppableId.split('_');
    const [, destDate, destTime] = destination.droppableId.split('_');

    if (sourceDate === destDate && sourceTime === destTime) return;

    try {
      const schedule = schedules.find(s => s._id === draggableId);
      if (!schedule) return;

      const updatedSchedule = {
        ...schedule,
        scheduled_date: destDate,
        scheduled_time: destTime,
      };
      delete updatedSchedule._id;

      const response = await fetch(`${API_URL}/api/schedules/${draggableId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedSchedule),
      });

      if (!response.ok) throw new Error('Failed to reschedule');

      toast.success('Case rescheduled successfully!');
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Weekly OR Schedule</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {format(weekStart, 'MMMM d')} - {format(addDays(weekStart, 6), 'MMMM d, yyyy')}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(addWeeks(currentDate, -1))}
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
                onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => setIsIntakeFormOpen(true)}
                className="ml-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Patient
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="border rounded-lg overflow-hidden">
              {/* Header with days */}
              <div className="grid grid-cols-8 bg-muted/50 border-b sticky top-0 z-10">
                <div className="p-2 text-xs font-semibold text-muted-foreground border-r">
                  Time
                </div>
                {weekDays.map((day) => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={day.toISOString()}
                      className={`p-2 text-center border-r last:border-r-0 ${
                        isToday ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className="text-xs font-semibold text-muted-foreground">
                        {format(day, 'EEE')}
                      </div>
                      <div className={`text-lg font-bold ${
                        isToday ? 'text-primary' : 'text-foreground'
                      }`}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time slots grid */}
              <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
                {TIME_SLOTS.map((timeSlot) => (
                  <div key={timeSlot} className="grid grid-cols-8 border-b last:border-b-0">
                    <div className="p-2 text-xs text-muted-foreground border-r bg-muted/20 font-medium">
                      {timeSlot}
                    </div>
                    {weekDays.map((day) => {
                      const events = getEventsForDateAndTime(day, timeSlot);
                      const droppableId = `slot_${format(day, 'yyyy-MM-dd')}_${timeSlot}`;

                      return (
                        <Droppable key={droppableId} droppableId={droppableId}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`p-1 border-r last:border-r-0 min-h-[60px] cursor-pointer hover:bg-accent/20 transition-colors ${
                                snapshot.isDraggingOver ? 'bg-primary/10' : ''
                              }`}
                              onClick={() => handleTimeSlotClick(day, timeSlot)}
                            >
                              {events.map((event, idx) => {
                                if (event.title) {
                                  // Conference/Meeting
                                  return (
                                    <div
                                      key={event._id}
                                      className="bg-info/20 border-l-4 border-info rounded p-1.5 mb-1 text-xs"
                                    >
                                      <div className="font-semibold text-info">{event.title}</div>
                                    </div>
                                  );
                                } else {
                                  // OR Case
                                  const colors = getSurgeonColor(event.staff);
                                  return (
                                    <Draggable
                                      key={event._id}
                                      draggableId={event._id}
                                      index={idx}
                                    >
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`${colors.bg} border-l-4 ${colors.border} rounded p-1.5 mb-1 text-xs shadow-sm hover:shadow-md transition-shadow ${
                                            snapshot.isDragging ? 'shadow-lg opacity-90' : ''
                                          }`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className={`font-semibold ${colors.text} truncate`}>
                                            {event.patient_name}
                                          </div>
                                          <div className="text-xs text-muted-foreground truncate">
                                            {event.procedure}
                                          </div>
                                          <div className={`text-xs ${colors.text} truncate`}>
                                            {event.staff}
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                }
                              })}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </DragDropContext>

          {/* Legend */}
          <div className="mt-4 p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-semibold text-foreground mb-2">Surgeon Color Legend</h4>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(SURGEON_COLORS).map(([surgeon, colors]) => (
                <div key={surgeon} className="flex items-center space-x-2">
                  <div className={`w-4 h-4 rounded border-2 ${colors.border} ${colors.bg}`} />
                  <span className="text-xs text-foreground">{surgeon}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <PatientIntakeForm
        isOpen={isIntakeFormOpen}
        onClose={() => {
          setIsIntakeFormOpen(false);
          setSelectedSlot(null);
        }}
        onSuccess={onRefresh}
        defaultDate={selectedSlot?.date}
        defaultTime={selectedSlot?.time}
      />
    </div>
  );
};

export default EnhancedWeeklyCalendar;
