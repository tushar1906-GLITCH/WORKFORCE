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
  Building,
  X,
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

  const handleDeactivateSite = async () => {
    if (!siteToDeactivate) return;
    setSubmitting(true);
    try {
      await apiClient.patch(`/sites/${siteToDeactivate.id}`, { status: 'INACTIVE' });
      showToast(`Location ${siteToDeactivate.name} deactivated.`, 'success');
      setDeactivateModalOpen(false);
      fetchSites();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSite = async () => {
    if (!siteToDelete) return;
    setSubmitting(true);
    try {
      await apiClient.delete(`/sites/${siteToDelete.id}`);
      showToast('Work location removed.', 'success');
      setDeleteModalOpen(false);
      fetchSites();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (site) => {
    setActiveSiteForEdit(site);
    setFormData({
      name: site.name,
      address: site.address,
      description: site.description || '',
      status: site.status,
      supervisorIds: site.supervisors ? site.supervisors.map((s) => s.id) : [],
    });
    setEditModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Work Locations & Facilities"
        description="Operational site registry with supervisor mapping and access boundaries"
        actions={
          isAdmin && (
            <button
              onClick={() => {
                setFormData({
                  name: '',
                  address: '',
                  description: '',
                  status: 'ACTIVE',
                  supervisorIds: [],
                });
                setCreateModalOpen(true);
              }}
              className="btn btn-primary btn-sm"
              style={{ gap: '6px', height: '36px' }}
            >
              <Plus size={16} />
              <span>New Work Location</span>
            </button>
          )
        }
      />

      {/* Filter and Status Bar */}
      <div
        className="card"
        style={{
          padding: '14px 20px',
          backgroundColor: 'var(--bg-surface, #111827)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setStatusFilter('')}
            className={`btn btn-sm ${statusFilter === '' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
          >
            All Locations ({sites.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`btn btn-sm ${statusFilter === 'ACTIVE' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
          >
            Active Only
          </button>
          <button
            onClick={() => setStatusFilter('INACTIVE')}
            className={`btn btn-sm ${statusFilter === 'INACTIVE' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
          >
            Inactive Only
          </button>
        </div>

        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Operational scoping enforces site-level data isolation for supervisors
        </span>
      </div>

      {/* Locations Grid */}
      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : sites.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No work locations found"
          description="Create your organization's first operational facility or construction site."
          action={
            isAdmin && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="btn btn-secondary btn-sm"
                style={{ gap: '6px' }}
              >
                <Plus size={14} />
                <span>Create Location</span>
              </button>
            )
          }
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '16px',
          }}
        >
          {sites.map((site) => (
            <div
              key={site.id}
              className="card"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all var(--transition-normal)',
                border: site.status === 'INACTIVE' ? '1px dashed var(--border-medium)' : undefined,
                opacity: site.status === 'INACTIVE' ? 0.75 : 1,
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <MapPin size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {site.name}
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Site ID: {site.id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={site.status} />
                </div>

                <p
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '12px',
                    lineHeight: 1.4,
                  }}
                >
                  {site.address}
                </p>

                {site.description && (
                  <p
                    style={{
                      fontSize: '0.76rem',
                      color: 'var(--text-muted)',
                      marginBottom: '14px',
                      lineHeight: 1.4,
                    }}
                  >
                    {site.description}
                  </p>
                )}

                {/* Supervisor badges */}
                <div
                  style={{
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-subtle)',
                    marginBottom: '14px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    Assigned Supervisors:
                  </span>
                  {site.supervisors && site.supervisors.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {site.supervisors.map((sup) => (
                        <span
                          key={sup.id}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            color: 'var(--success)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                          }}
                        >
                          {sup.fullName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      No supervisors assigned
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {isAdmin && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <button
                    onClick={() => openEditModal(site)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 10px', fontSize: '0.76rem', gap: '4px' }}
                  >
                    <Edit size={13} />
                    <span>Edit</span>
                  </button>

                  {site.status === 'ACTIVE' ? (
                    <button
                      onClick={() => {
                        setSiteToDeactivate(site);
                        setDeactivateModalOpen(true);
                      }}
                      className="btn btn-outline btn-sm"
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.76rem',
                        color: 'var(--warning)',
                        borderColor: 'rgba(245, 158, 11, 0.3)',
                      }}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSiteToDelete(site);
                        setDeleteModalOpen(true);
                      }}
                      className="btn btn-outline btn-sm"
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.76rem',
                        color: 'var(--danger)',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Site Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add New Work Location"
        subtitle="Establish an operational site facility with assigned site managers"
        maxWidth="540px"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateSite}
              className="btn btn-primary"
              disabled={submitting || !formData.name || !formData.address}
            >
              {submitting ? 'Creating...' : 'Create Location'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateSite}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Site Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. North District Plant Block 4"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Physical Address / Geo Reference *</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Full operational facility address or plot coordinates..."
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Facility Description</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Heavy manufacturing & fabrication facility"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Assign Supervisors (Multi-Select)</label>
              <select
                multiple
                className="form-control"
                style={{ height: '90px' }}
                value={formData.supervisorIds}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions, (o) => o.value);
                  setFormData({ ...formData, supervisorIds: opts });
                }}
              >
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.email})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Hold Ctrl (Windows) / Cmd (Mac) to select multiple supervisors.
              </span>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Site Modal */}
      {activeSiteForEdit && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Edit Location: ${activeSiteForEdit.name}`}
          maxWidth="540px"
          footer={
            <>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateSite}
                className="btn btn-primary"
                disabled={submitting || !formData.name || !formData.address}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          }
        >
          <form onSubmit={handleUpdateSite}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Site Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Physical Address *</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Operational Status</label>
                <select
                  className="form-control"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Facility Description</label>
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
                  style={{ height: '90px' }}
                  value={formData.supervisorIds}
                  onChange={(e) => {
                    const opts = Array.from(e.target.selectedOptions, (o) => o.value);
                    setFormData({ ...formData, supervisorIds: opts });
                  }}
                >
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Deactivate Warning Modal */}
      {siteToDeactivate && (
        <Modal
          isOpen={deactivateModalOpen}
          onClose={() => setDeactivateModalOpen(false)}
          title="Deactivate Work Location"
          maxWidth="460px"
          footer={
            <>
              <button
                type="button"
                onClick={() => setDeactivateModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivateSite}
                className="btn btn-danger"
                disabled={submitting}
              >
                {submitting ? 'Deactivating...' : 'Deactivate Location'}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ color: 'var(--warning)', flexShrink: 0 }}>
              <AlertTriangle size={26} />
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Deactivating <strong>{siteToDeactivate.name}</strong> will prevent new worker allocations to this site. Historical attendance, payroll and assignment records will remain intact.
            </p>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {siteToDelete && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Remove Work Location"
          maxWidth="460px"
          footer={
            <>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSite}
                className="btn btn-danger"
                disabled={submitting}
              >
                {submitting ? 'Removing...' : 'Delete Location'}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ color: 'var(--danger)', flexShrink: 0 }}>
              <ShieldAlert size={26} />
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete <strong>{siteToDelete.name}</strong>? Sites with linked historical attendance or payroll records cannot be deleted.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default WorkSitesPage;
