import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import aiApi from '../../api/ai';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import { CardSkeleton } from '../../components/common/LoadingSkeleton';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  CalendarCheck2,
  CalendarDays,
  Building2,
  Banknote,
  Receipt,
  ArrowRight,
  TrendingUp,
  MapPin,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Bot,
  Shield,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

export const DashboardPage = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const fetchAiInsights = async () => {
    try {
      setLoadingAi(true);
      const insights = await aiApi.getCommandCenterInsights();
      setAiInsights(insights);
    } catch (err) {
      console.warn('Failed to load AI Command Center insights:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/reports/dashboard-stats');
      setStats(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchAiInsights();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ height: '36px', width: '280px' }} className="skeleton" />
        <CardSkeleton count={4} />
        <div style={{ height: '280px', width: '100%', borderRadius: 'var(--radius-lg)' }} className="skeleton" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="card"
        style={{
          color: 'var(--danger)',
          backgroundColor: 'var(--danger-bg)',
          borderColor: 'var(--danger-border)',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <AlertTriangle size={24} />
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Failed to Load Dashboard</h3>
          <p style={{ fontSize: '0.84rem', marginTop: '4px' }}>{error}</p>
        </div>
      </div>
    );
  }

  const attentionCount = aiInsights?.actionableIssues?.length || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title" style={{ fontSize: '1.4rem' }}>
              {isAdmin ? 'Executive Command Center' : 'Site Supervisor Operations'}
            </h1>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: 'var(--primary)',
                letterSpacing: '0.04em',
              }}
            >
              LIVE SYNCHRONIZATION
            </span>
          </div>
          <p className="page-description" style={{ marginTop: '4px' }}>
            {isAdmin
              ? 'Organization-wide live workforce deployment, attendance velocity and financial operations'
              : `Operational view for assigned locations: ${
                  user?.assignedSites?.map((s) => s.name).join(', ') || 'Assigned Facilities'
                }`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/attendance')}
            className="btn btn-primary btn-sm"
            style={{ gap: '6px', height: '36px', padding: '0 14px' }}
          >
            <CalendarCheck2 size={16} />
            <span>Mark Today's Attendance</span>
          </button>
          <button
            onClick={() => navigate('/workers')}
            className="btn btn-secondary btn-sm"
            style={{ gap: '6px', height: '36px', padding: '0 14px' }}
          >
            <Users size={16} />
            <span>Workers Directory</span>
          </button>
        </div>
      </div>

      {/* AI Operations Command Center Strip */}
      <div
        style={{
          backgroundColor: 'rgba(17, 24, 39, 0.75)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 22px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, var(--primary) 0%, #8B5CF6 100%)',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                flexShrink: 0,
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--text-primary)' }}>
                  AI Operations Intelligence
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor:
                      attentionCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: attentionCount > 0 ? 'var(--warning)' : 'var(--success)',
                    border: `1px solid ${
                      attentionCount > 0 ? 'var(--warning-border)' : 'var(--success-border)'
                    }`,
                  }}
                >
                  {attentionCount > 0
                    ? `${attentionCount} Attention Item${attentionCount > 1 ? 's' : ''}`
                    : 'All Operations Optimal'}
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Synthesized live from PostgreSQL transactional tables &bull; Groq Function Calling
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={fetchAiInsights}
              disabled={loadingAi}
              className="btn btn-secondary btn-sm"
              title="Refresh AI Insights"
              style={{ gap: '5px' }}
            >
              <RefreshCw size={13} className={loadingAi ? 'spin' : ''} />
              <span>{loadingAi ? 'Analyzing...' : 'Refresh'}</span>
            </button>
            <button
              onClick={() => navigate('/ai-assistant')}
              className="btn btn-primary btn-sm"
              style={{ gap: '6px' }}
            >
              <Bot size={14} />
              <span>Ask AI Assistant</span>
            </button>
          </div>
        </div>

        {/* Actionable Issues or Optimal Status */}
        {aiInsights?.actionableIssues && aiInsights.actionableIssues.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            {aiInsights.actionableIssues.map((issue, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 14px',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  fontSize: '0.82rem',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <AlertTriangle size={15} color="var(--warning)" style={{ flexShrink: 0 }} />
                  <span>{issue}</span>
                </div>
                <button
                  onClick={() => {
                    if (issue.toLowerCase().includes('attendance')) navigate('/attendance');
                    else if (issue.toLowerCase().includes('leave')) navigate('/leave');
                    else if (issue.toLowerCase().includes('assignment')) navigate('/assignments');
                    else navigate('/ai-assistant');
                  }}
                  className="btn btn-outline btn-sm"
                  style={{
                    padding: '3px 10px',
                    fontSize: '0.74rem',
                    color: 'var(--primary)',
                    borderColor: 'rgba(59, 130, 246, 0.35)',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Resolve Now &rarr;
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 14px',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--success-border)',
              color: 'var(--success)',
              fontSize: '0.82rem',
              marginTop: '10px',
            }}
          >
            <CheckCircle2 size={16} />
            <span>Attendance records are aligned, all active workers have assignments, and no pending leave alerts detected.</span>
          </div>
        )}
      </div>

      {/* Main KPI Row */}
      <div className="stats-grid">
        <StatCard
          title="Total Workforce"
          value={stats?.totalWorkers || 0}
          subtitle={`${stats?.activeWorkers || 0} Active • ${stats?.inactiveWorkers || 0} Inactive`}
          icon={Users}
          color="var(--primary)"
          onClick={() => navigate('/workers')}
        />
        <StatCard
          title="Present Today"
          value={stats?.presentToday || 0}
          subtitle={`${stats?.halfDayToday || 0} Half Day Recorded`}
          icon={UserCheck}
          color="var(--success)"
          onClick={() => navigate('/attendance')}
        />
        <StatCard
          title="Absent Today"
          value={stats?.absentToday || 0}
          subtitle={`${stats?.onLeaveToday || 0} on Approved Leave`}
          icon={UserX}
          color="var(--danger)"
          onClick={() => navigate('/attendance')}
        />
        <StatCard
          title="Attendance Velocity"
          value={`${stats?.attendancePercentage || 0}%`}
          subtitle="Assigned workforce participation"
          icon={TrendingUp}
          color="var(--info)"
          trend={{
            isPositive: (stats?.attendancePercentage || 0) >= 75,
            label: `${stats?.attendancePercentage || 0}% rate`,
          }}
        />

        {isAdmin && (
          <>
            <StatCard
              title="Payroll Expenditure"
              value={`₹${parseFloat(stats?.totalPayrollExpenditure || '0').toLocaleString('en-IN')}`}
              subtitle="Calculated period wages"
              icon={Banknote}
              color="var(--purple)"
              onClick={() => navigate('/payroll')}
            />
            <StatCard
              title="Disbursed Payments"
              value={`₹${parseFloat(stats?.totalDisbursed || '0').toLocaleString('en-IN')}`}
              subtitle={`₹${parseFloat(stats?.outstandingPayable || '0').toLocaleString('en-IN')} Outstanding`}
              icon={Receipt}
              color="var(--success)"
              onClick={() => navigate('/payments')}
            />
          </>
        )}

        <StatCard
          title="Pending Leave"
          value={stats?.pendingLeaves || 0}
          subtitle="Awaiting supervisor review"
          icon={CalendarDays}
          color="var(--warning)"
          onClick={() => navigate('/leave')}
        />

        <StatCard
          title="Work Locations"
          value={stats?.totalSites || 0}
          subtitle={isAdmin ? 'Active operational sites' : 'Assigned supervisor facilities'}
          icon={MapPin}
          color="var(--primary)"
          onClick={() => navigate('/sites')}
        />
      </div>

      {/* Analytics Charts Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Attendance Trend Line/Area Chart */}
        <div className="card" style={{ padding: '22px' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h3 className="card-title" style={{ fontSize: '0.98rem' }}>Attendance Trends (Last 7 Days)</h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Shift-level participation: Present vs Absent headcount
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                Present
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--danger)' }} />
                Absent
              </span>
            </div>
          </div>
          <div style={{ height: '260px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.attendanceTrend || []} margin={{ top: 8, right: 12, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--success)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--danger)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-modal, #131C2E)',
                    borderColor: 'var(--border-medium)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
                  }}
                />
                <Area type="monotone" dataKey="present" stroke="var(--success)" strokeWidth={2} fillOpacity={1} fill="url(#presentGrad)" name="Present" />
                <Area type="monotone" dataKey="absent" stroke="var(--danger)" strokeWidth={2} fillOpacity={1} fill="url(#absentGrad)" name="Absent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workforce Distribution by Department */}
        <div className="card" style={{ padding: '22px' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h3 className="card-title" style={{ fontSize: '0.98rem' }}>Workforce by Department</h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Active personnel headcount allocated across departments
              </p>
            </div>
          </div>
          <div style={{ height: '260px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.departmentDistribution || []} margin={{ top: 8, right: 12, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} interval={0} angle={-15} textAnchor="end" height={45} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-modal, #131C2E)',
                    borderColor: 'var(--border-medium)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
                  }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Personnel" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Operations Quick Access Strip */}
      <div className="card" style={{ padding: '22px' }}>
        <h3 className="card-title" style={{ fontSize: '0.98rem', marginBottom: '14px' }}>
          Operations Quick Access
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <div
            onClick={() => navigate('/attendance')}
            className="card"
            style={{
              padding: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  padding: '9px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  color: 'var(--primary)',
                }}
              >
                <CalendarCheck2 size={18} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 600 }}>Daily Attendance</h4>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Mark & verify shifts</p>
              </div>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </div>

          <div
            onClick={() => navigate('/workers')}
            className="card"
            style={{
              padding: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  padding: '9px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--success)',
                }}
              >
                <Users size={18} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 600 }}>Workers Directory</h4>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Profiles, rates & status</p>
              </div>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </div>

          <div
            onClick={() => navigate('/leave')}
            className="card"
            style={{
              padding: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  padding: '9px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  color: 'var(--warning)',
                }}
              >
                <CalendarDays size={18} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 600 }}>Leave Requests</h4>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Review site requests</p>
              </div>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </div>

          {isAdmin && (
            <div
              onClick={() => navigate('/payroll')}
              className="card"
              style={{
                padding: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    padding: '9px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    color: 'var(--purple)',
                  }}
                >
                  <Banknote size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 600 }}>Payroll & Wages</h4>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Calculations & payouts</p>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
