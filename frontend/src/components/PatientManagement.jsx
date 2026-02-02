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
import { UserPlus, Edit2, Trash2, Search, ArrowRight, CheckCircle, Archive, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PatientManagement = ({ patients, onRefresh }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [showArchived, setShowArchived] = useState(false);
  const [archivedPatients, setArchivedPatients] = useState([]);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const filteredPatients = patients.filter(p =>
    p.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.mrn.includes(searchTerm)
  );

  const filteredArchivedPatients = archivedPatients.filter(p =>
    p.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.mrn.includes(searchTerm)
  );

  React.useEffect(() => {
    if (showArchived) {
      fetchArchivedPatients();
    }
  }, [showArchived]);

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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || `Failed to ${editingPatient ? 'update' : 'add'} patient`);
      }

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
    setSelectedStatus(patient.status || 'pending');
    setIsDialogOpen(true);
  };

  const handleDelete = async (mrn) => {
    if (!window.confirm('Are you sure you want to delete this patient?')) return;

    try {
      const response = await fetch(`${API_URL}/api/patients/${mrn}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to delete patient');
      }

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
      in_or: 'bg-blue-100 text-blue-700 border-blue-300',
      completed: 'bg-green-100 text-green-700 border-green-300',
    };
    return colors[status] || colors.pending;
  };

  const fetchArchivedPatients = async () => {
    try {
      const response = await fetch(`${API_URL}/api/patients/archived`, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to fetch archived patients');
      }

      setArchivedPatients(result);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSendToOR = async (mrn, patientName) => {
    if (!window.confirm(`Send ${patientName} to the operating room?`)) return;

    try {
      const response = await fetch(`${API_URL}/api/patients/${mrn}/send-to-or`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to send patient to OR');
      }

      toast.success(`${patientName} sent to OR`);
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleMarkComplete = async (mrn, patientName) => {
    if (!window.confirm(`Mark procedure complete for ${patientName}?`)) return;

    try {
      const response = await fetch(`${API_URL}/api/patients/${mrn}/mark-complete`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to mark procedure complete');
      }

      toast.success(`Procedure completed for ${patientName}. Will auto-archive in ${result.auto_archive_in_hours} hours.`);
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleArchive = async (mrn, patientName) => {
    if (!window.confirm(`Archive patient record for ${patientName}? This can be undone later.`)) return;

    try {
      const response = await fetch(`${API_URL}/api/patients/${mrn}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to archive patient');
      }

      toast.success(`${patientName} archived successfully`);
      onRefresh();
      if (showArchived) {
        fetchArchivedPatients();
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleRestore = async (mrn, patientName) => {
    if (!window.confirm(`Restore ${patientName} from archive?`)) return;

    try {
      const response = await fetch(`${API_URL}/api/patients/${mrn}/restore`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to restore patient');
      }

      toast.success(`${patientName} restored successfully`);
      onRefresh();
      fetchArchivedPatients();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold">
              {showArchived ? 'Archived Patients' : 'Patient Management'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {showArchived ? `${archivedPatients.length} archived patients` : `${patients.length} active patients`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant={showArchived ? "default" : "outline"}
              onClick={() => setShowArchived(!showArchived)}
              className="sm:w-auto"
            >
              <Archive className="h-4 w-4 mr-2" />
              {showArchived ? 'Show Active' : 'Show Archived'}
            </Button>
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
              if (!open) {
                setEditingPatient(null);
                setSelectedStatus('pending');
              }
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
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="deficient">Deficient</SelectItem>
                          <SelectItem value="in_or">In OR</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
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
                {(showArchived ? filteredArchivedPatients : filteredPatients).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No patients found' : showArchived ? 'No archived patients' : 'No patients added yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  (showArchived ? filteredArchivedPatients : filteredPatients).map((patient) => (
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
                          {patient.status === 'in_or' ? 'In OR' : patient.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {showArchived ? (
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestore(patient.mrn, patient.patient_name)}
                              title="Restore from archive"
                            >
                              <RotateCcw className="h-4 w-4 text-blue-600" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end space-x-1">
                            {patient.status === 'confirmed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendToOR(patient.mrn, patient.patient_name)}
                                title="Send to OR"
                              >
                                <ArrowRight className="h-4 w-4 text-blue-600" />
                              </Button>
                            )}
                            {patient.status === 'in_or' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkComplete(patient.mrn, patient.patient_name)}
                                title="Mark procedure complete"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {patient.status === 'completed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleArchive(patient.mrn, patient.patient_name)}
                                title="Archive patient"
                              >
                                <Archive className="h-4 w-4 text-gray-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(patient)}
                              title="Edit patient"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(patient.mrn)}
                              title="Delete patient (permanent)"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
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
