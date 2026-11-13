import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import Pagination from '../../components/common/Pagination';
import { History, Search, Filter, ShieldCheck, Terminal } from 'lucide-react';

export const ActivityLogsPage = () => {
  const { showToast } = useNotification();

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/activity-logs', {
        params: {
          action: action || undefined,
          entityType: entityType || undefined,
          page,
          limit: 20,
        },
      });
      setLogs(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, action, entityType]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity Logs & Audit Trail</h1>
          <p className="page-description">
            Immutable system audit logs tracking authentication, attendance changes, payroll and approvals
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ width: '220px' }}>
          <label className="form-label">Action Filter</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. ATTENDANCE_BATCH_SAVED"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div style={{ width: '200px' }}>
          <label className="form-label">Entity Type</label>
          <select
            className="form-control"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Entities</option>
            <option value="Attendance">Attendance</option>
            <option value="Worker">Worker</option>
            <option value="PayrollRun">PayrollRun</option>
            <option value="PayrollPayment">PayrollPayment</option>
            <option value="LeaveRequest">LeaveRequest</option>
            <option value="User">User</option>
            <option value="WorkSite">WorkSite</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No audit logs found matching criteria.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User / Role</th>
                <th>Action</th>
                <th>Entity Target</th>
                <th>Change Details Snapshot</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#FFF' }}>{log.userEmail || 'System'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{log.userRole || 'SYSTEM'}</div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        color: log.action.includes('REOPEN')
                          ? 'var(--danger)'
                          : log.action.includes('APPROVED') || log.action.includes('FINALIZED')
                          ? 'var(--success)'
                          : 'var(--primary)',
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{log.entityType}</div>
                    {log.entityId && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        ID: {log.entityId.slice(0, 8)}...
                      </div>
                    )}
                  </td>
                  <td>
                    {log.changeDetails ? (
                      <pre
                        style={{
                          fontSize: '0.72rem',
                          fontFamily: 'var(--font-mono)',
                          backgroundColor: 'rgba(0, 0, 0, 0.25)',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          maxWidth: '400px',
                          overflowX: 'auto',
                          whiteSpace: 'pre-wrap',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {JSON.stringify(log.changeDetails, null, 2)}
                      </pre>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {log.ipAddress || '127.0.0.1'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => setPage(p)}
      />
    </div>
  );
};

export default ActivityLogsPage;
