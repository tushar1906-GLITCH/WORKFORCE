import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
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
        setData(res);
      } else if (reportType === 'workers') {
        const res = await apiClient.get('/workers', { params: { limit: 100 } });
        setData(res.items || []);
      } else if (reportType === 'site-comparison') {
        const [sitesRes, assignmentsRes, attendanceRes] = await Promise.all([
          apiClient.get('/sites', { params: { status: 'ACTIVE' } }),
          apiClient.get('/assignments', { params: { status: 'ACTIVE' } }),
          apiClient.get('/attendance', { params: { date: new Date().toISOString().split('T')[0] } }),
        ]);

        const comp = sitesRes.map((site) => {
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
    const token = localStorage.getItem('workforce_token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

    let exportUrl = '';
    if (reportType === 'attendance') {
      exportUrl = `${baseUrl}/reports/attendance/export-csv?startDate=${startDate}&endDate=${endDate}`;
      if (selectedSiteId) exportUrl += `&workSiteId=${selectedSiteId}`;
    } else {
      exportUrl = `${baseUrl}/reports/workers/export-csv`;
    }

    // Direct browser download with auth token header using fetch & blob
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Data Exports</h1>
          <p className="page-description">
            Live database reports, historical audit records and site-scoped CSV ledger exports
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => window.print()} className="btn btn-secondary">
            <Printer size={16} /> Print / Save PDF
          </button>
          <button onClick={handleExportCsv} className="btn btn-primary">
            <Download size={16} /> Export Scoped CSV
          </button>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ width: '260px' }}>
            <label className="form-label">Report Category</label>
            <select
              className="form-control"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="attendance">Daily Attendance Ledger</option>
              <option value="workers">Worker Directory & Roster</option>
              <option value="site-comparison">Work Location Performance & Comparison</option>
              <option value="daily-operations">Daily Operations Snapshot & AI Briefing</option>
            </select>
          </div>

          {reportType === 'attendance' && (
            <>
              <div style={{ width: '160px' }}>
                <label className="form-label">From Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div style={{ width: '160px' }}>
                <label className="form-label">To Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}

          <div style={{ width: '220px' }}>
            <label className="form-label">Work Location</label>
            <select
              className="form-control"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
            >
              <option value="">All Permitted Work Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Generating report from PostgreSQL records...
          </div>
        ) : reportType === 'attendance' ? (
          data.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No attendance records found for the selected dates and parameters.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Worker Code</th>
                  <th>Worker Name</th>
                  <th>Department</th>
                  <th>Work Location</th>
                  <th>Shift</th>
                  <th>Status</th>
                  <th>Times</th>
                  <th>Overtime</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.attendanceDate}</td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 600 }}>
                        {r.worker?.workerCode}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#FFF' }}>{r.worker?.fullName}</td>
                    <td>{r.worker?.department?.name || '—'}</td>
                    <td>{r.workSite?.name}</td>
                    <td>{r.shift?.name}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>{r.checkIn ? `${r.checkIn} - ${r.checkOut || 'Active'}` : '—'}</td>
                    <td>{r.overtimeMinutes > 0 ? `${r.overtimeMinutes}m` : '0m'}</td>
                    <td>{r.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : reportType === 'workers' ? (
          data.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No worker personnel records found.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Worker Code</th>
                  <th>Full Name</th>
                  <th>Phone</th>
                  <th>Joining Date</th>
                  <th>Department</th>
                  <th>Skill Category</th>
                  <th>Employment Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 600 }}>
                        {w.workerCode}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#FFF' }}>{w.fullName}</td>
                    <td>{w.phone}</td>
                    <td>{w.joiningDate}</td>
                    <td>{w.department?.name || '—'}</td>
                    <td>{w.skillCategory?.name || '—'}</td>
                    <td>{w.employmentType?.replace(/_/g, ' ')}</td>
                    <td><StatusBadge status={w.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : reportType === 'site-comparison' ? (
          <div>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Site-by-Site Labour Performance Matrix
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Side-by-side comparison of active workforce deployments, attendance compliance and supervisor supervision
              </p>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Work Site</th>
                  <th>Location Address</th>
                  <th>Active Workforce</th>
                  <th>Present Today</th>
                  <th>Half Day</th>
                  <th>Absent</th>
                  <th>Attendance Rate</th>
                  <th>Supervisors</th>
                </tr>
              </thead>
              <tbody>
                {siteComparisons.map((sc) => (
                  <tr key={sc.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sc.name}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{sc.address}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{sc.scheduled}</span> worker(s)
                    </td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{sc.present}</td>
                    <td style={{ color: 'var(--warning)' }}>{sc.halfDay}</td>
                    <td style={{ color: 'var(--danger)' }}>{sc.absent}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          color: parseFloat(sc.rate) >= 80 ? 'var(--success)' : parseFloat(sc.rate) >= 60 ? 'var(--warning)' : 'var(--danger)',
                        }}
                      >
                        {sc.rate}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {sc.supervisorCount > 0 ? `${sc.supervisorCount} Assigned` : <span style={{ color: 'var(--warning)' }}>No Supervisor</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : reportType === 'daily-operations' ? (
          <div style={{ padding: '24px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                marginBottom: '20px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} color="var(--primary)" />
                  Daily Operations Snapshot & Executive AI Report
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Live operational telemetry synthesized from active attendance logs, assignments, and leave records.
                </p>
              </div>

              <button
                onClick={handleGenerateAiBriefing}
                disabled={generatingAi}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Bot size={16} />
                <span>{generatingAi ? 'Generating AI Briefing...' : 'Generate AI Briefing'}</span>
              </button>
            </div>

            {/* AI Generated Briefing Box */}
            {aiBriefing && (
              <div
                style={{
                  padding: '20px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-medium)',
                  marginBottom: '20px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <Bot size={18} color="var(--primary)" />
                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>Executive AI Operational Summary</strong>
                </div>
                <MarkdownContent content={aiBriefing} />
              </div>
            )}

            {/* Quick Metrics Grid */}
            {dailySnapshot && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div className="card" style={{ padding: '16px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Today Attendance Rate</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>
                    {dailySnapshot.dashStats?.attendancePercentage || '0'}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {dailySnapshot.dashStats?.presentToday || 0} Present / {dailySnapshot.dashStats?.absentToday || 0} Absent
                  </div>
                </div>

                <div className="card" style={{ padding: '16px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Active Workforce</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)', marginTop: '4px' }}>
                    {dailySnapshot.dashStats?.activeWorkers || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Across {dailySnapshot.dashStats?.totalSites || 0} operational site(s)
                  </div>
                </div>

                <div className="card" style={{ padding: '16px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pending Approvals</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--warning)', marginTop: '4px' }}>
                    {dailySnapshot.dashStats?.pendingLeaves || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Site leave request(s) awaiting review
                  </div>
                </div>

                {dailySnapshot.insights?.outstandingPayroll && (
                  <div className="card" style={{ padding: '16px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Outstanding Payroll</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--purple)', marginTop: '4px' }}>
                      {dailySnapshot.insights.outstandingPayroll}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Pending worker disbursement
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ReportsPage;
