import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import aiApi from '../../api/ai';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
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
  Legend,
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

  useEffect(() => {
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
    fetchDashboard();
    fetchAiInsights();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading enterprise dashboard data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ color: 'var(--danger)', padding: '24px' }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isAdmin ? 'Executive Workforce Dashboard' : 'Site Supervisor Dashboard'}
          </h1>
          <p className="page-description">
            {isAdmin
              ? 'Organization-wide live labour statistics, attendance velocity and payroll summaries'
              : `Site-scoped view for assigned locations: ${user?.assignedSites?.map((s) => s.name).join(', ') || 'No locations assigned'}`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/attendance')}
            className="btn btn-primary"
          >
            <CalendarCheck2 size={16} /> Mark Today's Attendance
          </button>
          <button
            onClick={() => navigate('/workers')}
            className="btn btn-secondary"
          >
            <Users size={16} /> Workers Directory
          </button>
        </div>
      </div>

      {/* AI Operations Command Center Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
          marginBottom: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                  AI Operations Command Center
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: (aiInsights?.actionableIssues?.length || 0) > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: (aiInsights?.actionableIssues?.length || 0) > 0 ? 'var(--warning)' : 'var(--success)',
                    border: `1px solid ${(aiInsights?.actionableIssues?.length || 0) > 0 ? 'var(--warning-border)' : 'var(--success-border)'}`,
                  }}
                >
                  {(aiInsights?.actionableIssues?.length || 0) > 0 ? `${aiInsights.actionableIssues.length} Attention Item(s)` : 'All Systems Optimal'}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Live operational intelligence synthesized from PostgreSQL tables &bull; Updated just now
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={fetchAiInsights}
              disabled={loadingAi}
              className="btn btn-secondary btn-sm"
              title="Refresh AI Insights"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => navigate('/ai-assistant')}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Bot size={14} />
              <span>Ask AI Assistant</span>
            </button>
          </div>
        </div>

        {/* Actionable Issues / Insights Strip */}
        {aiInsights?.actionableIssues && aiInsights.actionableIssues.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            {aiInsights.actionableIssues.map((issue, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: '0.84rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <AlertTriangle size={15} color="var(--warning)" />
                  <span>{issue}</span>
                </div>
                <button
                  onClick={() => {
                    if (issue.includes('attendance')) navigate('/attendance');
                    else if (issue.includes('leave')) navigate('/leave');
                    else if (issue.includes('assignment')) navigate('/assignments');
                    else navigate('/ai-assistant');
                  }}
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: '#93C5FD',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    fontWeight: 600,
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
              padding: '10px 14px',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--success-border)',
              color: 'var(--success)',
              fontSize: '0.84rem',
            }}
          >
            <CheckCircle2 size={16} />
            <span>Attendance is current, all active workers have assignments, and no pending leave alerts detected.</span>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Workforce"
          value={stats?.totalWorkers || 0}
          subtitle={`${stats?.activeWorkers || 0} Active / ${stats?.inactiveWorkers || 0} Inactive`}
          icon={Users}
          color="var(--primary)"
        />
        <StatCard
          title="Present Today"
          value={stats?.presentToday || 0}
          subtitle={`${stats?.halfDayToday || 0} Half Day`}
          icon={UserCheck}
          color="var(--success)"
        />
        <StatCard
          title="Absent Today"
          value={stats?.absentToday || 0}
          subtitle={`${stats?.onLeaveToday || 0} on Approved Leave`}
          icon={UserX}
          color="var(--danger)"
        />
        <StatCard
          title="Attendance Rate"
          value={`${stats?.attendancePercentage || 0}%`}
          subtitle="Based on eligible assigned workforce"
          icon={TrendingUp}
          color="var(--info)"
        />

        {isAdmin && (
          <>
            <StatCard
              title="Payroll Expenditure"
              value={`₹${parseFloat(stats?.totalPayrollExpenditure || '0').toLocaleString()}`}
              subtitle="Total calculated payroll runs"
              icon={Banknote}
              color="var(--purple)"
            />
            <StatCard
              title="Disbursed Payments"
              value={`₹${parseFloat(stats?.totalDisbursed || '0').toLocaleString()}`}
              subtitle={`₹${parseFloat(stats?.outstandingPayable || '0').toLocaleString()} Outstanding`}
              icon={Receipt}
              color="var(--success)"
            />
          </>
        )}

        <StatCard
          title="Pending Leave"
          value={stats?.pendingLeaves || 0}
          subtitle="Awaiting supervisor review"
          icon={CalendarDays}
          color="var(--warning)"
        />

        <StatCard
          title="Work Locations"
          value={stats?.totalSites || 0}
          subtitle={isAdmin ? 'Active project sites' : 'Assigned supervisor sites'}
          icon={MapPin}
          color="var(--primary)"
        />
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Attendance Trend Line/Area Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Attendance Trends (Last 7 Days)</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Daily count of Present, Absent and Half-Day personnel
              </p>
            </div>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.attendanceTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--success)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--danger)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-modal)',
                    borderColor: 'var(--border-medium)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#FFF',
                  }}
                />
                <Area type="monotone" dataKey="present" stroke="var(--success)" fillOpacity={1} fill="url(#presentGrad)" name="Present" />
                <Area type="monotone" dataKey="absent" stroke="var(--danger)" fillOpacity={1} fill="url(#absentGrad)" name="Absent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workforce Distribution by Department */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Workforce by Department</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Total registered workers allocated across business units
              </p>
            </div>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.departmentDistribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} interval={0} angle={-15} textAnchor="end" height={45} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-modal)',
                    borderColor: 'var(--border-medium)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#FFF',
                  }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Workers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Panels */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '16px' }}>Core Operations Quick Access</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
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
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                <CalendarCheck2 size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 600 }}>Daily Attendance</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Individual & bulk marking workflow</p>
              </div>
            </div>
            <ArrowRight size={18} color="var(--text-muted)" />
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
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                <Users size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 600 }}>Workers Directory</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Profiles, wage rates & assignments</p>
              </div>
            </div>
            <ArrowRight size={18} color="var(--text-muted)" />
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
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
                <CalendarDays size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 600 }}>Leave Requests</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Record & review site leaves</p>
              </div>
            </div>
            <ArrowRight size={18} color="var(--text-muted)" />
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
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: 'var(--purple)' }}>
                  <Banknote size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 600 }}>Payroll & Wages</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Run calculation & approvals</p>
                </div>
              </div>
              <ArrowRight size={18} color="var(--text-muted)" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
