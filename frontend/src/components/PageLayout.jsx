import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
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
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <main className={`flex-1 flex flex-col ${sidebarCollapsed ? 'md:pl-[68px]' : 'md:pl-64'} h-full overflow-hidden transition-all duration-300`}>
        {/* Header */}
        {(title || headerActions) && (
          <header
            className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <div className="flex items-center gap-3 pl-10 md:pl-0 h-14 md:h-16">
              <div>
                {title && (
                  <h1 className="text-lg md:text-xl font-semibold text-slate-900 tracking-tight">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-xs md:text-sm text-slate-500 hidden md:block">{subtitle}</p>
                )}
              </div>
            </div>
            {headerActions && (
              <div className="flex items-center gap-2 md:gap-3 h-14 md:h-16">
                {headerActions}
              </div>
            )}
          </header>
        )}

        {/* Page Content - Bottom padding clears mobile tab bar + iPhone home indicator */}
        <div
          className="flex-1 overflow-y-auto md:pb-0"
          style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
        >
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav 
        currentView={currentView}
        onNavigate={(view) => {
          onNavigate(view);
          setSidebarOpen(false);
        }}
      />
    </div>
  );
};

export default PageLayout;
