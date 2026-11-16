import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  FileBarChart2,
  Download,
  Filter,
  Calendar,
  MapPin,
  Sparkles,
  Bot,
  Printer,
  CheckCircle2,
  TrendingUp,
  BarChart2,
  Users,
  Clock,
  Layers,
  Building,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import MarkdownContent from '../../components/ai/MarkdownContent';
import aiApi from '../../api/ai';

export const ReportsPage = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [sites, setSites] = useState([]);
  const [reportType, setReportType] = useState('attendance'); // 'attendance' | 'workers' | 'site-comparison' | 'daily-operations'
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSiteId, setSelectedSiteId] = useState('');

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [siteComparisons, setSiteComparisons] = useState([]);
  const [dailySnapshot, setDailySnapshot] = useState(null);
  const [aiBriefing, setAiBriefing] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);

  useEffect(() => {
    apiClient.get('/sites').then(setSites).catch(console.error);
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (reportType === 'attendance') {
        const res = await apiClient.get('/reports/attendance', {
          params: {
            startDate,
            endDate,
            workSiteId: selectedSiteId || undefined,
          },
        });
        setData(res || []);
      } else if (reportType === 'workers') {
        const res = await apiClient.get('/workers', { params: { limit: 100 } });
        setData(res?.items || []);
      } else if (reportType === 'site-comparison') {
        const [sitesRes, assignmentsRes, attendanceRes] = await Promise.all([
          apiClient.get('/sites', { params: { status: 'ACTIVE' } }),
          apiClient.get('/assignments', { params: { status: 'ACTIVE' } }),
          apiClient.get('/attendance', { params: { date: new Date().toISOString().split('T')[0] } }),
        ]);

        const comp = (sitesRes || []).map((site) => {
          const siteAssignments = (assignmentsRes || []).filter((a) => a.workSiteId === site.id);
          const siteAtt = (attendanceRes || []).filter((att) => att.workSiteId === site.id);
          const present = siteAtt.filter((a) => a.status === 'PRESENT').length;
          const halfDay = siteAtt.filter((a) => a.status === 'HALF_DAY').length;
          const absent = siteAtt.filter((a) => a.status === 'ABSENT').length;
          const scheduled = Math.max(siteAssignments.length, siteAtt.length);
          const rate = scheduled > 0 ? (((present + 0.5 * halfDay) / scheduled) * 100).toFixed(1) + '%' : '0%';

          return {
            id: site.id,
            name: site.name,
            address: site.address,
            scheduled,
            present,
            halfDay,
            absent,
            rate,
            supervisorCount: site.supervisorSites?.length || 0,
          };
        });
        setSiteComparisons(comp);
      } else if (reportType === 'daily-operations') {
        const [dashStats, insights] = await Promise.all([
          apiClient.get('/reports/dashboard-stats'),
          aiApi.getCommandCenterInsights(),
        ]);
        setDailySnapshot({ dashStats, insights });
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAiBriefing = async () => {
    setGeneratingAi(true);
    try {
      const res = await aiApi.sendMessage('Generate a comprehensive daily operations briefing summarizing workforce attendance, shift performance, site deployment, and open actionable items.');
      setAiBriefing(res.message?.content || 'No summary returned.');
    } catch (err) {
      showToast('AI Briefing failed: ' + err.message, 'error');
    } finally {
      setGeneratingAi(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, startDate, endDate, selectedSiteId]);

  const handleExportCsv = () => {
    const token = localStorage.getItem('shramsetu_token') || localStorage.getItem('workforce_token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

    let exportUrl = '';
    if (reportType === 'attendance') {
      exportUrl = `${baseUrl}/reports/attendance/export-csv?startDate=${startDate}&endDate=${endDate}`;
      if (selectedSiteId) exportUrl += `&workSiteId=${selectedSiteId}`;
    } else {
      exportUrl = `${baseUrl}/reports/workers/export-csv`;
    }

    fetch(exportUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('CSV export downloaded successfully!', 'success');
      })
      .catch((err) => showToast('Failed to export CSV: ' + err.message, 'error'));
  };

  const reportTabs = [
    { id: 'attendance', label: 'Attendance Ledger', icon: Calendar, description: 'Shift-level check-ins, overtime, and work site logs' },
    { id: 'workers', label: 'Worker Roster', icon: Users, description: 'Personnel directory, compliance, and employment records' },
    { id: 'site-comparison', label: 'Site Performance', icon: Building, description: 'Cross-site deployment compliance and coverage matrix' },
    { id: 'daily-operations', label: 'Daily Operations & AI', icon: Sparkles, description: 'Synthesized intelligence briefing and shift telemetry' },
  ];

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Live operational telemetry, audit-grade ledgers, cross-facility performance benchmarks, and CSV data exports"
        actions={
          <>
            <button
              onClick={() => window.print()}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Printer size={15} />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
          </>
        }
      />

      {/* Navigation Pill Tabs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = reportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id)}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                borderColor: isActive ? 'var(--primary)' : 'var(--border-subtle)',
                background: isActive ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(30, 41, 59, 0.5) 100%)' : 'var(--bg-card)',
                boxShadow: isActive ? '0 0 0 1px var(--primary), 0 4px 12px rgba(59, 130, 246, 0.15)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                  color: isActive ? '#FFF' : 'var(--text-secondary)',
                  flexShrink: 0,
                }}
              >
                <Icon size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: isActive ? '#FFF' : 'var(--text-primary)' }}>
                  {tab.label}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
                  {tab.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Scoped Filter Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '14px',
          background: 'var(--bg-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
          <Filter size={15} />
          <span>SCOPE FILTERS:</span>
        </div>

        {reportType === 'attendance' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>From:</span>
              <input
                type="date"
                className="form-control"
                style={{ width: '150px', padding: '6px 10px', fontSize: '0.82rem' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>To:</span>
              <input
                type="date"
                className="form-control"
                style={{ width: '150px', padding: '6px 10px', fontSize: '0.82rem' }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px' }}>
          <MapPin size={15} style={{ color: 'var(--text-muted)' }} />
          <select
            className="form-control"
            style={{ padding: '6px 10px', fontSize: '0.82rem' }}
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
          >
            <option value="">All Operating Facilities</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchReport}
          className="btn btn-secondary btn-sm"
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Query</span>
        </button>
      </div>

      {/* Results View */}
      {loading ? (
        <TableSkeleton rows={8} cols={reportType === 'attendance' ? 8 : reportType === 'workers' ? 7 : 6} />
      ) : reportType === 'attendance' ? (
        data.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No Attendance Logs Found"
            description="No shift attendance records match the selected date window and facility parameters."
          />
        ) : (
          <div className="table-container">
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.015)',
              }}
            >
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Showing <strong style={{ color: '#FFF' }}>{data.length}</strong> attendance audit records
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.76rem' }}>
                <span style={{ color: 'var(--success)' }}>
                  Present: <strong>{data.filter((r) => r.status === 'PRESENT').length}</strong>
                </span>
                <span style={{ color: 'var(--warning)' }}>
                  Half-Day: <strong>{data.filter((r) => r.status === 'HALF_DAY').length}</strong>
                </span>
                <span style={{ color: 'var(--danger)' }}>
                  Absent: <strong>{data.filter((r) => r.status === 'ABSENT').length}</strong>
                </span>
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Audit Date</th>
                  <th>Worker Code</th>
                  <th>Personnel Name</th>
                  <th>Department</th>
                  <th>Facility Location</th>
                  <th>Shift</th>
                  <th>Status</th>
                  <th>Check In / Out</th>
                  <th>Overtime</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      {r.attendanceDate}
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: 'var(--primary)',
                          background: 'rgba(59, 130, 246, 0.1)',
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                        }}
                      >
                        {r.worker?.workerCode}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#FFF' }}>{r.worker?.fullName}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {r.worker?.department?.name || '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        {r.workSite?.name || '—'}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.76rem',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {r.shift?.name || 'General'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {r.checkIn ? `${r.checkIn} → ${r.checkOut || 'Active'}` : '—'}
                    </td>
                    <td>
                      {r.overtimeMinutes > 0 ? (
                        <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '0.82rem' }}>
                          +{r.overtimeMinutes}m
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>0m</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.remarks || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : reportType === 'workers' ? (
        data.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Worker Records"
            description="No worker personnel profiles registered in the system."
          />
        ) : (
          <div className="table-container">
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Active Roster: <strong style={{ color: '#FFF' }}>{data.length}</strong> personnel profiles
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Worker Code</th>
                  <th>Full Name</th>
                  <th>Phone Number</th>
                  <th>Joining Date</th>
                  <th>Department</th>
                  <th>Skill Category</th>
                  <th>Employment Type</th>
                  <th>Operational Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: 'var(--primary)',
                          background: 'rgba(59, 130, 246, 0.1)',
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                        }}
                      >
                        {w.workerCode}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#FFF' }}>{w.fullName}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {w.phone}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{w.joiningDate}</td>
                    <td>{w.department?.name || '—'}</td>
                    <td>{w.skillCategory?.name || '—'}</td>
                    <td>
                      <span style={{ fontSize: '0.78rem', textTransform: 'capitalize' }}>
                        {w.employmentType?.toLowerCase().replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={w.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : reportType === 'site-comparison' ? (
        <div className="table-container">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Cross-Facility Deployment & Attendance Matrix
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Benchmarking active worker allocations, real-time presence rates, and supervisor coverage
            </p>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Work Facility</th>
                <th>Physical Address</th>
                <th>Scheduled Workforce</th>
                <th>Present Today</th>
                <th>Half-Day</th>
                <th>Absent</th>
                <th>Attendance Ratio</th>
                <th>Supervision</th>
              </tr>
            </thead>
            <tbody>
              {siteComparisons.map((sc) => (
                <tr key={sc.id}>
                  <td>
                    <span style={{ fontWeight: 600, color: '#FFF' }}>{sc.name}</span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{sc.address}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.92rem' }}>
                      {sc.scheduled}
                    </span>{' '}
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>personnel</span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>{sc.present}</span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{sc.halfDay}</span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{sc.absent}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.86rem',
                          color:
                            parseFloat(sc.rate) >= 80
                              ? 'var(--success)'
                              : parseFloat(sc.rate) >= 60
                              ? 'var(--warning)'
                              : 'var(--danger)',
                        }}
                      >
                        {sc.rate}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: '6px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                          minWidth: '50px',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: sc.rate,
                            background:
                              parseFloat(sc.rate) >= 80
                                ? 'var(--success)'
                                : parseFloat(sc.rate) >= 60
                                ? 'var(--warning)'
                                : 'var(--danger)',
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>
                    {sc.supervisorCount > 0 ? (
                      <span className="badge badge-present">{sc.supervisorCount} Assigned</span>
                    ) : (
                      <span className="badge badge-absent">Unsupervised</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : reportType === 'daily-operations' ? (
        <div>
          {/* Executive AI Briefing Section */}
          <div
            className="card"
            style={{
              padding: '20px 24px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              marginBottom: '24px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                  }}
                >
                  <Sparkles size={18} color="var(--primary)" />
                  Executive AI Operational Intelligence Briefing
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Automated synthesis of live shift attendance, site deployment velocity, and unresolved bottlenecks.
                </p>
              </div>

              <button
                onClick={handleGenerateAiBriefing}
                disabled={generatingAi}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Bot size={16} />
                <span>{generatingAi ? 'Synthesizing Briefing...' : 'Generate Operations Briefing'}</span>
              </button>
            </div>

            {aiBriefing && (
              <div
                style={{
                  marginTop: '18px',
                  padding: '18px 20px',
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '8px',
                  }}
                >
                  <Bot size={16} color="var(--primary)" />
                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                    Generated Operations Digest
                  </strong>
                </div>
                <MarkdownContent content={aiBriefing} />
              </div>
            )}
          </div>

          {/* Telemetry Metrics Grid */}
          {dailySnapshot && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
              <div className="card" style={{ padding: '18px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  TODAY'S ATTENDANCE RATIO
                </span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginTop: '6px' }}>
                  {dailySnapshot.dashStats?.attendancePercentage || '0'}%
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <strong style={{ color: 'var(--success)' }}>{dailySnapshot.dashStats?.presentToday || 0}</strong>{' '}
                  Present vs <strong style={{ color: 'var(--danger)' }}>{dailySnapshot.dashStats?.absentToday || 0}</strong>{' '}
                  Absent
                </div>
              </div>

              <div className="card" style={{ padding: '18px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  ACTIVE REGISTERED WORKFORCE
                </span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', marginTop: '6px' }}>
                  {dailySnapshot.dashStats?.activeWorkers || 0}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Deployed across {dailySnapshot.dashStats?.totalSites || 0} operational facility locations
                </div>
              </div>

              <div className="card" style={{ padding: '18px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  UNRESOLVED LEAVE APPROVALS
                </span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)', marginTop: '6px' }}>
                  {dailySnapshot.dashStats?.pendingLeaves || 0}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Site personnel absence requests awaiting administrative action
                </div>
              </div>

              {dailySnapshot.insights?.outstandingPayroll && (
                <div className="card" style={{ padding: '18px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    OUTSTANDING PAYROLL LEDGER
                  </span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--purple)', marginTop: '6px' }}>
                    {dailySnapshot.insights.outstandingPayroll}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Accumulated wages pending financial disbursement
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default ReportsPage;
