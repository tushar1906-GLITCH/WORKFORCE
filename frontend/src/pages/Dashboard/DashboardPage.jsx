import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import aiApi from '../../api/ai';
import { useAuth } from '../../context/AuthContext';
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
  Briefcase,
  Wrench,
  Award,
  ArrowUpRight,
  Activity,
  Compass,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  Calendar,
  FileBarChart2,
  UserPlus,
  Settings,
  CircleDot,
  Radio,
  Sliders,
  DollarSign,
  TrendingDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

// Custom Glassmorphic Recharts Tooltip
const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: '#0F172A',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
          fontSize: '0.78rem',
          minWidth: '140px',
        }}
      >
        <div style={{ color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>{label}</div>
        {payload.map((entry, index) => (
          <div
            key={`tip-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginTop: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }} />
              <span style={{ color: 'var(--text-secondary)' }}>{entry.name}</span>
            </div>
            <span style={{ fontWeight: 700, color: '#FFF', fontFamily: 'var(--font-mono)' }}>
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const DashboardPage = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Primary Data States
  const [stats, setStats] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [sites, setSites] = useState([]);
  const [workersList, setWorkersList] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // UI Control States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('ALL');

  // Master Data Fetcher
  const fetchAllDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const promises = [
        apiClient.get('/reports/dashboard-stats').catch((err) => {
          console.warn('Dashboard stats error:', err);
          return null;
        }),
        aiApi.getCommandCenterInsights().catch((err) => {
          console.warn('AI Insights error:', err);
          return null;
        }),
        apiClient.get('/sites').catch(() => []),
        apiClient.get('/workers', { params: { limit: 200 } }).catch(() => ({ items: [] })),
        apiClient.get('/shifts').catch(() => []),
        apiClient.get('/assignments', { params: { status: 'ACTIVE' } }).catch(() => []),
      ];

      // Admin-only endpoints
      if (isAdmin) {
        promises.push(
          apiClient.get('/activity-logs', { params: { limit: 6 } }).catch(() => ({ items: [] })),
        );
        promises.push(apiClient.get('/payroll').catch(() => []));
      }

      const results = await Promise.all(promises);

      const [
        dashStats,
        aiData,
        sitesData,
        workersData,
        shiftsData,
        assignmentsData,
        activityData,
        payrollData,
      ] = results;

      if (dashStats) setStats(dashStats);
      if (aiData) setAiInsights(aiData);
      setSites(Array.isArray(sitesData) ? sitesData : []);
      setWorkersList(workersData?.items || []);
      setShifts(Array.isArray(shiftsData) ? shiftsData : []);
      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);

      if (isAdmin) {
        setActivityLogs(activityData?.items || []);
        setPayrollRuns(Array.isArray(payrollData) ? payrollData : []);
      }
    } catch (err) {
      setError(err.message || 'Failed to aggregate enterprise telemetry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllDashboardData();
  }, [isAdmin]);

  // Derived Workforce Intelligence Metrics
  const workforceBreakdown = useMemo(() => {
    const total = stats?.totalWorkers || workersList.length || 0;
    const active = stats?.activeWorkers || 0;
    const inactive = stats?.inactiveWorkers || Math.max(0, total - active);

    // Employment Classification
    const empCounts = {
      FULL_TIME: 0,
      CONTRACT: 0,
      DAILY_WAGE: 0,
      PART_TIME: 0,
    };
    workersList.forEach((w) => {
      const type = w.employmentType || 'CONTRACT';
      if (empCounts[type] !== undefined) empCounts[type]++;
      else empCounts.CONTRACT++;
    });

    // Skill Categories
    const skillCounts = {
      Skilled: 0,
      'Semi-Skilled': 0,
      Unskilled: 0,
      Specialist: 0,
    };
    workersList.forEach((w) => {
      const skillName = w.skillCategory?.name || 'General';
      if (skillCounts[skillName] !== undefined) skillCounts[skillName]++;
      else if (skillName.toLowerCase().includes('semi')) skillCounts['Semi-Skilled']++;
      else if (skillName.toLowerCase().includes('skill')) skillCounts['Skilled']++;
      else skillCounts.Unskilled++;
    });

    // Unassigned active workers
    const unassignedCount =
      aiInsights?.unassignedWorkers ??
      workersList.filter(
        (w) =>
          w.status === 'ACTIVE' &&
          (!w.assignments || w.assignments.filter((a) => a.status === 'ACTIVE').length === 0),
      ).length;

    return {
      total,
      active,
      inactive,
      empCounts,
      skillCounts,
      unassignedCount,
    };
  }, [stats, workersList, aiInsights]);

  // Derived Attendance Intelligence (Shift-Dependent)
  const attendanceMetrics = useMemo(() => {
    const present = stats?.presentToday || 0;
    const halfDay = stats?.halfDayToday || 0;
    const absent = stats?.absentToday || 0;
    const onLeave = stats?.onLeaveToday || 0;
    const notMarked = aiInsights?.notMarkedCount || 0;
    const rate = stats?.attendancePercentage || 0;

    // Total rostered population considered
    const scheduledTotal = present + halfDay + absent + onLeave + notMarked;

    return {
      present,
      halfDay,
      absent,
      onLeave,
      notMarked,
      rate,
      scheduledTotal: scheduledTotal > 0 ? scheduledTotal : stats?.activeWorkers || 0,
    };
  }, [stats, aiInsights]);

  // Derived Site Intelligence
  const siteTelemetry = useMemo(() => {
    return sites.map((site) => {
      const siteAssignments = assignments.filter((a) => a.workSiteId === site.id);
      const supervisors = site.supervisorSites?.map((ss) => ss.user?.fullName).filter(Boolean) || [];
      const isUnsupervised = site.status === 'ACTIVE' && supervisors.length === 0;

      return {
        id: site.id,
        name: site.name,
        code: site.code || `SIT-${site.id.slice(0, 4).toUpperCase()}`,
        address: site.address,
        status: site.status,
        assignedCount: siteAssignments.length,
        supervisors,
        isUnsupervised,
      };
    });
  }, [sites, assignments]);

  // Derived Needs Your Attention Alert Queue
  const actionItems = useMemo(() => {
    const items = [];

    // 1. Unmarked Attendance Alert
    if (attendanceMetrics.notMarked > 0) {
      items.push({
        id: 'unmarked-attendance',
        title: 'Unfinalized Shift Attendance',
        description: 'Scheduled active workforce has not had daily attendance submitted or verified.',
        count: `${attendanceMetrics.notMarked} Worker${attendanceMetrics.notMarked > 1 ? 's' : ''}`,
        severity: 'warning',
        actionLabel: 'Mark Attendance',
        route: '/attendance',
      });
    }

    // 2. Pending Leave Approvals
    const pendingLeaveCount = stats?.pendingLeaves || aiInsights?.pendingLeaveCount || 0;
    if (pendingLeaveCount > 0) {
      items.push({
        id: 'pending-leaves',
        title: 'Pending Leave Applications',
        description: 'Personnel absence requests require supervisor review or administrative sign-off.',
        count: `${pendingLeaveCount} Request${pendingLeaveCount > 1 ? 's' : ''}`,
        severity: 'warning',
        actionLabel: 'Review Requests',
        route: '/leave',
      });
    }

    // 3. Unassigned Active Workforce
    if (workforceBreakdown.unassignedCount > 0) {
      items.push({
        id: 'unassigned-workers',
        title: 'Unassigned Active Personnel',
        description: 'Active workers on roster currently lack an active facility and shift assignment.',
        count: `${workforceBreakdown.unassignedCount} Personnel`,
        severity: 'info',
        actionLabel: 'Assign Workers',
        route: '/assignments',
      });
    }

    // 4. Unsupervised Facilities
    const unsupervisedSites = siteTelemetry.filter((s) => s.isUnsupervised);
    if (unsupervisedSites.length > 0) {
      items.push({
        id: 'unsupervised-sites',
        title: 'Facilities Lacking Supervision',
        description: 'Active work sites operating without designated supervisor coverage.',
        count: `${unsupervisedSites.length} Location${unsupervisedSites.length > 1 ? 's' : ''}`,
        severity: 'danger',
        actionLabel: 'Assign Supervisor',
        route: '/sites',
      });
    }

    // 5. Draft Payroll Batches (Admin Only)
    if (isAdmin) {
      const draftPayroll = payrollRuns.filter((p) => p.status === 'DRAFT');
      if (draftPayroll.length > 0) {
        items.push({
          id: 'draft-payroll',
          title: 'Draft Payroll Awaiting Finalization',
          description: 'Calculated payroll runs remain in draft state awaiting lock and disbursement.',
          count: `${draftPayroll.length} Period${draftPayroll.length > 1 ? 's' : ''}`,
          severity: 'purple',
          actionLabel: 'Open Payroll',
          route: '/payroll',
        });
      }
    }

    return items;
  }, [attendanceMetrics, stats, aiInsights, workforceBreakdown, siteTelemetry, payrollRuns, isAdmin]);

  // Current Date Formatter
  const currentDateFormatted = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  // Loading Skeleton View
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ height: '90px', borderRadius: 'var(--radius-lg)' }} className="skeleton" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div style={{ height: '110px', borderRadius: 'var(--radius-md)' }} className="skeleton" />
          <div style={{ height: '110px', borderRadius: 'var(--radius-md)' }} className="skeleton" />
          <div style={{ height: '110px', borderRadius: 'var(--radius-md)' }} className="skeleton" />
          <div style={{ height: '110px', borderRadius: 'var(--radius-md)' }} className="skeleton" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          <div style={{ height: '320px', borderRadius: 'var(--radius-lg)' }} className="skeleton" />
          <div style={{ height: '320px', borderRadius: 'var(--radius-lg)' }} className="skeleton" />
        </div>
      </div>
    );
  }

  // Error State View
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
          gap: '16px',
        }}
      >
        <AlertTriangle size={28} />
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Command Center Telemetry Offline</h3>
          <p style={{ fontSize: '0.84rem', marginTop: '4px', color: 'var(--text-secondary)' }}>{error}</p>
        </div>
        <button onClick={() => fetchAllDashboardData()} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} /> Retry Connection
        </button>
      </div>
    );
  }

  const isAllSystemsNominal = actionItems.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* =========================================================================
          SECTION 1: ADMIN COMMAND HEADER
          ========================================================================= */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top Electric Accent Line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, #3B82F6 0%, #06B6D4 50%, #8B5CF6 100%)',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Left Title & Status */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: 'var(--primary)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  padding: '3px 9px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                }}
              >
                <Compass size={13} />
                <span>WORKFORCE COMMAND // OPERATIONS NEXUS</span>
              </div>

              {/* Live Operational Status Indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 9px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  backgroundColor: isAllSystemsNominal ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  border: `1px solid ${isAllSystemsNominal ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  color: isAllSystemsNominal ? 'var(--success)' : 'var(--warning)',
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: isAllSystemsNominal ? 'var(--success)' : 'var(--warning)',
                    boxShadow: isAllSystemsNominal ? '0 0 8px var(--success)' : '0 0 8px var(--warning)',
                  }}
                />
                <span>{isAllSystemsNominal ? 'ALL SYSTEMS NOMINAL' : `${actionItems.length} ACTIONABLE BENCHMARKS`}</span>
              </div>
            </div>

            <div style={{ marginTop: '8px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFF', letterSpacing: '-0.02em', margin: 0 }}>
                {isAdmin
                  ? `Welcome, ${user?.fullName || 'Administrator'}`
                  : `Site Operations // ${user?.fullName || 'Supervisor'}`}
              </h1>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
                {isAdmin
                  ? `Organisation-wide telemetry: ${workforceBreakdown.active} active personnel deployed across ${sites.length} operational facilities`
                  : `Assigned locations: ${user?.assignedSites?.map((s) => s.name).join(', ') || 'All Assigned Sites'}`}
              </p>
            </div>
          </div>

          {/* Right Date & Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <Calendar size={14} style={{ color: 'var(--primary)' }} />
              <span>{currentDateFormatted}</span>
            </div>

            <button
              onClick={() => fetchAllDashboardData(true)}
              disabled={refreshing}
              className="btn btn-secondary btn-sm"
              title="Refresh Live Telemetry"
              style={{ height: '36px', padding: '0 12px' }}
            >
              <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
            </button>

            <button
              onClick={() => navigate('/attendance')}
              className="btn btn-primary btn-sm"
              style={{ height: '36px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CalendarCheck2 size={15} />
              <span>Mark Attendance</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: ADMIN ACTION CENTER ("Needs Your Attention") + AI OPERATIONS
          ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: actionItems.length > 0 ? '1.8fr 1.2fr' : '1fr 1fr',
          gap: '20px',
        }}
      >
        {/* Needs Your Attention Console */}
        <div
          className="card"
          style={{
            padding: '20px',
            backgroundColor: 'rgba(17, 24, 39, 0.85)',
            border: actionItems.length > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-subtle)',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: actionItems.length > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: actionItems.length > 0 ? 'var(--warning)' : 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {actionItems.length > 0 ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
              </div>
              <div>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#FFF', margin: 0 }}>
                  Needs Your Attention
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Unresolved administrative bottlenecks & operational alerts
                </span>
              </div>
            </div>

            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: actionItems.length > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: actionItems.length > 0 ? 'var(--warning)' : 'var(--success)',
                border: `1px solid ${actionItems.length > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              }}
            >
              {actionItems.length} PENDING
            </span>
          </div>

          {actionItems.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={24} />
              </div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                All Operational Benchmarks Optimal
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '380px', margin: 0 }}>
                Shift attendance is verified, no leave requests are pending review, and all active personnel have facility assignments.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {actionItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.84rem', color: '#FFF' }}>
                        {item.title}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor:
                            item.severity === 'danger'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : item.severity === 'warning'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(59, 130, 246, 0.15)',
                          color:
                            item.severity === 'danger'
                              ? 'var(--danger)'
                              : item.severity === 'warning'
                              ? 'var(--warning)'
                              : 'var(--primary)',
                        }}
                      >
                        {item.count}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: '0.74rem',
                        color: 'var(--text-secondary)',
                        marginTop: '2px',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.description}
                    </p>
                  </div>

                  <button
                    onClick={() => navigate(item.route)}
                    className="btn btn-outline btn-sm"
                    style={{
                      fontSize: '0.75rem',
                      padding: '4px 10px',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      borderColor: 'rgba(59, 130, 246, 0.35)',
                      color: 'var(--primary)',
                    }}
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Operations Intelligence Console */}
        <div
          className="card"
          style={{
            padding: '20px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#FFF', margin: 0 }}>
                    AI Operations Telemetry
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Groq LLaMA 3.3 70B &bull; Transactional PostgreSQL Inference
                  </span>
                </div>
              </div>

              <span
                style={{
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                }}
              >
                LIVE
              </span>
            </div>

            {/* Quick Diagnostic Insights */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
              <div
                style={{
                  padding: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ATTENDANCE RATE</div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: attendanceMetrics.rate >= 75 ? 'var(--success)' : 'var(--warning)',
                    fontFamily: 'var(--font-mono)',
                    marginTop: '2px',
                  }}
                >
                  {attendanceMetrics.rate}%
                </div>
              </div>

              <div
                style={{
                  padding: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>UNASSIGNED WORKERS</div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: workforceBreakdown.unassignedCount > 0 ? 'var(--warning)' : 'var(--success)',
                    fontFamily: 'var(--font-mono)',
                    marginTop: '2px',
                  }}
                >
                  {workforceBreakdown.unassignedCount}
                </div>
              </div>
            </div>

            {/* Diagnostic Message */}
            <p
              style={{
                fontSize: '0.76rem',
                color: 'var(--text-secondary)',
                marginTop: '12px',
                lineHeight: 1.45,
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                margin: '12px 0 0 0',
              }}
            >
              {aiInsights?.actionableIssues && aiInsights.actionableIssues.length > 0
                ? aiInsights.actionableIssues[0]
                : 'AI telemetry reports stable operational equilibrium across all reporting site channels.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
            <button
              onClick={() => navigate('/ai-assistant')}
              className="btn btn-primary btn-sm"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Bot size={14} />
              <span>Launch AI Command Nexus</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: WORKFORCE INTELLIGENCE (Major Section)
          ========================================================================= */}
      <div
        className="card"
        style={{
          padding: '24px',
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(22, 30, 46, 0.8) 100%)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFF', margin: 0 }}>
                Workforce Intelligence
              </h2>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
              Real-time headcount telemetry, department allocations, employment classifications, and skill matrices
            </p>
          </div>

          <button
            onClick={() => navigate('/workers')}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>Personnel Roster</span>
            <ExternalLink size={13} />
          </button>
        </div>

        {/* 3-Column Intelligence Composition */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(240px, 1.2fr) minmax(280px, 1.8fr) minmax(260px, 1.5fr)',
            gap: '24px',
          }}
        >
          {/* Column A: Primary Volume Metrics */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              borderRight: '1px solid var(--border-subtle)',
              paddingRight: '20px',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.04em' }}>
                TOTAL REGISTERED WORKFORCE
              </div>
              <div
                style={{
                  fontSize: '2.4rem',
                  fontWeight: 900,
                  color: '#FFF',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '-0.03em',
                  marginTop: '4px',
                  lineHeight: 1,
                }}
              >
                {workforceBreakdown.total}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Total personnel registered on system database
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600 }}>ACTIVE</div>
                <div
                  style={{
                    fontSize: '1.45rem',
                    fontWeight: 800,
                    color: '#FFF',
                    fontFamily: 'var(--font-mono)',
                    marginTop: '2px',
                  }}
                >
                  {workforceBreakdown.active}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {workforceBreakdown.total > 0
                    ? Math.round((workforceBreakdown.active / workforceBreakdown.total) * 100)
                    : 0}
                  % of total roster
                </div>
              </div>

              <div
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600 }}>INACTIVE</div>
                <div
                  style={{
                    fontSize: '1.45rem',
                    fontWeight: 800,
                    color: '#FFF',
                    fontFamily: 'var(--font-mono)',
                    marginTop: '2px',
                  }}
                >
                  {workforceBreakdown.inactive}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Suspended / Left
                </div>
              </div>
            </div>
          </div>

          {/* Column B: Department Allocation Breakdown */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              borderRight: '1px solid var(--border-subtle)',
              paddingRight: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                DEPARTMENT ALLOCATION
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {stats?.departmentDistribution?.length || 0} Departments
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {stats?.departmentDistribution && stats.departmentDistribution.length > 0 ? (
                stats.departmentDistribution.map((dept, idx) => {
                  const pct =
                    workforceBreakdown.active > 0
                      ? Math.round((dept.count / workforceBreakdown.active) * 100)
                      : 0;

                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{dept.name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                          {dept.count} <span style={{ color: 'var(--text-muted)' }}>({pct}%)</span>
                        </span>
                      </div>
                      <div
                        style={{
                          height: '5px',
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, #3B82F6 0%, #06B6D4 100%)',
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>No departments registered.</div>
              )}
            </div>
          </div>

          {/* Column C: Employment Classification & Skill Tier */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Employment Classification */}
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                EMPLOYMENT CLASSIFICATION
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>FULL-TIME</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFF', fontFamily: 'var(--font-mono)' }}>
                    {workforceBreakdown.empCounts.FULL_TIME}
                  </div>
                </div>

                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>CONTRACTOR</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFF', fontFamily: 'var(--font-mono)' }}>
                    {workforceBreakdown.empCounts.CONTRACT}
                  </div>
                </div>

                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>DAILY WAGE</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFF', fontFamily: 'var(--font-mono)' }}>
                    {workforceBreakdown.empCounts.DAILY_WAGE}
                  </div>
                </div>

                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>PART-TIME</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFF', fontFamily: 'var(--font-mono)' }}>
                    {workforceBreakdown.empCounts.PART_TIME}
                  </div>
                </div>
              </div>
            </div>

            {/* Skill Tier Breakdown */}
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                SKILL CLASSIFICATION
              </span>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <span
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    fontSize: '0.74rem',
                    color: 'var(--primary)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                  }}
                >
                  Skilled: {workforceBreakdown.skillCounts.Skilled}
                </span>
                <span
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    fontSize: '0.74rem',
                    color: 'var(--warning)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                  }}
                >
                  Semi: {workforceBreakdown.skillCounts['Semi-Skilled']}
                </span>
                <span
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(148, 163, 184, 0.1)',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                  }}
                >
                  Unskilled: {workforceBreakdown.skillCounts.Unskilled}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 4: ATTENDANCE INTELLIGENCE & SHIFT COMMAND (Shift-Dependent)
          ========================================================================= */}
      <div
        className="card"
        style={{
          padding: '24px',
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(22, 30, 46, 0.8) 100%)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '18px',
            flexWrap: 'wrap',
            gap: '12px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} style={{ color: 'var(--success)' }} />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFF', margin: 0 }}>
                Attendance Intelligence & Shift Command
              </h2>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
              Shift-dependent presence calculations evaluated against eligible scheduled personnel
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: 'var(--success)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              ELIGIBLE DENOMINATOR: {attendanceMetrics.scheduledTotal} WORKERS
            </span>
            <button
              onClick={() => navigate('/attendance')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem' }}
            >
              Verify Shift Ledger &rarr;
            </button>
          </div>
        </div>

        {/* Attendance Breakdown Grid & 7-Day Trend Chart */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 1.2fr) minmax(400px, 2.2fr)',
            gap: '24px',
          }}
        >
          {/* Status Metric Blocks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Today's Overall Rate Display */}
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  TODAY'S ATTENDANCE VELOCITY
                </div>
                <div
                  style={{
                    fontSize: '2.2rem',
                    fontWeight: 900,
                    fontFamily: 'var(--font-mono)',
                    color: attendanceMetrics.rate >= 75 ? 'var(--success)' : 'var(--warning)',
                    marginTop: '2px',
                    lineHeight: 1,
                  }}
                >
                  {attendanceMetrics.rate}%
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Weighted presence of scheduled active workforce
                </div>
              </div>

              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: `4px solid ${attendanceMetrics.rate >= 75 ? 'var(--success)' : 'var(--warning)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#FFF',
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                }}
              >
                {attendanceMetrics.rate}%
              </div>
            </div>

            {/* 5-Status Headcount Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {/* Present */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Present</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {attendanceMetrics.present}
                </div>
              </div>

              {/* Half-Day */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--warning)' }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Half-Day</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {attendanceMetrics.halfDay}
                </div>
              </div>

              {/* Absent */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--danger)' }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Absent</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {attendanceMetrics.absent}
                </div>
              </div>

              {/* On Leave */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--purple)' }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>On Leave</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {attendanceMetrics.onLeave}
                </div>
              </div>
            </div>

            {/* Shift Context Alert Callout */}
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
              }}
            >
              <strong style={{ color: 'var(--text-secondary)' }}>Notice:</strong> Attendance is strictly shift-dependent. Personnel rostered to other shifts or other facility locations are excluded from this denominator.
            </div>
          </div>

          {/* 7-Day Attendance Trend Chart */}
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFF', margin: 0 }}>
                  7-Day Attendance Trajectory
                </h4>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Present vs Absent Headcount across all operating facilities
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                  Present
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--danger)' }} />
                  Absent
                </span>
              </div>
            </div>

            <div style={{ height: '220px', width: '100%', marginTop: 'auto' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats?.attendanceTrend || []}
                  margin={{ top: 8, right: 10, left: -22, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="absentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 2" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis
                    dataKey="date"
                    stroke="var(--text-muted)"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => val.slice(5)}
                  />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="present"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#presentGradient)"
                    name="Present"
                  />
                  <Area
                    type="monotone"
                    dataKey="absent"
                    stroke="#EF4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#absentGradient)"
                    name="Absent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 5: ORGANISATION-WIDE SITE INTELLIGENCE
          ========================================================================= */}
      <div
        className="card"
        style={{
          padding: '24px',
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(22, 30, 46, 0.8) 100%)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFF', margin: 0 }}>
                Organisation-Wide Site Intelligence
              </h2>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
              Operating facilities deployment matrix, supervisor coverage, and site-level headcount
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                color: 'var(--primary)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {siteTelemetry.filter((s) => s.status === 'ACTIVE').length} / {siteTelemetry.length} SITES ACTIVE
            </span>
            <button
              onClick={() => navigate('/sites')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem' }}
            >
              Manage Work Locations &rarr;
            </button>
          </div>
        </div>

        {/* Site Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {siteTelemetry.map((site) => (
            <div
              key={site.id}
              onClick={() => navigate('/sites')}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: site.isUnsupervised
                  ? '1px solid rgba(239, 68, 68, 0.35)'
                  : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.68rem',
                      color: 'var(--text-muted)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      padding: '2px 5px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {site.code}
                  </span>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFF', marginTop: '4px', margin: '4px 0 0 0' }}>
                    {site.name}
                  </h4>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      marginTop: '4px',
                    }}
                  >
                    <MapPin size={11} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                      {site.address || 'Address unassigned'}
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor:
                      site.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                    color: site.status === 'ACTIVE' ? 'var(--success)' : 'var(--text-muted)',
                    border: `1px solid ${site.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-subtle)'}`,
                  }}
                >
                  {site.status}
                </span>
              </div>

              {/* Personnel & Supervision Ribbons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '14px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Assigned Workforce:</span>{' '}
                  <strong style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                    {site.assignedCount}
                  </strong>
                </div>

                <div>
                  {site.isUnsupervised ? (
                    <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.72rem' }}>
                      Unsupervised
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                      {site.supervisors[0] || 'Supervised'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          SECTION 6: FINANCIAL OVERVIEW (Admin-Only)
          ========================================================================= */}
      {isAdmin && (
        <div
          className="card"
          style={{
            padding: '22px',
            background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(22, 30, 46, 0.8) 100%)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Banknote size={18} style={{ color: 'var(--purple)' }} />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFF', margin: 0 }}>
                  Financial Operations & Payroll Liquidity
                </h2>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
                Aggregated period wage expenditure, worker disbursements, and outstanding liabilities
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => navigate('/payroll')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.78rem' }}
              >
                Payroll Runs &rarr;
              </button>
              <button
                onClick={() => navigate('/payments')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.78rem' }}
              >
                Disbursements &rarr;
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Total Period Payroll Expenditure */}
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
              }}
            >
              <div style={{ fontSize: '0.74rem', color: 'var(--purple)', fontWeight: 600 }}>
                CALCULATED PERIOD EXPENDITURE
              </div>
              <div
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  color: '#FFF',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '-0.02em',
                  marginTop: '4px',
                }}
              >
                ₹{parseFloat(stats?.totalPayrollExpenditure || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Gross wage obligations computed from shift attendance
              </div>
            </div>

            {/* Total Disbursed */}
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              <div style={{ fontSize: '0.74rem', color: 'var(--success)', fontWeight: 600 }}>
                TOTAL AMOUNT DISBURSED
              </div>
              <div
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  color: '#FFF',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '-0.02em',
                  marginTop: '4px',
                }}
              >
                ₹{parseFloat(stats?.totalDisbursed || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Executed payouts recorded via bank transfer / cash
              </div>
            </div>

            {/* Outstanding Payable */}
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
              }}
            >
              <div style={{ fontSize: '0.74rem', color: 'var(--warning)', fontWeight: 600 }}>
                OUTSTANDING PAYABLE LIABILITY
              </div>
              <div
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  color: '#FFF',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '-0.02em',
                  marginTop: '4px',
                }}
              >
                ₹{parseFloat(stats?.outstandingPayable || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Pending wage disbursements awaiting settlement
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 7: WORKFORCE ACTIVITY TIMELINE + ADMIN QUICK ACTIONS
          ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isAdmin ? '1.4fr 1fr' : '1fr',
          gap: '20px',
        }}
      >
        {/* Workforce Activity Timeline (Admin Only) */}
        {isAdmin && (
          <div
            className="card"
            style={{
              padding: '20px',
              backgroundColor: 'rgba(17, 24, 39, 0.85)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={17} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#FFF', margin: 0 }}>
                  Workforce Activity Audit Stream
                </h3>
              </div>
              <button
                onClick={() => navigate('/activity-logs')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem' }}
              >
                Full Audit Trail &rarr;
              </button>
            </div>

            {activityLogs.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No recent system activity recorded.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activityLogs.map((log) => {
                  const actionColor = log.action?.includes('REOPEN')
                    ? 'var(--danger)'
                    : log.action?.includes('APPROVED') || log.action?.includes('SAVED')
                    ? 'var(--success)'
                    : 'var(--primary)';

                  return (
                    <div
                      key={log.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.78rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            color: actionColor,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {log.action}
                        </span>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#FFF', fontWeight: 600 }}>{log.entityType}</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>
                            by {log.userEmail || 'System'}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Admin Quick Operations Launcher */}
        <div
          className="card"
          style={{
            padding: '20px',
            backgroundColor: 'rgba(17, 24, 39, 0.85)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={17} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#FFF', margin: 0 }}>
                Operations Launcher
              </h3>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>QUICK COMMANDS</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
            }}
          >
            <button
              onClick={() => navigate('/workers')}
              className="card"
              style={{
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <UserPlus size={16} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FFF' }}>Register Worker</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Onboard personnel</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/attendance')}
              className="card"
              style={{
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <CalendarCheck2 size={16} color="var(--success)" />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FFF' }}>Daily Attendance</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Shift verify & lock</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/assignments')}
              className="card"
              style={{
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <Briefcase size={16} color="var(--info)" />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FFF' }}>Site Assignments</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Deploy & transfer</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/leave')}
              className="card"
              style={{
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <CalendarDays size={16} color="var(--warning)" />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FFF' }}>Leave Requests</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Review approvals</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/sites')}
              className="card"
              style={{
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <MapPin size={16} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FFF' }}>Work Locations</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Facilities & sites</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/reports')}
              className="card"
              style={{
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <FileBarChart2 size={16} color="var(--purple)" />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FFF' }}>Audit Reports</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CSV exports & analytics</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
