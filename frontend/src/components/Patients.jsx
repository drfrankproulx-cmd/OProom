import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  Search,
  Download,
  Filter,
  X,
  ChevronUp,
  ChevronDown,
  FileSpreadsheet,
  User,
  FileText,
  Trash2
} from 'lucide-react';
import PageLayout from './PageLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export const Patients = ({ onNavigate, initialFilter, user, onLogout }) => {
  const [patients, setPatients] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'patient_name', direction: 'asc' });
  const [filterStatus, setFilterStatus] = useState(initialFilter?.type === 'addon' ? 'addon' : 'all');
  const [showFilterBanner, setShowFilterBanner] = useState(!!initialFilter);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const fetchData = async () => {
    try {
      const [patientsRes, schedulesRes] = await Promise.all([
        fetch(`${API_URL}/api/patients`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/schedules`, { headers: getAuthHeaders() }),
      ]);

      const [patientsData, schedulesData] = await Promise.all([
        patientsRes.json(),
        schedulesRes.json(),
      ]);

      if (patientsRes.ok) setPatients(patientsData);
      if (schedulesRes.ok) setSchedules(schedulesData);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getScheduleForPatient = (mrn) => {
    return schedules.find(s => s.patient_mrn === mrn);
  };

  const getPrepProgress = (checklist) => {
    if (!checklist) return { completed: 0, total: 4, percentage: 0 };
    const completed = Object.values(checklist).filter(Boolean).length;
    const total = 4;
    return { completed, total, percentage: (completed / total) * 100 };
  };

  // Sorting function
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and search
  const filteredPatients = patients.filter(patient => {
    const matchesSearch =
      patient.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.diagnosis && patient.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (patient.procedures && patient.procedures.toLowerCase().includes(searchTerm.toLowerCase()));

    // Handle addon filter by checking schedules
    let matchesFilter = false;
    if (filterStatus === 'all') {
      matchesFilter = true;
    } else if (filterStatus === 'addon') {
      const schedule = getScheduleForPatient(patient.mrn);
      matchesFilter = schedule?.is_addon === true;
    } else {
      matchesFilter = patient.status === filterStatus;
    }

    return matchesSearch && matchesFilter;
  });

  // Sort patients
  const sortedPatients = [...filteredPatients].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Handle special cases
    if (sortConfig.key === 'prep_progress') {
      aValue = getPrepProgress(a.prep_checklist).percentage;
      bValue = getPrepProgress(b.prep_checklist).percentage;
    }

    if (aValue === undefined || aValue === null) aValue = '';
    if (bValue === undefined || bValue === null) bValue = '';

    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Patient Name',
      'Patient ID',
      'DOB',
      'Diagnosis',
      'Procedure',
      'Attending',
      'Status',
      'Scheduled Date',
      'Scheduled Time',
      'Type',
      'Prep Progress',
      'X-rays',
      'Lab Tests',
      'Insurance',
      'Medical Opt'
    ];

    const rows = sortedPatients.map(patient => {
      const schedule = getScheduleForPatient(patient.mrn);
      const prep = getPrepProgress(patient.prep_checklist);
      const checklist = patient.prep_checklist || {};

      return [
        patient.patient_name,
        patient.mrn,
        patient.dob || '',
        patient.diagnosis || '',
        patient.procedures || '',
        patient.attending || '',
        patient.status,
        schedule?.scheduled_date || '',
        schedule?.scheduled_time || '',
        schedule?.is_addon ? 'Add-on' : 'Scheduled',
        `${prep.completed}/${prep.total}`,
        checklist.xrays ? 'Yes' : 'No',
        checklist.lab_tests ? 'Yes' : 'No',
        checklist.insurance_approval ? 'Yes' : 'No',
        checklist.medical_optimization ? 'Yes' : 'No'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patients_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Patient list exported to CSV');
  };

  // Delete patient
  const handleDeletePatient = async (mrn, patientName) => {
    if (!window.confirm(`Are you sure you want to delete ${patientName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/patients/${mrn}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setPatients(prevPatients => prevPatients.filter(p => p.mrn !== mrn));
        toast.success(`${patientName} has been deleted successfully`);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to delete patient');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete patient');
    }
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ?
      <ChevronUp className="h-4 w-4" /> :
      <ChevronDown className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <PageLayout
        currentView="patients"
        onNavigate={onNavigate}
        user={user}
        onLogout={onLogout}
        title="All Patients"
        subtitle={`${sortedPatients.length} patients`}
        headerActions={
          <Button
            onClick={exportToCSV}
            className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl"
            data-testid="export-csv-btn"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        }
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading patients...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      currentView="patients"
      onNavigate={onNavigate}
      user={user}
      onLogout={onLogout}
      title="All Patients"
      subtitle={`${sortedPatients.length} patients`}
      headerActions={
        <Button
          onClick={exportToCSV}
          className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl"
          data-testid="export-csv-btn"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-slate-400" />
              <Input
                placeholder="Search patients..."
                className="pl-9 md:pl-10 h-11 md:h-10 text-base md:text-sm rounded-lg border-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 md:h-5 md:w-5 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 md:h-5 md:w-5 text-slate-500" />
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setShowFilterBanner(false); }}
                className="flex-1 md:flex-none h-11 md:h-10 px-3 md:px-4 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Status</option>
                <option value="addon">Add-On Cases</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Banner */}
        {showFilterBanner && initialFilter?.type === 'addon' && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-orange-800 font-medium text-sm">Showing Add-On Cases</span>
            </div>
            <button 
              onClick={() => { setFilterStatus('all'); setShowFilterBanner(false); }}
              className="text-orange-600 hover:text-orange-800 text-xs font-medium flex items-center"
            >
              Clear <X className="h-3 w-3 ml-1" />
            </button>
          </div>
        )}

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {sortedPatients.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">No patients found</p>
              <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
            </div>
          ) : (
            sortedPatients.map((patient) => {
              const schedule = getScheduleForPatient(patient.mrn);
              const prep = getPrepProgress(patient.prep_checklist);

              return (
                <div key={patient.mrn} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                        {patient.patient_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{patient.patient_name}</div>
                        <div className="text-xs text-gray-500">ID: {patient.mrn}</div>
                      </div>
                    </div>
                    <Badge
                      className={`
                        ${patient.status === 'confirmed' ? 'bg-green-100 text-green-700' : ''}
                        ${patient.status === 'pending' ? 'bg-blue-100 text-blue-700' : ''}
                        ${patient.status === 'completed' ? 'bg-gray-100 text-gray-700' : ''}
                        ${patient.status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}
                        px-2 py-0.5 text-xs font-medium rounded-full
                      `}
                    >
                      {patient.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    {patient.diagnosis && (
                      <div>
                        <span className="text-gray-500">Diagnosis:</span>
                        <span className="ml-1 text-gray-900 truncate">{patient.diagnosis}</span>
                      </div>
                    )}
                    {patient.procedures && (
                      <div>
                        <span className="text-gray-500">Procedure:</span>
                        <span className="ml-1 text-gray-900 truncate">{patient.procedures}</span>
                      </div>
                    )}
                    {patient.attending && (
                      <div>
                        <span className="text-gray-500">Attending:</span>
                        <span className="ml-1 text-gray-900">{patient.attending}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex-1 mr-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Prep Progress</span>
                        <span className="text-xs font-medium text-gray-700">{prep.completed}/{prep.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            prep.percentage === 100 ? 'bg-green-500' :
                            prep.percentage >= 50 ? 'bg-blue-500' :
                            'bg-orange-500'
                          }`}
                          style={{ width: `${prep.percentage}%` }}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDeletePatient(patient.mrn, patient.patient_name)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                      title="Delete patient"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    onClick={() => handleSort('patient_name')}
                    className="w-[20%] px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>Patient Name</span>
                      <SortIcon columnKey="patient_name" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('mrn')}
                    className="w-[14%] px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Patient ID</span>
                      <SortIcon columnKey="mrn" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('diagnosis')}
                    className="w-[18%] px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <FileText className="h-4 w-4" />
                      <span>Diagnosis</span>
                      <SortIcon columnKey="diagnosis" />
                    </div>
                  </th>
                  <th className="w-[18%] px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Procedure
                  </th>
                  <th
                    onClick={() => handleSort('attending')}
                    className="w-[12%] px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Attending</span>
                      <SortIcon columnKey="attending" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="w-[10%] px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      <SortIcon columnKey="status" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('prep_progress')}
                    className="w-[12%] px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Prep</span>
                      <SortIcon columnKey="prep_progress" />
                    </div>
                  </th>
                  <th className="w-[6%] px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Delete
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedPatients.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg font-medium">No patients found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </td>
                  </tr>
                ) : (
                  sortedPatients.map((patient) => {
                    const schedule = getScheduleForPatient(patient.mrn);
                    const prep = getPrepProgress(patient.prep_checklist);

                    return (
                      <tr key={patient.mrn} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                              {patient.patient_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                            <div className="ml-3 min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{patient.patient_name}</div>
                              <div className="text-xs text-gray-500">
                                {patient.dob ? format(parseISO(patient.dob), 'MM/dd/yyyy') : 'No DOB'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">{patient.mrn}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900 truncate" title={patient.diagnosis}>
                            {patient.diagnosis || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900 truncate" title={patient.procedures}>
                            {patient.procedures || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 truncate">{patient.attending || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge
                            className={`
                              ${patient.status === 'confirmed' ? 'bg-green-100 text-green-700' : ''}
                              ${patient.status === 'pending' ? 'bg-blue-100 text-blue-700' : ''}
                              ${patient.status === 'completed' ? 'bg-gray-100 text-gray-700' : ''}
                              ${patient.status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}
                              px-2 py-1 text-xs font-medium rounded-full
                            `}
                          >
                            {patient.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 min-w-[60px]">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600">{prep.completed}/{prep.total}</span>
                                <span className="text-xs font-medium text-gray-700">{Math.round(prep.percentage)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    prep.percentage === 100 ? 'bg-green-500' :
                                    prep.percentage >= 50 ? 'bg-blue-500' :
                                    'bg-orange-500'
                                  }`}
                                  style={{ width: `${prep.percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <Button
                            onClick={() => handleDeletePatient(patient.mrn, patient.patient_name)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                            title="Delete patient (permanent)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 border-l-4 border-l-blue-500">
            <div className="text-sm text-slate-500 mb-1">Total Patients</div>
            <div className="text-2xl font-bold text-slate-900">{patients.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 border-l-4 border-l-green-500">
            <div className="text-sm text-slate-500 mb-1">Confirmed</div>
            <div className="text-2xl font-bold text-slate-900">
              {patients.filter(p => p.status === 'confirmed').length}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 border-l-4 border-l-orange-500">
            <div className="text-sm text-slate-500 mb-1">Pending</div>
            <div className="text-2xl font-bold text-slate-900">
              {patients.filter(p => p.status === 'pending').length}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 border-l-4 border-l-purple-500">
            <div className="text-sm text-slate-500 mb-1">Prep Complete</div>
            <div className="text-2xl font-bold text-slate-900">
              {patients.filter(p => {
                const prep = getPrepProgress(p.prep_checklist);
                return prep.percentage === 100;
              }).length}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Patients;
