import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { Clock, Plus, Moon, Sun, CheckCircle } from 'lucide-react';

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
      setForm({ name: '', startTime: '08:00', endTime: '17:00', crossesMidnight: false, description: '' });
      fetchShifts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Work Shifts & Timing Rules</h1>
          <p className="page-description">
            Configure shift rotas, overnight shifts and timing rules for workforce attendance
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus size={16} /> New Shift Schedule
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {shifts.map((sh) => (
          <div key={sh.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                  {sh.crossesMidnight ? <Moon size={22} color="var(--purple)" /> : <Sun size={22} color="var(--warning)" />}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#FFF' }}>{sh.name}</h3>
                  <StatusBadge status={sh.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Clock size={16} color="var(--text-muted)" />
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {sh.startTime} — {sh.endTime}
              </span>
              {sh.crossesMidnight && (
                <span className="badge badge-weekly-off" style={{ fontSize: '0.68rem' }}>
                  Crosses Midnight
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {sh.description || 'Standard work rota'}
            </p>
          </div>
        ))}
      </div>

      {/* New Shift Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Shift Schedule"
        maxWidth="480px"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleCreateShift}
              className="btn btn-primary"
              disabled={submitting || !form.name || !form.startTime || !form.endTime}
            >
              {submitting ? 'Creating...' : 'Save Shift'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateShift}>
          <div className="form-group">
            <label className="form-label">Shift Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Afternoon Rota B"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Start Time (24h) *</label>
              <input
                type="text"
                className="form-control"
                placeholder="08:00"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Time (24h) *</label>
              <input
                type="text"
                className="form-control"
                placeholder="17:00"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="midnightCheck"
              checked={form.crossesMidnight}
              onChange={(e) => setForm({ ...form, crossesMidnight: e.target.checked })}
            />
            <label htmlFor="midnightCheck" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
              Shift crosses midnight (overnight Graveyard shift)
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Rules</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Break timings or overtime qualification rules..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ShiftsPage;
