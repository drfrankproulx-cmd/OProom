import React, { useState } from 'react';
import { Sidebar } from './Sidebar';

export const PageLayout = ({ 
  children, 
  currentView, 
  onNavigate, 
  user, 
  onLogout,
  title,
  subtitle,
  headerActions
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          onNavigate(view);
          setSidebarOpen(false);
        }}
        user={user}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:pl-64 h-full overflow-hidden">
        {/* Header */}
        {(title || headerActions) && (
          <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
            <div className="flex items-center gap-4 pl-12 md:pl-0">
              <div>
                {title && (
                  <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-sm text-slate-500">{subtitle}</p>
                )}
              </div>
            </div>
            {headerActions && (
              <div className="flex items-center gap-3">
                {headerActions}
              </div>
            )}
          </header>
        )}

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default PageLayout;
