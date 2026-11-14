import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
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
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  Trash2,
  AlertCircle,
  ShieldCheck,
  CalendarCheck2,
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
  const [documents, setDocuments] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Document modal
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({
    documentType: 'aadhaar',
    title: '',
    documentNumber: '',
    issueDate: '',
    expiryDate: '',
    notes: '',
  });
  const [submittingDoc, setSubmittingDoc] = useState(false);

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
          const res = await apiClient.get(`/attendance/worker/${id}`);
          setAttendance(res || []);
        } else if (activeTab === 'assignments') {
          const res = await apiClient.get(`/assignments/worker/${id}`);
          setAssignments(res || []);
        } else if (activeTab === 'leave') {
          const res = await apiClient.get(`/leave/worker/${id}`);
          setLeaves(res || []);
        } else if (activeTab === 'documents') {
          const res = await apiClient.get(`/documents/worker/${id}`);
          setDocuments(res || []);
        } else if (activeTab === 'wages' && isAdmin) {
          const res = await apiClient.get(`/wages/worker/${id}`);
          setWages(res || []);
        } else if (activeTab === 'payments' && isAdmin) {
          const res = await apiClient.get(`/payments/worker/${id}`);
          setPayments(res || []);
        }
      } catch (err) {
        console.warn('Failed to load tab data:', err);
      } finally {
        setTabLoading(false);
      }
    };
    fetchTabData();
  }, [id, activeTab, worker, isAdmin]);

  const handleAddDocument = async (e) => {
    e.preventDefault();
    setSubmittingDoc(true);
    try {
      await apiClient.post(`/documents/worker/${id}`, newDoc);
      showToast('Document attached successfully!', 'success');
      setDocModalOpen(false);
      setNewDoc({
        documentType: 'aadhaar',
        title: '',
        documentNumber: '',
        issueDate: '',
        expiryDate: '',
        notes: '',
      });
      const updatedDocs = await apiClient.get(`/documents/worker/${id}`);
      setDocuments(updatedDocs || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingDoc(false);
    }
  };

  const handleVerifyDocument = async (docId, status) => {
    try {
      await apiClient.patch(`/documents/${docId}/verify`, { status });
      showToast(`Document ${status.toLowerCase()} successfully!`, 'success');
      const updatedDocs = await apiClient.get(`/documents/worker/${id}`);
      setDocuments(updatedDocs || []);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document record?')) return;
    try {
      await apiClient.delete(`/documents/${docId}`);
      showToast('Document record deleted.', 'success');
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await apiClient.patch(`/workers/${id}/deactivate`);
      showToast(`Worker ${worker.workerCode} has been deactivated.`, 'success');
      setDeactivateModalOpen(false);
      fetchWorker();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeactivating(false);
    }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      await apiClient.patch(`/workers/${id}/reactivate`);
      showToast(`Worker ${worker.workerCode} reactivated successfully!`, 'success');
      fetchWorker();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setReactivating(false);
    }
  };

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ height: '36px', width: '180px' }} className="skeleton" />
        <div style={{ height: '180px', width: '100%', borderRadius: 'var(--radius-lg)' }} className="skeleton" />
        <TableSkeleton rows={5} cols={6} />
      </div>
    );
  }

  const initials = worker?.fullName
    ? worker.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'W';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/workers')}
          className="btn btn-outline btn-sm"
          style={{ gap: '6px' }}
        >
          <ArrowLeft size={15} />
          <span>Back to Workers Directory</span>
        </button>
      </div>

      {/* Profile Header Card */}
      <div className="card" style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {worker.fullName}
                </h1>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.84rem',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                  }}
                >
                  {worker.workerCode}
                </span>
                <StatusBadge status={worker.status} />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  marginTop: '10px',
                  flexWrap: 'wrap',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={14} color="var(--text-muted)" />
                  {worker.department?.name || 'General Department'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={14} color="var(--text-muted)" />
                  {worker.skillCategory?.name || 'General Labour'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} color="var(--text-muted)" />
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{worker.phone}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} color="var(--text-muted)" />
                  Joined {worker.joiningDate}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons: Edit and Status Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={openEditModal}
              className="btn btn-secondary btn-sm"
              style={{ gap: '6px', height: '34px' }}
            >
              <Edit2 size={14} />
              <span>Edit Profile</span>
            </button>

            {worker.status === 'ACTIVE' ? (
              <button
                onClick={() => setDeactivateModalOpen(true)}
                className="btn btn-outline btn-sm"
                style={{
                  color: 'var(--danger)',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  gap: '6px',
                  height: '34px',
                }}
              >
                <UserX size={14} />
                <span>Deactivate</span>
              </button>
            ) : (
              isAdmin && (
                <button
                  onClick={handleReactivate}
                  className="btn btn-primary btn-sm"
                  disabled={reactivating}
                  style={{ gap: '6px', height: '34px' }}
                >
                  <UserCheck size={14} />
                  <span>{reactivating ? 'Reactivating...' : 'Reactivate'}</span>
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
            fontSize: '0.82rem',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.74rem' }}>
              Residential Address
            </span>
            <span style={{ color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>
              {worker.address}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.74rem' }}>
              Emergency Contact
            </span>
            <span style={{ color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>
              {worker.emergencyContact || '—'}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.74rem' }}>
              Employment Classification
            </span>
            <span style={{ color: 'var(--text-primary)', marginTop: '2px', display: 'block', textTransform: 'capitalize' }}>
              {worker.employmentType?.replace(/_/g, ' ').toLowerCase()}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.74rem' }}>
              Current Wage Rate
            </span>
            <span style={{ color: 'var(--success)', fontWeight: 600, marginTop: '2px', display: 'block' }}>
              {worker.currentWage
                ? `₹${parseFloat(worker.currentWage.rate).toLocaleString('en-IN')} / ${worker.currentWage.wageType.toLowerCase()}`
                : 'Not configured'}
            </span>
          </div>
        </div>
      </div>

      {/* History Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid var(--border-subtle)',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveTab('attendance')}
          className="btn"
          style={{
            borderBottom: activeTab === 'attendance' ? '2px solid var(--primary)' : '2px solid transparent',
            borderRadius: '0',
            color: activeTab === 'attendance' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'attendance' ? 600 : 500,
            padding: '10px 16px',
            fontSize: '0.86rem',
            backgroundColor: 'transparent',
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
            color: activeTab === 'assignments' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'assignments' ? 600 : 500,
            padding: '10px 16px',
            fontSize: '0.86rem',
            backgroundColor: 'transparent',
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
            color: activeTab === 'leave' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'leave' ? 600 : 500,
            padding: '10px 16px',
            fontSize: '0.86rem',
            backgroundColor: 'transparent',
          }}
        >
          Leave Records
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className="btn"
          style={{
            borderBottom: activeTab === 'documents' ? '2px solid var(--primary)' : '2px solid transparent',
            borderRadius: '0',
            color: activeTab === 'documents' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'documents' ? 600 : 500,
            padding: '10px 16px',
            fontSize: '0.86rem',
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <FileText size={15} />
          <span>Documents & Compliance</span>
        </button>

        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('wages')}
              className="btn"
              style={{
                borderBottom: activeTab === 'wages' ? '2px solid var(--primary)' : '2px solid transparent',
                borderRadius: '0',
                color: activeTab === 'wages' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: activeTab === 'wages' ? 600 : 500,
                padding: '10px 16px',
                fontSize: '0.86rem',
                backgroundColor: 'transparent',
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
                color: activeTab === 'payments' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: activeTab === 'payments' ? 600 : 500,
                padding: '10px 16px',
                fontSize: '0.86rem',
                backgroundColor: 'transparent',
              }}
            >
              Payroll & Disbursements
            </button>
          </>
        )}
      </div>

      {/* Tab Contents */}
      {tabLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : activeTab === 'attendance' ? (
        attendance.length === 0 ? (
          <EmptyState
            icon={CalendarCheck2}
            title="No attendance records recorded yet"
            description="Attendance logs for this personnel will populate as daily check-ins are verified."
          />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Work Location</th>
                  <th>Shift</th>
                  <th>Status</th>
                  <th>Check In / Out</th>
                  <th>Overtime</th>
                  <th>Audit Notes</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((att) => (
                  <tr key={att.id}>
                    <td style={{ fontWeight: 600 }}>{att.attendanceDate}</td>
                    <td>{att.workSite?.name || 'Assigned Facility'}</td>
                    <td>{att.shift?.name || 'General Shift'}</td>
                    <td>
                      <StatusBadge status={att.status} />
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {att.checkIn || '—'} / {att.checkOut || '—'}
                    </td>
                    <td>{att.overtimeMinutes > 0 ? `${att.overtimeMinutes} mins` : '—'}</td>
                    <td style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      {att.remarks ||
                        (att.correctionReason
                          ? `Correction: ${att.correctionReason}`
                          : 'Operational log')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : activeTab === 'assignments' ? (
        assignments.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No assignment records found"
            description="This worker has no active or past site assignments."
          />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Work Location</th>
                  <th>Shift</th>
                  <th>Role / Designation</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((asg) => (
                  <tr key={asg.id}>
                    <td style={{ fontWeight: 600 }}>{asg.workSite?.name}</td>
                    <td>{asg.shift?.name || 'All Shifts'}</td>
                    <td>{asg.roleTitle || 'Labourer'}</td>
                    <td>{asg.startDate}</td>
                    <td>{asg.endDate || 'Active Assignment'}</td>
                    <td>
                      <StatusBadge status={asg.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : activeTab === 'leave' ? (
        leaves.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No leave records on file"
            description="Worker has not submitted any leave requests to date."
          />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Period</th>
                  <th>Duration</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.leaveType}</td>
                    <td>
                      {l.startDate} &rarr; {l.endDate}
                    </td>
                    <td>{l.totalDays} day(s)</td>
                    <td style={{ fontSize: '0.82rem' }}>{l.reason}</td>
                    <td>
                      <StatusBadge status={l.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : activeTab === 'wages' ? (
        wages.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="No wage history records"
            description="Wage rate revisions will be logged here chronologically."
          />
        ) : (
          <div className="table-container">
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
                    <td style={{ textTransform: 'capitalize' }}>{w.wageType.toLowerCase()}</td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                      ₹{parseFloat(w.rate).toLocaleString('en-IN')}
                    </td>
                    <td>{w.effectiveFrom}</td>
                    <td>{w.effectiveTo || 'Present'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{w.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : activeTab === 'payments' ? (
        payments.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No payment or payroll records"
            description="Worker-level disbursements and salary slips will be catalogued here."
          />
        ) : (
          <div className="table-container">
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
                    <td>₹{parseFloat(p.grossEarnings).toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--danger)' }}>
                      - ₹{parseFloat(p.advanceRecovery).toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                      ₹{parseFloat(p.netPay).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <StatusBadge status={p.paymentStatus} />
                    </td>
                    <td>
                      {p.payments?.length > 0 ? (
                        <div style={{ fontSize: '0.78rem' }}>
                          {p.payments.map((pmt) => (
                            <div key={pmt.id} style={{ color: 'var(--text-secondary)' }}>
                              ₹{parseFloat(pmt.amount).toLocaleString('en-IN')} via {pmt.paymentMethod} on{' '}
                              {pmt.paymentDate}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Pending payout
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : activeTab === 'documents' ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              backgroundColor: 'rgba(255, 255, 255, 0.01)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Identity & Compliance Documents
              </h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Aadhaar, PAN, labour contracts, certificates & expiry status
              </p>
            </div>
            <button
              onClick={() => setDocModalOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ gap: '6px' }}
            >
              <Upload size={14} />
              <span>Attach Document</span>
            </button>
          </div>

          {documents.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No compliance documents uploaded yet. Click "Attach Document" to add Aadhaar or certificates.
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Document Title</th>
                    <th>Identifier / Ref #</th>
                    <th>Issue Date</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                    <th>Verification</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => {
                    const isExpiringSoon =
                      doc.expiryDate &&
                      new Date(doc.expiryDate).getTime() - Date.now() < 30 * 86400000 &&
                      new Date(doc.expiryDate).getTime() > Date.now();
                    const isExpired =
                      doc.expiryDate && new Date(doc.expiryDate).getTime() <= Date.now();

                    return (
                      <tr key={doc.id}>
                        <td>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'rgba(59, 130, 246, 0.12)',
                              color: 'var(--primary)',
                            }}
                          >
                            {doc.documentType}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.title}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                          {doc.documentNumber || '—'}
                        </td>
                        <td>{doc.issueDate || '—'}</td>
                        <td>
                          {doc.expiryDate ? (
                            <div>
                              <span>{doc.expiryDate}</span>
                              {isExpired && (
                                <span
                                  style={{
                                    marginLeft: '6px',
                                    fontSize: '0.66rem',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                    color: 'var(--danger)',
                                    fontWeight: 700,
                                  }}
                                >
                                  EXPIRED
                                </span>
                              )}
                              {isExpiringSoon && (
                                <span
                                  style={{
                                    marginLeft: '6px',
                                    fontSize: '0.66rem',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                    color: 'var(--warning)',
                                    fontWeight: 700,
                                  }}
                                >
                                  EXPIRING SOON
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>No Expiry</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={doc.verificationStatus} />
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {doc.verifier?.fullName
                            ? `Verified by ${doc.verifier.fullName}`
                            : 'Awaiting review'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {isAdmin && doc.verificationStatus === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleVerifyDocument(doc.id, 'VERIFIED')}
                                  className="btn btn-secondary btn-sm"
                                  title="Approve & Verify"
                                  style={{ color: 'var(--success)', padding: '4px 6px' }}
                                >
                                  <CheckCircle2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleVerifyDocument(doc.id, 'REJECTED')}
                                  className="btn btn-secondary btn-sm"
                                  title="Reject Document"
                                  style={{ color: 'var(--danger)', padding: '4px 6px' }}
                                >
                                  <XCircle size={14} />
                                </button>
                              </>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="btn btn-secondary btn-sm"
                                title="Delete Document"
                                style={{ color: 'var(--text-muted)', padding: '4px 6px' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {/* Upload Document Modal */}
      <Modal
        isOpen={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        title="Attach Compliance Document"
        subtitle="Catalog identity, certificates or safety clearance documents"
        maxWidth="500px"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDocModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddDocument}
              className="btn btn-primary"
              disabled={submittingDoc || !newDoc.title}
            >
              {submittingDoc ? 'Saving Document...' : 'Save & Attach'}
            </button>
          </>
        }
      >
        <form onSubmit={handleAddDocument}>
          <div className="form-group">
            <label className="form-label">Document Type *</label>
            <select
              className="form-control"
              value={newDoc.documentType}
              onChange={(e) => setNewDoc({ ...newDoc, documentType: e.target.value })}
              required
            >
              <option value="aadhaar">Aadhaar Card (UIDAI)</option>
              <option value="pan">PAN Card</option>
              <option value="voter_id">Voter Identity Card</option>
              <option value="contract">Employment / Labour Contract</option>
              <option value="certificate">Trade / Skill Certificate</option>
              <option value="medical">Medical Fitness Certificate</option>
              <option value="other">Other Identity Document</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Document Title *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Aadhaar Card Front & Back"
              value={newDoc.title}
              onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Document Reference Number</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. XXXX-XXXX-1234 or PAN number"
              value={newDoc.documentNumber}
              onChange={(e) => setNewDoc({ ...newDoc, documentNumber: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Issue Date</label>
              <input
                type="date"
                className="form-control"
                value={newDoc.issueDate}
                onChange={(e) => setNewDoc({ ...newDoc, issueDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input
                type="date"
                className="form-control"
                value={newDoc.expiryDate}
                onChange={(e) => setNewDoc({ ...newDoc, expiryDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes / Remarks</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Optional remarks or verification details..."
              value={newDoc.notes}
              onChange={(e) => setNewDoc({ ...newDoc, notes: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Deactivate Modal */}
      <Modal
        isOpen={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
        title="Confirm Worker Deactivation"
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
              onClick={handleDeactivate}
              className="btn btn-danger"
              disabled={deactivating}
            >
              {deactivating ? 'Deactivating...' : 'Deactivate Worker'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={{ color: 'var(--danger)', flexShrink: 0 }}>
            <ShieldAlert size={28} />
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Are you sure you want to deactivate worker{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {worker.fullName} ({worker.workerCode})
            </strong>
            ? Active assignments will be closed. Historical records will be safely preserved.
          </p>
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      {editForm && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Edit Worker Profile — ${worker.workerCode}`}
          maxWidth="560px"
          footer={
            <>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="btn btn-secondary"
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button
                type="button"
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
                <div style={{ color: 'var(--danger)', fontSize: '0.74rem', marginTop: '4px' }}>
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
                  onChange={(e) =>
                    setEditForm({ ...editForm, emergencyContact: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Employment Classification</label>
                <select
                  className="form-control"
                  value={editForm.employmentType}
                  onChange={(e) =>
                    setEditForm({ ...editForm, employmentType: e.target.value })
                  }
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
