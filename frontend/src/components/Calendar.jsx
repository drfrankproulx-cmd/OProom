import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { 
  format, 
  startOfWeek, 
  addDays, 
  parseISO, 
  isToday, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  addMonths, 
  subMonths,
  addWeeks,
  subWeeks
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  User,
  FileText,
  Filter,
  X
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const getInitials = (name) => {
  if (!name) return 'UN';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Calendar = ({ onBack, initialFilter }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  // Set view mode based on filter - 'today' shows week view focused on today
  const [viewMode, setViewMode] = useState(initialFilter?.type === 'today' ? 'week' : 'week');
  const [schedules, setSchedules] = useState([]);
  const [patients, setPatients] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterAttending, setFilterAttending] = useState('all');
  const [showFilterBanner, setShowFilterBanner] = useState(!!initialFilter);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const fetchData = async () => {
    try {
      const [schedulesRes, patientsRes, conferencesRes] = await Promise.all([
        fetch(`${API_URL}/api/schedules`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/patients`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/conferences`, { headers: getAuthHeaders() }),
      ]);

      const [schedulesData, patientsData, conferencesData] = await Promise.all([
        schedulesRes.json(),
        patientsRes.json(),
        conferencesRes.json(),
      ]);

      if (schedulesRes.ok) setSchedules(schedulesData);
      if (patientsRes.ok) setPatients(patientsData);
      if (conferencesRes.ok) setConferences(conferencesData);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: addDays(endOfMonth(currentDate), 6 - endOfMonth(currentDate).getDay()) });

  const getSchedulesForDate = (date) => {
    return schedules.filter(schedule => {
      if (!schedule.scheduled_date || schedule.is_addon) return false;
      if (filterAttending !== 'all' && schedule.staff !== filterAttending) return false;
      try {
        return isSameDay(parseISO(schedule.scheduled_date), date);
      } catch {
        return false;
      }
    });
  };

  const getConferencesForDate = (date) => {
    return conferences.filter(conf => {
      if (!conf.date) return false;
      try {
        return isSameDay(parseISO(conf.date), date);
      } catch {
        return false;
      }
    });
  };

  const uniqueAttendings = [...new Set(schedules.map(s => s.staff).filter(Boolean))];

  const navigatePrev = () => {
    if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 border-red-400 text-red-800';
      case 'medium': return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      case 'low': return 'bg-green-100 border-green-400 text-green-800';
      default: return 'bg-blue-100 border-blue-400 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="hover:bg-gray-100 rounded-xl"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">OR Calendar</h1>
              <p className="text-gray-600">
                {viewMode === 'week' 
                  ? `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
                  : format(currentDate, 'MMMM yyyy')
                }
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Filter by Attending */}
            <Select value={filterAttending} onValueChange={setFilterAttending}>
              <SelectTrigger className="w-48 rounded-xl">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by Attending" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Attendings</SelectItem>
                {uniqueAttendings.map(attending => (
                  <SelectItem key={attending} value={attending}>{attending}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'week' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'month' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Month
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={navigatePrev}
                className="rounded-full w-10 h-10 p-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentDate(new Date())}
                className="rounded-xl px-4"
              >
                Today
              </Button>
              <Button
                variant="outline"
                onClick={navigateNext}
                className="rounded-full w-10 h-10 p-0"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Banner */}
        {showFilterBanner && initialFilter && (
          <div className={`${initialFilter.type === 'today' ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'} border rounded-xl p-3 mb-4 flex items-center justify-between`}>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 ${initialFilter.type === 'today' ? 'bg-blue-500' : 'bg-purple-500'} rounded-full animate-pulse`}></div>
              <span className={`${initialFilter.type === 'today' ? 'text-blue-800' : 'text-purple-800'} font-medium`}>
                {initialFilter.type === 'today' ? "Viewing today's schedule" : "Viewing this week's cases"}
              </span>
            </div>
            <button 
              onClick={() => setShowFilterBanner(false)}
              className={`${initialFilter.type === 'today' ? 'text-blue-600 hover:text-blue-800' : 'text-purple-600 hover:text-purple-800'} text-sm font-medium flex items-center`}
            >
              Dismiss <X className="h-4 w-4 ml-1" />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-3xl font-bold text-blue-600">{schedules.filter(s => !s.is_addon).length}</div>
            <div className="text-gray-600 text-sm">Total Scheduled</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-3xl font-bold text-green-600">
              {getSchedulesForDate(new Date()).length}
            </div>
            <div className="text-gray-600 text-sm">Today's Cases</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-3xl font-bold text-purple-600">{conferences.length}</div>
            <div className="text-gray-600 text-sm">Conferences</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-3xl font-bold text-orange-600">{schedules.filter(s => s.is_addon).length}</div>
            <div className="text-gray-600 text-sm">Pending Add-Ons</div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-3xl shadow-xl p-6">
          {viewMode === 'week' ? (
            /* Weekly View */
            <div className="grid grid-cols-7 gap-4">
              {weekDays.map((day) => {
                const daySchedules = getSchedulesForDate(day);
                const dayConferences = getConferencesForDate(day);
                const today = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={`rounded-2xl p-4 min-h-[500px] transition-all ${
                      today
                        ? 'bg-gradient-to-br from-blue-50 to-blue-100 ring-2 ring-blue-400'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-center mb-4 pb-3 border-b border-gray-200">
                      <div className="text-gray-500 text-sm font-medium">
                        {format(day, 'EEE')}
                      </div>
                      <div className={`text-2xl font-bold ${today ? 'text-blue-600' : 'text-gray-900'}`}>
                        {format(day, 'd')}
                      </div>
                      {daySchedules.length > 0 && (
                        <Badge className="mt-1 bg-blue-100 text-blue-700 text-xs">
                          {daySchedules.length} case{daySchedules.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 overflow-y-auto max-h-[400px]">
                      {/* Conferences */}
                      {dayConferences.map(conf => (
                        <div
                          key={conf._id}
                          className="p-3 bg-purple-100 border-l-4 border-purple-500 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setSelectedEvent({ type: 'conference', data: conf })}
                        >
                          <div className="font-semibold text-purple-900 text-sm">{conf.title}</div>
                          <div className="text-purple-700 text-xs flex items-center mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            {conf.start_time} - {conf.end_time}
                          </div>
                        </div>
                      ))}

                      {/* Surgeries */}
                      {daySchedules.map(schedule => {
                        const patient = patients.find(p => p.mrn === schedule.patient_mrn);
                        return (
                          <div
                            key={schedule._id}
                            className={`p-3 border-l-4 rounded-lg cursor-pointer hover:shadow-md transition-shadow ${getPriorityColor(schedule.priority)}`}
                            onClick={() => setSelectedEvent({ type: 'surgery', data: schedule, patient })}
                          >
                            <div className="flex items-center space-x-2 mb-1">
                              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                                {getInitials(schedule.patient_name)}
                              </div>
                              <div className="font-semibold text-sm truncate">{schedule.patient_name}</div>
                            </div>
                            <div className="text-xs opacity-80 truncate">{schedule.procedure}</div>
                            {schedule.scheduled_time && (
                              <div className="text-xs opacity-70 flex items-center mt-1">
                                <Clock className="h-3 w-3 mr-1" />
                                {schedule.scheduled_time}
                              </div>
                            )}
                            <div className="text-xs opacity-70 flex items-center mt-1">
                              <User className="h-3 w-3 mr-1" />
                              {schedule.staff || 'Unassigned'}
                            </div>
                          </div>
                        );
                      })}

                      {daySchedules.length === 0 && dayConferences.length === 0 && (
                        <div className="text-center text-gray-400 text-sm py-8">
                          No events
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Monthly View */
            <div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day) => {
                  const daySchedules = getSchedulesForDate(day);
                  const dayConferences = getConferencesForDate(day);
                  const today = isToday(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[120px] p-2 rounded-xl transition-all ${
                        !isCurrentMonth
                          ? 'bg-gray-50 opacity-50'
                          : today
                          ? 'bg-blue-50 ring-2 ring-blue-400'
                          : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        today ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayConferences.slice(0, 1).map(conf => (
                          <div
                            key={conf._id}
                            className="text-xs p-1 bg-purple-100 text-purple-800 rounded truncate cursor-pointer"
                            onClick={() => setSelectedEvent({ type: 'conference', data: conf })}
                          >
                            {conf.title}
                          </div>
                        ))}
                        {daySchedules.slice(0, 2).map(schedule => (
                          <div
                            key={schedule._id}
                            className={`text-xs p-1 rounded truncate cursor-pointer ${getPriorityColor(schedule.priority)}`}
                            onClick={() => setSelectedEvent({ type: 'surgery', data: schedule })}
                          >
                            {getInitials(schedule.patient_name)} - {schedule.procedure?.substring(0, 15)}...
                          </div>
                        ))}
                        {(daySchedules.length + dayConferences.length) > 3 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{daySchedules.length + dayConferences.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Event Details Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedEvent(null)}>
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              {selectedEvent.type === 'surgery' ? (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Surgery Details</h2>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {getInitials(selectedEvent.data.patient_name)}
                      </div>
                      <div>
                        <div className="text-xl font-bold">{selectedEvent.data.patient_name}</div>
                        <div className="text-gray-600">ID: {selectedEvent.data.patient_mrn}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-500">Procedure</label>
                        <p className="font-medium">{selectedEvent.data.procedure}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Attending</label>
                        <p className="font-medium">{selectedEvent.data.staff || 'Unassigned'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Date</label>
                        <p className="font-medium">{selectedEvent.data.scheduled_date}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Time</label>
                        <p className="font-medium">{selectedEvent.data.scheduled_time || 'TBD'}</p>
                      </div>
                    </div>
                    <Badge className={getPriorityColor(selectedEvent.data.priority)}>
                      {selectedEvent.data.priority || 'Normal'} Priority
                    </Badge>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Conference Details</h2>
                  <div className="space-y-4">
                    <div className="text-xl font-bold text-purple-700">{selectedEvent.data.title}</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-500">Date</label>
                        <p className="font-medium">{selectedEvent.data.date}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Time</label>
                        <p className="font-medium">{selectedEvent.data.start_time} - {selectedEvent.data.end_time}</p>
                      </div>
                    </div>
                    {selectedEvent.data.participants && (
                      <div>
                        <label className="text-sm text-gray-500">Participants</label>
                        <p className="font-medium">{selectedEvent.data.participants}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
              <Button
                onClick={() => setSelectedEvent(null)}
                className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;
