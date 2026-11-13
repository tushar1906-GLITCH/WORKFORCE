import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Settings, Save, Globe, Clock, ShieldCheck } from 'lucide-react';

export const SettingsPage = () => {
  const { showToast } = useNotification();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/settings');
      setSettings(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdate = async (key, value) => {
    setSavingKey(key);
    try {
      await apiClient.patch(`/settings/${key}`, { value });
      showToast(`Setting '${key}' updated successfully!`, 'success');
      fetchSettings();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Organization Settings</h1>
          <p className="page-description">
            Configure system-wide operational policies, calculation multipliers and timezones
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '800px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading organization settings...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {settings.map((s) => (
              <div key={s.id} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#FFF' }}>
                      {s.key.replace(/_/g, ' ').toUpperCase()}
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {s.description || 'System configuration variable'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <input
                    type="text"
                    className="form-control"
                    defaultValue={s.value}
                    id={`input-${s.key}`}
                    style={{ maxWidth: '340px' }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById(`input-${s.key}`);
                      if (input) handleUpdate(s.key, input.value);
                    }}
                    className="btn btn-secondary"
                    disabled={savingKey === s.key}
                  >
                    <Save size={16} /> {savingKey === s.key ? 'Saving...' : 'Update'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
