import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ChevronDown, ChevronUp, Edit2, Trash2, MoveRight, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import PatientIntakeForm from './PatientIntakeForm';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const EnhancedAddOnList = ({ schedules, onRefresh, onDragStart }) => {
  const [sortColumn, setSortColumn] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPatient, setEditingPatient] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const addOnCases = schedules
    .filter(s => s.is_addon)
    .map(s => ({
      ...s,
      priority: s.priority || 'medium',
      date_added: s.created_at || new Date().toISOString()
    }));

  // Filter by search and priority
  const filteredCases = addOnCases.filter(c => {
    const matchesSearch = 
      c.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.patient_mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.procedure.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = filterPriority === 'all' || c.priority === filterPriority;
    
    return matchesSearch && matchesPriority;
  });

  // Sort cases
  const sortedCases = [...filteredCases].sort((a, b) => {
    let aVal = a[sortColumn];
    let bVal = b[sortColumn];

    if (sortColumn === 'date_added') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleDelete = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to remove this patient from the add-on list?')) return;

    try {
      const response = await fetch(`${API_URL}/api/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to delete');
      }

      toast.success('Patient removed from add-on list');
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSchedule = async (scheduleId) => {
    const date = prompt('Enter OR date (YYYY-MM-DD):');
    if (!date) return;

    const time = prompt('Enter OR time (HH:MM):', '08:00');
    if (!time) return;

    try {
      const schedule = schedules.find(s => s._id === scheduleId);
      const updatedSchedule = {
        ...schedule,
        scheduled_date: date,
        scheduled_time: time,
        is_addon: false,
        status: 'scheduled',
      };
      delete updatedSchedule._id;

      const response = await fetch(`${API_URL}/api/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedSchedule),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to schedule');
      }

      toast.success('Patient scheduled successfully!');
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const updatePriority = async (scheduleId, newPriority) => {
    try {
      const schedule = schedules.find(s => s._id === scheduleId);
      const updatedSchedule = {
        ...schedule,
        priority: newPriority,
      };
      delete updatedSchedule._id;

      const response = await fetch(`${API_URL}/api/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedSchedule),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to update priority');
      }

      toast.success('Priority updated');
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-destructive/10 text-destructive border-destructive/20',
      medium: 'bg-warning/10 text-warning border-warning/20',
      low: 'bg-success/10 text-success border-success/20',
    };
    return colors[priority] || colors.medium;
  };

  const SortIcon = ({ column }) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 inline ml-1" /> : 
      <ChevronDown className="h-4 w-4 inline ml-1" />;
  };

  return (
    <>
      <Card className="shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Add-On List</CardTitle>
              <p className="text-sm text-muted-foreground">
                {sortedCases.length} unscheduled patients
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48"
              />
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-8"></TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/70"
                    onClick={() => handleSort('patient_name')}
                  >
                    Patient Name <SortIcon column="patient_name" />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/70"
                    onClick={() => handleSort('patient_mrn')}
                  >
                    MRN <SortIcon column="patient_mrn" />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/70"
                    onClick={() => handleSort('staff')}
                  >
                    Attending <SortIcon column="staff" />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/70"
                    onClick={() => handleSort('procedure')}
                  >
                    Procedure <SortIcon column="procedure" />
                  </TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/70"
                    onClick={() => handleSort('date_added')}
                  >
                    Date Added <SortIcon column="date_added" />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/70"
                    onClick={() => handleSort('priority')}
                  >
                    Priority <SortIcon column="priority" />
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No add-on cases found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedCases.map((addOn) => (
                    <TableRow 
                      key={addOn._id}
                      className="hover:bg-muted/30 transition-smooth cursor-move"
                      draggable
                      onDragStart={(e) => onDragStart && onDragStart(e, addOn)}
                    >
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell className="font-medium">{addOn.patient_name}</TableCell>
                      <TableCell>{addOn.patient_mrn}</TableCell>
                      <TableCell>{addOn.staff}</TableCell>
                      <TableCell className="max-w-xs truncate">{addOn.procedure}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                        {addOn.diagnosis || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(parseISO(addOn.date_added), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={addOn.priority} 
                          onValueChange={(value) => updatePriority(addOn._id, value)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSchedule(addOn._id)}
                            title="Schedule"
                          >
                            <MoveRight className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(addOn._id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editingPatient && (
        <PatientIntakeForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingPatient(null);
          }}
          onSuccess={onRefresh}
          editingPatient={editingPatient}
        />
      )}
    </>
  );
};

export default EnhancedAddOnList;
