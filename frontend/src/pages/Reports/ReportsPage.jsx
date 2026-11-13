import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import { FileBarChart2, Download, Filter, Calendar, MapPin } from 'lucide-react';

export const ReportsPage = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [sites, setSites] = useState([]);
  const [reportType, setReportType] = useState('attendance'); // 'attendance' | 'workers'
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSiteId, setSelectedSiteId] = useState('');

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

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
      } else {
        const res = await apiClient.get('/workers', { params: { limit: 100 } });
        setData(res.items || []);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
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

        <button onClick={handleExportCsv} className="btn btn-primary">
          <Download size={16} /> Export Scoped CSV
        </button>
      </div>

      {/* Filter Ribbon */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ width: '200px' }}>
            <label className="form-label">Report Category</label>
            <select
              className="form-control"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="attendance">Daily Attendance Ledger</option>
              <option value="workers">Worker Directory & Roster</option>
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
        ) : data.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No records found for the selected reporting parameters.
          </div>
        ) : reportType === 'attendance' ? (
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
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
