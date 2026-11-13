import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { ShieldCheck, Plus, UserCheck, UserX, Mail, Lock, MapPin } from 'lucide-react';

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
      setUsers(u);
      setSites(s);
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
    try {
      await apiClient.patch(`/users/${targetUser.id}`, { isActive: !targetUser.isActive });
      showToast(`User ${targetUser.isActive ? 'deactivated' : 'activated'} successfully!`, 'success');
      fetchUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Account Administration</h1>
          <p className="page-description">
            Manage organization users, access roles, passwords and supervisor site assignments
          </p>
        </div>

        <button onClick={() => setModalOpen(true)} className="btn btn-primary">
          <Plus size={16} /> Create User Account
        </button>
      </div>

      <div className="table-container">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading users...
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email Address</th>
                <th>Role</th>
                <th>Assigned Work Sites</th>
                <th>Last Login</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600, color: '#FFF' }}>{u.fullName}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'ADMIN' ? 'badge-present' : 'badge-on-leave'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {u.role === 'ADMIN' ? (
                      <span style={{ fontSize: '0.78rem', color: 'var(--success)' }}>
                        Organization-Wide (All Sites)
                      </span>
                    ) : u.assignedSites?.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {u.assignedSites.map((s) => (
                          <span
                            key={s.id}
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 6px',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No sites assigned</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                  </td>
                  <td>
                    <StatusBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {u.id !== user?.id && (
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`btn btn-sm ${u.isActive ? 'btn-outline' : 'btn-secondary'}`}
                        style={{ color: u.isActive ? 'var(--danger)' : 'var(--success)' }}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create New User Account"
        maxWidth="500px"
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
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateUser}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
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
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-control"
              placeholder="supervisor@workforce.local"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Temporary Password (Defaults to Welcome@123456)</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Application Role *</label>
            <select
              className="form-control"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="SUPERVISOR">Supervisor (Scoped to Assigned Sites)</option>
              <option value="ADMIN">Administrator (Organization-Wide Access)</option>
            </select>
          </div>

          {form.role === 'SUPERVISOR' && (
            <div className="form-group">
              <label className="form-label">Assign Supervised Work Locations</label>
              <select
                multiple
                className="form-control"
                style={{ height: '100px' }}
                value={form.assignedSiteIds}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                  setForm({ ...form, assignedSiteIds: selected });
                }}
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Hold Ctrl / Cmd to select multiple sites
              </span>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default UsersPage;
