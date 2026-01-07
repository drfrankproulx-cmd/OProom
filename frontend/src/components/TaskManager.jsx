import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { CheckSquare, Plus, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const TaskManager = ({ tasks, patients, onRefresh }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterUrgency, setFilterUrgency] = useState('all');

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const filteredTasks = tasks.filter(t => 
    filterUrgency === 'all' || t.urgency === filterUrgency
  );

  const urgentTasks = tasks.filter(t => t.urgency === 'urgent' && !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
      patient_mrn: formData.get('patient_mrn'),
      task_description: formData.get('task_description'),
      urgency: formData.get('urgency'),
      assigned_to: formData.get('assigned_to'),
      assigned_to_email: formData.get('assigned_to_email') || '',
      due_date: formData.get('due_date') || '',
      status: 'pending',
      completed: false,
    };

    try {
      const response = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create task');

      toast.success('Task created successfully!');
      setIsDialogOpen(false);
      onRefresh();
      e.target.reset();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}/toggle`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to update task');

      onRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      urgent: 'bg-destructive/10 text-destructive border-destructive/20',
      high: 'bg-warning/10 text-warning border-warning/20',
      medium: 'bg-primary/10 text-primary border-primary/20',
      low: 'bg-muted text-muted-foreground border-border',
    };
    return colors[urgency] || colors.medium;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-destructive shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Urgent Tasks</p>
                <p className="text-3xl font-bold text-foreground">{urgentTasks.length}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Tasks</p>
                <p className="text-3xl font-bold text-foreground">
                  {tasks.filter(t => !t.completed).length}
                </p>
              </div>
              <Clock className="h-10 w-10 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-foreground">{completedTasks.length}</p>
              </div>
              <CheckSquare className="h-10 w-10 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <Card className="shadow-elegant">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">Task Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                {filteredTasks.length} tasks
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select value={filterUrgency} onValueChange={setFilterUrgency}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgency</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="patient_mrn">Patient MRN</Label>
                        <Input id="patient_mrn" name="patient_mrn" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="urgency">Urgency Level</Label>
                        <Select name="urgency" defaultValue="medium">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="urgent">Urgent (1-3 days)</SelectItem>
                            <SelectItem value="high">High (3-7 days)</SelectItem>
                            <SelectItem value="medium">Medium (1-2 weeks)</SelectItem>
                            <SelectItem value="low">Low (2+ weeks)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task_description">Task Description</Label>
                      <Textarea
                        id="task_description"
                        name="task_description"
                        placeholder="e.g., Medical optimization, Insurance prior-auth, Imaging needed..."
                        required
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="assigned_to">Assigned To (Resident Name)</Label>
                        <Input id="assigned_to" name="assigned_to" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="assigned_to_email">Email Address</Label>
                        <Input
                          id="assigned_to_email"
                          name="assigned_to_email"
                          type="email"
                          placeholder="resident@hospital.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="due_date">Due Date (Optional)</Label>
                      <Input id="due_date" name="due_date" type="date" />
                    </div>
                    <Button type="submit" className="w-full">
                      Create Task
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No tasks found</p>
              <p className="text-sm">Create a new task to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div
                  key={task._id}
                  className={`border rounded-lg p-4 transition-smooth hover:shadow-md ${
                    task.completed ? 'bg-muted/30 border-border' : 'bg-card border-border'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => handleToggleTask(task._id)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`font-medium ${
                            task.completed
                              ? 'line-through text-muted-foreground'
                              : 'text-foreground'
                          }`}>
                            {task.task_description}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Patient MRN: {task.patient_mrn}
                          </p>
                        </div>
                        <Badge variant="outline" className={getUrgencyColor(task.urgency)}>
                          {task.urgency}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>Assigned to: <strong>{task.assigned_to}</strong></span>
                        {task.assigned_to_email && (
                          <span>Email: <strong>{task.assigned_to_email}</strong></span>
                        )}
                        {task.due_date && (
                          <span>Due: <strong>{task.due_date}</strong></span>
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
  );
};

export default TaskManager;
