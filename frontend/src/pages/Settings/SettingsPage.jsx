import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import PageHeader from '../../components/common/PageHeader';
import { CardSkeleton } from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  Settings,
  Save,
  Globe,
  Clock,
  ShieldCheck,
  Sliders,
  CheckCircle2,
  HelpCircle,
  FileText
} from 'lucide-react';

export const SettingsPage = () => {
  const { showToast } = useNotification();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState(null);
  const [formValues, setFormValues] = useState({});

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/settings');
      setSettings(data || []);
      const values = {};
      (data || []).forEach((s) => {
        values[s.key] = s.value;
      });
      setFormValues(values);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdate = async (key) => {
    setSavingKey(key);
    try {
      const value = formValues[key];
      await apiClient.patch(`/settings/${key}`, { value });
      showToast(`Setting '${key}' saved successfully!`, 'success');
      fetchSettings();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const getSettingIcon = (key = '') => {
    if (key.includes('TIME') || key.includes('SHIFT') || key.includes('HOURS')) return Clock;
    if (key.includes('CURRENCY') || key.includes('PAYROLL') || key.includes('OVERTIME')) return Sliders;
    if (key.includes('SECURITY') || key.includes('AUTH') || key.includes('PASSWORD')) return ShieldCheck;
    return Globe;
  };

  return (
    <div>
      <PageHeader
        title="Organization Settings"
        description="Configure enterprise-wide operational parameters, overtime calculation rules, timezones, and audit controls"
        actions={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              fontSize: '0.78rem',
              color: 'var(--primary)',
              fontWeight: 600,
            }}
          >
            <ShieldCheck size={16} />
            <span>Active Enterprise Policies</span>
          </div>
        }
      />

      <div style={{ maxWidth: '900px' }}>
        {loading ? (
          <CardSkeleton count={4} />
        ) : settings.length === 0 ? (
          <EmptyState
            icon={Settings}
            title="No Settings Configured"
            description="No system configuration parameters were found in PostgreSQL."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {settings.map((s) => {
              const Icon = getSettingIcon(s.key);
              const isSaving = savingKey === s.key;

              return (
                <div
                  key={s.id}
                  className="card"
                  style={{
                    padding: '20px 24px',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      <Icon size={18} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#FFF' }}>
                          {s.key.replace(/_/g, ' ').toUpperCase()}
                        </h4>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            background: 'rgba(255, 255, 255, 0.04)',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {s.key}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {s.description || 'System configuration variable governing operational workflows.'}
                      </p>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '14px', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="form-control"
                          value={formValues[s.key] ?? s.value ?? ''}
                          onChange={(e) =>
                            setFormValues({
                              ...formValues,
                              [s.key]: e.target.value,
                            })
                          }
                          style={{ maxWidth: '380px', fontSize: '0.86rem' }}
                        />
                        <button
                          onClick={() => handleUpdate(s.key)}
                          className="btn btn-secondary"
                          disabled={isSaving}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Save size={15} />
                          <span>{isSaving ? 'Saving...' : 'Update Setting'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
