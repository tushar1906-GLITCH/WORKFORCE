import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import {
  LayoutDashboard,
  Users,
  MapPin,
  Building2,
  Clock,
  CalendarCheck2,
  CalendarDays,
  Briefcase,
  Banknote,
  Receipt,
  FileBarChart2,
  History,
  ShieldCheck,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

export const Sidebar = () => {
  const { user, isAdmin, logout } = useAuth();
  const { collapsed, toggleCollapsed, mobileOpen, closeMobile } = useSidebar();

  const avatarInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'WF';

  const handleNavClick = () => {
    if (mobileOpen) closeMobile();
  };

  return (
    <aside
      className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}
      style={{
        width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        backgroundColor: 'var(--sidebar-bg, #0E1420)',
        borderRight: '1px solid var(--sidebar-border, rgba(255, 255, 255, 0.07))',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 'var(--z-sidebar, 40)',
        transition: 'width var(--transition-normal), transform var(--transition-normal)',
      }}
    >
      {/* Brand Header */}
      <div
        className="sidebar-header"
        style={{
          height: 'var(--header-height, 64px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0 12px' : '0 20px',
          borderBottom: '1px solid var(--border-subtle)',
          gap: '10px',
        }}
      >
        <div
          className="sidebar-brand"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '1.1rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#FFFFFF',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              flexShrink: 0,
            }}
          >
            <Briefcase size={18} />
          </div>
          {!collapsed && <span>WorkForce</span>}
        </div>
        {!collapsed && (
          <span
            className="sidebar-brand-badge"
            style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              padding: '2px 7px',
              backgroundColor: isAdmin ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              border: `1px solid ${isAdmin ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              color: isAdmin ? 'var(--primary)' : 'var(--success)',
              borderRadius: 'var(--radius-sm)',
              letterSpacing: '0.06em',
            }}
          >
            {isAdmin ? 'ADMIN' : 'SUPERVISOR'}
          </span>
        )}
      </div>

      {/* Navigation Links */}
      <nav
        className="sidebar-nav"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: collapsed ? '12px 8px' : '14px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {/* OVERVIEW */}
        {!collapsed && <div className="nav-section-title">Overview</div>}

        <NavLink
          to="/dashboard"
          onClick={handleNavClick}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={collapsed ? 'Dashboard' : undefined}
        >
          <LayoutDashboard size={18} />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        <NavLink
          to="/ai-assistant"
          onClick={handleNavClick}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={collapsed ? 'AI Assistant' : undefined}
        >
          <Sparkles size={18} color="var(--primary)" />
          {!collapsed && <span>AI Assistant</span>}
          {!collapsed && (
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(59, 130, 246, 0.18)',
                color: 'var(--primary)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              2.0
            </span>
          )}
        </NavLink>

        {/* WORKFORCE */}
        {!collapsed && <div className="nav-section-title">Workforce</div>}

        <NavLink
          to="/workers"
          onClick={handleNavClick}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={collapsed ? 'Workers Directory' : undefined}
        >
          <Users size={18} />
          {!collapsed && <span>Workers</span>}
        </NavLink>

        <NavLink
          to="/departments"
          onClick={handleNavClick}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={collapsed ? 'Departments & Skills' : undefined}
        >
          <Building2 size={18} />
          {!collapsed && <span>Departments & Skills</span>}
        </NavLink>

        <NavLink
          to="/sites"
          onClick={handleNavClick}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={collapsed ? 'Work Locations' : undefined}
        >
          <MapPin size={18} />
          {!collapsed && <span>Work Locations</span>}
        </NavLink>

        <NavLink
          to="/shifts"
          onClick={handleNavClick}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={collapsed ? 'Shifts' : undefined}
        >
          <Clock size={18} />
          {!collapsed && <span>Shifts</span>}
        </NavLink>

        <NavLink
          to="/assignments"
          onClick={handleNavClick}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={collapsed ? 'Assignments' : undefined}
        >
          <Briefcase size={18} />
          {!collapsed && <span>Assignments</span>}
        </NavLink>

        {/* OPERATIONS */}
        {!collapsed && <div className="nav-section-title">Operations</div>}

        <NavLink
          to="/attendance"
          onClick={handleNavClick}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={collapsed ? 'Daily Attendance' : undefined}
        >
          <CalendarCheck2 size={18} />
          {!collapsed && <span>Attendance</span>}
        </NavLink>

        <NavLink
          to="/leave"
          onClick={handleNavClick}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={collapsed ? 'Leave Requests' : undefined}
        >
          <CalendarDays size={18} />
          {!collapsed && <span>Leave Management</span>}
        </NavLink>

        {/* FINANCE (Admin Only) */}
        {isAdmin && (
          <>
            {!collapsed && <div className="nav-section-title">Finance</div>}

            <NavLink
              to="/payroll"
              onClick={handleNavClick}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? 'Payroll & Wages' : undefined}
            >
              <Banknote size={18} />
              {!collapsed && <span>Payroll</span>}
            </NavLink>

            <NavLink
              to="/payments"
              onClick={handleNavClick}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? 'Disbursements' : undefined}
            >
              <Receipt size={18} />
              {!collapsed && <span>Payments</span>}
            </NavLink>
          </>
        )}

        {/* INSIGHTS */}
        {!collapsed && <div className="nav-section-title">Insights</div>}

        <NavLink
          to="/reports"
          onClick={handleNavClick}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={collapsed ? 'Reports & Analytics' : undefined}
        >
          <FileBarChart2 size={18} />
          {!collapsed && <span>Reports</span>}
        </NavLink>

        {isAdmin && (
          <NavLink
            to="/activity-logs"
            onClick={handleNavClick}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={collapsed ? 'Activity Logs' : undefined}
          >
            <History size={18} />
            {!collapsed && <span>Activity Logs</span>}
          </NavLink>
        )}

        {/* ADMINISTRATION (Admin Only) */}
        {isAdmin && (
          <>
            {!collapsed && <div className="nav-section-title">Administration</div>}

            <NavLink
              to="/users"
              onClick={handleNavClick}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? 'User Management' : undefined}
            >
              <ShieldCheck size={18} />
              {!collapsed && <span>User Management</span>}
            </NavLink>

            <NavLink
              to="/settings"
              onClick={handleNavClick}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? 'Settings' : undefined}
            >
              <Settings size={18} />
              {!collapsed && <span>Settings</span>}
            </NavLink>
          </>
        )}
      </nav>

      {/* User Profile Footer */}
      <div
        className="user-profile-section"
        style={{
          padding: collapsed ? '12px 8px' : '12px 14px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          className="avatar-initials"
          title={user?.fullName || 'User'}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: isAdmin ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            color: isAdmin ? 'var(--primary)' : 'var(--success)',
            border: `1px solid ${isAdmin ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.78rem',
            flexShrink: 0,
          }}
        >
          {avatarInitials}
        </div>

        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.fullName || 'User'}
            </div>
            <div
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {user?.role || 'Staff'}
            </div>
          </div>
        )}

        {!collapsed && (
          <button
            onClick={logout}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px', color: 'var(--text-muted)' }}
            title="Sign out of WorkForce"
          >
            <LogOut size={14} />
          </button>
        )}
      </div>

      {/* Collapse Toggle Bar */}
      <button
        className="sidebar-toggle-btn"
        onClick={toggleCollapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          height: '36px',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: 'none',
          borderTop: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
        }}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
};

export default Sidebar;
