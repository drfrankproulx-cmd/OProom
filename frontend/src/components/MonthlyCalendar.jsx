import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, isSameMonth, isSameDay, parseISO } from 'date-fns';

const MonthlyCalendar = ({ schedules }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day) => {
            const daySchedules = getSchedulesForDate(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[120px] rounded-lg border-2 p-2 transition-smooth ${
                  !isCurrentMonth
                    ? 'bg-muted/30 border-transparent'
                    : isToday
                    ? 'border-primary bg-primary/5'
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
                  {daySchedules.slice(0, 3).map((schedule) => (
                    <div
                      key={schedule._id}
                      className="bg-card border border-border rounded px-1.5 py-1 text-xs hover:shadow-md transition-smooth cursor-pointer"
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
                  ))}
                  {daySchedules.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{daySchedules.length - 3} more
                    </div>
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

export default MonthlyCalendar;
