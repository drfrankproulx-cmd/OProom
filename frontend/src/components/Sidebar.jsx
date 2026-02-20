import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  CheckSquare, 
  ClipboardList,
  Clock,
  Settings,
  Upload,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'patient-status', label: 'Pre-Op Status', icon: ClipboardList },
  { id: 'surgery-timeline', label: 'Surgery Timeline', icon: Clock },
];

const SECONDARY_ITEMS = [
  { id: 'bulk-import', label: 'Bulk Import', icon: Upload },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar = ({ currentView, onNavigate, user, onLogout, isOpen, onToggle }) => {
  const NavItem = ({ item, isActive }) => (
    <button
      onClick={() => onNavigate(item.id)}
      data-testid={`nav-${item.id}`}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-teal-50 text-teal-700 shadow-sm'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <item.icon className={`h-5 w-5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} strokeWidth={1.5} />
      <span>{item.label}</span>
    </button>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">OR</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">SurgiFlow</h1>
                <p className="text-[10px] text-slate-400 -mt-0.5">OR Scheduling</p>
              </div>
            </div>
            <button 
              onClick={onToggle}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Main
            </p>
            {NAV_ITEMS.map((item) => (
              <NavItem 
                key={item.id} 
                item={item} 
                isActive={currentView === item.id}
              />
            ))}

            <div className="pt-4">
              <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Management
              </p>
              {SECONDARY_ITEMS.map((item) => (
                <NavItem 
                  key={item.id} 
                  item={item} 
                  isActive={currentView === item.id}
                />
              ))}
            </div>
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {user?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {user?.email || ''}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
                title="Sign out"
                data-testid="logout-btn"
              >
                <LogOut className="h-4 w-4 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-30 p-2 rounded-xl bg-white shadow-md border border-slate-200 md:hidden"
        data-testid="mobile-menu-btn"
      >
        <Menu className="h-5 w-5 text-slate-600" />
      </button>
    </>
  );
};

export default Sidebar;
