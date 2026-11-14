import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import {
  Briefcase,
  MapPin,
  Clock,
  ArrowRightLeft,
  Plus,
  Search,
  Filter,
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
        if (workersData.items?.length > 0) {
          setNewAssignment((prev) => ({ ...prev, workerId: workersData.items[0].id }));
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
      await apiClient.post(`/assignments/${activeAssignmentForTransfer.id}/transfer`, transferData);
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
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Worker Assignments & Transfers</h1>
          <p className="page-description">
            Allocate workforce members to sites, shifts, and manage site-to-site personnel transfers
          </p>
        </div>

        <button
          onClick={() => setAssignModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus size={16} /> New Worker Assignment
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '36px' }}
            placeholder="Search worker name, code, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

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
          style={{ width: '160px' }}
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="TRANSFERRED">Transferred</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Assignments Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading assignments...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No worker assignments found matching criteria.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Worker Code</th>
                <th>Worker Name</th>
                <th>Work Location</th>
                <th>Shift</th>
                <th>Role Title</th>
                <th>Tenure Period</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary)' }}>
                      {a.worker?.workerCode}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: '#FFF' }}>{a.worker?.fullName}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} color="var(--primary)" />
                      <span>{a.workSite?.name}</span>
                    </div>
                  </td>
                  <td>{a.shift?.name || 'Standard Day Shift'}</td>
                  <td>{a.roleTitle || 'Labourer'}</td>
                  <td>
                    <div style={{ fontSize: '0.8rem' }}>
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
                        title="Transfer worker to another site"
                      >
                        <ArrowRightLeft size={14} /> Transfer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Assignment Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Worker to Work Location"
        maxWidth="540px"
        footer={
          <>
            <button onClick={() => setAssignModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleCreateAssignment}
              className="btn btn-primary"
              disabled={submitting || !newAssignment.workerId || !newAssignment.workSiteId}
            >
              {submitting ? 'Saving...' : 'Create Assignment'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateAssignment}>
          <div className="form-group">
            <label className="form-label">Select Worker *</label>
            <select
              className="form-control"
              value={newAssignment.workerId}
              onChange={(e) => setNewAssignment({ ...newAssignment, workerId: e.target.value })}
              required
            >
              <option value="">Select an active worker</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.workerCode} — {w.fullName} ({w.department?.name || 'Unassigned'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Work Location *</label>
            <select
              className="form-control"
              value={newAssignment.workSiteId}
              onChange={(e) => setNewAssignment({ ...newAssignment, workSiteId: e.target.value })}
              required
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Assigned Shift</label>
            <select
              className="form-control"
              value={newAssignment.shiftId}
              onChange={(e) => setNewAssignment({ ...newAssignment, shiftId: e.target.value })}
            >
              {shifts.map((sh) => (
                <option key={sh.id} value={sh.id}>
                  {sh.name} ({sh.startTime} - {sh.endTime})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Role Title on Site</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Lead Mason, Electrician, Helper"
              value={newAssignment.roleTitle}
              onChange={(e) => setNewAssignment({ ...newAssignment, roleTitle: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Effective Start Date *</label>
            <input
              type="date"
              className="form-control"
              value={newAssignment.startDate}
              onChange={(e) => setNewAssignment({ ...newAssignment, startDate: e.target.value })}
              required
            />
          </div>
        </form>
      </Modal>

      {/* Transfer Worker Modal */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title={`Transfer Worker: ${activeAssignmentForTransfer?.worker?.fullName} (${activeAssignmentForTransfer?.worker?.workerCode})`}
        maxWidth="540px"
        footer={
          <>
            <button onClick={() => setTransferModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleTransferWorker}
              className="btn btn-primary"
              disabled={submitting || !transferData.targetWorkSiteId}
            >
              {submitting ? 'Transferring...' : 'Execute Site Transfer'}
            </button>
          </>
        }
      >
        <form onSubmit={handleTransferWorker}>
          <div style={{ padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', marginBottom: '16px', fontSize: '0.84rem' }}>
            <span><strong>Current Site:</strong> {activeAssignmentForTransfer?.workSite?.name}</span>
          </div>

          <div className="form-group">
            <label className="form-label">Destination Work Location *</label>
            <select
              className="form-control"
              value={transferData.targetWorkSiteId}
              onChange={(e) => setTransferData({ ...transferData, targetWorkSiteId: e.target.value })}
              required
            >
              {sites
                .filter((s) => s.id !== activeAssignmentForTransfer?.workSiteId)
                .map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Destination Shift</label>
            <select
              className="form-control"
              value={transferData.targetShiftId}
              onChange={(e) => setTransferData({ ...transferData, targetShiftId: e.target.value })}
            >
              <option value="">Keep standard / same shift</option>
              {shifts.map((sh) => (
                <option key={sh.id} value={sh.id}>
                  {sh.name} ({sh.startTime} - {sh.endTime})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Role Title on Destination Site</label>
            <input
              type="text"
              className="form-control"
              value={transferData.roleTitle}
              onChange={(e) => setTransferData({ ...transferData, roleTitle: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Effective Transfer Date *</label>
            <input
              type="date"
              className="form-control"
              value={transferData.effectiveDate}
              onChange={(e) => setTransferData({ ...transferData, effectiveDate: e.target.value })}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AssignmentsPage;
