import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { getToken, getAuthHeaders as getAuth, clearToken } from '../utils/auth';
import {
  Users,
  UserPlus,
  Stethoscope,
  Plus,
  Pencil,
  Trash2,
  X,
  Mail,
  Calendar,
  Upload
} from 'lucide-react';
import PageLayout from './PageLayout';
import GoogleIntegration from './GoogleIntegration';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export const Settings = ({ onClose, onSessionExpired, onNavigate, initialTab = 'residents', user, onLogout }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [residents, setResidents] = useState([]);
  const [attendings, setAttendings] = useState([]);
  const [showAddResident, setShowAddResident] = useState(false);
  const [showAddAttending, setShowAddAttending] = useState(false);
  const [editingResident, setEditingResident] = useState(null);
  const [editingAttending, setEditingAttending] = useState(null);

  const handleSessionExpired = () => {
    clearToken();
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
    const token = getToken();
    if (!token) {
      // No auth token available
    }
    return {
      ...getAuth(),
      'Content-Type': 'application/json',
    };
  };

  const fetchResidents = async () => {
    try {
      const token = getToken();
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
      // Network error fetching residents
    }
  };

  const fetchAttendings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/attendings`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setAttendings(data);
      }
    } catch (error) {
      // Network error fetching attendings
    }
  };

  useEffect(() => {
    fetchResidents();
    fetchAttendings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddResident = async () => {
    if (!residentForm.name || !residentForm.email || !residentForm.hospital) {
      toast.error('Name, email, and hospital are required');
      return;
    }

    const token = getToken();
    if (!token) {
      handleSessionExpired();
      return;
    }

    try {
      // Clean up form data - convert empty strings to null for optional fields
      const cleanedForm = {
        ...residentForm,
        specialty: residentForm.specialty?.trim() || null,
        year: residentForm.year?.trim() || null
      };

      const response = await fetch(`${API_URL}/api/residents`, {
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

    const token = getToken();
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
        fetchAttendings();
      } else {
        toast.error(data.detail || 'Failed to add attending');
      }
    } catch (error) {
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
        fetchAttendings();
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
        fetchAttendings();
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
    <PageLayout
      currentView="settings"
      onNavigate={(view) => {
        if (view === 'dashboard') {
          onClose();
        } else {
          onClose();
          if (onNavigate) onNavigate(view);
        }
      }}
      user={user}
      onLogout={onLogout}
      title="Settings"
      subtitle="Manage residents, attendings, and integrations"
    >
      <div className="p-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setActiveTab('residents')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-medium transition-all text-sm ${
              activeTab === 'residents'
                ? 'bg-teal-500 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
            data-testid="tab-residents"
          >
            <Users className="h-4 w-4" />
            <span>Residents</span>
          </button>
          <button
            onClick={() => setActiveTab('attendings')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-medium transition-all text-sm ${
              activeTab === 'attendings'
                ? 'bg-teal-500 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
            data-testid="tab-attendings"
          >
            <Stethoscope className="h-4 w-4" />
            <span>Attendings</span>
          </button>
          <button
            onClick={() => setActiveTab('google')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-medium transition-all text-sm ${
              activeTab === 'google'
                ? 'bg-teal-500 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
            data-testid="tab-google"
          >
            <Mail className="h-4 w-4" />
            <span>Email & Calendar</span>
          </button>
          <button
            onClick={() => {
              onClose();
              if (onNavigate) onNavigate('bulk-import');
            }}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl font-medium transition-all text-sm bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-md"
            data-testid="bulk-import-nav-btn"
          >
            <Upload className="h-4 w-4" />
            <span>Bulk Import</span>
          </button>
        </div>

        {/* Google Integration Tab */}
        {activeTab === 'google' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">Email & Calendar Integration</h2>
              <p className="text-slate-500 text-sm mt-1">Connect your Google account for Gmail and Calendar sync</p>
            </div>
            <GoogleIntegration />
          </div>
        )}

        {/* Residents Tab */}
        {activeTab === 'residents' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900">Manage Residents</h2>
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
                className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-medium"
                data-testid="add-resident-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Resident
              </Button>
            </div>

            <div className="space-y-3">
              {residents.map((resident) => (
                <div
                  key={resident._id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:shadow-sm transition-all"
                >
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-slate-900">{resident.name}</h3>
                      {resident.is_active ? (
                        <Badge className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm">{resident.email}</p>
                    <p className="text-slate-400 text-sm">
                      {resident.hospital} • {resident.specialty || 'No specialty'} • {resident.year || 'No year'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditResident(resident)}
                      className="rounded-lg"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteResident(resident._id)}
                      className="rounded-lg text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {residents.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No residents added yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attendings Tab */}
        {activeTab === 'attendings' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900">Manage Attendings</h2>
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
                className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-medium"
                data-testid="add-attending-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Attending
              </Button>
            </div>

            <div className="space-y-3">
              {attendings.map((attending) => (
                <div
                  key={attending._id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:shadow-sm transition-all"
                >
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-slate-900">{attending.name}</h3>
                      {attending.is_active ? (
                        <Badge className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm">{attending.email || 'No email'}</p>
                    <p className="text-slate-400 text-sm">
                      {attending.hospital} • {attending.specialty || 'No specialty'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditAttending(attending)}
                      className="rounded-lg"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAttending(attending._id)}
                      className="rounded-lg text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {attendings.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <Stethoscope className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No attendings added yet</p>
                </div>
              )}
            </div>
          </div>
        )}

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
    </PageLayout>
  );
};

export default Settings;
