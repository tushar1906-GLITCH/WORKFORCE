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
  Briefcase,
  MapPin,
  Clock,
  ArrowRightLeft,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Sparkles,
  UserCheck,
  Calendar,
  X,
} from 'lucide-react';

export const AssignmentsPage = () => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useNotification();

  const [assignments, setAssignments] = useState([]);
  const [sites, setSites] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [activeAssignmentForTransfer, setActiveAssignmentForTransfer] = useState(null);

  // Form states
  const [newAssignment, setNewAssignment] = useState({
    workerId: '',
    workSiteId: '',
    shiftId: '',
    roleTitle: '',
    startDate: new Date().toISOString().split('T')[0],
  });

  const [transferData, setTransferData] = useState({
    targetWorkSiteId: '',
    targetShiftId: '',
    roleTitle: '',
    effectiveDate: new Date().toISOString().split('T')[0],
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [sitesData, shiftsData, workersData] = await Promise.all([
          apiClient.get('/sites', { params: { status: 'ACTIVE' } }),
          apiClient.get('/shifts'),
          apiClient.get('/workers', { params: { limit: 100 } }),
        ]);
        setSites(sitesData);
        setShifts(shiftsData);
        const activeWorkers = (workersData.items || []).filter((w) => w.status === 'ACTIVE');
        setWorkers(activeWorkers);

        if (sitesData.length > 0) {
          setNewAssignment((prev) => ({ ...prev, workSiteId: sitesData[0].id }));
          setTransferData((prev) => ({ ...prev, targetWorkSiteId: sitesData[0].id }));
        }
        if (shiftsData.length > 0) {
          setNewAssignment((prev) => ({ ...prev, shiftId: shiftsData[0].id }));
        }
        if (activeWorkers.length > 0) {
          setNewAssignment((prev) => ({ ...prev, workerId: activeWorkers[0].id }));
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
    loadDropdowns();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/assignments', {
        params: {
          workSiteId: selectedSiteId || undefined,
          status: selectedStatus || undefined,
        },
      });
      setAssignments(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [selectedSiteId, selectedStatus]);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/assignments', newAssignment);
      showToast('Worker assignment created successfully!', 'success');
      setAssignModalOpen(false);
      fetchAssignments();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferWorker = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post(
        `/assignments/${activeAssignmentForTransfer.id}/transfer`,
        transferData,
      );
      showToast('Worker transferred successfully to new location!', 'success');
      setTransferModalOpen(false);
      fetchAssignments();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = assignments.filter((a) => {
    const text = `${a.worker?.fullName} ${a.worker?.workerCode} ${a.workSite?.name}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Worker Assignments & Transfers"
        description="Allocate workforce personnel to project sites, shifts, and orchestrate location transfers"
        actions={
          <button
            onClick={() => setAssignModalOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ gap: '6px', height: '36px' }}
          >
            <Plus size={16} />
            <span>New Worker Assignment</span>
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          backgroundColor: 'var(--bg-surface, #111827)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '36px', height: '38px', fontSize: '0.84rem' }}
            placeholder="Search by worker name, code, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-control"
          style={{ width: '220px', height: '38px', fontSize: '0.84rem' }}
          value={selectedSiteId}
          onChange={(e) => setSelectedSiteId(e.target.value)}
        >
          <option value="">All Permitted Work Sites</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          className="form-control"
          style={{ width: '160px', height: '38px', fontSize: '0.84rem' }}
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="TRANSFERRED">Transferred</option>
          <option value="COMPLETED">Completed</option>
        </select>

        {(search || selectedSiteId || selectedStatus) && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedSiteId('');
              setSelectedStatus('');
            }}
            className="btn btn-outline btn-sm"
            style={{ height: '38px', padding: '0 12px', gap: '4px' }}
          >
            <X size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Assignments Table */}
      {loading ? (
        <TableSkeleton rows={7} cols={8} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No worker assignments found"
          description="Allocate personnel to active sites or adjust your filter query."
          action={
            <button
              onClick={() => setAssignModalOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{ gap: '6px' }}
            >
              <Plus size={14} />
              <span>Create Assignment</span>
            </button>
          }
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Personnel</th>
                <th>Worker Code</th>
                <th>Work Location</th>
                <th>Shift Schedule</th>
                <th>Designation / Role</th>
                <th>Tenure Period</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const initials = a.worker?.fullName
                  ? a.worker.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'W';

                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                          {a.worker?.fullName}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          color: 'var(--primary)',
                          backgroundColor: 'rgba(59, 130, 246, 0.08)',
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                        }}
                      >
                        {a.worker?.workerCode}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} color="var(--primary)" />
                        <span style={{ fontSize: '0.84rem' }}>{a.workSite?.name}</span>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {a.shift?.name || 'Standard Shift'}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {a.roleTitle || 'Labourer'}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        From {a.startDate} {a.endDate ? `to ${a.endDate}` : '(Current)'}
                      </div>
                    </td>

                    <td>
                      <StatusBadge status={a.status} />
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      {a.status === 'ACTIVE' && (
                        <button
                          onClick={() => {
                            setActiveAssignmentForTransfer(a);
                            setTransferData((prev) => ({
                              ...prev,
                              roleTitle: a.roleTitle || '',
                            }));
                            setTransferModalOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: '0.78rem', gap: '4px' }}
                          title="Transfer worker to another site"
                        >
                          <ArrowRightLeft size={13} />
                          <span>Transfer</span>
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

      {/* New Assignment Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Worker to Work Location"
        subtitle="Allocate workforce member to operational site and shift schedule"
        maxWidth="560px"
        footer={
          <>
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateAssignment}
              className="btn btn-primary"
              disabled={submitting || !newAssignment.workerId || !newAssignment.workSiteId}
            >
              {submitting ? 'Allocating...' : 'Create Assignment'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateAssignment}>
          {/* Smart Recommendation for Available Workers */}
          {(() => {
            const assignedIds = new Set(
              assignments.filter((a) => a.status === 'ACTIVE').map((a) => a.workerId),
            );
            const unassigned = workers.filter((w) => !assignedIds.has(w.id));
            const activeConflict = assignments.find(
              (a) => a.workerId === newAssignment.workerId && a.status === 'ACTIVE',
            );

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {unassigned.length > 0 && !newAssignment.workerId && (
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: 'var(--primary)',
                        marginBottom: '8px',
                      }}
                    >
                      <Sparkles size={14} />
                      <span>
                        Operational Insight: {unassigned.length} Available Unassigned Worker(s)
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {unassigned.slice(0, 5).map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setNewAssignment((prev) => ({ ...prev, workerId: w.id }))}
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '3px 8px',
                            color: 'var(--text-primary)',
                            fontSize: '0.74rem',
                            cursor: 'pointer',
                          }}
                        >
                          + {w.fullName} ({w.workerCode})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeConflict && (
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid var(--warning-border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.8rem',
                      color: 'var(--warning)',
                    }}
                  >
                    <AlertTriangle size={15} />
                    <span>
                      Worker already has an active assignment at <strong>{activeConflict.workSite?.name}</strong>. Creating a new assignment will transfer or complete their current assignment.
                    </span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Worker *</label>
                  <select
                    className="form-control"
                    value={newAssignment.workerId}
                    onChange={(e) =>
                      setNewAssignment({ ...newAssignment, workerId: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Worker</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.fullName} ({w.workerCode}) — {w.department?.name || 'General'}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Work Location *</label>
                    <select
                      className="form-control"
                      value={newAssignment.workSiteId}
                      onChange={(e) =>
                        setNewAssignment({ ...newAssignment, workSiteId: e.target.value })
                      }
                      required
                    >
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Shift Schedule</label>
                    <select
                      className="form-control"
                      value={newAssignment.shiftId}
                      onChange={(e) =>
                        setNewAssignment({ ...newAssignment, shiftId: e.target.value })
                      }
                    >
                      <option value="">Select Shift</option>
                      {shifts.map((sh) => (
                        <option key={sh.id} value={sh.id}>
                          {sh.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Role Title / Trade</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Senior Mason, Electrician"
                      value={newAssignment.roleTitle}
                      onChange={(e) =>
                        setNewAssignment({ ...newAssignment, roleTitle: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assignment Start Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={newAssignment.startDate}
                      onChange={(e) =>
                        setNewAssignment({ ...newAssignment, startDate: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </form>
      </Modal>

      {/* Transfer Worker Modal */}
      {activeAssignmentForTransfer && (
        <Modal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          title={`Transfer Worker: ${activeAssignmentForTransfer.worker?.fullName}`}
          subtitle={`Current site: ${activeAssignmentForTransfer.workSite?.name}`}
          maxWidth="500px"
          footer={
            <>
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTransferWorker}
                className="btn btn-primary"
                disabled={submitting || !transferData.targetWorkSiteId}
              >
                {submitting ? 'Transferring...' : 'Execute Transfer'}
              </button>
            </>
          }
        >
          <form onSubmit={handleTransferWorker}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Target Work Location *</label>
                <select
                  className="form-control"
                  value={transferData.targetWorkSiteId}
                  onChange={(e) =>
                    setTransferData({ ...transferData, targetWorkSiteId: e.target.value })
                  }
                  required
                >
                  {sites
                    .filter((s) => s.id !== activeAssignmentForTransfer.workSiteId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Target Shift Schedule</label>
                <select
                  className="form-control"
                  value={transferData.targetShiftId}
                  onChange={(e) =>
                    setTransferData({ ...transferData, targetShiftId: e.target.value })
                  }
                >
                  <option value="">Keep current shift or select new</option>
                  {shifts.map((sh) => (
                    <option key={sh.id} value={sh.id}>
                      {sh.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Effective Transfer Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={transferData.effectiveDate}
                  onChange={(e) =>
                    setTransferData({ ...transferData, effectiveDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role Designation at New Site</label>
                <input
                  type="text"
                  className="form-control"
                  value={transferData.roleTitle}
                  onChange={(e) =>
                    setTransferData({ ...transferData, roleTitle: e.target.value })
                  }
                  placeholder="e.g. Lead Fabricator"
                />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AssignmentsPage;
