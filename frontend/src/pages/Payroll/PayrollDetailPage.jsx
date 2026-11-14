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
  CheckCircle,
  FileText,
  DollarSign,
  Users,
  Lock,
  Printer,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Banknote,
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
    if (
      !window.confirm(
        'Are you sure you want to approve this payroll run? This will lock the records and deduct advance recoveries from worker balances.',
      )
    ) {
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ height: '36px', width: '200px' }} className="skeleton" />
        <div style={{ height: '140px', width: '100%', borderRadius: 'var(--radius-lg)' }} className="skeleton" />
        <TableSkeleton rows={8} cols={9} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <button
          onClick={() => navigate('/payroll')}
          className="btn btn-outline btn-sm"
          style={{ gap: '6px' }}
        >
          <ArrowLeft size={15} />
          <span>Back to Payroll Runs</span>
        </button>
      </div>

      {/* Overview Card */}
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Payroll Run: {run.periodStart} &rarr; {run.periodEnd}
              </h1>
              <StatusBadge status={run.status} />
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {run.notes || 'Calculated period wages and statutory advance deductions'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {run.status === 'DRAFT' && isAdmin && (
              <button
                onClick={handleApprovePayroll}
                className="btn btn-primary btn-sm"
                disabled={approving}
                style={{ gap: '6px', height: '36px', padding: '0 16px' }}
              >
                <CheckCircle size={15} />
                <span>{approving ? 'Approving...' : 'Approve & Lock Payroll'}</span>
              </button>
            )}
            {run.status === 'APPROVED' && (
              <span
                className="badge badge-approved"
                style={{
                  padding: '8px 14px',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Lock size={13} />
                <span>Immutable Approved Snapshot</span>
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
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Workforce
            </span>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {run.totalWorkers} personnel
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Net Disbursable Sum
            </span>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.3rem',
                fontWeight: 700,
                color: 'var(--success)',
                marginTop: '2px',
              }}
            >
              ₹{parseFloat(run.totalAmount).toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Calculation Engine Date
            </span>
            <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)', marginTop: '4px' }}>
              {new Date(run.createdAt).toLocaleString()}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Executive Approval
            </span>
            <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)', marginTop: '4px' }}>
              {run.approvedAt ? new Date(run.approvedAt).toLocaleString() : 'Pending Executive Review'}
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Personnel</th>
              <th>Worker Code</th>
              <th>Wage Basis</th>
              <th>Present / Half</th>
              <th>Leave (Pd/Unpd)</th>
              <th>Overtime</th>
              <th>Gross Amount</th>
              <th>Advance Recovered</th>
              <th>Net Payable</th>
              <th>Disbursement</th>
              <th style={{ textAlign: 'right' }}>Slip</th>
            </tr>
          </thead>
          <tbody>
            {run.items?.map((item) => (
              <tr key={item.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                    {item.worker?.fullName}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {item.worker?.department?.name || 'General Department'}
                  </div>
                </td>

                <td>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      color: 'var(--primary)',
                      backgroundColor: 'rgba(59, 130, 246, 0.08)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                    }}
                  >
                    {item.worker?.workerCode}
                  </span>
                </td>

                <td>
                  <span style={{ fontSize: '0.8rem' }}>
                    ₹{parseFloat(item.wageRateSnapshot).toLocaleString('en-IN')}{' '}
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                      /{item.wageTypeSnapshot?.toLowerCase()}
                    </span>
                  </span>
                </td>

                <td>
                  <span style={{ fontSize: '0.82rem' }}>
                    <strong>{item.presentDays}</strong>d / {item.halfDays}h
                  </span>
                </td>

                <td>
                  <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>
                    {item.paidLeaveDays} pd
                  </span>{' '}
                  /{' '}
                  <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>
                    {item.unpaidLeaveDays} unpd
                  </span>
                </td>

                <td>
                  {parseFloat(item.overtimeHours) > 0 ? (
                    <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '0.8rem' }}>
                      {item.overtimeHours} hrs (x{item.overtimeRateMultiplier})
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>0 hrs</span>
                  )}
                </td>

                <td>
                  <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                    ₹{parseFloat(item.grossEarnings).toLocaleString('en-IN')}
                  </span>
                </td>

                <td>
                  {parseFloat(item.advanceRecovery) > 0 ? (
                    <span style={{ color: 'var(--danger)', fontSize: '0.86rem' }}>
                      - ₹{parseFloat(item.advanceRecovery).toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                  )}
                </td>

                <td>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.94rem',
                      fontWeight: 700,
                      color: 'var(--success)',
                    }}
                  >
                    ₹{parseFloat(item.netPay).toLocaleString('en-IN')}
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
                    style={{ padding: '3px 8px', fontSize: '0.76rem', gap: '4px' }}
                    title="View Statement"
                  >
                    <FileText size={13} />
                    <span>Slip</span>
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
        title="Worker Wage Statement / Salary Slip"
        subtitle="Audited period payroll calculation sheet"
        maxWidth="540px"
        footer={
          <button onClick={() => window.print()} className="btn btn-secondary btn-sm" style={{ gap: '6px' }}>
            <Printer size={15} />
            <span>Print Statement</span>
          </button>
        }
      >
        {activeItemForSlip && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {activeItemForSlip.worker?.fullName}
                </h3>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--primary)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  Worker ID: {activeItemForSlip.worker?.workerCode}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Period</span>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  {run.periodStart} &rarr; {run.periodEnd}
                </div>
              </div>
            </div>

            <table
              style={{
                width: '100%',
                fontSize: '0.84rem',
                borderCollapse: 'collapse',
              }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: '6px 0', color: 'var(--text-secondary)' }}>Wage Category</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {activeItemForSlip.wageTypeSnapshot}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: 'var(--text-secondary)' }}>Applicable Wage Rate</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    ₹{parseFloat(activeItemForSlip.wageRateSnapshot).toLocaleString('en-IN')}
                  </td>
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
                  <td style={{ textAlign: 'right' }}>
                    {activeItemForSlip.overtimeHours} hrs (x{activeItemForSlip.overtimeRateMultiplier})
                  </td>
                </tr>
                <tr style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 0', fontWeight: 600 }}>Gross Earnings</td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    ₹{parseFloat(activeItemForSlip.grossEarnings).toLocaleString('en-IN')}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: 'var(--danger)' }}>
                    Advance Deductions / Recoveries
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      color: 'var(--danger)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    - ₹{parseFloat(activeItemForSlip.advanceRecovery).toLocaleString('en-IN')}
                  </td>
                </tr>
                <tr style={{ borderTop: '2px solid var(--border-medium)' }}>
                  <td style={{ padding: '10px 0', fontSize: '0.94rem', fontWeight: 700 }}>
                    Net Disbursable Pay
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: 'var(--success)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    ₹{parseFloat(activeItemForSlip.netPay).toLocaleString('en-IN')}
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
