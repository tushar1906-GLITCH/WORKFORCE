import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  DollarSign,
  Users,
  Lock,
  Printer,
} from 'lucide-react';

export const PayrollDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { showToast } = useNotification();

  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  // Pay slip modal
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [activeItemForSlip, setActiveItemForSlip] = useState(null);

  const fetchPayrollRun = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get(`/payroll/${id}`);
      setRun(data);
    } catch (err) {
      showToast(err.message, 'error');
      navigate('/payroll');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollRun();
  }, [id]);

  const handleApprovePayroll = async () => {
    if (!window.confirm('Are you sure you want to approve this payroll run? This will lock the records and deduct advance recoveries from worker balances.')) {
      return;
    }
    setApproving(true);
    try {
      await apiClient.post(`/payroll/${id}/approve`);
      showToast('Payroll run approved and locked successfully!', 'success');
      fetchPayrollRun();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading payroll breakdown...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '18px' }}>
        <button
          onClick={() => navigate('/payroll')}
          className="btn btn-outline btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} /> Back to Payroll Runs
        </button>
      </div>

      {/* Overview Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#FFF' }}>
                Payroll Run: {run.periodStart} to {run.periodEnd}
              </h1>
              <StatusBadge status={run.status} />
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {run.notes || 'Calculated labour expenditure snapshot'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {run.status === 'DRAFT' && isAdmin && (
              <button
                onClick={handleApprovePayroll}
                className="btn btn-primary"
                disabled={approving}
              >
                <CheckCircle size={16} /> {approving ? 'Approving...' : 'Approve & Lock Payroll'}
              </button>
            )}
            {run.status === 'APPROVED' && (
              <span className="badge badge-approved" style={{ padding: '8px 12px', fontSize: '0.82rem' }}>
                <Lock size={14} /> Immutable Approved Snapshot
              </span>
            )}
          </div>
        </div>

        {/* Financial Highlights */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
          }}
        >
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Total Personnel</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#FFF' }}>{run.totalWorkers}</div>
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Net Disbursable Amount</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--success)' }}>
              ₹{parseFloat(run.totalAmount).toLocaleString()}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Calculated On</span>
            <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '4px' }}>
              {new Date(run.createdAt).toLocaleString()}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Approved On</span>
            <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '4px' }}>
              {run.approvedAt ? new Date(run.approvedAt).toLocaleString() : 'Pending'}
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Worker Code</th>
              <th>Worker Name</th>
              <th>Wage Type & Rate</th>
              <th>Present / Half</th>
              <th>Leaves (Pd/Unpd)</th>
              <th>Overtime</th>
              <th>Gross Earnings</th>
              <th>Advance Deducted</th>
              <th>Net Pay</th>
              <th>Disbursement Status</th>
              <th style={{ textAlign: 'right' }}>Slip</th>
            </tr>
          </thead>
          <tbody>
            {run.items?.map((item) => (
              <tr key={item.id}>
                <td>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary)' }}>
                    {item.worker?.workerCode}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: '#FFF' }}>{item.worker?.fullName}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {item.worker?.department?.name || 'General'}
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: '0.82rem' }}>
                    ₹{parseFloat(item.wageRateSnapshot).toLocaleString()} / {item.wageTypeSnapshot?.toLowerCase()}
                  </span>
                </td>
                <td>
                  {item.presentDays}d / {item.halfDays}h
                </td>
                <td>
                  <span style={{ color: 'var(--success)' }}>{item.paidLeaveDays} pd</span> /{' '}
                  <span style={{ color: 'var(--danger)' }}>{item.unpaidLeaveDays} unpd</span>
                </td>
                <td>
                  {parseFloat(item.overtimeHours) > 0 ? (
                    <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                      {item.overtimeHours} hrs (x{item.overtimeRateMultiplier})
                    </span>
                  ) : (
                    '0 hrs'
                  )}
                </td>
                <td style={{ fontWeight: 600 }}>₹{parseFloat(item.grossEarnings).toLocaleString()}</td>
                <td style={{ color: 'var(--danger)' }}>
                  {parseFloat(item.advanceRecovery) > 0 ? `- ₹${parseFloat(item.advanceRecovery).toLocaleString()}` : '—'}
                </td>
                <td>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)' }}>
                    ₹{parseFloat(item.netPay).toLocaleString()}
                  </span>
                </td>
                <td>
                  <StatusBadge status={item.paymentStatus} />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => {
                      setActiveItemForSlip(item);
                      setPayslipModalOpen(true);
                    }}
                    className="btn btn-secondary btn-sm"
                    title="View individual wage statement / pay slip"
                  >
                    <FileText size={14} /> Slip
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pay Slip Modal */}
      <Modal
        isOpen={payslipModalOpen}
        onClose={() => setPayslipModalOpen(false)}
        title="Worker Wage Statement / Pay Slip"
        maxWidth="540px"
        footer={
          <button onClick={() => window.print()} className="btn btn-secondary">
            <Printer size={16} /> Print Statement
          </button>
        }
      >
        {activeItemForSlip && (
          <div style={{ padding: '4px' }}>
            <div style={{ borderBottom: '1px solid var(--border-medium)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFF' }}>
                    {activeItemForSlip.worker?.fullName}
                  </h3>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontSize: '0.84rem' }}>
                    Worker ID: {activeItemForSlip.worker?.workerCode}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Period</span>
                  <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                    {run.periodStart} to {run.periodEnd}
                  </div>
                </div>
              </div>
            </div>

            <table style={{ width: '100%', fontSize: '0.86rem', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 0', color: 'var(--text-secondary)' }}>Wage Category</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{activeItemForSlip.wageTypeSnapshot}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: 'var(--text-secondary)' }}>Applicable Wage Rate</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{parseFloat(activeItemForSlip.wageRateSnapshot).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: 'var(--text-secondary)' }}>Full Present Days</td>
                  <td style={{ textAlign: 'right' }}>{activeItemForSlip.presentDays} days</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: 'var(--text-secondary)' }}>Half Days Worked</td>
                  <td style={{ textAlign: 'right' }}>{activeItemForSlip.halfDays} days</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: 'var(--text-secondary)' }}>Approved Paid Leaves</td>
                  <td style={{ textAlign: 'right' }}>{activeItemForSlip.paidLeaveDays} days</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: 'var(--text-secondary)' }}>Overtime Hours</td>
                  <td style={{ textAlign: 'right' }}>{activeItemForSlip.overtimeHours} hrs (x{activeItemForSlip.overtimeRateMultiplier})</td>
                </tr>
                <tr style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 0', fontWeight: 600 }}>Gross Earnings</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                    ₹{parseFloat(activeItemForSlip.grossEarnings).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: 'var(--danger)' }}>Advance Recovery / Deductions</td>
                  <td style={{ textAlign: 'right', color: 'var(--danger)' }}>
                    - ₹{parseFloat(activeItemForSlip.advanceRecovery).toLocaleString()}
                  </td>
                </tr>
                <tr style={{ borderTop: '2px solid var(--border-medium)' }}>
                  <td style={{ padding: '10px 0', fontSize: '1rem', fontWeight: 700 }}>Net Disbursable Pay</td>
                  <td style={{ textAlign: 'right', fontSize: '1.15rem', fontWeight: 700, color: 'var(--success)' }}>
                    ₹{parseFloat(activeItemForSlip.netPay).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PayrollDetailPage;
