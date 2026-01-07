import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { UserPlus, Edit2, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PatientManagement = ({ patients, onRefresh }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('pending');

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const filteredPatients = patients.filter(p =>
    p.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.mrn.includes(searchTerm)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
      mrn: formData.get('mrn'),
      patient_name: formData.get('patient_name'),
      dob: formData.get('dob'),
      diagnosis: formData.get('diagnosis') || '',
      procedures: formData.get('procedures') || '',
      attending: formData.get('attending') || '',
      status: selectedStatus,
    };

    try {
      const url = editingPatient
        ? `${API_URL}/api/patients/${editingPatient.mrn}`
        : `${API_URL}/api/patients`;
      const method = editingPatient ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error(`Failed to ${editingPatient ? 'update' : 'add'} patient`);

      toast.success(`Patient ${editingPatient ? 'updated' : 'added'} successfully!`);
      setIsDialogOpen(false);
      setEditingPatient(null);
      onRefresh();
      e.target.reset();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleEdit = (patient) => {
    setEditingPatient(patient);
    setIsDialogOpen(true);
  };

  const handleDelete = async (mrn) => {
    if (!window.confirm('Are you sure you want to delete this patient?')) return;

    try {
      const response = await fetch(`${API_URL}/api/patients/${mrn}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to delete patient');

      toast.success('Patient deleted successfully');
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      confirmed: 'bg-success/10 text-success border-success/20',
      pending: 'bg-warning/10 text-warning border-warning/20',
      deficient: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return colors[status] || colors.pending;
  };

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold">Patient Management</CardTitle>
            <p className="text-sm text-muted-foreground">{patients.length} total patients</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or MRN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingPatient(null);
            }}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Patient
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingPatient ? 'Edit Patient' : 'Add New Patient'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mrn">Medical Record Number (MRN)</Label>
                      <Input
                        id="mrn"
                        name="mrn"
                        defaultValue={editingPatient?.mrn}
                        disabled={!!editingPatient}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="patient_name">Patient Name</Label>
                      <Input
                        id="patient_name"
                        name="patient_name"
                        defaultValue={editingPatient?.patient_name}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        name="dob"
                        type="date"
                        defaultValue={editingPatient?.dob}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" defaultValue={editingPatient?.status || 'pending'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="deficient">Deficient</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="attending">Attending Physician</Label>
                    <Input
                      id="attending"
                      name="attending"
                      defaultValue={editingPatient?.attending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="diagnosis">Diagnosis</Label>
                    <Textarea
                      id="diagnosis"
                      name="diagnosis"
                      defaultValue={editingPatient?.diagnosis}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="procedures">Procedures</Label>
                    <Textarea
                      id="procedures"
                      name="procedures"
                      defaultValue={editingPatient?.procedures}
                      rows={2}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {editingPatient ? 'Update Patient' : 'Add Patient'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>MRN</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>DOB</TableHead>
                  <TableHead>Attending</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No patients found' : 'No patients added yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients.map((patient) => (
                    <TableRow key={patient.mrn} className="hover:bg-muted/30 transition-smooth">
                      <TableCell className="font-medium">{patient.mrn}</TableCell>
                      <TableCell>{patient.patient_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{patient.dob}</TableCell>
                      <TableCell className="text-sm">{patient.attending || '-'}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {patient.diagnosis || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(patient.status)}>
                          {patient.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(patient)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(patient.mrn)}
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
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientManagement;
