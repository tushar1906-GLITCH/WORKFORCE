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
  CalendarDays,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
  MapPin,
  X,
} from 'lucide-react';

export const LeavePage = () => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useNotification();

  const [leaves, setLeaves] = useState([]);
  const [sites, setSites] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeLeaveForReview, setActiveLeaveForReview] = useState(null);

  // Form states
  const [newLeave, setNewLeave] = useState({
    workerId: '',
    workSiteId: '',
    leaveType: 'CASUAL',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
  });

  const [reviewData, setReviewData] = useState({
    status: 'APPROVED',
    reviewRemarks: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [sitesData, workersData] = await Promise.all([
          apiClient.get('/sites'),
          apiClient.get('/workers', { params: { limit: 100 } }),
        ]);
        setSites(sitesData);
        setWorkers(workersData.items || []);
        if (sitesData.length > 0) {
          setNewLeave((prev) => ({ ...prev, workSiteId: sitesData[0].id }));
        }
        if (workersData.items?.length > 0) {
          setNewLeave((prev) => ({ ...prev, workerId: workersData.items[0].id }));
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
    loadDropdowns();
  }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/leave', {
        params: {
          workSiteId: selectedSiteId || undefined,
          status: selectedStatus || undefined,
        },
      });
      setLeaves(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [selectedSiteId, selectedStatus]);

  const handleCreateLeave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/leave', newLeave);
      showToast('Leave request recorded successfully on worker behalf!', 'success');
      setCreateModalOpen(false);
      setNewLeave({
        workerId: workers[0]?.id || '',
        workSiteId: sites[0]?.id || '',
        leaveType: 'CASUAL',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: '',
      });
      fetchLeaves();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewLeave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post(`/leave/${activeLeaveForReview.id}/review`, reviewData);
      showToast(`Leave request ${reviewData.status.toLowerCase()}!`, 'success');
      setReviewModalOpen(false);
      fetchLeaves();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = leaves.filter((l) => {
    const text = `${l.worker?.fullName} ${l.worker?.workerCode} ${l.reason} ${l.workSite?.name}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const pendingCount = leaves.filter((l) => l.status === 'PENDING').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Leave Management & Approvals"
        description="Record worker leave requests on their behalf and execute audited supervisor approvals"
        actions={
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ gap: '6px', height: '36px' }}
          >
            <Plus size={16} />
            <span>Record Leave Request</span>
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
            placeholder="Search by worker code, name, or reason..."
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
          style={{ width: '180px', height: '38px', fontSize: '0.84rem' }}
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="">All Statuses ({leaves.length})</option>
          <option value="PENDING">Pending Review ({pendingCount})</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
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

      {/* Leave Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={8} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No leave requests on file"
          description="Record a new leave request or adjust filter criteria."
          action={
            <button
              onClick={() => setCreateModalOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{ gap: '6px' }}
            >
              <Plus size={14} />
              <span>Record Leave</span>
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
                <th>Leave Classification</th>
                <th>Leave Duration</th>
                <th>Justification / Reason</th>
                <th>Approval Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const initials = l.worker?.fullName
                  ? l.worker.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'W';

                return (
                  <tr key={l.id}>
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
                          {l.worker?.fullName}
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
                        {l.worker?.workerCode}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} color="var(--primary)" />
                        <span style={{ fontSize: '0.84rem' }}>{l.workSite?.name}</span>
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {l.leaveType}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        {l.startDate} &rarr; {l.endDate}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {l.totalDays ? `${l.totalDays} day(s)` : 'Single period'}
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          maxWidth: '220px',
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={l.reason}
                      >
                        {l.reason}
                      </span>
                    </td>

                    <td>
                      <StatusBadge status={l.status} />
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      {(l.status === 'PENDING' || isAdmin) && (
                        <button
                          onClick={() => {
                            setActiveLeaveForReview(l);
                            setReviewData({ status: 'APPROVED', reviewRemarks: '' });
                            setReviewModalOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.78rem',
                            gap: '4px',
                            borderColor: l.status === 'PENDING' ? 'var(--warning-border)' : undefined,
                            color: l.status === 'PENDING' ? 'var(--warning)' : undefined,
                          }}
                        >
                          {l.status === 'PENDING' ? 'Review & Decide' : 'Audit Override'}
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

      {/* Record Leave Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Record Worker Leave Request"
        subtitle="Submit a site leave request on behalf of a labourer with automatic conflict checking"
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
              onClick={handleCreateLeave}
              className="btn btn-primary"
              disabled={submitting || !newLeave.workerId || !newLeave.reason}
            >
              {submitting ? 'Recording...' : 'Record Request'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateLeave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Worker *</label>
              <select
                className="form-control"
                value={newLeave.workerId}
                onChange={(e) => setNewLeave({ ...newLeave, workerId: e.target.value })}
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
                <label className="form-label">Work Location</label>
                <select
                  className="form-control"
                  value={newLeave.workSiteId}
                  onChange={(e) => setNewLeave({ ...newLeave, workSiteId: e.target.value })}
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Leave Type</label>
                <select
                  className="form-control"
                  value={newLeave.leaveType}
                  onChange={(e) => setNewLeave({ ...newLeave, leaveType: e.target.value })}
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="EMERGENCY">Emergency Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={newLeave.startDate}
                  onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={newLeave.endDate}
                  onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Reason / Justification *</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Worker's stated justification for leave request..."
                value={newLeave.reason}
                onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                required
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Review & Decide Modal */}
      {activeLeaveForReview && (
        <Modal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          title={`Review Leave: ${activeLeaveForReview.worker?.fullName}`}
          subtitle={`Requested ${activeLeaveForReview.startDate} to ${activeLeaveForReview.endDate}`}
          maxWidth="500px"
          footer={
            <>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReviewLeave}
                className={`btn ${reviewData.status === 'APPROVED' ? 'btn-success' : 'btn-danger'}`}
                disabled={submitting}
              >
                {submitting
                  ? 'Saving...'
                  : reviewData.status === 'APPROVED'
                  ? 'Approve Request'
                  : 'Reject Request'}
              </button>
            </>
          }
        >
          <form onSubmit={handleReviewLeave}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.84rem',
                }}
              >
                <div style={{ marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Worker: </span>
                  <strong>{activeLeaveForReview.worker?.fullName}</strong> ({activeLeaveForReview.worker?.workerCode})
                </div>
                <div style={{ marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Type: </span>
                  <strong>{activeLeaveForReview.leaveType}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Stated Reason: </span>
                  <span style={{ color: 'var(--text-primary)' }}>{activeLeaveForReview.reason}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Supervisor Decision *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setReviewData({ ...reviewData, status: 'APPROVED' })}
                    className={`btn ${
                      reviewData.status === 'APPROVED' ? 'btn-success' : 'btn-secondary'
                    }`}
                    style={{ height: '40px', gap: '6px' }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Approve</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewData({ ...reviewData, status: 'REJECTED' })}
                    className={`btn ${
                      reviewData.status === 'REJECTED' ? 'btn-danger' : 'btn-secondary'
                    }`}
                    style={{ height: '40px', gap: '6px' }}
                  >
                    <XCircle size={16} />
                    <span>Reject</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Review Remarks / Audit Notes</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Optional review reason, conditions or explanation..."
                  value={reviewData.reviewRemarks}
                  onChange={(e) =>
                    setReviewData({ ...reviewData, reviewRemarks: e.target.value })
                  }
                />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default LeavePage;
