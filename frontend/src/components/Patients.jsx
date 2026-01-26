import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Search,
  Download,
  Filter,
  X,
  ChevronUp,
  ChevronDown,
  FileSpreadsheet,
  Calendar as CalendarIcon,
  User,
  FileText
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export const Patients = ({ onBack }) => {
  const [patients, setPatients] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'patient_name', direction: 'asc' });
  const [filterStatus, setFilterStatus] = useState('all');

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

    const matchesFilter = filterStatus === 'all' || patient.status === filterStatus;

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

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ?
      <ChevronUp className="h-4 w-4" /> :
      <ChevronDown className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={onBack}
                variant="ghost"
                className="hover:bg-gray-100 rounded-xl"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Button>
              <div className="h-8 w-px bg-gray-300" />
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FileSpreadsheet className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">All Patients</h1>
                  <p className="text-sm text-gray-500">{sortedPatients.length} patients</p>
                </div>
              </div>
            </div>
            <Button
              onClick={exportToCSV}
              className="bg-green-500 hover:bg-green-600 text-white rounded-xl"
            >
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search by name, ID, diagnosis, or procedure..."
                className="pl-10 h-12 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-12 px-4 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    onClick={() => handleSort('patient_name')}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>Patient Name</span>
                      <SortIcon columnKey="patient_name" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('mrn')}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Patient ID</span>
                      <SortIcon columnKey="mrn" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    DOB
                  </th>
                  <th
                    onClick={() => handleSort('diagnosis')}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <FileText className="h-4 w-4" />
                      <span>Diagnosis</span>
                      <SortIcon columnKey="diagnosis" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Procedure
                  </th>
                  <th
                    onClick={() => handleSort('attending')}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Attending</span>
                      <SortIcon columnKey="attending" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      <SortIcon columnKey="status" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Scheduled</span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('prep_progress')}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Prep Progress</span>
                      <SortIcon columnKey="prep_progress" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedPatients.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              {patient.patient_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-semibold text-gray-900">{patient.patient_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">{patient.mrn}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {patient.dob ? format(parseISO(patient.dob), 'MM/dd/yyyy') : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate" title={patient.diagnosis}>
                            {patient.diagnosis || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate" title={patient.procedures}>
                            {patient.procedures || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{patient.attending || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            className={`
                              ${patient.status === 'confirmed' ? 'bg-green-100 text-green-700' : ''}
                              ${patient.status === 'pending' ? 'bg-blue-100 text-blue-700' : ''}
                              ${patient.status === 'completed' ? 'bg-gray-100 text-gray-700' : ''}
                              ${patient.status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}
                              px-3 py-1 text-xs font-medium rounded-full
                            `}
                          >
                            {patient.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {schedule ? (
                            <div>
                              {schedule.is_addon ? (
                                <Badge className="bg-orange-100 text-orange-700 px-2 py-1 text-xs rounded-full">
                                  Add-on
                                </Badge>
                              ) : (
                                <div className="text-sm">
                                  <div className="text-gray-900 font-medium">
                                    {schedule.scheduled_date ? format(parseISO(schedule.scheduled_date), 'MMM dd, yyyy') : 'N/A'}
                                  </div>
                                  {schedule.scheduled_time && (
                                    <div className="text-gray-500 text-xs">{schedule.scheduled_time}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Not scheduled</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 min-w-[80px]">
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
            <div className="text-sm text-gray-600 mb-1">Total Patients</div>
            <div className="text-2xl font-bold text-gray-900">{patients.length}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg p-4 border-l-4 border-green-500">
            <div className="text-sm text-gray-600 mb-1">Confirmed</div>
            <div className="text-2xl font-bold text-gray-900">
              {patients.filter(p => p.status === 'confirmed').length}
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg p-4 border-l-4 border-orange-500">
            <div className="text-sm text-gray-600 mb-1">Pending</div>
            <div className="text-2xl font-bold text-gray-900">
              {patients.filter(p => p.status === 'pending').length}
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg p-4 border-l-4 border-purple-500">
            <div className="text-sm text-gray-600 mb-1">Prep Complete</div>
            <div className="text-2xl font-bold text-gray-900">
              {patients.filter(p => {
                const prep = getPrepProgress(p.prep_checklist);
                return prep.percentage === 100;
              }).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Patients;
