import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
} from 'lucide-react';

export const Sidebar = () => {
  const { user, isAdmin } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <Briefcase size={22} color="var(--primary)" />
          <span>WorkForce</span>
        </div>
        <span className="sidebar-brand-badge">
          {isAdmin ? 'ADMIN' : 'SUPERVISOR'}
        </span>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard />
          <span>Dashboard</span>
        </NavLink>

        <div className="nav-section-title">Workforce Operations</div>

        <NavLink
          to="/workers"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Users />
          <span>Workers</span>
        </NavLink>

        <NavLink
          to="/attendance"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <CalendarCheck2 />
          <span>Attendance</span>
        </NavLink>

        <NavLink
          to="/assignments"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Briefcase />
          <span>Assignments</span>
        </NavLink>

        <NavLink
          to="/leave"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <CalendarDays />
          <span>Leave Requests</span>
        </NavLink>

        <div className="nav-section-title">Organization Structure</div>

        <NavLink
          to="/sites"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <MapPin />
          <span>Work Locations</span>
        </NavLink>

        <NavLink
          to="/departments"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Building2 />
          <span>Departments & Skills</span>
        </NavLink>

        <NavLink
          to="/shifts"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Clock />
          <span>Shifts</span>
        </NavLink>

        {isAdmin && (
          <>
            <div className="nav-section-title">Payroll & Finance</div>

            <NavLink
              to="/payroll"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Banknote />
              <span>Payroll & Wages</span>
            </NavLink>

            <NavLink
              to="/payments"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Receipt />
              <span>Disbursements</span>
            </NavLink>
          </>
        )}

        <div className="nav-section-title">Analytics & Audit</div>

        <NavLink
          to="/reports"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <FileBarChart2 />
          <span>Reports & Exports</span>
        </NavLink>

        {isAdmin && (
          <>
            <NavLink
              to="/activity-logs"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <History />
              <span>Activity Logs</span>
            </NavLink>

            <NavLink
              to="/users"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <ShieldCheck />
              <span>User Management</span>
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Settings />
              <span>Settings</span>
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
