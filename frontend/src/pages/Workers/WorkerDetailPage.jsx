import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  Clock,
  Banknote,
  Receipt,
  UserX,
  UserCheck,
  Edit2,
  History,
  ShieldAlert,
} from 'lucide-react';

const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

export const WorkerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { showToast } = useNotification();

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance');

  // Histories
  const [attendance, setAttendance] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [wages, setWages] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Deactivate modal
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  // Reactivate action
  const [reactivating, setReactivating] = useState(false);

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editPhoneError, setEditPhoneError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchWorker = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get(`/workers/${id}`);
      setWorker(data);
    } catch (err) {
      showToast(err.message, 'error');
      navigate('/workers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorker();
  }, [id]);

  useEffect(() => {
    if (!worker) return;
    const fetchTabData = async () => {
      setTabLoading(true);
      try {
        if (activeTab === 'attendance') {
          const data = await apiClient.get(`/workers/${id}/attendance`);
          setAttendance(data);
        } else if (activeTab === 'assignments') {
          const data = await apiClient.get(`/workers/${id}/assignments`);
          setAssignments(data);
        } else if (activeTab === 'leave') {
          const data = await apiClient.get(`/workers/${id}/leave`);
          setLeaves(data);
        } else if (activeTab === 'wages' && isAdmin) {
          const data = await apiClient.get(`/wages/worker/${id}/history`);
          setWages(data);
        } else if (activeTab === 'payments' && isAdmin) {
          const data = await apiClient.get(`/workers/${id}/payments`);
          setPayments(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setTabLoading(false);
      }
    };
    fetchTabData();
  }, [activeTab, worker]);

  // Bug Fix 2: Deactivate worker
  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await apiClient.patch(`/workers/${id}/deactivate`);
      showToast('Worker deactivated successfully.', 'success');
      setDeactivateModalOpen(false);
      setWorker((prev) => ({ ...prev, status: 'INACTIVE' }));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeactivating(false);
    }
  };

  // Bug Fix 2: Reactivate worker
  const handleReactivate = async () => {
    setReactivating(true);
    try {
      await apiClient.patch(`/workers/${id}/reactivate`);
      showToast('Worker reactivated successfully!', 'success');
      setWorker((prev) => ({ ...prev, status: 'ACTIVE' }));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setReactivating(false);
    }
  };

  // Edit worker handler
  const openEditModal = () => {
    setEditForm({
      fullName: worker.fullName,
      phone: worker.phone,
      email: worker.email || '',
      address: worker.address,
      emergencyContact: worker.emergencyContact || '',
      employmentType: worker.employmentType || 'DAILY_WAGE',
    });
    setEditPhoneError('');
    setEditModalOpen(true);
  };

  const handleEditPhoneChange = (val) => {
    const clean = val.replace(/\s+/g, '');
    setEditForm((prev) => ({ ...prev, phone: clean }));
    if (!clean) {
      setEditPhoneError('Phone number is required');
    } else if (!INDIAN_PHONE_REGEX.test(clean)) {
      setEditPhoneError('Must be a 10-digit Indian mobile number starting with 6, 7, 8, or 9');
    } else {
      setEditPhoneError('');
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (editForm.phone && !INDIAN_PHONE_REGEX.test(editForm.phone)) {
      setEditPhoneError('Must be a 10-digit Indian mobile number starting with 6, 7, 8, or 9');
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await apiClient.patch(`/workers/${id}`, {
        fullName: editForm.fullName,
        phone: editForm.phone,
        email: editForm.email || undefined,
        address: editForm.address,
        emergencyContact: editForm.emergencyContact || undefined,
        employmentType: editForm.employmentType,
      });
      showToast('Worker profile updated successfully!', 'success');
      setWorker((prev) => ({
        ...prev,
        fullName: updated.fullName,
        phone: updated.phone,
        email: updated.email,
        address: updated.address,
        emergencyContact: updated.emergencyContact,
        employmentType: updated.employmentType,
      }));
      setEditModalOpen(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading worker profile...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '18px' }}>
        <button
          onClick={() => navigate('/workers')}
          className="btn btn-outline btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} /> Back to Directory
        </button>
      </div>

      {/* Profile Header Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 700,
              }}
            >
              {worker.fullName[0]}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#FFF' }}>{worker.fullName}</h1>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.86rem', color: 'var(--primary)', fontWeight: 600 }}>
                  {worker.workerCode}
                </span>
                <StatusBadge status={worker.status} />
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={14} /> {worker.department?.name || 'General Dept'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={14} /> {worker.skillCategory?.name || 'General Labour'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} /> <span style={{ fontFamily: 'var(--font-mono)' }}>{worker.phone}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} /> Joined {worker.joiningDate}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons: Edit and Status Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={openEditModal}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Edit2 size={14} /> Edit Profile
            </button>

            {worker.status === 'ACTIVE' ? (
              <button
                onClick={() => setDeactivateModalOpen(true)}
                className="btn btn-outline btn-sm"
                style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <UserX size={14} /> Deactivate Worker
              </button>
            ) : (
              isAdmin && (
                <button
                  onClick={handleReactivate}
                  className="btn btn-primary btn-sm"
                  disabled={reactivating}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <UserCheck size={14} /> {reactivating ? 'Reactivating...' : 'Reactivate Worker'}
                </button>
              )
            )}
          </div>
        </div>

        {/* Profile Info Strip */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            fontSize: '0.84rem',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block' }}>Residential Address</span>
            <span style={{ color: 'var(--text-primary)' }}>{worker.address}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block' }}>Emergency Contact</span>
            <span style={{ color: 'var(--text-primary)' }}>{worker.emergencyContact || '—'}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block' }}>Employment Type</span>
            <span style={{ color: 'var(--text-primary)' }}>{worker.employmentType?.replace(/_/g, ' ')}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block' }}>Current Applicable Wage</span>
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>
              {worker.currentWage ? `₹${parseFloat(worker.currentWage.rate).toLocaleString()} / ${worker.currentWage.wageType.toLowerCase()}` : 'Not configured'}
            </span>
          </div>
        </div>
      </div>

      {/* History Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-medium)', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('attendance')}
          className="btn"
          style={{
            borderBottom: activeTab === 'attendance' ? '2px solid var(--primary)' : '2px solid transparent',
            borderRadius: '0',
            color: activeTab === 'attendance' ? '#FFF' : 'var(--text-muted)',
            fontWeight: activeTab === 'attendance' ? 600 : 400,
            padding: '10px 16px',
          }}
        >
          Attendance History
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className="btn"
          style={{
            borderBottom: activeTab === 'assignments' ? '2px solid var(--primary)' : '2px solid transparent',
            borderRadius: '0',
            color: activeTab === 'assignments' ? '#FFF' : 'var(--text-muted)',
            fontWeight: activeTab === 'assignments' ? 600 : 400,
            padding: '10px 16px',
          }}
        >
          Site Assignments
        </button>

        <button
          onClick={() => setActiveTab('leave')}
          className="btn"
          style={{
            borderBottom: activeTab === 'leave' ? '2px solid var(--primary)' : '2px solid transparent',
            borderRadius: '0',
            color: activeTab === 'leave' ? '#FFF' : 'var(--text-muted)',
            fontWeight: activeTab === 'leave' ? 600 : 400,
            padding: '10px 16px',
          }}
        >
          Leave Records
        </button>

        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('wages')}
              className="btn"
              style={{
                borderBottom: activeTab === 'wages' ? '2px solid var(--primary)' : '2px solid transparent',
                borderRadius: '0',
                color: activeTab === 'wages' ? '#FFF' : 'var(--text-muted)',
                fontWeight: activeTab === 'wages' ? 600 : 400,
                padding: '10px 16px',
              }}
            >
              Wage Rate History
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className="btn"
              style={{
                borderBottom: activeTab === 'payments' ? '2px solid var(--primary)' : '2px solid transparent',
                borderRadius: '0',
                color: activeTab === 'payments' ? '#FFF' : 'var(--text-muted)',
                fontWeight: activeTab === 'payments' ? 600 : 400,
                padding: '10px 16px',
              }}
            >
              Payroll & Payments
            </button>
          </>
        )}
      </div>

      {/* Tab Contents */}
      <div className="table-container">
        {tabLoading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading audit history...
          </div>
        ) : activeTab === 'attendance' ? (
          attendance.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No attendance records recorded for this worker yet.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Work Site</th>
                  <th>Shift</th>
                  <th>Status</th>
                  <th>Check In / Out</th>
                  <th>Overtime</th>
                  <th>Remarks / Audit</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((att) => (
                  <tr key={att.id}>
                    <td style={{ fontWeight: 600 }}>{att.attendanceDate}</td>
                    <td>{att.workSite?.name || 'Assigned Site'}</td>
                    <td>{att.shift?.name || 'General Shift'}</td>
                    <td><StatusBadge status={att.status} /></td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {att.checkIn || '—'} / {att.checkOut || '—'}
                    </td>
                    <td>{att.overtimeMinutes > 0 ? `${att.overtimeMinutes} mins` : '—'}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {att.remarks || (att.correctionReason ? `Correction: ${att.correctionReason}` : 'Regular check-in')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : activeTab === 'assignments' ? (
          assignments.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No historical assignments.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Work Location</th>
                  <th>Shift</th>
                  <th>Role / Trade</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((asg) => (
                  <tr key={asg.id}>
                    <td style={{ fontWeight: 600, color: '#FFF' }}>{asg.workSite?.name}</td>
                    <td>{asg.shift?.name || 'All Shifts'}</td>
                    <td>{asg.roleTitle || 'Labourer'}</td>
                    <td>{asg.startDate}</td>
                    <td>{asg.endDate || 'Ongoing'}</td>
                    <td><StatusBadge status={asg.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : activeTab === 'leave' ? (
          leaves.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No leave records found.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Period</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l.id}>
                    <td>{l.leaveType}</td>
                    <td>{l.startDate} to {l.endDate}</td>
                    <td>{l.totalDays} day(s)</td>
                    <td style={{ fontSize: '0.8rem' }}>{l.reason}</td>
                    <td><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : activeTab === 'wages' ? (
          wages.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No wage history available.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Wage Type</th>
                  <th>Rate</th>
                  <th>Effective From</th>
                  <th>Effective To</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {wages.map((w) => (
                  <tr key={w.id}>
                    <td>{w.wageType}</td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>₹{parseFloat(w.rate).toLocaleString()}</td>
                    <td>{w.effectiveFrom}</td>
                    <td>{w.effectiveTo || 'Present'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{w.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          payments.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No payroll items or disbursement records found for this worker.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payroll Period</th>
                  <th>Gross Earnings</th>
                  <th>Advance Deduction</th>
                  <th>Net Pay</th>
                  <th>Payment Status</th>
                  <th>Disbursements</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>
                      {p.payrollRun?.periodStart} to {p.payrollRun?.periodEnd}
                    </td>
                    <td>₹{parseFloat(p.grossEarnings).toLocaleString()}</td>
                    <td style={{ color: 'var(--danger)' }}>- ₹{parseFloat(p.advanceRecovery).toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                      ₹{parseFloat(p.netPay).toLocaleString()}
                    </td>
                    <td><StatusBadge status={p.paymentStatus} /></td>
                    <td>
                      {p.payments?.length > 0 ? (
                        <div style={{ fontSize: '0.78rem' }}>
                          {p.payments.map((pmt) => (
                            <div key={pmt.id} style={{ color: 'var(--text-secondary)' }}>
                              ₹{parseFloat(pmt.amount).toLocaleString()} via {pmt.paymentMethod} on {pmt.paymentDate}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending payout</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* Deactivate Modal */}
      <Modal
        isOpen={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
        title="Confirm Worker Deactivation"
        maxWidth="460px"
        footer={
          <>
            <button onClick={() => setDeactivateModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleDeactivate} className="btn btn-danger" disabled={deactivating}>
              {deactivating ? 'Deactivating...' : 'Deactivate Worker'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={{ color: 'var(--danger)', flexShrink: 0 }}>
            <ShieldAlert size={28} />
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Are you sure you want to deactivate worker <strong>{worker.fullName} ({worker.workerCode})</strong>? Active assignments will be closed. Historical records will be safely preserved.
          </p>
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      {editForm && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Edit Worker Profile — ${worker.workerCode}`}
          maxWidth="540px"
          footer={
            <>
              <button onClick={() => setEditModalOpen(false)} className="btn btn-secondary" disabled={savingEdit}>
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="btn btn-primary"
                disabled={savingEdit || !editForm.fullName || !!editPhoneError}
              >
                {savingEdit ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveEdit}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-control"
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number * (10 Digits)</label>
              <input
                type="tel"
                maxLength={10}
                className="form-control"
                style={{
                  borderColor: editPhoneError ? 'var(--danger)' : undefined,
                  backgroundColor: editPhoneError ? 'rgba(239, 68, 68, 0.05)' : undefined,
                }}
                value={editForm.phone}
                onChange={(e) => handleEditPhoneChange(e.target.value)}
                required
              />
              {editPhoneError && (
                <div style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '4px' }}>
                  {editPhoneError}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Residential Address</label>
              <textarea
                className="form-control"
                rows={2}
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Emergency Contact</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.emergencyContact}
                  onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Employment Classification</label>
                <select
                  className="form-control"
                  value={editForm.employmentType}
                  onChange={(e) => setEditForm({ ...editForm, employmentType: e.target.value })}
                >
                  <option value="DAILY_WAGE">Daily Wage</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default WorkerDetailPage;
