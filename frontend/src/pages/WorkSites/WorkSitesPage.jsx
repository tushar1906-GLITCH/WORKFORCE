import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { MapPin, Plus, Edit, Users, UserCheck } from 'lucide-react';

export const WorkSitesPage = () => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useNotification();

  const [sites, setSites] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeSiteForEdit, setActiveSiteForEdit] = useState(null);

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
      const data = await apiClient.get('/sites');
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
      apiClient.get('/users').then((users) => {
        setSupervisors(users.filter((u) => u.role === 'SUPERVISOR'));
      }).catch(console.error);
    }
  }, [isAdmin]);

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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Work Locations & Facilities</h1>
          <p className="page-description">
            Manage construction sites, manufacturing plants, warehouses and supervisor allocations
          </p>
        </div>

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {sites.map((s) => (
          <div key={s.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                  <MapPin size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#FFF' }}>{s.name}</h3>
                  <StatusBadge status={s.status} />
                </div>
              </div>

              {isAdmin && (
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
                >
                  <Edit size={14} /> Edit
                </button>
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
        ))}
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
              style={{ height: '100px' }}
              value={formData.supervisorIds}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                setFormData({ ...formData, supervisorIds: selected });
              }}
            >
              {supervisors.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.fullName} ({sp.email})
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Hold Ctrl / Cmd to select multiple supervisors
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
              disabled={submitting}
            >
              {submitting ? 'Updating...' : 'Save Changes'}
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
            <label className="form-label">Status</label>
            <select
              className="form-control"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Assign Supervisors</label>
            <select
              multiple
              className="form-control"
              style={{ height: '100px' }}
              value={formData.supervisorIds}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                setFormData({ ...formData, supervisorIds: selected });
              }}
            >
              {supervisors.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.fullName} ({sp.email})
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WorkSitesPage;
