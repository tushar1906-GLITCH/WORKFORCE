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
  Receipt,
  Plus,
  CreditCard,
  Banknote,
  Search,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  TrendingDown,
  Calendar,
  Wallet,
} from 'lucide-react';

export const PaymentsPage = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState('payments'); // 'payments' | 'advances'
  const [payments, setPayments] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [unpaidItems, setUnpaidItems] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);

  // Forms
  const [paymentForm, setPaymentForm] = useState({
    payrollItemId: '',
    amount: '',
    paymentMethod: 'BANK_TRANSFER',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentReference: '',
    remarks: '',
  });

  const [advanceForm, setAdvanceForm] = useState({
    workerId: '',
    amount: '',
    advanceDate: new Date().toISOString().split('T')[0],
    reason: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchPaymentsData = async () => {
    setLoading(true);
    try {
      const [pmts, advs, runs, wrks] = await Promise.all([
        apiClient.get('/payments'),
        apiClient.get('/advances'),
        apiClient.get('/payroll'),
        apiClient.get('/workers', { params: { limit: 100 } }),
      ]);
      setPayments(pmts);
      setAdvances(advs);
      setWorkers(wrks.items || []);

      // Gather unpaid or partially paid items from latest runs
      const pendingItems = [];
      for (const r of runs.slice(0, 3)) {
        const details = await apiClient.get(`/payroll/${r.id}`);
        if (details.items) {
          details.items
            .filter((i) => i.paymentStatus !== 'PAID')
            .forEach((i) => {
              const paidSoFar =
                i.payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
              const remaining = Math.max(0, parseFloat(i.netPay) - paidSoFar);
              if (remaining > 0.01) {
                pendingItems.push({
                  ...i,
                  period: `${r.periodStart} to ${r.periodEnd}`,
                  remainingBalance: remaining,
                });
              }
            });
        }
      }
      setUnpaidItems(pendingItems);
      if (pendingItems.length > 0) {
        setPaymentForm((prev) => ({
          ...prev,
          payrollItemId: pendingItems[0].id,
          amount: pendingItems[0].remainingBalance.toFixed(2),
        }));
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentsData();
  }, []);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(paymentForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('Payment amount must be greater than zero', 'error');
      return;
    }
    if (selectedUnpaidItem && amountNum > selectedUnpaidItem.remainingBalance + 0.001) {
      showToast(
        `Payment cannot exceed outstanding balance of ₹${selectedUnpaidItem.remainingBalance.toFixed(2)}`,
        'error',
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post('/payments', paymentForm);
      showToast(
        `Disbursement of ₹${amountNum.toFixed(2)} recorded successfully! (${
          res.paymentStatus === 'PAID' ? 'Fully Settled' : 'Partial Settlement'
        })`,
        'success',
      );
      setDisburseModalOpen(false);
      fetchPaymentsData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAdvance = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/advances', advanceForm);
      showToast('Worker advance recorded successfully!', 'success');
      setAdvanceModalOpen(false);
      fetchPaymentsData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedUnpaidItem = unpaidItems.find((i) => i.id === paymentForm.payrollItemId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Disbursements & Worker Advances"
        description="Audit-safe worker salary payouts, bank transfers, and cash advance tracking with overpayment protection"
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setAdvanceModalOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{ gap: '6px', height: '36px' }}
            >
              <Banknote size={15} />
              <span>Issue Cash Advance</span>
            </button>
            <button
              onClick={() => setDisburseModalOpen(true)}
              className="btn btn-primary btn-sm"
              disabled={unpaidItems.length === 0}
              style={{ gap: '6px', height: '36px' }}
            >
              <CreditCard size={15} />
              <span>Record Salary Payout</span>
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => setActiveTab('payments')}
          className="btn"
          style={{
            borderBottom: activeTab === 'payments' ? '2px solid var(--primary)' : '2px solid transparent',
            borderRadius: '0',
            color: activeTab === 'payments' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'payments' ? 600 : 500,
            padding: '10px 18px',
            fontSize: '0.86rem',
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Receipt size={16} />
          <span>Disbursement Records ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('advances')}
          className="btn"
          style={{
            borderBottom: activeTab === 'advances' ? '2px solid var(--primary)' : '2px solid transparent',
            borderRadius: '0',
            color: activeTab === 'advances' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'advances' ? 600 : 500,
            padding: '10px 18px',
            fontSize: '0.86rem',
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Wallet size={16} />
          <span>Worker Advances & Balances ({advances.length})</span>
        </button>
      </div>

      {/* Table Container */}
      {loading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : activeTab === 'payments' ? (
        payments.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No disbursements recorded yet"
            description="Execute salary payouts against approved payroll runs."
          />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payment Date</th>
                  <th>Personnel</th>
                  <th>Worker Code</th>
                  <th>Payroll Period</th>
                  <th>Payment Method</th>
                  <th>Disbursed Amount</th>
                  <th>Transaction Reference</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const initials = p.payrollItem?.worker?.fullName
                    ? p.payrollItem.worker.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    : 'W';

                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.paymentDate}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              color: 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                            {p.payrollItem?.worker?.fullName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--primary)',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                          }}
                        >
                          {p.payrollItem?.worker?.workerCode}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {p.payrollItem?.payrollRun?.periodStart} &rarr; {p.payrollItem?.payrollRun?.periodEnd}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid var(--border-subtle)',
                            fontWeight: 600,
                          }}
                        >
                          {p.paymentMethod?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.96rem',
                            fontWeight: 700,
                            color: 'var(--success)',
                          }}
                        >
                          ₹{parseFloat(p.amount).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {p.paymentReference || '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {p.recordedByUser?.fullName || 'Administrator'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : advances.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title="No worker advances on record"
          description="Cash advances given to workers are logged and recovered automatically in subsequent payroll runs."
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date Issued</th>
                <th>Personnel</th>
                <th>Worker Code</th>
                <th>Advance Principal</th>
                <th>Unrecovered Balance</th>
                <th>Recovery Status</th>
                <th>Justification</th>
                <th>Authorized By</th>
              </tr>
            </thead>
            <tbody>
              {advances.map((adv) => {
                const initials = adv.worker?.fullName
                  ? adv.worker.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'W';

                return (
                  <tr key={adv.id}>
                    <td style={{ fontWeight: 600 }}>{adv.advanceDate}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            color: 'var(--warning)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                          {adv.worker?.fullName}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--primary)',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                        }}
                      >
                        {adv.worker?.workerCode}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                        ₹{parseFloat(adv.amount).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          color:
                            parseFloat(adv.remainingBalance) > 0
                              ? 'var(--warning)'
                              : 'var(--text-muted)',
                        }}
                      >
                        ₹{parseFloat(adv.remainingBalance).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={adv.status} />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {adv.reason || '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {adv.approvedByUser?.fullName || 'Administrator'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={disburseModalOpen}
        onClose={() => setDisburseModalOpen(false)}
        title="Record Salary Disbursement Payout"
        subtitle="Disburse approved wage earnings with overpayment safeguard"
        maxWidth="540px"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDisburseModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRecordPayment}
              className="btn btn-primary"
              disabled={submitting || !paymentForm.payrollItemId || !paymentForm.amount}
            >
              {submitting ? 'Executing Payout...' : 'Record Disbursement'}
            </button>
          </>
        }
      >
        <form onSubmit={handleRecordPayment}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Worker / Approved Payroll Item *</label>
              <select
                className="form-control"
                value={paymentForm.payrollItemId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const item = unpaidItems.find((i) => i.id === selectedId);
                  setPaymentForm((prev) => ({
                    ...prev,
                    payrollItemId: selectedId,
                    amount: item ? item.remainingBalance.toFixed(2) : '',
                  }));
                }}
                required
              >
                {unpaidItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.worker?.fullName} ({item.worker?.workerCode}) — Balance: ₹
                    {item.remainingBalance.toFixed(2)} ({item.period})
                  </option>
                ))}
              </select>
            </div>

            {selectedUnpaidItem && (
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Net Wages Approved:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    ₹{parseFloat(selectedUnpaidItem.netPay).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Remaining Outstanding:</span>
                  <strong style={{ color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
                    ₹{selectedUnpaidItem.remainingBalance.toFixed(2)}
                  </strong>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Payout Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  placeholder="0.00"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method *</label>
                <select
                  className="form-control"
                  value={paymentForm.paymentMethod}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })
                  }
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                  <option value="CASH">Cash in Hand</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Payment Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={paymentForm.paymentDate}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, paymentDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">UTR / Check / Reference #</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. UTR1234567890"
                  value={paymentForm.paymentReference}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, paymentReference: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Disbursement Remarks</label>
              <input
                type="text"
                className="form-control"
                placeholder="Optional payment notes or batch reference..."
                value={paymentForm.remarks}
                onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Issue Advance Modal */}
      <Modal
        isOpen={advanceModalOpen}
        onClose={() => setAdvanceModalOpen(false)}
        title="Issue Cash Advance to Worker"
        subtitle="Advance will be registered and deducted automatically from next approved payroll run"
        maxWidth="500px"
        footer={
          <>
            <button
              type="button"
              onClick={() => setAdvanceModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateAdvance}
              className="btn btn-primary"
              disabled={submitting || !advanceForm.workerId || !advanceForm.amount}
            >
              {submitting ? 'Recording...' : 'Authorize Advance'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateAdvance}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Worker *</label>
              <select
                className="form-control"
                value={advanceForm.workerId}
                onChange={(e) => setAdvanceForm({ ...advanceForm, workerId: e.target.value })}
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
                <label className="form-label">Advance Principal (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  placeholder="e.g. 2000.00"
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Issue Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={advanceForm.advanceDate}
                  onChange={(e) =>
                    setAdvanceForm({ ...advanceForm, advanceDate: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Justification / Reason *</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="e.g. Festival advance, medical emergency or travel expense..."
                value={advanceForm.reason}
                onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                required
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PaymentsPage;
