import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import { CardSkeleton } from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import { Clock, Plus, Moon, Sun, CheckCircle, AlertCircle } from 'lucide-react';

export const ShiftsPage = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useNotification();

  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    startTime: '08:00',
    endTime: '17:00',
    crossesMidnight: false,
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/shifts');
      setShifts(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleCreateShift = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/shifts', form);
      showToast('Shift schedule created successfully!', 'success');
      setModalOpen(false);
      setForm({
        name: '',
        startTime: '08:00',
        endTime: '17:00',
        crossesMidnight: false,
        description: '',
      });
      fetchShifts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Shift Schedules & Rotas"
        description="Configure operational shift templates, overnight rotas, and working hours for workforce attendance"
        actions={
          isAdmin && (
            <button
              onClick={() => setModalOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ gap: '6px', height: '36px' }}
            >
              <Plus size={16} />
              <span>New Shift Schedule</span>
            </button>
          )
        }
      />

      {loading ? (
        <CardSkeleton count={3} />
      ) : shifts.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No shift schedules configured"
          description="Create operational shifts to track working hours and overtime."
          action={
            isAdmin && (
              <button
                onClick={() => setModalOpen(true)}
                className="btn btn-secondary btn-sm"
                style={{ gap: '6px' }}
              >
                <Plus size={14} />
                <span>Create Shift</span>
              </button>
            )
          }
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {shifts.map((sh) => (
            <div
              key={sh.id}
              className="card"
              style={{
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div
                      style={{
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: sh.crossesMidnight
                          ? 'rgba(139, 92, 246, 0.12)'
                          : 'rgba(245, 158, 11, 0.12)',
                        color: sh.crossesMidnight ? 'var(--purple)' : 'var(--warning)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {sh.crossesMidnight ? <Moon size={22} /> : <Sun size={22} />}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {sh.name}
                      </h3>
                      <div style={{ marginTop: '2px' }}>
                        <StatusBadge status={sh.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '12px',
                    padding: '10px 14px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <Clock size={16} color="var(--primary)" />
                  <span
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {sh.startTime} &rarr; {sh.endTime}
                  </span>
                  {sh.crossesMidnight && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--purple-bg)',
                        color: 'var(--purple)',
                        border: '1px solid var(--purple-border)',
                      }}
                    >
                      Night Shift
                    </span>
                  )}
                </div>

                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4,
                  }}
                >
                  {sh.description || 'Standard facility operational shift schedule'}
                </p>
              </div>

              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.74rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span>Grace Period: 15 mins</span>
                <span>Audit Enforced</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Shift Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Shift Schedule"
        subtitle="Establish daily work hours, check-in window and night shift rules"
        maxWidth="500px"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateShift}
              className="btn btn-primary"
              disabled={submitting || !form.name}
            >
              {submitting ? 'Creating...' : 'Create Shift'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateShift}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Shift Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Morning Shift A"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Start Time (24h) *</label>
                <input
                  type="time"
                  className="form-control"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Time (24h) *</label>
                <input
                  type="time"
                  className="form-control"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <input
                type="checkbox"
                id="crossesMidnight"
                checked={form.crossesMidnight}
                onChange={(e) => setForm({ ...form, crossesMidnight: e.target.checked })}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="crossesMidnight" style={{ fontSize: '0.82rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                Shift crosses midnight (Overnight graveyard rota)
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Operational schedule notes or eligible departments..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ShiftsPage;
