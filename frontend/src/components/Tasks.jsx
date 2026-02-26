import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { format, parseISO, isPast, isToday, differenceInDays } from 'date-fns';
import {
  Search,
  Filter,
  X,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Calendar as CalendarIcon,
  User,
  ListTodo,
  Edit2,
  Trash2
} from 'lucide-react';
import PageLayout from './PageLayout';
import PullToRefresh from './PullToRefresh';
import { TaskCategoryBadge } from './TaskCategorySelect';
import { getCategoryByTaskType } from '../data/taskCategories';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export const Tasks = ({ onNavigate, initialFilter, user, onLogout }) => {
  const [tasks, setTasks] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'due_date', direction: 'asc' });
  const [filterStatus, setFilterStatus] = useState(initialFilter?.type === 'urgent' ? 'active' : 'all');
  const [filterUrgency, setFilterUrgency] = useState(initialFilter?.type === 'urgent' ? 'urgent_due' : 'all');
  const [showFilterBanner, setShowFilterBanner] = useState(!!initialFilter);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const fetchData = async () => {
    try {
      const [tasksRes, patientsRes] = await Promise.all([
        fetch(`${API_URL}/api/tasks`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/patients`, { headers: getAuthHeaders() }),
      ]);

      const [tasksData, patientsData] = await Promise.all([
        tasksRes.json(),
        patientsRes.json(),
      ]);

      if (tasksRes.ok) setTasks(tasksData);
      if (patientsRes.ok) setPatients(patientsData);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await fetchData();
    toast.success('Tasks refreshed', { duration: 1500 });
  }, []);

  // Get task status
  const getTaskStatus = (task) => {
    if (task.completed) return 'completed';
    if (!task.due_date) return 'pending';

    const dueDate = parseISO(task.due_date);
    if (isPast(dueDate) && !isToday(dueDate)) return 'overdue';
    if (isToday(dueDate)) return 'due-today';

    const daysUntilDue = differenceInDays(dueDate, new Date());
    if (daysUntilDue <= 3) return 'urgent';

    return 'pending';
  };

  // Get status icon and color
  const getStatusInfo = (status) => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bg: 'bg-green-100',
          label: 'Completed'
        };
      case 'overdue':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bg: 'bg-red-100',
          label: 'Overdue'
        };
      case 'due-today':
        return {
          icon: AlertTriangle,
          color: 'text-orange-600',
          bg: 'bg-orange-100',
          label: 'Due Today'
        };
      case 'urgent':
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          label: 'Urgent'
        };
      default:
        return {
          icon: Clock,
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          label: 'Pending'
        };
    }
  };

  // Get urgency badge
  const getUrgencyBadge = (urgency) => {
    const urgencyColors = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700'
    };
    return urgencyColors[urgency] || urgencyColors.medium;
  };

  // Toggle task completion
  const handleToggleComplete = async (taskId, currentStatus) => {
    if (!taskId) {
      toast.error('Invalid task: missing ID');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}/toggle`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task._id === taskId ? { ...task, completed: data.completed } : task
          )
        );
        toast.success(data.completed ? 'Task completed!' : 'Task marked as incomplete');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to update task');
      }
    } catch (error) {
      toast.error('Failed to update task');
      console.error('Task update error:', error);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setTasks(prevTasks => prevTasks.filter(task => task._id !== taskId));
        toast.success('Task deleted');
      } else {
        toast.error('Failed to delete task');
      }
    } catch (error) {
      toast.error('Failed to delete task');
      console.error('Task delete error:', error);
    }
  };

  // Sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and search
  const filteredTasks = tasks.filter(task => {
    const status = getTaskStatus(task);
    const matchesSearch =
      task.task_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assigned_to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.patient_mrn && task.patient_mrn.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && !task.completed) ||
      (filterStatus === 'completed' && task.completed) ||
      (filterStatus === 'overdue' && status === 'overdue') ||
      (filterStatus === 'urgent' && (status === 'urgent' || status === 'due-today'));

    // Handle special urgent_due filter for tasks due within 3 days
    const matchesUrgency = filterUrgency === 'all' || 
      task.urgency === filterUrgency ||
      (filterUrgency === 'urgent_due' && !task.completed && task.due_date && (() => {
        const days = Math.ceil((new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 3;
      })());

    return matchesSearch && matchesStatus && matchesUrgency;
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Handle special case for status
    if (sortConfig.key === 'status') {
      aValue = getTaskStatus(a);
      bValue = getTaskStatus(b);
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
      'Task Description',
      'Assigned To',
      'Due Date',
      'Status',
      'Urgency',
      'Patient ID',
      'Created By',
      'Completed'
    ];

    const rows = sortedTasks.map(task => {
      const status = getTaskStatus(task);
      return [
        task.task_description,
        task.assigned_to,
        task.due_date ? format(parseISO(task.due_date), 'MM/dd/yyyy') : '',
        getStatusInfo(status).label,
        task.urgency,
        task.patient_mrn || '',
        task.created_by || '',
        task.completed ? 'Yes' : 'No'
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
    a.download = `tasks_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Tasks exported to CSV');
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
        currentView="tasks"
        onNavigate={onNavigate}
        user={user}
        onLogout={onLogout}
        title="All Tasks"
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading tasks...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    active: tasks.filter(t => !t.completed).length,
    overdue: tasks.filter(t => getTaskStatus(t) === 'overdue').length,
    dueToday: tasks.filter(t => getTaskStatus(t) === 'due-today').length,
    urgent: tasks.filter(t => getTaskStatus(t) === 'urgent').length
  };

  return (
    <PageLayout
      currentView="tasks"
      onNavigate={onNavigate}
      user={user}
      onLogout={onLogout}
      title="All Tasks"
      subtitle={`${stats.active} active • ${stats.completed} completed`}
    >
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Filters and Search */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-slate-400" />
                <Input
                  placeholder="Search tasks..."
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

              {/* Filters row */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Status Filter */}
              <div className="flex items-center space-x-2 flex-1 md:flex-none">
                <Filter className="h-4 w-4 md:h-5 md:w-5 text-gray-500 hidden md:block" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="flex-1 md:flex-none h-11 md:h-10 px-3 md:px-4 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Tasks</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Urgency Filter */}
              <select
                value={filterUrgency}
                onChange={(e) => { setFilterUrgency(e.target.value); setShowFilterBanner(false); }}
                className="flex-1 md:flex-none h-11 md:h-10 px-3 md:px-4 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Urgency</option>
                <option value="urgent_due">Due Soon</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Banner */}
        {showFilterBanner && initialFilter?.type === 'urgent' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-800 font-medium text-sm">Tasks due within 3 days</span>
            </div>
            <button 
              onClick={() => { setFilterStatus('all'); setFilterUrgency('all'); setShowFilterBanner(false); }}
              className="text-green-600 hover:text-green-800 text-xs font-medium flex items-center"
            >
              Clear <X className="h-3 w-3 ml-1" />
            </button>
          </div>
        )}

        {/* Quick Stats - 3x2 grid on mobile, 6-col on desktop */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-sm md:shadow-lg p-2.5 md:p-4 border-l-4 border-blue-500">
            <div className="text-[10px] md:text-xs text-gray-600 mb-0.5 md:mb-1">Total</div>
            <div className="text-lg md:text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-sm md:shadow-lg p-2.5 md:p-4 border-l-4 border-green-500">
            <div className="text-[10px] md:text-xs text-gray-600 mb-0.5 md:mb-1">Done</div>
            <div className="text-lg md:text-2xl font-bold text-gray-900">{stats.completed}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-sm md:shadow-lg p-2.5 md:p-4 border-l-4 border-purple-500">
            <div className="text-[10px] md:text-xs text-gray-600 mb-0.5 md:mb-1">Active</div>
            <div className="text-lg md:text-2xl font-bold text-gray-900">{stats.active}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-sm md:shadow-lg p-2.5 md:p-4 border-l-4 border-red-500">
            <div className="text-[10px] md:text-xs text-gray-600 mb-0.5 md:mb-1">Overdue</div>
            <div className="text-lg md:text-2xl font-bold text-gray-900">{stats.overdue}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-sm md:shadow-lg p-2.5 md:p-4 border-l-4 border-orange-500">
            <div className="text-[10px] md:text-xs text-gray-600 mb-0.5 md:mb-1">Today</div>
            <div className="text-lg md:text-2xl font-bold text-gray-900">{stats.dueToday}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-sm md:shadow-lg p-2.5 md:p-4 border-l-4 border-yellow-500">
            <div className="text-[10px] md:text-xs text-gray-600 mb-0.5 md:mb-1">Urgent</div>
            <div className="text-lg md:text-2xl font-bold text-gray-900">{stats.urgent}</div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {sortedTasks.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <ListTodo className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">No tasks found</p>
              <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
            </div>
          ) : (
            sortedTasks.map((task) => {
              const status = getTaskStatus(task);
              const statusInfo = getStatusInfo(status);
              const StatusIcon = statusInfo.icon;

              return (
                <div 
                  key={task._id} 
                  className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 ${task.completed ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => handleToggleComplete(task._id, task.completed)}
                        className="h-5 w-5 mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-medium text-gray-900 ${task.completed ? 'line-through' : ''}`}>
                          {task.task_description}
                        </div>
                        {task.created_by && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            by {task.created_by}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTask(task._id)}
                      className="hover:bg-red-50 hover:text-red-600 h-8 w-8 p-0 flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${statusInfo.bg} ${statusInfo.color} px-2 py-0.5 text-[10px] font-medium rounded-full flex items-center space-x-1`}>
                      <StatusIcon className="h-3 w-3" />
                      <span>{statusInfo.label}</span>
                    </Badge>
                    <Badge className={`${getUrgencyBadge(task.urgency)} px-2 py-0.5 text-[10px] font-medium rounded-full capitalize`}>
                      {task.urgency}
                    </Badge>
                    {task.due_date && (
                      <span className="text-xs text-gray-500">
                        Due: {format(parseISO(task.due_date), 'MMM dd')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-center text-gray-600">
                      <div className="w-5 h-5 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-[9px] mr-1.5">
                        {task.assigned_to.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="truncate max-w-[100px]">{task.assigned_to}</span>
                    </div>
                    {task.patient_mrn && (
                      <span className="text-gray-500">Patient: {task.patient_mrn}</span>
                    )}
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
                  <th className="w-[5%] px-4 py-4 text-left">
                    <div className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 text-gray-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('task_description')}
                    className="w-[28%] px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <ListTodo className="h-4 w-4" />
                      <span>Task</span>
                      <SortIcon columnKey="task_description" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('assigned_to')}
                    className="w-[15%] px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>Assigned To</span>
                      <SortIcon columnKey="assigned_to" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('due_date')}
                    className="w-[13%] px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Due Date</span>
                      <SortIcon columnKey="due_date" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="w-[12%] px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      <SortIcon columnKey="status" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('urgency')}
                    className="w-[10%] px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Urgency</span>
                      <SortIcon columnKey="urgency" />
                    </div>
                  </th>
                  <th className="w-[11%] px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="w-[6%] px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTasks.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      <ListTodo className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg font-medium">No tasks found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </td>
                  </tr>
                ) : (
                  sortedTasks.map((task) => {
                    const status = getTaskStatus(task);
                    const statusInfo = getStatusInfo(status);
                    const StatusIcon = statusInfo.icon;

                    return (
                      <tr
                        key={task._id}
                        className={`hover:bg-gray-50 transition-colors ${
                          task.completed ? 'opacity-60' : ''
                        }`}
                      >
                        <td className="px-4 py-4">
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={() => handleToggleComplete(task._id, task.completed)}
                            className="h-5 w-5"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className={`text-sm font-medium text-gray-900 truncate ${
                            task.completed ? 'line-through' : ''
                          }`}>
                            {task.task_description}
                          </div>
                          {task.created_by && (
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              Created by {task.created_by}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-7 h-7 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                              {task.assigned_to.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="ml-2 min-w-0">
                              <div className="text-sm text-gray-900 truncate">{task.assigned_to}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {task.due_date ? (
                            <div>
                              <div className="text-sm text-gray-900">
                                {format(parseISO(task.due_date), 'MMM dd')}
                              </div>
                              {status === 'overdue' && (
                                <div className="text-xs text-red-600 font-medium">
                                  {Math.abs(differenceInDays(parseISO(task.due_date), new Date()))}d overdue
                                </div>
                              )}
                              {status === 'urgent' && (
                                <div className="text-xs text-yellow-600 font-medium">
                                  {differenceInDays(parseISO(task.due_date), new Date())}d left
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge className={`${statusInfo.bg} ${statusInfo.color} px-2 py-1 text-xs font-medium rounded-full flex items-center space-x-1 w-fit`}>
                            <StatusIcon className="h-3 w-3" />
                            <span>{statusInfo.label}</span>
                          </Badge>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge className={`${getUrgencyBadge(task.urgency)} px-2 py-1 text-xs font-medium rounded-full capitalize`}>
                            {task.urgency}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {task.patient_mrn ? (
                            <div className="text-sm text-gray-900 font-medium truncate">
                              {task.patient_mrn}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="hover:bg-blue-50 hover:text-blue-600 rounded-lg"
                              title="Edit task"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(task._id)}
                              className="hover:bg-red-50 hover:text-red-600 rounded-lg"
                              title="Delete task"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
      </div>
      </PullToRefresh>
    </PageLayout>
  );
};

export default Tasks;
