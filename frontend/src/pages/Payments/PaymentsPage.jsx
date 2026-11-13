import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import {
  Receipt,
  Plus,
  CreditCard,
  Banknote,
  Search,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
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
              const paidSoFar = i.payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
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
    setSubmitting(true);
    try {
      await apiClient.post('/payments', paymentForm);
      showToast('Payment disbursement recorded successfully!', 'success');
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
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Disbursements & Advances</h1>
          <p className="page-description">
            Audit-safe worker salary payouts, bank transfers and cash advances with overpayment protection
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setAdvanceModalOpen(true)}
            className="btn btn-secondary"
          >
            <Banknote size={16} /> Issue Cash Advance
          </button>
          <button
            onClick={() => setDisburseModalOpen(true)}
            className="btn btn-primary"
            disabled={unpaidItems.length === 0}
          >
            <CreditCard size={16} /> Record Salary Disbursement
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('payments')}
          className={`btn ${activeTab === 'payments' ? 'btn-primary' : 'btn-outline'}`}
          style={{ borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0' }}
        >
          <Receipt size={16} /> Salary Disbursements ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('advances')}
          className={`btn ${activeTab === 'advances' ? 'btn-primary' : 'btn-outline'}`}
          style={{ borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0' }}
        >
          <Banknote size={16} /> Worker Advances ({advances.length})
        </button>
      </div>

      {/* Table Container */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading disbursement ledgers...
          </div>
        ) : activeTab === 'payments' ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Payment Date</th>
                <th>Worker Code</th>
                <th>Worker Name</th>
                <th>Payroll Period</th>
                <th>Method</th>
                <th>Disbursed Amount</th>
                <th>Transaction Ref</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No payments recorded yet.</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.paymentDate}</td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 600 }}>
                        {p.payrollItem?.worker?.workerCode}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#FFF' }}>{p.payrollItem?.worker?.fullName}</td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {p.payrollItem?.payrollRun?.periodStart} to {p.payrollItem?.payrollRun?.periodEnd}
                    </td>
                    <td>
                      <span className="badge badge-present">{p.paymentMethod}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--success)' }}>
                        ₹{parseFloat(p.amount).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        {p.paymentReference || '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {p.recordedByUser?.fullName || 'Administrator'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Advance Date</th>
                <th>Worker Code</th>
                <th>Worker Name</th>
                <th>Total Advance Amount</th>
                <th>Remaining Unrecovered Balance</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Approved By</th>
              </tr>
            </thead>
            <tbody>
              {advances.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No advances recorded.</td></tr>
              ) : (
                advances.map((adv) => (
                  <tr key={adv.id}>
                    <td style={{ fontWeight: 600 }}>{adv.advanceDate}</td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 600 }}>
                        {adv.worker?.workerCode}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#FFF' }}>{adv.worker?.fullName}</td>
                    <td style={{ fontWeight: 600 }}>₹{parseFloat(adv.amount).toLocaleString()}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: parseFloat(adv.remainingBalance) > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                        ₹{parseFloat(adv.remainingBalance).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={adv.status} />
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {adv.reason || '—'}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{adv.approvedByUser?.fullName || 'Administrator'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={disburseModalOpen}
        onClose={() => setDisburseModalOpen(false)}
        title="Record Salary Disbursement"
        maxWidth="540px"
        footer={
          <>
            <button onClick={() => setDisburseModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleRecordPayment}
              className="btn btn-primary"
              disabled={submitting || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0}
            >
              {submitting ? 'Recording...' : 'Disburse Payment'}
            </button>
          </>
        }
      >
        <form onSubmit={handleRecordPayment}>
          <div className="form-group">
            <label className="form-label">Select Pending Worker Payroll Item *</label>
            <select
              className="form-control"
              value={paymentForm.payrollItemId}
              onChange={(e) => {
                const itemId = e.target.value;
                const found = unpaidItems.find((i) => i.id === itemId);
                setPaymentForm({
                  ...paymentForm,
                  payrollItemId: itemId,
                  amount: found ? found.remainingBalance.toFixed(2) : '',
                });
              }}
              required
            >
              {unpaidItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.worker?.workerCode} — {item.worker?.fullName} (Due: ₹{item.remainingBalance.toFixed(2)} | {item.period})
                </option>
              ))}
            </select>
          </div>

          {selectedUnpaidItem && (
            <div style={{ padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--success-border)', borderRadius: '6px', marginBottom: '16px', fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Net Salary Payable:</strong> ₹{parseFloat(selectedUnpaidItem.netPay).toLocaleString()}</span>
                <span><strong>Outstanding Balance:</strong> ₹{selectedUnpaidItem.remainingBalance.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Payment Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={paymentForm.amount}
                max={selectedUnpaidItem ? selectedUnpaidItem.remainingBalance : undefined}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method *</label>
              <select
                className="form-control"
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                <option value="UPI">UPI / Digital Transfer</option>
                <option value="CASH">Physical Cash Payout</option>
                <option value="OTHER">Cheque / Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Payment Date *</label>
              <input
                type="date"
                className="form-control"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Transaction / UTR Reference</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. UTR-98450123"
                value={paymentForm.paymentReference}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Remarks</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Monthly salary full settlement"
              value={paymentForm.remarks}
              onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Record Advance Modal */}
      <Modal
        isOpen={advanceModalOpen}
        onClose={() => setAdvanceModalOpen(false)}
        title="Issue Cash Advance to Worker"
        maxWidth="500px"
        footer={
          <>
            <button onClick={() => setAdvanceModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleCreateAdvance}
              className="btn btn-primary"
              disabled={submitting || !advanceForm.workerId || !advanceForm.amount}
            >
              {submitting ? 'Recording...' : 'Issue Advance'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateAdvance}>
          <div className="form-group">
            <label className="form-label">Select Worker *</label>
            <select
              className="form-control"
              value={advanceForm.workerId}
              onChange={(e) => setAdvanceForm({ ...advanceForm, workerId: e.target.value })}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Advance Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                placeholder="5000.00"
                value={advanceForm.amount}
                onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Disbursement Date *</label>
              <input
                type="date"
                className="form-control"
                value={advanceForm.advanceDate}
                onChange={(e) => setAdvanceForm({ ...advanceForm, advanceDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reason / Justification</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="e.g. Festival advance, emergency medical expenses..."
              value={advanceForm.reason}
              onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PaymentsPage;
