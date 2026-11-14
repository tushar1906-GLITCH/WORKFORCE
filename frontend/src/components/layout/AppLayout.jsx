import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SidebarProvider, useSidebar } from '../../context/SidebarContext';
import Sidebar from './Sidebar';
import Header from './Header';
import FloatingAiChat from '../ai/FloatingAiChat';

const LayoutContent = () => {
  const { collapsed, mobileOpen, closeMobile } = useSidebar();

  return (
    <div className="app-container">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 35,
          }}
        />
      )}

      <Sidebar />

      <div
        className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}
        style={{
          marginLeft: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
          transition: 'margin-left var(--transition-normal)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-base)',
        }}
      >
        <Header />
        <main className="page-wrapper page-enter">
          <Outlet />
        </main>
      </div>

      <FloatingAiChat />
    </div>
  );
};

export const AppLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-base)',
          color: 'var(--text-secondary)',
          gap: '12px',
        }}
      >
        <div
          className="skeleton"
          style={{ width: '48px', height: '48px', borderRadius: '12px' }}
        />
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Initializing WorkForce Command...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
