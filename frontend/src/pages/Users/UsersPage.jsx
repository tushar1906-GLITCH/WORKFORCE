import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  ShieldCheck,
  Plus,
  UserCheck,
  UserX,
  Mail,
  Lock,
  MapPin,
  Users,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const UsersPage = () => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useNotification();

  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'SUPERVISOR',
    assignedSiteIds: [],
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [u, s] = await Promise.all([
        apiClient.get('/users'),
        apiClient.get('/sites'),
      ]);
      setUsers(u || []);
      setSites(s || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email) return;

    setSubmitting(true);
    try {
      await apiClient.post('/users', form);
      showToast('User account created successfully!', 'success');
      setModalOpen(false);
      setForm({ fullName: '', email: '', password: '', role: 'SUPERVISOR', assignedSiteIds: [] });
      fetchUsers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (targetUser) => {
    const newStatus = !targetUser.isActive;
    try {
      await apiClient.patch(`/users/${targetUser.id}/status`, { isActive: newStatus });
      showToast(
        `User ${targetUser.fullName} has been ${newStatus ? 'reactivated' : 'deactivated'} successfully!`,
        'success',
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, isActive: newStatus } : u)),
      );
      fetchUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const supervisorCount = users.filter((u) => u.role === 'SUPERVISOR').length;
  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div>
      <PageHeader
        title="User Administration"
        description="Provision administrative staff and supervisors, configure site access scopes, and manage active session credentials"
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            <span>Create User Account</span>
          </button>
        }
      />

      {/* Overview Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL ACCOUNTS</span>
            <Users size={16} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#FFF', marginTop: '4px' }}>
            {users.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {activeCount} active, {users.length - activeCount} suspended
          </div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>ADMINISTRATORS</span>
            <Shield size={16} style={{ color: 'var(--purple)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--purple)', marginTop: '4px' }}>
            {adminCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Full organization privileges
          </div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>SUPERVISORS</span>
            <UserCheck size={16} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>
            {supervisorCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Facility-scoped field operators
          </div>
        </div>
      </div>

      {/* Users Data Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No User Accounts"
          description="No users found in the system database."
          action={
            <button onClick={() => setModalOpen(true)} className="btn btn-primary btn-sm">
              <Plus size={14} /> Create First User
            </button>
          }
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Personnel User</th>
                <th>Email Address</th>
                <th>System Role</th>
                <th>Facility Access Boundary</th>
                <th>Last Active</th>
                <th>Account Status</th>
                <th style={{ textAlign: 'right' }}>Security Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const initials = (u.fullName || 'User')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                const isCurrentSelf = u.id === user?.id;

                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: 'var(--radius-full)',
                            background: u.role === 'ADMIN' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                            color: u.role === 'ADMIN' ? 'var(--purple)' : 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            border: `1px solid ${u.role === 'ADMIN' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: '#FFF' }}>{u.fullName}</span>
                          {isCurrentSelf && (
                            <span
                              style={{
                                marginLeft: '6px',
                                fontSize: '0.68rem',
                                color: 'var(--primary)',
                                background: 'rgba(59, 130, 246, 0.1)',
                                padding: '1px 5px',
                                borderRadius: 'var(--radius-sm)',
                              }}
                            >
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {u.email}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          letterSpacing: '0.04em',
                          background: u.role === 'ADMIN' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                          color: u.role === 'ADMIN' ? 'var(--purple)' : 'var(--primary)',
                          border: `1px solid ${u.role === 'ADMIN' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`,
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.role === 'ADMIN' ? (
                        <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={13} />
                          Organization-Wide (All Sites)
                        </span>
                      ) : u.assignedSites?.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {u.assignedSites.map((s) => (
                            <span
                              key={s.id}
                              style={{
                                fontSize: '0.72rem',
                                padding: '2px 7px',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={13} />
                          No sites assigned
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never logged in'}
                    </td>
                    <td>
                      <StatusBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {!isCurrentSelf && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`btn btn-sm ${u.isActive ? 'btn-outline' : 'btn-primary'}`}
                          style={{
                            fontSize: '0.76rem',
                            color: u.isActive ? 'var(--danger)' : undefined,
                            borderColor: u.isActive ? 'var(--danger-border)' : undefined,
                          }}
                        >
                          {u.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Provision New User Account"
        maxWidth="520px"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleCreateUser}
              className="btn btn-primary"
              disabled={submitting || !form.fullName || !form.email}
            >
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateUser}>
          <div className="form-group">
            <label className="form-label">Full Personnel Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Marcus Brody"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Corporate Email Address *</label>
            <input
              type="email"
              className="form-control"
              placeholder="operator@shramsetu.local"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Initial Password (Optional)</label>
            <input
              type="password"
              className="form-control"
              placeholder="Defaults to Welcome@123456"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Leave blank to use default policy: <code style={{ color: 'var(--primary)' }}>Welcome@123456</code>
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Access Role *</label>
            <select
              className="form-control"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="SUPERVISOR">Supervisor (Scoped to Assigned Work Sites)</option>
              <option value="ADMIN">Administrator (Full Organization Access)</option>
            </select>
          </div>

          {form.role === 'SUPERVISOR' && (
            <div className="form-group">
              <label className="form-label">Assign Supervised Facilities</label>
              <select
                multiple
                className="form-control"
                style={{ height: '110px' }}
                value={form.assignedSiteIds}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                  setForm({ ...form, assignedSiteIds: selected });
                }}
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.address})</option>
                ))}
              </select>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Hold Ctrl (Windows) or Cmd (Mac) to select multiple locations
              </span>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default UsersPage;
