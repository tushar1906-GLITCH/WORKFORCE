import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useSidebar } from '../../context/SidebarContext';
import { Bell, LogOut, Menu, CheckCircle2, Shield } from 'lucide-react';

const PAGE_METADATA = {
  '/dashboard': { title: 'Command Center', subtitle: 'Live Workforce Operations & Metrics' },
  '/ai-assistant': { title: 'ShramSetu AI Assistant', subtitle: 'Groq LLM with Live Database Tools' },
  '/workers': { title: 'Workers Directory', subtitle: 'Personnel Profiles, Rates & Status' },
  '/attendance': { title: 'Daily Attendance', subtitle: 'Shift-Scoped Tracking & Verification' },
  '/assignments': { title: 'Worker Assignments', subtitle: 'Site & Shift Workforce Allocations' },
  '/leave': { title: 'Leave Management', subtitle: 'Requests, Approvals & Leave Balances' },
  '/sites': { title: 'Work Locations', subtitle: 'Operational Facilities & Capacity' },
  '/departments': { title: 'Departments & Skills', subtitle: 'Organizational Units & Classifications' },
  '/shifts': { title: 'Shift Configuration', subtitle: 'Schedules, Working Hours & Grace Periods' },
  '/payroll': { title: 'Payroll Operations', subtitle: 'Wage Calculations & Approvals' },
  '/payments': { title: 'Disbursements', subtitle: 'Payment Verification & Audit Records' },
  '/reports': { title: 'Reports & Analytics', subtitle: 'Workforce Velocity & Financial Export' },
  '/activity-logs': { title: 'Audit Trail', subtitle: 'System-Wide Action & Security History' },
  '/users': { title: 'User Management', subtitle: 'Platform Accounts & Access Control' },
  '/settings': { title: 'System Configuration', subtitle: 'Workforce Rules & Operational Defaults' },
};

export const Header = () => {
  const { user, logout, isAdmin } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotification();
  const { toggleMobile } = useSidebar();
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);
  const location = useLocation();

  // Find page title (handling nested routes like /workers/:id or /payroll/:id)
  let currentMeta = PAGE_METADATA[location.pathname];
  if (!currentMeta) {
    if (location.pathname.startsWith('/workers/')) {
      currentMeta = { title: 'Worker Profile', subtitle: 'Detailed Personnel Records & History' };
    } else if (location.pathname.startsWith('/payroll/')) {
      currentMeta = { title: 'Payroll Run Details', subtitle: 'Worker-Level Line Items & Calculations' };
    } else {
      currentMeta = { title: 'ShramSetu Command', subtitle: 'Industrial Workforce Management' };
    }
  }

  // Click-outside listener for notifications dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    if (showNotifs) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifs]);

  const avatarInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'WF';

  return (
    <header
      className="topbar"
      style={{
        height: 'var(--header-height, 64px)',
        backgroundColor: 'rgba(11, 15, 23, 0.82)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-header, 30)',
      }}
    >
      {/* Left: Hamburger (Mobile) + Breadcrumb / Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={toggleMobile}
          className="btn btn-secondary btn-sm"
          style={{
            display: 'none',
            padding: '6px',
            borderRadius: 'var(--radius-md)',
          }}
          id="mobile-menu-toggle"
          title="Toggle Navigation Menu"
        >
          <Menu size={18} />
        </button>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              {currentMeta.title}
            </span>
          </div>
          <div
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              display: 'none',
            }}
            className="header-subtitle-desktop"
          >
            {currentMeta.subtitle}
          </div>
        </div>
      </div>

      {/* Right: Notification Center + User Pill + Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Notifications Popover */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="btn btn-secondary btn-sm"
            style={{
              position: 'relative',
              width: '36px',
              height: '36px',
              padding: 0,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: showNotifs ? 'rgba(59, 130, 246, 0.12)' : undefined,
              borderColor: showNotifs ? 'var(--primary)' : undefined,
            }}
            title="System Notifications"
            aria-label="System Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: 'var(--danger)',
                  color: '#FFFFFF',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  minWidth: '17px',
                  height: '17px',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div
              style={{
                position: 'absolute',
                top: '44px',
                right: 0,
                width: '340px',
                maxHeight: '440px',
                backgroundColor: 'var(--bg-modal, #131C2E)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 'var(--z-dropdown, 50)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'modalIn 0.12s ease-out',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Activity Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        color: 'var(--primary)',
                      }}
                    >
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.72rem', padding: '2px 8px', height: '24px' }}
                  >
                    Mark read
                  </button>
                )}
              </div>

              <div style={{ overflowY: 'auto', flex: 1, maxHeight: '340px' }}>
                {notifications.length === 0 ? (
                  <div
                    style={{
                      padding: '32px 16px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.82rem',
                    }}
                  >
                    <CheckCircle2
                      size={24}
                      color="var(--success)"
                      style={{ margin: '0 auto 8px', display: 'block', opacity: 0.6 }}
                    />
                    All caught up. No pending alerts.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && markAsRead(n.id)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: n.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                        cursor: n.isRead ? 'default' : 'pointer',
                        transition: 'background-color var(--transition-fast)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: n.isRead ? 'var(--text-primary)' : 'var(--primary)',
                          }}
                        >
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--primary)',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: '0.76rem',
                          color: 'var(--text-secondary)',
                          marginTop: '3px',
                          lineHeight: 1.4,
                        }}
                      >
                        {n.message}
                      </p>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          color: 'var(--text-muted)',
                          marginTop: '4px',
                          display: 'block',
                        }}
                      >
                        {new Date(n.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px 4px 6px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: isAdmin ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: isAdmin ? 'var(--primary)' : 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}
          >
            {avatarInitials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                lineHeight: 1.1,
              }}
            >
              {user?.fullName?.split(' ')[0] || 'User'}
            </span>
            <span
              style={{
                fontSize: '0.62rem',
                color: isAdmin ? 'var(--primary)' : 'var(--success)',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {user?.role}
            </span>
          </div>
        </div>

        {/* Quick Sign Out */}
        <button
          onClick={logout}
          className="btn btn-secondary btn-sm"
          style={{ gap: '6px', height: '34px' }}
          title="Sign out of ShramSetu"
        >
          <LogOut size={15} />
          <span style={{ fontSize: '0.78rem' }}>Exit</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
