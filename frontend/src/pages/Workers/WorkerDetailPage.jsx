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
  History,
  ShieldAlert,
} from 'lucide-react';

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

  useEffect(() => {
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
                  <Phone size={14} /> {worker.phone}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} /> Joined {worker.joiningDate}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {worker.status === 'ACTIVE' && (
              <button
                onClick={() => setDeactivateModalOpen(true)}
                className="btn btn-outline btn-sm"
                style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
              >
                <UserX size={14} /> Deactivate Worker
              </button>
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
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`btn ${activeTab === 'attendance' ? 'btn-primary' : 'btn-outline'}`}
          style={{ borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0' }}
        >
          <Clock size={16} /> Attendance History
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`btn ${activeTab === 'assignments' ? 'btn-primary' : 'btn-outline'}`}
          style={{ borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0' }}
        >
          <Briefcase size={16} /> Assignments & Transfers
        </button>
        <button
          onClick={() => setActiveTab('leave')}
          className={`btn ${activeTab === 'leave' ? 'btn-primary' : 'btn-outline'}`}
          style={{ borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0' }}
        >
          <Calendar size={16} /> Leave History
        </button>
        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('wages')}
              className={`btn ${activeTab === 'wages' ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0' }}
            >
              <Banknote size={16} /> Wage Rate History
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`btn ${activeTab === 'payments' ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0' }}
            >
              <Receipt size={16} /> Payroll & Payments History
            </button>
          </>
        )}
      </div>

      {/* Tab Contents */}
      <div className="table-container">
        {tabLoading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading tab history...
          </div>
        ) : (
          <>
            {activeTab === 'attendance' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Work Location</th>
                    <th>Shift</th>
                    <th>Status</th>
                    <th>Times</th>
                    <th>Overtime</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No attendance records found.</td></tr>
                  ) : (
                    attendance.map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{a.attendanceDate}</td>
                        <td>{a.workSite?.name || '—'}</td>
                        <td>{a.shift?.name || '—'}</td>
                        <td><StatusBadge status={a.status} /></td>
                        <td>{a.checkIn ? `${a.checkIn} - ${a.checkOut || 'Active'}` : '—'}</td>
                        <td>{a.overtimeMinutes > 0 ? `${a.overtimeMinutes} mins` : '—'}</td>
                        <td>{a.remarks || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'assignments' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Work Location</th>
                    <th>Role Title</th>
                    <th>Shift</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No assignment records found.</td></tr>
                  ) : (
                    assignments.map((as) => (
                      <tr key={as.id}>
                        <td style={{ fontWeight: 600 }}>{as.workSite?.name}</td>
                        <td>{as.roleTitle || 'Labourer'}</td>
                        <td>{as.shift?.name || 'Standard'}</td>
                        <td>{as.startDate}</td>
                        <td>{as.endDate || 'Ongoing'}</td>
                        <td><StatusBadge status={as.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'leave' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Leave Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Reviewer Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No leave records found.</td></tr>
                  ) : (
                    leaves.map((l) => (
                      <tr key={l.id}>
                        <td><strong>{l.leaveType}</strong></td>
                        <td>{l.startDate}</td>
                        <td>{l.endDate}</td>
                        <td>{l.reason}</td>
                        <td><StatusBadge status={l.status} /></td>
                        <td>{l.reviewRemarks || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'wages' && (
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
                  {wages.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No wage rate history found.</td></tr>
                  ) : (
                    wages.map((w) => (
                      <tr key={w.id}>
                        <td>{w.wageType}</td>
                        <td style={{ fontWeight: 600, color: 'var(--success)' }}>₹{parseFloat(w.rate).toLocaleString()}</td>
                        <td>{w.effectiveFrom}</td>
                        <td>{w.effectiveTo || 'Current Active'}</td>
                        <td>{w.notes || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'payments' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Payroll Period</th>
                    <th>Gross</th>
                    <th>Advance Recovery</th>
                    <th>Net Pay</th>
                    <th>Payment Status</th>
                    <th>Disbursements</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No payroll records found.</td></tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.payrollRun?.periodStart} to {p.payrollRun?.periodEnd}</td>
                        <td>₹{parseFloat(p.grossEarnings).toLocaleString()}</td>
                        <td>₹{parseFloat(p.advanceRecovery).toLocaleString()}</td>
                        <td style={{ fontWeight: 700, color: '#FFF' }}>₹{parseFloat(p.netPay).toLocaleString()}</td>
                        <td><StatusBadge status={p.paymentStatus} /></td>
                        <td>
                          {p.payments && p.payments.length > 0 ? (
                            p.payments.map((py) => (
                              <div key={py.id} style={{ fontSize: '0.78rem' }}>
                                ₹{parseFloat(py.amount).toLocaleString()} via {py.paymentMethod} ({py.paymentDate})
                              </div>
                            ))
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Unpaid</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </>
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
    </div>
  );
};

export default WorkerDetailPage;
