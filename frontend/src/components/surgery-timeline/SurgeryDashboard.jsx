import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, AlertCircle, Clock, CheckCircle, Download, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { PatientTimelineRow } from './PatientTimelineRow';
import { DateValidator } from './DateValidator';
import './surgery-timeline.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export const SurgeryDashboard = ({ onBack }) => {
  const [patients, setPatients] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDays, setFilterDays] = useState('all'); // 'all', '30', '60', '90'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'ready', 'pending', 'overdue'
  const [sortBy, setSortBy] = useState('surgery_date'); // 'surgery_date', 'days_until', 'progress'

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
      toast.error('Failed to load surgery timeline data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get schedule for patient
  const getScheduleForPatient = (mrn) => {
    return schedules.find(s => s.patient_mrn === mrn && !s.is_addon);
  };

  // Filter and sort patients
  const getFilteredPatients = () => {
    let filtered = patients.filter(patient => {
      const schedule = getScheduleForPatient(patient.mrn);
      if (!schedule?.scheduled_date) return false;

      const daysUntil = DateValidator.getDaysUntilSurgery(schedule.scheduled_date);
      if (daysUntil === null) return false;

      // Filter by days
      if (filterDays !== 'all') {
        const maxDays = parseInt(filterDays);
        if (daysUntil > maxDays) return false;
      }

      // Filter by status
      if (filterStatus !== 'all') {
        const checklist = patient.prep_checklist || {};
        const completed = Object.values(checklist).filter(Boolean).length;

        if (filterStatus === 'ready' && completed !== 4) return false;
        if (filterStatus === 'pending' && (completed === 0 || completed === 4)) return false;
        if (filterStatus === 'overdue' && daysUntil >= 0) return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      const schedA = getScheduleForPatient(a.mrn);
      const schedB = getScheduleForPatient(b.mrn);

      if (sortBy === 'surgery_date') {
        return new Date(schedA.scheduled_date) - new Date(schedB.scheduled_date);
      }

      if (sortBy === 'days_until') {
        const daysA = DateValidator.getDaysUntilSurgery(schedA.scheduled_date);
        const daysB = DateValidator.getDaysUntilSurgery(schedB.scheduled_date);
        return daysA - daysB;
      }

      if (sortBy === 'progress') {
        const progressA = Object.values(a.prep_checklist || {}).filter(Boolean).length;
        const progressB = Object.values(b.prep_checklist || {}).filter(Boolean).length;
        return progressB - progressA;
      }

      return 0;
    });

    return filtered;
  };

  const filteredPatients = getFilteredPatients();

  // Calculate statistics
  const stats = {
    upcoming30: patients.filter(p => {
      const schedule = getScheduleForPatient(p.mrn);
      if (!schedule?.scheduled_date) return false;
      const days = DateValidator.getDaysUntilSurgery(schedule.scheduled_date);
      return days !== null && days >= 0 && days <= 30;
    }).length,

    overdue: patients.filter(p => {
      const schedule = getScheduleForPatient(p.mrn);
      if (!schedule?.scheduled_date) return false;
      const hasOverdueItems = false; // Would check document ages
      return hasOverdueItems;
    }).length,

    pendingVSP: patients.filter(p => {
      return !p.vsp || !p.vsp.approved;
    }).length,

    ready: patients.filter(p => {
      const checklist = p.prep_checklist || {};
      return Object.values(checklist).filter(Boolean).length === 4;
    }).length
  };

  const handleExport = () => {
    toast.success('Export feature coming soon');
    // Would export to Excel/CSV
  };

  if (loading) {
    return (
      <div className="surgery-timeline-container">
        <div className="loading-overlay">
          <div style={{ textAlign: 'center' }}>
            <div className="loading-spinner" />
            <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '1rem' }}>
              Loading surgery timeline...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="surgery-timeline-container">
      {/* Header */}
      <div className="timeline-header">
        <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '1.5rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={onBack}
                className="action-button"
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
                  <Calendar size={24} style={{ color: 'white' }} />
                </div>
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                    Surgery Timeline Tracker
                  </h1>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                    {filteredPatients.length} scheduled surgeries
                  </p>
                </div>
              </div>
            </div>
            <button onClick={handleExport} className="action-button primary">
              <Download size={16} />
              Export to Excel
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="surgery-dashboard">
        {/* Summary Cards */}
        <div className="timeline-summary-cards">
          <div className="summary-card upcoming">
            <div className="summary-card-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
              <Calendar size={24} />
            </div>
            <div className="summary-card-value">{stats.upcoming30}</div>
            <div className="summary-card-label">Next 30 Days</div>
          </div>

          <div className="summary-card overdue">
            <div className="summary-card-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <AlertCircle size={24} />
            </div>
            <div className="summary-card-value">{stats.overdue}</div>
            <div className="summary-card-label">Overdue Items</div>
          </div>

          <div className="summary-card pending-vsp">
            <div className="summary-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <Clock size={24} />
            </div>
            <div className="summary-card-value">{stats.pendingVSP}</div>
            <div className="summary-card-label">Pending VSP</div>
          </div>

          <div className="summary-card ready">
            <div className="summary-card-icon" style={{ background: '#d1fae5', color: '#059669' }}>
              <CheckCircle size={24} />
            </div>
            <div className="summary-card-value">{stats.ready}</div>
            <div className="summary-card-label">Ready for Surgery</div>
          </div>
        </div>

        {/* Filters */}
        <div className="timeline-filters">
          <div className="filter-group">
            <Filter size={18} style={{ color: '#6b7280' }} />
            <span className="filter-label">Show:</span>
            <select
              value={filterDays}
              onChange={(e) => setFilterDays(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Surgeries</option>
              <option value="30">Next 30 Days</option>
              <option value="60">Next 60 Days</option>
              <option value="90">Next 90 Days</option>
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="ready">Ready</option>
              <option value="pending">In Progress</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="surgery_date">Surgery Date</option>
              <option value="days_until">Days Until Surgery</option>
              <option value="progress">Progress</option>
            </select>
          </div>
        </div>

        {/* Timeline Table */}
        <div className="timeline-table-container">
          {filteredPatients.length === 0 ? (
            <div className="empty-state">
              <Calendar className="empty-state-icon" size={80} />
              <h2 className="empty-state-title">No surgeries scheduled</h2>
              <p className="empty-state-description">
                No patients match your current filters
              </p>
            </div>
          ) : (
            <table className="timeline-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Patient</th>
                  <th>Staff/Ortho</th>
                  <th>Surgery Date</th>
                  <th>Prior Auth<br /><span style={{ fontSize: '0.65rem', fontWeight: 400, opacity: 0.7 }}>(&lt;2 months)</span></th>
                  <th>Surgical Records<br /><span style={{ fontSize: '0.65rem', fontWeight: 400, opacity: 0.7 }}>(2-3 months)</span></th>
                  <th>Bite Approval<br /><span style={{ fontSize: '0.65rem', fontWeight: 400, opacity: 0.7 }}>(&lt;4 months)</span></th>
                  <th>VSP</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map(patient => {
                  const schedule = getScheduleForPatient(patient.mrn);
                  return (
                    <PatientTimelineRow
                      key={patient.mrn}
                      patient={patient}
                      schedule={schedule}
                    />
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurgeryDashboard;
