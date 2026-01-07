import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ListPlus, MoveRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const AddOnList = ({ schedules, onRefresh }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const addOnCases = schedules.filter(s => s.is_addon);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const handleAddAddOn = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
      patient_mrn: formData.get('patient_mrn'),
      patient_name: formData.get('patient_name'),
      procedure: formData.get('procedure'),
      staff: formData.get('staff'),
      scheduled_date: '',
      status: 'pending',
      is_addon: true,
    };

    try {
      const response = await fetch(`${API_URL}/api/schedules`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to add add-on case');

      toast.success('Add-on case added successfully!');
      setIsDialogOpen(false);
      onRefresh();
      e.target.reset();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleScheduleAddOn = async (scheduleId) => {
    const date = prompt('Enter scheduled date (YYYY-MM-DD):');
    if (!date) return;

    try {
      const schedule = schedules.find(s => s._id === scheduleId);
      const updatedSchedule = {
        ...schedule,
        scheduled_date: date,
        is_addon: false,
        status: 'scheduled',
      };
      delete updatedSchedule._id;

      const response = await fetch(`${API_URL}/api/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedSchedule),
      });

      if (!response.ok) throw new Error('Failed to schedule add-on');

      toast.success('Add-on case scheduled!');
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteAddOn = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this add-on case?')) return;

    try {
      const response = await fetch(`${API_URL}/api/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to delete add-on');

      toast.success('Add-on case deleted');
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">Add-On Cases</CardTitle>
            <p className="text-sm text-muted-foreground">Not yet scheduled</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <ListPlus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Add-On Case</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddAddOn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="addon_patient_mrn">Patient MRN</Label>
                  <Input id="addon_patient_mrn" name="patient_mrn" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addon_patient_name">Patient Name</Label>
                  <Input id="addon_patient_name" name="patient_name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addon_procedure">Procedure</Label>
                  <Input id="addon_procedure" name="procedure" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addon_staff">Staff/Attending</Label>
                  <Input id="addon_staff" name="staff" required />
                </div>
                <Button type="submit" className="w-full">
                  Add to List
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {addOnCases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No add-on cases at this time</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {addOnCases.map((addOn) => (
              <div
                key={addOn._id}
                className="border border-warning/30 rounded-lg p-4 bg-warning/5 hover:shadow-md transition-smooth"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{addOn.patient_name}</p>
                      <p className="text-sm text-muted-foreground">MRN: {addOn.patient_mrn}</p>
                    </div>
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                      Add-on
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">Procedure:</span> {addOn.procedure}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Staff:</span> {addOn.staff}
                    </p>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleScheduleAddOn(addOn._id)}
                    >
                      <MoveRight className="h-3 w-3 mr-1" />
                      Schedule
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteAddOn(addOn._id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AddOnList;
