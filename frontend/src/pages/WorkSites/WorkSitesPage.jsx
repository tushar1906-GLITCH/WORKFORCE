import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import {
  MapPin,
  Plus,
  Edit,
  Users,
  UserCheck,
  CheckCircle,
  XCircle,
  Trash2,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';

export const WorkSitesPage = () => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useNotification();

  const [sites, setSites] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeSiteForEdit, setActiveSiteForEdit] = useState(null);

  // Deactivate warning modal
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [siteToDeactivate, setSiteToDeactivate] = useState(null);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: '',
    status: 'ACTIVE',
    supervisorIds: [],
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchSites = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/sites', {
        params: { status: statusFilter || undefined },
      });
      setSites(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
    if (isAdmin) {
      apiClient
        .get('/users')
        .then((users) => {
          setSupervisors(users.filter((u) => u.role === 'SUPERVISOR'));
        })
        .catch(console.error);
    }
  }, [isAdmin, statusFilter]);

  const handleCreateSite = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/sites', formData);
      showToast('Work location created successfully!', 'success');
      setCreateModalOpen(false);
      setFormData({ name: '', address: '', description: '', status: 'ACTIVE', supervisorIds: [] });
      fetchSites();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSite = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.patch(`/sites/${activeSiteForEdit.id}`, formData);
      showToast('Work location updated successfully!', 'success');
      setEditModalOpen(false);
      fetchSites();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Bug Fix 3: Deactivate Location with Active Assignments Warning
  const confirmDeactivate = async () => {
    if (!siteToDeactivate) return;
    setSubmitting(true);
    try {
      const res = await apiClient.patch(`/sites/${siteToDeactivate.id}/deactivate`);
      if (res.warning) {
        showToast(res.warning, 'warning');
      } else {
        showToast(res.message, 'success');
      }
      setDeactivateModalOpen(false);
      fetchSites();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Bug Fix 3: Reactivate Location
  const handleReactivate = async (site) => {
    try {
      const res = await apiClient.patch(`/sites/${site.id}/reactivate`);
      showToast(res.message, 'success');
      fetchSites();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Bug Fix 3: Safe Delete Location
  const confirmDelete = async () => {
    if (!siteToDelete) return;
    setSubmitting(true);
    try {
      const res = await apiClient.delete(`/sites/${siteToDelete.id}`);
      showToast(res.message, 'success');
      setDeleteModalOpen(false);
      fetchSites();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Work Locations & Facilities</h1>
          <p className="page-description">
            Manage construction sites, manufacturing plants, warehouses and supervisor allocations
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: '150px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Locations</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          {isAdmin && (
            <button
              onClick={() => {
                setFormData({ name: '', address: '', description: '', status: 'ACTIVE', supervisorIds: [] });
                setCreateModalOpen(true);
              }}
              className="btn btn-primary"
            >
              <Plus size={16} /> Add Work Location
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            Loading work locations...
          </div>
        ) : sites.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No work locations found matching filter.
          </div>
        ) : (
          sites.map((s) => (
            <div
              key={s.id}
              className="card"
              style={{
                opacity: s.status === 'INACTIVE' ? 0.75 : 1,
                border: s.status === 'INACTIVE' ? '1px dashed var(--border-medium)' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      backgroundColor: s.status === 'ACTIVE' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(100, 116, 139, 0.15)',
                      color: s.status === 'ACTIVE' ? 'var(--primary)' : 'var(--text-muted)',
                    }}
                  >
                    <MapPin size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#FFF' }}>{s.name}</h3>
                    <StatusBadge status={s.status} />
                  </div>
                </div>

                {isAdmin && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => {
                        setActiveSiteForEdit(s);
                        setFormData({
                          name: s.name,
                          address: s.address,
                          description: s.description || '',
                          status: s.status,
                          supervisorIds: s.supervisorSites ? s.supervisorSites.map((ss) => ss.userId) : [],
                        });
                        setEditModalOpen(true);
                      }}
                      className="btn btn-secondary btn-sm"
                      title="Edit location details"
                    >
                      <Edit size={14} />
                    </button>

                    {/* Bug Fix 3: Reactivate / Deactivate buttons */}
                    {s.status === 'ACTIVE' ? (
                      <button
                        onClick={() => {
                          setSiteToDeactivate(s);
                          setDeactivateModalOpen(true);
                        }}
                        className="btn btn-outline btn-sm"
                        style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                        title="Deactivate location"
                      >
                        <XCircle size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(s)}
                        className="btn btn-outline btn-sm"
                        style={{ color: 'var(--success)', borderColor: 'var(--success-border)' }}
                        title="Reactivate location"
                      >
                        <CheckCircle size={14} />
                      </button>
                    )}

                    {/* Bug Fix 3: Delete option */}
                    <button
                      onClick={() => {
                        setSiteToDelete(s);
                        setDeleteModalOpen(true);
                      }}
                      className="btn btn-outline btn-sm"
                      style={{ color: 'var(--danger)' }}
                      title="Delete permanently (only if unreferenced)"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                {s.address}
              </p>

              {s.description && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  {s.description}
                </p>
              )}

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', marginTop: '14px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Assigned Site Supervisors:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {s.supervisorSites && s.supervisorSites.length > 0 ? (
                    s.supervisorSites.map((ss) => (
                      <span
                        key={ss.id}
                        style={{
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {ss.user?.fullName}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None assigned</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Location Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add New Work Location"
        maxWidth="520px"
        footer={
          <>
            <button onClick={() => setCreateModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleCreateSite}
              className="btn btn-primary"
              disabled={submitting || !formData.name || !formData.address}
            >
              {submitting ? 'Creating...' : 'Save Location'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateSite}>
          <div className="form-group">
            <label className="form-label">Location Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Apex Tower Construction"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Address *</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Physical street address..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description / Scope</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. High-rise commercial development"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Assign Supervisors</label>
            <select
              multiple
              className="form-control"
              style={{ minHeight: '100px' }}
              value={formData.supervisorIds}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                setFormData({ ...formData, supervisorIds: selected });
              }}
            >
              {supervisors.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.fullName} ({sup.email})
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Hold Ctrl (or Cmd) to select multiple supervisors
            </span>
          </div>
        </form>
      </Modal>

      {/* Edit Location Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Work Location"
        maxWidth="520px"
        footer={
          <>
            <button onClick={() => setEditModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleUpdateSite}
              className="btn btn-primary"
              disabled={submitting || !formData.name || !formData.address}
            >
              {submitting ? 'Updating...' : 'Update Location'}
            </button>
          </>
        }
      >
        <form onSubmit={handleUpdateSite}>
          <div className="form-group">
            <label className="form-label">Location Name *</label>
            <input
              type="text"
              className="form-control"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Address *</label>
            <textarea
              className="form-control"
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              type="text"
              className="form-control"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Assign Supervisors</label>
            <select
              multiple
              className="form-control"
              style={{ minHeight: '100px' }}
              value={formData.supervisorIds}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                setFormData({ ...formData, supervisorIds: selected });
              }}
            >
              {supervisors.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.fullName} ({sup.email})
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Deactivate Warning Modal */}
      {siteToDeactivate && (
        <Modal
          isOpen={deactivateModalOpen}
          onClose={() => setDeactivateModalOpen(false)}
          title="Deactivate Work Location"
          maxWidth="480px"
          footer={
            <>
              <button onClick={() => setDeactivateModalOpen(false)} className="btn btn-secondary" disabled={submitting}>
                Cancel
              </button>
              <button onClick={confirmDeactivate} className="btn btn-danger" disabled={submitting}>
                {submitting ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ color: 'var(--warning)', flexShrink: 0 }}>
              <AlertTriangle size={28} />
            </div>
            <div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Are you sure you want to deactivate <strong>{siteToDeactivate.name}</strong>?
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                • This location will immediately be hidden from worker registration, assignment dropdowns and attendance marking.
                <br />
                • Historical attendance, payroll and past assignments will be safely preserved.
                <br />
                • You can reactivate this location at any time.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {siteToDelete && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Work Location"
          maxWidth="480px"
          footer={
            <>
              <button onClick={() => setDeleteModalOpen(false)} className="btn btn-secondary" disabled={submitting}>
                Cancel
              </button>
              <button onClick={confirmDelete} className="btn btn-danger" disabled={submitting}>
                {submitting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ color: 'var(--danger)', flexShrink: 0 }}>
              <ShieldAlert size={28} />
            </div>
            <div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Attempting permanent deletion of <strong>{siteToDelete.name}</strong>.
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Permanent deletion is strictly restricted to locations with zero historical records. If any workers or attendance records were ever logged at this location, the system will block deletion and require deactivation instead.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default WorkSitesPage;
