import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  CheckSquare, 
  Settings
} from 'lucide-react';

const MOBILE_NAV_ITEMS = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const MobileNav = ({ currentView, onNavigate }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = currentView === item.id || 
            (item.id === 'settings' && ['settings', 'bulk-import', 'patient-status', 'surgery-timeline'].includes(currentView));
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              data-testid={`mobile-nav-${item.id}`}
              className={`flex flex-col items-center justify-center flex-1 h-full min-w-[64px] py-2 transition-colors ${
                isActive ? 'text-teal-600' : 'text-slate-400'
              }`}
            >
              <item.icon 
                className={`h-6 w-6 mb-1 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} 
                strokeWidth={isActive ? 2 : 1.5} 
              />
              <span className={`text-[10px] font-medium ${isActive ? 'text-teal-600' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
