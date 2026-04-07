import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { X, Calendar, Clock, MapPin, User, FileText, Stethoscope } from 'lucide-react';
import { format, addDays } from 'date-fns';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// OR Rooms (can be made configurable)
const OR_ROOMS = [
  'OR 1', 'OR 2', 'OR 3', 'OR 4', 'OR 5', 
  'OR 6', 'OR 7', 'OR 8', 'Ambulatory OR',
  'Minor Procedure Room'
];

// Time slots for scheduling
const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30'
];

export const SchedulePatientModal = ({ 
  patient, 
  schedule, 
  initialDate, 
  onClose, 
  onSchedule,
  existingSchedules = [],
  attendings = []
}) => {
  const [scheduledDate, setScheduledDate] = useState(
    initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );
  const [scheduledTime, setScheduledTime] = useState('08:00');
  const [orRoom, setOrRoom] = useState('');
  const [selectedAttending, setSelectedAttending] = useState(schedule?.staff || '');
  const [estimatedDuration, setEstimatedDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if a time slot is occupied on the selected date
  const isSlotOccupied = (time) => {
    return existingSchedules.some(s => 
      s.scheduled_date === scheduledDate && 
      s.scheduled_time === time &&
      s._id !== schedule?._id
    );
  };

  const handleSubmit = async () => {
    if (!scheduledDate || !scheduledTime) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSchedule({
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        or_room: orRoom,
        staff: selectedAttending,
        estimated_duration: parseInt(estimatedDuration),
        notes: notes
      });
      onClose();
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate next 14 days for date selection
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEE, MMM d')
    };
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div 
        className="bg-white w-full md:w-[480px] md:max-h-[90vh] rounded-t-2xl md:rounded-2xl overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-4 md:px-6 md:py-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-white truncate">
                Schedule Patient
              </h2>
              <p className="text-teal-100 text-sm mt-0.5 truncate">
                {schedule?.patient_name || patient?.patient_name}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Patient Info Card */}
        <div className="px-4 py-3 md:px-6 md:py-4 border-b bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {(schedule?.patient_name || patient?.patient_name || 'UN').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-900">{schedule?.patient_name || patient?.patient_name}</div>
              <div className="text-sm text-slate-500">ID: {schedule?.patient_mrn || patient?.mrn}</div>
              {(schedule?.procedure || patient?.procedures) && (
                <div className="text-sm text-slate-600 truncate flex items-center gap-1 mt-0.5">
                  <Stethoscope className="h-3 w-3" />
                  {schedule?.procedure || patient?.procedures}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="px-4 py-4 md:px-6 md:py-5 space-y-4 max-h-[50vh] md:max-h-[400px] overflow-y-auto">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-teal-600" />
              Date
            </Label>
            <Select value={scheduledDate} onValueChange={setScheduledDate}>
              <SelectTrigger className="h-11 md:h-10">
                <SelectValue placeholder="Select date" />
              </SelectTrigger>
              <SelectContent>
                {dateOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Or use custom date */}
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="h-11 md:h-10"
            />
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-teal-600" />
              Time
            </Label>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5">
              {TIME_SLOTS.map(time => {
                const occupied = isSlotOccupied(time);
                return (
                  <button
                    key={time}
                    onClick={() => !occupied && setScheduledTime(time)}
                    disabled={occupied}
                    className={`py-2 px-2 text-xs md:text-sm rounded-lg border transition-all ${
                      scheduledTime === time
                        ? 'bg-teal-500 text-white border-teal-500 font-medium'
                        : occupied
                          ? 'bg-red-50 text-red-300 border-red-200 cursor-not-allowed line-through'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300 hover:bg-teal-50'
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>

          {/* OR Room */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-teal-600" />
              OR Room
            </Label>
            <Select value={orRoom} onValueChange={setOrRoom}>
              <SelectTrigger className="h-11 md:h-10">
                <SelectValue placeholder="Select OR room" />
              </SelectTrigger>
              <SelectContent>
                {OR_ROOMS.map(room => (
                  <SelectItem key={room} value={room}>{room}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Attending */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-teal-600" />
              Attending Surgeon
            </Label>
            <Select value={selectedAttending} onValueChange={setSelectedAttending}>
              <SelectTrigger className="h-11 md:h-10">
                <SelectValue placeholder="Select attending" />
              </SelectTrigger>
              <SelectContent>
                {attendings.map(att => (
                  <SelectItem key={att._id || att.name} value={att.name}>{att.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Estimated Duration (minutes)</Label>
            <Select value={estimatedDuration} onValueChange={setEstimatedDuration}>
              <SelectTrigger className="h-11 md:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="180">3 hours</SelectItem>
                <SelectItem value="240">4 hours</SelectItem>
                <SelectItem value="300">5+ hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-teal-600" />
              Notes (optional)
            </Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions..."
              className="h-11 md:h-10"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 md:px-6 md:py-5 border-t bg-slate-50 flex gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1 h-11 md:h-10"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!scheduledDate || !scheduledTime || isSubmitting}
            className="flex-1 h-11 md:h-10 bg-teal-500 hover:bg-teal-600"
          >
            {isSubmitting ? 'Scheduling...' : 'Confirm Schedule'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SchedulePatientModal;
