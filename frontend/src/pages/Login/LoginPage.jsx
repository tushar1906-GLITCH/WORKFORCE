import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Briefcase,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  Sparkles,
} from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('admin@workforce.local');
  const [password, setPassword] = useState('Admin@123456');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      showToast(`Welcome back, ${user.fullName}!`, 'success');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role) => {
    setError('');
    if (role === 'admin') {
      setEmail('admin@workforce.local');
      setPassword('Admin@123456');
    } else if (role === 'supervisor_north') {
      setEmail('supervisor.north@workforce.local');
      setPassword('Supervisor@123456');
    } else if (role === 'supervisor_south') {
      setEmail('supervisor.south@workforce.local');
      setPassword('Supervisor@123456');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-base, #0B0F17)',
        padding: '24px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle Radial Glow Orbs */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, rgba(11, 15, 23, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '40px',
          backgroundColor: 'var(--bg-surface, #111827)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-xl, 16px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(59, 130, 246, 0.08)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'rgba(59, 130, 246, 0.14)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              color: 'var(--primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.25)',
            }}
          >
            <Briefcase size={26} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              ShramSetu Command
            </h1>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: 'var(--primary)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              v2.0
            </span>
          </div>

          <p
            style={{
              fontSize: '0.84rem',
              color: 'var(--text-secondary)',
              marginTop: '6px',
            }}
          >
            Industrial Labour Management & Operations Platform
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div
            style={{
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Corporate Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="email"
                className="form-control"
                style={{ paddingLeft: '40px', height: '42px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@shramsetu.local"
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Access Password
              </label>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                style={{ paddingLeft: '40px', paddingRight: '40px', height: '42px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              height: '44px',
              fontSize: '0.92rem',
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
            }}
            disabled={loading}
          >
            {loading ? (
              <span>Authenticating Credentials...</span>
            ) : (
              <>
                <span>Sign In to ShramSetu</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Access Pills */}
        <div
          style={{
            marginTop: '28px',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <KeyRound size={12} />
              Instant Sandbox Profiles
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="btn btn-secondary btn-sm"
              style={{
                justifyContent: 'space-between',
                padding: '8px 12px',
                height: 'auto',
                backgroundColor: email === 'admin@workforce.local' ? 'rgba(59, 130, 246, 0.08)' : undefined,
                borderColor: email === 'admin@workforce.local' ? 'rgba(59, 130, 246, 0.4)' : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                <ShieldCheck size={15} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Admin: System Executive
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    admin@workforce.local &bull; Full Access
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>Use</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('supervisor_north')}
              className="btn btn-secondary btn-sm"
              style={{
                justifyContent: 'space-between',
                padding: '8px 12px',
                height: 'auto',
                backgroundColor: email === 'supervisor.north@workforce.local' ? 'rgba(16, 185, 129, 0.08)' : undefined,
                borderColor: email === 'supervisor.north@workforce.local' ? 'rgba(16, 185, 129, 0.4)' : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                <UserCheck size={15} color="var(--success)" />
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Supervisor: Marcus Brody
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    North District Plant &bull; Operations Scoped
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600 }}>Use</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('supervisor_south')}
              className="btn btn-secondary btn-sm"
              style={{
                justifyContent: 'space-between',
                padding: '8px 12px',
                height: 'auto',
                backgroundColor: email === 'supervisor.south@workforce.local' ? 'rgba(6, 182, 212, 0.08)' : undefined,
                borderColor: email === 'supervisor.south@workforce.local' ? 'rgba(6, 182, 212, 0.4)' : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                <UserCheck size={15} color="var(--info)" />
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Supervisor: Rajesh Kulkarni
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    South Logistics Hub &bull; Operations Scoped
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--info)', fontWeight: 600 }}>Use</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security Footer Notice */}
      <div
        style={{
          marginTop: '20px',
          fontSize: '0.74rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 1,
        }}
      >
        <span>Secured with JWT Authentication</span>
        <span>&bull;</span>
        <span>PostgreSQL Transactional Integrity</span>
      </div>
    </div>
  );
};

export default LoginPage;
