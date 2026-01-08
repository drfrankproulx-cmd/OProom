import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Video, Plus, Calendar, Clock, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isPast } from 'date-fns';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ConferenceManager = ({ conferences, onRefresh }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const upcomingConferences = conferences.filter(c => {
    try {
      return !isPast(parseISO(c.date));
    } catch {
      return true;
    }
  });

  const pastConferences = conferences.filter(c => {
    try {
      return isPast(parseISO(c.date));
    } catch {
      return false;
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const attendeesText = formData.get('attendees');
    const attendeesArray = attendeesText
      ? attendeesText.split(',').map(a => a.trim()).filter(a => a)
      : [];

    const data = {
      title: formData.get('title'),
      date: formData.get('date'),
      time: formData.get('time'),
      attendees: attendeesArray,
      notes: formData.get('notes') || '',
    };

    try {
      const response = await fetch(`${API_URL}/api/conferences`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to create conference');
      }

      toast.success('Conference scheduled successfully!');
      setIsDialogOpen(false);
      onRefresh();
      e.target.reset();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (conferenceId) => {
    if (!window.confirm('Are you sure you want to delete this conference?')) return;

    try {
      const response = await fetch(`${API_URL}/api/conferences/${conferenceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to delete conference');
      }

      toast.success('Conference deleted successfully');
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const ConferenceCard = ({ conference, isPast }) => {
    let formattedDate;
    try {
      formattedDate = format(parseISO(conference.date), 'MMM d, yyyy');
    } catch {
      formattedDate = conference.date;
    }

    return (
      <div
        className={`border rounded-lg p-4 transition-smooth hover:shadow-md ${
          isPast ? 'bg-muted/30 border-border' : 'bg-card border-primary/30'
        }`}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{conference.title}</h3>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formattedDate}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {conference.time}
                  </div>
                  {conference.attendees && conference.attendees.length > 0 && (
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {conference.attendees.length} attendees
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(conference._id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>

          {conference.attendees && conference.attendees.length > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Attendees:</p>
              <div className="flex flex-wrap gap-1">
                {conference.attendees.map((attendee, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {attendee}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {conference.notes && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Notes:</p>
              <p className="text-sm text-foreground">{conference.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-elegant">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">Weekly Conferences & Meetings</CardTitle>
              <p className="text-sm text-muted-foreground">
                {upcomingConferences.length} upcoming, {pastConferences.length} past
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Meeting
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Schedule New Conference/Meeting</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Meeting Title</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="e.g., Weekly OR Planning, Pre-op Conference"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input id="date" name="date" type="date" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Time</Label>
                      <Input id="time" name="time" type="time" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="attendees">Attendees (comma-separated)</Label>
                    <Input
                      id="attendees"
                      name="attendees"
                      placeholder="Dr. Smith, Dr. Jones, Resident Team"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter names or email addresses separated by commas
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes/Agenda</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      placeholder="Meeting agenda, topics to discuss..."
                      rows={4}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Schedule Conference
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Upcoming Conferences */}
      {upcomingConferences.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-primary" />
            Upcoming Conferences
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {upcomingConferences.map((conference) => (
              <ConferenceCard key={conference._id} conference={conference} isPast={false} />
            ))}
          </div>
        </div>
      )}

      {/* Past Conferences */}
      {pastConferences.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-muted-foreground mb-3">Past Conferences</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pastConferences.map((conference) => (
              <ConferenceCard key={conference._id} conference={conference} isPast={true} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {conferences.length === 0 && (
        <Card className="shadow-md">
          <CardContent className="text-center py-12">
            <Video className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium text-foreground">No conferences scheduled</p>
            <p className="text-sm text-muted-foreground mb-4">
              Schedule your first meeting or conference
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConferenceManager;
