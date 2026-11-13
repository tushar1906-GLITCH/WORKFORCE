import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import {
  CalendarDays,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search,
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-description">
            Record verbal leave requests on workers' behalf and execute audited supervisor approvals
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus size={16} /> Record Leave Request
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <select
          className="form-control"
          style={{ width: '220px' }}
          value={selectedSiteId}
          onChange={(e) => setSelectedSiteId(e.target.value)}
        >
          <option value="">All Permitted Work Sites</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          className="form-control"
          style={{ width: '180px' }}
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Leave Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading leave requests...
          </div>
        ) : leaves.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No leave requests found matching criteria.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Worker Code</th>
                <th>Worker Name</th>
                <th>Work Location</th>
                <th>Leave Type</th>
                <th>Date Span</th>
                <th>Reason</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary)' }}>
                      {l.worker?.workerCode}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: '#FFF' }}>{l.worker?.fullName}</td>
                  <td>{l.workSite?.name}</td>
                  <td>
                    <strong>{l.leaveType}</strong>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.82rem' }}>
                      {l.startDate} to {l.endDate}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
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
                      >
                        {l.status === 'PENDING' ? 'Review & Decide' : 'Admin Override'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Record Leave Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Record Leave on Worker's Behalf"
        maxWidth="540px"
        footer={
          <>
            <button onClick={() => setCreateModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleCreateLeave}
              className="btn btn-primary"
              disabled={submitting || !newLeave.workerId || !newLeave.workSiteId || !newLeave.reason}
            >
              {submitting ? 'Submitting...' : 'Save Leave Request'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateLeave}>
          <div className="form-group">
            <label className="form-label">Worker *</label>
            <select
              className="form-control"
              value={newLeave.workerId}
              onChange={(e) => setNewLeave({ ...newLeave, workerId: e.target.value })}
              required
            >
              <option value="">Select worker</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.workerCode} — {w.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Work Location *</label>
            <select
              className="form-control"
              value={newLeave.workSiteId}
              onChange={(e) => setNewLeave({ ...newLeave, workSiteId: e.target.value })}
              required
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Leave Type *</label>
            <select
              className="form-control"
              value={newLeave.leaveType}
              onChange={(e) => setNewLeave({ ...newLeave, leaveType: e.target.value })}
            >
              <option value="CASUAL">Casual Leave (Paid)</option>
              <option value="SICK">Sick Leave (Paid with notification)</option>
              <option value="UNPAID">Unpaid Leave (Loss of Pay)</option>
              <option value="OTHER">Other / Compassionate Leave</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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
            <label className="form-label">Reason Communicated by Worker *</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="e.g. Attending family wedding in hometown..."
              value={newLeave.reason}
              onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
              required
            />
          </div>
        </form>
      </Modal>

      {/* Review Leave Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={`Review Leave: ${activeLeaveForReview?.worker?.fullName}`}
        maxWidth="500px"
        footer={
          <>
            <button onClick={() => setReviewModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleReviewLeave}
              className={reviewData.status === 'APPROVED' ? 'btn btn-success' : 'btn btn-danger'}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : `Confirm ${reviewData.status}`}
            </button>
          </>
        }
      >
        <form onSubmit={handleReviewLeave}>
          <div style={{ padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', marginBottom: '16px', fontSize: '0.84rem' }}>
            <p><strong>Worker:</strong> {activeLeaveForReview?.worker?.fullName} ({activeLeaveForReview?.worker?.workerCode})</p>
            <p><strong>Period:</strong> {activeLeaveForReview?.startDate} to {activeLeaveForReview?.endDate}</p>
            <p><strong>Leave Type:</strong> {activeLeaveForReview?.leaveType}</p>
            <p><strong>Worker Reason:</strong> {activeLeaveForReview?.reason}</p>
          </div>

          <div className="form-group">
            <label className="form-label">Supervisor Decision *</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setReviewData({ ...reviewData, status: 'APPROVED' })}
                className={`btn ${reviewData.status === 'APPROVED' ? 'btn-success' : 'btn-outline'}`}
                style={{ flex: 1 }}
              >
                <CheckCircle size={16} /> Approve
              </button>
              <button
                type="button"
                onClick={() => setReviewData({ ...reviewData, status: 'REJECTED' })}
                className={`btn ${reviewData.status === 'REJECTED' ? 'btn-danger' : 'btn-outline'}`}
                style={{ flex: 1 }}
              >
                <XCircle size={16} /> Reject
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Review Remarks / Justification</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="e.g. Relief worker arranged on site / Critical operations underway..."
              value={reviewData.reviewRemarks}
              onChange={(e) => setReviewData({ ...reviewData, reviewRemarks: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LeavePage;
