import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import {
  Banknote,
  Plus,
  Calendar,
  CheckCircle,
  Eye,
  AlertCircle,
  Clock,
  ShieldCheck,
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
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll Runs & Wage Calculation</h1>
          <p className="page-description">
            Generate, review and approve immutable payroll runs calculated from finalized attendance and wage rates
          </p>
        </div>

        <button
          onClick={() => setGenerateModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus size={16} /> Generate New Payroll Run
        </button>
      </div>

      <div className="table-container">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading payroll history...
          </div>
        ) : runs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No payroll runs generated yet. Click "Generate New Payroll Run" to start.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Payroll Period</th>
                <th>Status</th>
                <th>Total Workers</th>
                <th>Net Payable Amount</th>
                <th>Created By</th>
                <th>Approved By / Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#FFF' }}>
                      {r.periodStart} to {r.periodEnd}
                    </div>
                    {r.notes && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{r.notes}</div>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>
                    <strong>{r.totalWorkers}</strong> personnel
                  </td>
                  <td>
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--success)' }}>
                      ₹{parseFloat(r.totalAmount).toLocaleString()}
                    </span>
                  </td>
                  <td>{r.createdByUser?.fullName || 'Administrator'}</td>
                  <td>
                    {r.approvedByUser ? (
                      <div>
                        <div style={{ color: '#FFF' }}>{r.approvedByUser.fullName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {new Date(r.approvedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Pending Approval</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => navigate(`/payroll/${r.id}`)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Eye size={14} /> Review Breakdown
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Generate Payroll Modal */}
      <Modal
        isOpen={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title="Generate Period Payroll Calculation"
        maxWidth="500px"
        footer={
          <>
            <button onClick={() => setGenerateModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleGeneratePayroll}
              className="btn btn-primary"
              disabled={generating || !form.periodStart || !form.periodEnd}
            >
              {generating ? 'Calculating...' : 'Run Calculation Engine'}
            </button>
          </>
        }
      >
        <form onSubmit={handleGeneratePayroll}>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            The payroll engine pulls all finalized attendance records, applies paid/unpaid leave rules, calculates regular & overtime earnings, recovers active advances, and creates a draft payroll snapshot.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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
            <label className="form-label">Run Notes / Period Label</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Mid-month bi-weekly wage distribution"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PayrollPage;
