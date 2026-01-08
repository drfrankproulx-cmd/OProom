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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CheckSquare, Plus, AlertCircle, Clock, User } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isPast, differenceInDays } from 'date-fns';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const EnhancedTaskManager = ({ tasks, patients, onRefresh, currentUser }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterView, setFilterView] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  // Calculate urgency based on due date
  const calculateUrgency = (dueDate) => {
    if (!dueDate) return 'medium';
    const days = differenceInDays(parseISO(dueDate), new Date());
    if (days <= 3) return 'urgent';
    if (days <= 7) return 'high';
    return 'medium';
  };

  // Check if task is overdue
  const isOverdue = (task) => {
    if (!task.due_date || task.completed) return false;
    return isPast(parseISO(task.due_date));
  };

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    const matchesView = 
      filterView === 'all' ||
      (filterView === 'assigned_to_me' && t.assigned_to_email === currentUser?.email) ||
      (filterView === 'assigned_by_me' && t.created_by === currentUser?.email) ||
      (filterView === 'completed' && t.completed) ||
      (filterView === 'incomplete' && !t.completed);
    
    const taskUrgency = calculateUrgency(t.due_date);
    const matchesUrgency = filterUrgency === 'all' || taskUrgency === filterUrgency;
    
    return matchesView && matchesUrgency;
  });

  // Calculate counts
  const urgentTasks = tasks.filter(t => 
    !t.completed && calculateUrgency(t.due_date) === 'urgent'
  );
  const overdueTasks = tasks.filter(t => isOverdue(t));
  const myTasks = tasks.filter(t => 
    t.assigned_to_email === currentUser?.email && !t.completed
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
      patient_mrn: formData.get('patient_mrn') || '',
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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to create task');
      }

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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to update task');
      }

      onRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getUrgencyColor = (dueDate) => {
    const urgency = calculateUrgency(dueDate);
    const colors = {
      urgent: 'bg-destructive/10 text-destructive border-destructive/20',
      high: 'bg-warning/10 text-warning border-warning/20',
      medium: 'bg-primary/10 text-primary border-primary/20',
    };
    return colors[urgency] || colors.medium;
  };

  const getUrgencyLabel = (dueDate) => {
    const urgency = calculateUrgency(dueDate);
    const labels = {
      urgent: '1-3 days',
      high: '4-7 days',
      medium: '7+ days',
    };
    return labels[urgency] || '7+ days';
  };

  const getPatientName = (mrn) => {
    const patient = patients.find(p => p.mrn === mrn);
    return patient ? patient.patient_name : null;
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Urgent</p>
                <p className="text-2xl font-bold text-foreground">{urgentTasks.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-foreground">{overdueTasks.length}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">My Tasks</p>
                <p className="text-2xl font-bold text-foreground">{myTasks.length}</p>
              </div>
              <User className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">
                  {tasks.filter(t => t.completed).length}
                </p>
              </div>
              <CheckSquare className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <Card className="shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">Task Management</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="task_description">Task Description</Label>
                    <Textarea
                      id="task_description"
                      name="task_description"
                      placeholder="Describe the task..."
                      required
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assigned_to">Assign To (Name)</Label>
                      <Input id="assigned_to" name="assigned_to" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assigned_to_email">Email Address</Label>
                      <Input
                        id="assigned_to_email"
                        name="assigned_to_email"
                        type="email"
                        placeholder="resident@umn.edu"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="due_date">Due Date</Label>
                      <Input id="due_date" name="due_date" type="date" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="urgency">Urgency</Label>
                      <Select name="urgency" defaultValue="medium">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgent">1-3 days (Urgent)</SelectItem>
                          <SelectItem value="high">4-7 days (High)</SelectItem>
                          <SelectItem value="medium">7+ days (Low)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patient_mrn">Attach to Patient (Optional)</Label>
                    <Select name="patient_mrn">
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {patients.map(p => (
                          <SelectItem key={p.mrn} value={p.mrn}>
                            {p.patient_name} ({p.mrn})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">
                    Create Task
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={filterView} onValueChange={setFilterView}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="assigned_to_me">Assigned to Me</TabsTrigger>
              <TabsTrigger value="assigned_by_me">Assigned by Me</TabsTrigger>
              <TabsTrigger value="incomplete">Incomplete</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <div className="mt-4">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No tasks found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTasks.map((task) => {
                    const taskOverdue = isOverdue(task);
                    const patientName = task.patient_mrn ? getPatientName(task.patient_mrn) : null;

                    return (
                      <div
                        key={task._id}
                        className={`border rounded-lg p-3 transition-smooth hover:shadow-md ${
                          task.completed ? 'bg-muted/30 border-border' : 
                          taskOverdue ? 'bg-destructive/5 border-destructive/30' : 
                          'bg-card border-border'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={() => handleToggleTask(task._id)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-start justify-between">
                              <p className={`font-medium text-sm ${
                                task.completed
                                  ? 'line-through text-muted-foreground'
                                  : 'text-foreground'
                              }`}>
                                {task.task_description}
                              </p>
                              <Badge variant="outline" className={getUrgencyColor(task.due_date)}>
                                {getUrgencyLabel(task.due_date)}
                              </Badge>
                            </div>
                            
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span>Assigned to: <strong>{task.assigned_to}</strong></span>
                              {task.due_date && (
                                <span className={taskOverdue ? 'text-destructive font-semibold' : ''}>
                                  Due: <strong>{format(parseISO(task.due_date), 'MMM d, yyyy')}</strong>
                                  {taskOverdue && ' (OVERDUE)'}
                                </span>
                              )}
                              {patientName && (
                                <span>
                                  Patient: <strong>{patientName}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedTaskManager;
