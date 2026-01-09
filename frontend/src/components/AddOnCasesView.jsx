import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ArrowLeft, GripVertical, Calendar, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Circle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ReadinessIndicator = ({ status }) => {
  const colors = {
    confirmed: 'text-green-500',
    pending: 'text-yellow-500',
    deficient: 'text-red-500'
  };
  return <Circle className={`h-2.5 w-2.5 fill-current ${colors[status] || colors.pending}`} />;
};

const getInitials = (name) => {
  if (!name) return 'UN';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const AddOnCasesView = ({ addOnCases, patients, onClose, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState('patient_name');
  const [sortDirection, setSortDirection] = useState('asc');

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const filteredCases = addOnCases.filter(c =>
    c.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.staff.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.procedure.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedCases = [...filteredCases].sort((a, b) => {
    let aVal = a[sortColumn] || '';
    let bVal = b[sortColumn] || '';
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

  const handleSchedule = async (caseId) => {
    const date = prompt('Enter OR date (YYYY-MM-DD):');
    if (!date) return;

    const time = prompt('Enter OR time (HH:MM):', '08:00');
    if (!time) return;

    try {
      const addOnCase = addOnCases.find(c => c._id === caseId);
      const updatedSchedule = {
        ...addOnCase,
        scheduled_date: date,
        scheduled_time: time,
        is_addon: false,
        status: 'scheduled',
      };
      delete updatedSchedule._id;

      const response = await fetch(`${API_URL}/api/schedules/${caseId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedSchedule),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to schedule');
      }

      toast.success('Case scheduled successfully!');
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (caseId) => {
    if (!window.confirm('Remove this case from add-on list?')) return;

    try {
      const response = await fetch(`${API_URL}/api/schedules/${caseId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to delete');
      }

      toast.success('Case removed');
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-xs">
      {/* Header */}
      <div className="h-9 border-b border-border flex items-center justify-between px-2 bg-card">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            <ArrowLeft className="h-3 w-3" />
          </Button>
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-sm">Add-On Cases - Detailed View</span>
          <Badge variant="outline" className="text-xs">{sortedCases.length} cases</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search cases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-6 pl-7 w-48 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-info/10 border-b border-info/20 px-2 py-1.5">
        <p className="text-xs text-info-foreground">
          <strong>Add-On Cases:</strong> Patients awaiting OR scheduling. Drag cases to calendar (future) or click Schedule to assign date/time.
        </p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-2">
        <Card className="border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-8"></TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/70 text-xs" onClick={() => handleSort('patient_name')}>
                  Patient {sortColumn === 'patient_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-xs">MRN</TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/70 text-xs" onClick={() => handleSort('staff')}>
                  Attending {sortColumn === 'staff' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-xs">Diagnosis</TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/70 text-xs" onClick={() => handleSort('procedure')}>
                  Procedure {sortColumn === 'procedure' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-xs">Readiness</TableHead>
                <TableHead className="text-xs">Priority</TableHead>
                <TableHead className="text-xs">Notes</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No add-on cases found
                  </TableCell>
                </TableRow>
              ) : (
                sortedCases.map((addOn) => {
                  const patient = patients.find(p => p.mrn === addOn.patient_mrn);
                  return (
                    <TableRow key={addOn._id} className="hover:bg-muted/20 cursor-move text-xs">
                      <TableCell>
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>{getInitials(addOn.patient_name)}</div>
                        <div className="text-muted-foreground">{addOn.patient_name}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{addOn.patient_mrn}</TableCell>
                      <TableCell>{addOn.staff}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {patient?.diagnosis || 'Not specified'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{addOn.procedure}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <ReadinessIndicator status={patient?.status || 'pending'} />
                          <span className="capitalize text-muted-foreground">
                            {patient?.status || 'pending'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select defaultValue={addOn.priority || 'medium'}>
                          <SelectTrigger className="h-6 text-xs w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-xs truncate">
                        {patient?.diagnosis ? `${patient.diagnosis.substring(0, 30)}...` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleSchedule(addOn._id)}
                          >
                            Schedule
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-destructive"
                            onClick={() => handleDelete(addOn._id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Footer Info */}
      <div className="h-8 border-t border-border flex items-center justify-between px-2 bg-muted/30 text-xs text-muted-foreground">
        <span>Total: {sortedCases.length} cases awaiting schedule</span>
        <span>Drag cases to calendar or click Schedule to assign date/time</span>
      </div>
    </div>
  );
};

export default AddOnCasesView;
