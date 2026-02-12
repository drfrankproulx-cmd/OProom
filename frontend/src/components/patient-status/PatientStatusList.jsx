import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Filter, X, Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { PatientRow } from './PatientRow';
import { RequirementModal } from './RequirementModal';
import './patient-status.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export const PatientStatusList = ({ onBack }) => {
  const [patients, setPatients] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);

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
      toast.error('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleItemToggle = async (mrn, itemId) => {
    // Map extended checklist items to the 4 backend items
    const itemMapping = {
      'lab_tests': 'lab_tests',
      'xrays': 'xrays',
      'insurance_approval': 'insurance_approval',
      'medical_optimization': 'medical_optimization',
      // Additional items don't sync to backend yet
      'lab_metabolic': null,
      'lab_coag': null,
      'ct_scan': null,
      'surgical_consent': null,
      'anesthesia_consent': null,
      'cardiology_clearance': null,
      'anesthesia_eval': null
    };

    const backendItem = itemMapping[itemId];

    if (!backendItem) {
      toast.info('This item is tracked locally only');
      return;
    }

    const patient = patients.find(p => p.mrn === mrn);
    const currentValue = patient?.prep_checklist?.[backendItem] || false;

    try {
      const response = await fetch(
        `${API_URL}/api/patients/${mrn}/checklist?checklist_item=${backendItem}&checked=${!currentValue}`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        // Update local state
        setPatients(prevPatients =>
          prevPatients.map(p => {
            if (p.mrn === mrn) {
              return {
                ...p,
                prep_checklist: {
                  ...p.prep_checklist,
                  [backendItem]: !currentValue
                }
              };
            }
            return p;
          })
        );
        toast.success(currentValue ? 'Item marked incomplete' : 'Item marked complete');
      } else {
        toast.error('Failed to update checklist');
      }
    } catch (error) {
      toast.error('Failed to update checklist');
      console.error('Checklist update error:', error);
    }
  };

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
        toast.success(`Patient ${patientName} has been deleted successfully`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Failed to delete patient');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete patient');
    }
  };

  const handleAction = (actionId, patient) => {
    switch (actionId) {
      case 'mark-ready':
        toast.success(`Marked ${patient.patient_name} as ready for surgery`);
        break;
      case 'upload-docs':
        toast.info('Document upload feature coming soon');
        break;
      case 'print-checklist':
        window.print();
        break;
      case 'notify-team':
        toast.success('Team notified via email');
        break;
      case 'reschedule':
        toast.info('Reschedule feature coming soon');
        break;
      case 'flag-issue':
        toast.info('Issue flagging feature coming soon');
        break;
      case 'delete-patient':
        handleDeletePatient(patient.mrn, patient.patient_name);
        break;
      default:
        break;
    }
  };

  const handleItemViewDetails = (item) => {
    const patient = patients.find(p => {
      const checklist = p.prep_checklist || {};
      return Object.keys(checklist).includes(item.id);
    });
    setSelectedItem(item);
    setSelectedPatient(patient);
  };

  const handleModalSave = (data) => {
    console.log('Saving:', data);
    toast.success('Documents uploaded and requirement updated');
    // Here you would upload files and update the checklist
  };

  // Filter patients
  const filteredPatients = patients.filter(patient => {
    const matchesSearch =
      patient.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.diagnosis && patient.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter =
      filterStatus === 'all' ||
      patient.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  // Get schedule for patient
  const getScheduleForPatient = (mrn) => {
    return schedules.find(s => s.patient_mrn === mrn);
  };

  // Statistics
  const stats = {
    total: patients.length,
    pending: patients.filter(p => p.status === 'pending').length,
    confirmed: patients.filter(p => p.status === 'confirmed').length,
    ready: patients.filter(p => {
      const checklist = p.prep_checklist || {};
      const completed = Object.values(checklist).filter(Boolean).length;
      return completed === 4;
    }).length
  };

  if (loading) {
    return (
      <div className="patient-status-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>Loading patient status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-status-container">
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={onBack}
                className="quick-action-btn"
                style={{ padding: '0.5rem 1rem' }}
              >
                <ArrowLeft size={20} />
                Back to Dashboard
              </button>
              <div style={{ height: '32px', width: '1px', background: '#d1d5db' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}>
                  <FileSpreadsheet size={24} style={{ color: 'white' }} />
                </div>
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                    Patient Pre-Op Status
                  </h1>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                    {stats.total} total • {stats.ready} ready • {stats.pending} pending
                  </p>
                </div>
              </div>
            </div>
            <button className="quick-action-btn primary">
              <Download size={16} />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="patient-list">
        {/* Filters */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
              <Search size={20} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6b7280'
              }} />
              <input
                type="text"
                placeholder="Search by name, ID, or diagnosis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  height: '48px',
                  paddingLeft: '44px',
                  paddingRight: searchTerm ? '44px' : '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit'
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#6b7280'
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={20} style={{ color: '#6b7280' }} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  height: '48px',
                  padding: '0 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  background: 'white'
                }}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="in-progress">In Progress</option>
                <option value="ready">Ready</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            borderRadius: '0.75rem',
            padding: '1rem',
            borderLeft: '4px solid #3b82f6',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              Total Patients
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827' }}>
              {stats.total}
            </div>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            borderRadius: '0.75rem',
            padding: '1rem',
            borderLeft: '4px solid #10b981',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              Ready for Surgery
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827' }}>
              {stats.ready}
            </div>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            borderRadius: '0.75rem',
            padding: '1rem',
            borderLeft: '4px solid #f59e0b',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              Pending
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827' }}>
              {stats.pending}
            </div>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            borderRadius: '0.75rem',
            padding: '1rem',
            borderLeft: '4px solid #8b5cf6',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              Confirmed
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827' }}>
              {stats.confirmed}
            </div>
          </div>
        </div>

        {/* Patient List */}
        {filteredPatients.length === 0 ? (
          <div className="empty-state">
            <FileSpreadsheet className="empty-state-icon" size={64} />
            <h2 className="empty-state-title">No patients found</h2>
            <p className="empty-state-description">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          filteredPatients.map(patient => (
            <PatientRow
              key={patient.mrn}
              patient={patient}
              schedule={getScheduleForPatient(patient.mrn)}
              onItemToggle={handleItemToggle}
              onAction={handleAction}
              onItemViewDetails={handleItemViewDetails}
            />
          ))
        )}
      </div>

      {/* Requirement Modal */}
      {selectedItem && (
        <RequirementModal
          item={selectedItem}
          patient={selectedPatient}
          onClose={() => {
            setSelectedItem(null);
            setSelectedPatient(null);
          }}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
};

export default PatientStatusList;
