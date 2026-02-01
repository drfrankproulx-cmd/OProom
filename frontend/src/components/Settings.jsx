import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Stethoscope,
  Plus,
  Pencil,
  Trash2,
  X,
  ArrowLeft
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export const Settings = ({ onClose, onSessionExpired }) => {
  const [activeTab, setActiveTab] = useState('residents');
  const [residents, setResidents] = useState([]);
  const [attendings, setAtttendings] = useState([]);
  const [showAddResident, setShowAddResident] = useState(false);
  const [showAddAttending, setShowAddAttending] = useState(false);
  const [editingResident, setEditingResident] = useState(null);
  const [editingAttending, setEditingAttending] = useState(null);

  const handleSessionExpired = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.error('Your session has expired. Please log in again.');
    if (onSessionExpired) {
      onSessionExpired();
    } else {
      window.location.reload();
    }
  };

  const [residentForm, setResidentForm] = useState({
    name: '',
    email: '',
    hospital: '',
    specialty: '',
    year: '',
    is_active: true
  });

  const [attendingForm, setAttendingForm] = useState({
    name: '',
    email: '',
    hospital: '',
    specialty: '',
    is_active: true
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No auth token found in localStorage');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchResidents = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Session expired. Please log in again.');
        return;
      }
      const response = await fetch(`${API_URL}/api/residents`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setResidents(data);
      }
    } catch (error) {
      console.error('Failed to fetch residents:', error);
    }
  };

  const fetchAtttendings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/attendings`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setAtttendings(data);
      }
    } catch (error) {
      console.error('Failed to fetch attendings:', error);
    }
  };

  useEffect(() => {
    fetchResidents();
    fetchAtttendings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddResident = async () => {
    if (!residentForm.name || !residentForm.email || !residentForm.hospital) {
      toast.error('Name, email, and hospital are required');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      handleSessionExpired();
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/residents`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(residentForm)
      });

      const data = await response.json();
      
      if (response.status === 401) {
        handleSessionExpired();
        return;
      }
      
      if (response.ok) {
        toast.success('Resident added successfully');
        setShowAddResident(false);
        setResidentForm({
          name: '',
          email: '',
          hospital: '',
          specialty: '',
          year: '',
          is_active: true
        });
        fetchResidents();
      } else {
        toast.error(data.detail || 'Failed to add resident');
      }
    } catch (error) {
      console.error('Error adding resident:', error);
      toast.error('Failed to add resident. Please try again.');
    }
  };

  const handleUpdateResident = async () => {
    if (!editingResident) return;

    try {
      const response = await fetch(`${API_URL}/api/residents/${editingResident._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(residentForm)
      });

      if (response.ok) {
        toast.success('Resident updated successfully');
        setEditingResident(null);
        setResidentForm({
          name: '',
          email: '',
          hospital: '',
          specialty: '',
          year: '',
          is_active: true
        });
        fetchResidents();
      } else {
        toast.error('Failed to update resident');
      }
    } catch (error) {
      toast.error('Failed to update resident');
    }
  };

  const handleDeleteResident = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resident?')) return;

    try {
      const response = await fetch(`${API_URL}/api/residents/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        toast.success('Resident deleted successfully');
        fetchResidents();
      } else {
        toast.error('Failed to delete resident');
      }
    } catch (error) {
      toast.error('Failed to delete resident');
    }
  };

  const handleAddAttending = async () => {
    if (!attendingForm.name || !attendingForm.hospital) {
      toast.error('Name and hospital are required');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      handleSessionExpired();
      return;
    }

    try {
      // Clean up form data - convert empty strings to null for optional fields
      const cleanedForm = {
        ...attendingForm,
        email: attendingForm.email?.trim() || null,
        specialty: attendingForm.specialty?.trim() || null
      };
      
      const response = await fetch(`${API_URL}/api/attendings`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(cleanedForm)
      });

      const data = await response.json();

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      if (response.ok) {
        toast.success('Attending added successfully');
        setShowAddAttending(false);
        setAttendingForm({
          name: '',
          email: '',
          hospital: '',
          specialty: '',
          is_active: true
        });
        fetchAtttendings();
      } else {
        toast.error(data.detail || 'Failed to add attending');
      }
    } catch (error) {
      console.error('Error adding attending:', error);
      toast.error('Failed to add attending. Please try again.');
    }
  };

  const handleUpdateAttending = async () => {
    if (!editingAttending) return;

    try {
      const response = await fetch(`${API_URL}/api/attendings/${editingAttending._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(attendingForm)
      });

      if (response.ok) {
        toast.success('Attending updated successfully');
        setEditingAttending(null);
        setAttendingForm({
          name: '',
          email: '',
          hospital: '',
          specialty: '',
          is_active: true
        });
        fetchAtttendings();
      } else {
        toast.error('Failed to update attending');
      }
    } catch (error) {
      toast.error('Failed to update attending');
    }
  };

  const handleDeleteAttending = async (id) => {
    if (!window.confirm('Are you sure you want to delete this attending?')) return;

    try {
      const response = await fetch(`${API_URL}/api/attendings/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        toast.success('Attending deleted successfully');
        fetchAtttendings();
      } else {
        toast.error('Failed to delete attending');
      }
    } catch (error) {
      toast.error('Failed to delete attending');
    }
  };

  const startEditResident = (resident) => {
    setEditingResident(resident);
    setResidentForm({
      name: resident.name,
      email: resident.email,
      hospital: resident.hospital,
      specialty: resident.specialty || '',
      year: resident.year || '',
      is_active: resident.is_active
    });
  };

  const startEditAttending = (attending) => {
    setEditingAttending(attending);
    setAttendingForm({
      name: attending.name,
      email: attending.email || '',
      hospital: attending.hospital,
      specialty: attending.specialty || '',
      is_active: attending.is_active
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={onClose}
                className="rounded-full hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Tabs */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('residents')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-full font-medium transition-all ${
              activeTab === 'residents'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Users className="h-5 w-5" />
            <span>Residents</span>
          </button>
          <button
            onClick={() => setActiveTab('attendings')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-full font-medium transition-all ${
              activeTab === 'attendings'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Stethoscope className="h-5 w-5" />
            <span>Attendings</span>
          </button>
        </div>

        {/* Residents Tab */}
        {activeTab === 'residents' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Manage Residents</h2>
              <Button
                onClick={() => {
                  setShowAddResident(true);
                  setEditingResident(null);
                  setResidentForm({
                    name: '',
                    email: '',
                    hospital: '',
                    specialty: '',
                    year: '',
                    is_active: true
                  });
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 py-3 font-medium shadow-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Resident
              </Button>
            </div>

            <div className="space-y-4">
              {residents.map((resident) => (
                <div
                  key={resident._id}
                  className="flex items-center justify-between p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{resident.name}</h3>
                      {resident.is_active ? (
                        <Badge className="bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-600 text-base">{resident.email}</p>
                    <p className="text-gray-600 text-base">
                      {resident.hospital} • {resident.specialty || 'No specialty'} • {resident.year || 'No year'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => startEditResident(resident)}
                      className="rounded-full"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDeleteResident(resident._id)}
                      className="rounded-full text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {residents.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">No residents added yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attendings Tab */}
        {activeTab === 'attendings' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Manage Attendings</h2>
              <Button
                onClick={() => {
                  setShowAddAttending(true);
                  setEditingAttending(null);
                  setAttendingForm({
                    name: '',
                    email: '',
                    hospital: '',
                    specialty: '',
                    is_active: true
                  });
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 py-3 font-medium shadow-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Attending
              </Button>
            </div>

            <div className="space-y-4">
              {attendings.map((attending) => (
                <div
                  key={attending._id}
                  className="flex items-center justify-between p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{attending.name}</h3>
                      {attending.is_active ? (
                        <Badge className="bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-600 text-base">{attending.email || 'No email'}</p>
                    <p className="text-gray-600 text-base">
                      {attending.hospital} • {attending.specialty || 'No specialty'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => startEditAttending(attending)}
                      className="rounded-full"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDeleteAttending(attending._id)}
                      className="rounded-full text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {attendings.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Stethoscope className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">No attendings added yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit Resident Modal */}
      <Dialog open={showAddResident || !!editingResident} onOpenChange={(open) => {
        if (!open) {
          setShowAddResident(false);
          setEditingResident(null);
        }
      }}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {editingResident ? 'Edit Resident' : 'Add New Resident'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-base font-medium text-gray-700 mb-2 block">Name *</Label>
                <Input
                  className="h-12 text-base rounded-xl border-gray-300"
                  value={residentForm.name}
                  onChange={(e) => setResidentForm({ ...residentForm, name: e.target.value })}
                  placeholder="Dr. John Doe"
                />
              </div>
              <div>
                <Label className="text-base font-medium text-gray-700 mb-2 block">Email *</Label>
                <Input
                  type="email"
                  className="h-12 text-base rounded-xl border-gray-300"
                  value={residentForm.email}
                  onChange={(e) => setResidentForm({ ...residentForm, email: e.target.value })}
                  placeholder="john.doe@hospital.edu"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-base font-medium text-gray-700 mb-2 block">Hospital *</Label>
                <Input
                  className="h-12 text-base rounded-xl border-gray-300"
                  value={residentForm.hospital}
                  onChange={(e) => setResidentForm({ ...residentForm, hospital: e.target.value })}
                  placeholder="General Hospital"
                />
              </div>
              <div>
                <Label className="text-base font-medium text-gray-700 mb-2 block">Specialty</Label>
                <Input
                  className="h-12 text-base rounded-xl border-gray-300"
                  value={residentForm.specialty}
                  onChange={(e) => setResidentForm({ ...residentForm, specialty: e.target.value })}
                  placeholder="Orthopedics"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-base font-medium text-gray-700 mb-2 block">Year</Label>
                <Select
                  value={residentForm.year}
                  onValueChange={(value) => setResidentForm({ ...residentForm, year: value })}
                >
                  <SelectTrigger className="h-12 text-base rounded-xl border-gray-300">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PGY-1">PGY-1</SelectItem>
                    <SelectItem value="PGY-2">PGY-2</SelectItem>
                    <SelectItem value="PGY-3">PGY-3</SelectItem>
                    <SelectItem value="PGY-4">PGY-4</SelectItem>
                    <SelectItem value="PGY-5">PGY-5</SelectItem>
                    <SelectItem value="Fellow">Fellow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-base font-medium text-gray-700 mb-2 block">Status</Label>
                <Select
                  value={residentForm.is_active ? 'active' : 'inactive'}
                  onValueChange={(value) => setResidentForm({ ...residentForm, is_active: value === 'active' })}
                >
                  <SelectTrigger className="h-12 text-base rounded-xl border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex space-x-4 pt-4">
              <Button
                onClick={editingResident ? handleUpdateResident : handleAddResident}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-6 text-base font-medium shadow-lg"
              >
                {editingResident ? 'Update Resident' : 'Add Resident'}
              </Button>
              <Button
                onClick={() => {
                  setShowAddResident(false);
                  setEditingResident(null);
                }}
                variant="outline"
                className="flex-1 rounded-xl py-6 text-base font-medium border-gray-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Attending Modal */}
      <Dialog open={showAddAttending || !!editingAttending} onOpenChange={(open) => {
        if (!open) {
          setShowAddAttending(false);
          setEditingAttending(null);
        }
      }}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {editingAttending ? 'Edit Attending' : 'Add New Attending'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-base font-medium text-gray-700 mb-2 block">Name *</Label>
                <Input
                  className="h-12 text-base rounded-xl border-gray-300"
                  value={attendingForm.name}
                  onChange={(e) => setAttendingForm({ ...attendingForm, name: e.target.value })}
                  placeholder="Dr. Jane Smith"
                />
              </div>
              <div>
                <Label className="text-base font-medium text-gray-700 mb-2 block">Email</Label>
                <Input
                  type="email"
                  className="h-12 text-base rounded-xl border-gray-300"
                  value={attendingForm.email}
                  onChange={(e) => setAttendingForm({ ...attendingForm, email: e.target.value })}
                  placeholder="jane.smith@hospital.edu"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-base font-medium text-gray-700 mb-2 block">Hospital *</Label>
                <Input
                  className="h-12 text-base rounded-xl border-gray-300"
                  value={attendingForm.hospital}
                  onChange={(e) => setAttendingForm({ ...attendingForm, hospital: e.target.value })}
                  placeholder="General Hospital"
                />
              </div>
              <div>
                <Label className="text-base font-medium text-gray-700 mb-2 block">Specialty</Label>
                <Input
                  className="h-12 text-base rounded-xl border-gray-300"
                  value={attendingForm.specialty}
                  onChange={(e) => setAttendingForm({ ...attendingForm, specialty: e.target.value })}
                  placeholder="Orthopedics"
                />
              </div>
            </div>

            <div>
              <Label className="text-base font-medium text-gray-700 mb-2 block">Status</Label>
              <Select
                value={attendingForm.is_active ? 'active' : 'inactive'}
                onValueChange={(value) => setAttendingForm({ ...attendingForm, is_active: value === 'active' })}
              >
                <SelectTrigger className="h-12 text-base rounded-xl border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-4 pt-4">
              <Button
                onClick={editingAttending ? handleUpdateAttending : handleAddAttending}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-6 text-base font-medium shadow-lg"
              >
                {editingAttending ? 'Update Attending' : 'Add Attending'}
              </Button>
              <Button
                onClick={() => {
                  setShowAddAttending(false);
                  setEditingAttending(null);
                }}
                variant="outline"
                className="flex-1 rounded-xl py-6 text-base font-medium border-gray-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
