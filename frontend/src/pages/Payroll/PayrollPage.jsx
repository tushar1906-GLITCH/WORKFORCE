import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  Banknote,
  Plus,
  Calendar,
  CheckCircle,
  Eye,
  AlertCircle,
  Clock,
  ShieldCheck,
  Calculator,
  ArrowRight,
} from 'lucide-react';

export const PayrollPage = () => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);

  // Generate modal
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [form, setForm] = useState({
    periodStart: '2026-11-01',
    periodEnd: '2026-11-14',
    notes: '',
  });
  const [generating, setGenerating] = useState(false);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/payroll');
      setRuns(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const newRun = await apiClient.post('/payroll/generate', form);
      showToast('Payroll calculation run generated successfully in Draft mode!', 'success');
      setGenerateModalOpen(false);
      navigate(`/payroll/${newRun.id}`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Payroll Operations & Calculations"
        description="Calculate period wages from finalized attendance, deduct active advances, and approve immutable disbursements"
        actions={
          <button
            onClick={() => setGenerateModalOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ gap: '6px', height: '36px' }}
          >
            <Plus size={16} />
            <span>Generate New Payroll Run</span>
          </button>
        }
      />

      {loading ? (
        <TableSkeleton rows={5} cols={7} />
      ) : runs.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title="No payroll runs generated yet"
          description="Click 'Generate New Payroll Run' to execute calculation for your latest attendance period."
          action={
            <button
              onClick={() => setGenerateModalOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{ gap: '6px' }}
            >
              <Plus size={14} />
              <span>Generate Payroll Run</span>
            </button>
          }
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Payroll Period</th>
                <th>Status</th>
                <th>Workforce Count</th>
                <th>Total Net Payable</th>
                <th>Prepared By</th>
                <th>Approval Audit</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                      {r.periodStart} &rarr; {r.periodEnd}
                    </div>
                    {r.notes && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {r.notes}
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>
                    <span style={{ fontSize: '0.84rem' }}>
                      <strong>{r.totalWorkers}</strong> personnel
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--success)',
                      }}
                    >
                      ₹{parseFloat(r.totalAmount).toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {r.createdByUser?.fullName || 'Administrator'}
                    </span>
                  </td>
                  <td>
                    {r.approvedByUser ? (
                      <div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {r.approvedByUser.fullName}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {new Date(r.approvedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--warning)', fontSize: '0.76rem', fontWeight: 600 }}>
                        Pending Executive Approval
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => navigate(`/payroll/${r.id}`)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 10px', fontSize: '0.78rem', gap: '4px' }}
                    >
                      <Eye size={13} />
                      <span>Review Breakdown</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate Payroll Modal */}
      <Modal
        isOpen={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title="Execute Payroll Calculation Engine"
        subtitle="Aggregate verified attendance records and compute net wages"
        maxWidth="520px"
        footer={
          <>
            <button
              type="button"
              onClick={() => setGenerateModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGeneratePayroll}
              className="btn btn-primary"
              disabled={generating || !form.periodStart || !form.periodEnd}
            >
              {generating ? 'Calculating Wages...' : 'Run Calculation Engine'}
            </button>
          </>
        }
      >
        <form onSubmit={handleGeneratePayroll}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p
              style={{
                fontSize: '0.84rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                padding: '10px 14px',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              The payroll engine scans all finalized shift attendance, applies daily wage rates, computes overtime allowances, deducts active worker advances, and creates a reviewable draft snapshot.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Period Start Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.periodStart}
                  onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Period End Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.periodEnd}
                  onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Run Description / Period Label</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Mid-Month Labour Wage Run (Fortnight 1)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PayrollPage;
