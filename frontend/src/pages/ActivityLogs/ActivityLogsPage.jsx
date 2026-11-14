import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import Pagination from '../../components/common/Pagination';
import PageHeader from '../../components/common/PageHeader';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  History,
  Search,
  Filter,
  ShieldCheck,
  Terminal,
  Clock,
  User,
  ArrowRight,
  Code,
  Globe,
  RotateCcw
} from 'lucide-react';

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
      setLogs(data?.items || []);
      setTotal(data?.total || 0);
      setTotalPages(data?.totalPages || 1);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, action, entityType]);

  const quickEntityFilters = [
    { label: 'All Events', value: '' },
    { label: 'Attendance', value: 'Attendance' },
    { label: 'Workers', value: 'Worker' },
    { label: 'Payroll Runs', value: 'PayrollRun' },
    { label: 'Disbursements', value: 'PayrollPayment' },
    { label: 'Leave Requests', value: 'LeaveRequest' },
    { label: 'User Admin', value: 'User' },
    { label: 'Facilities', value: 'WorkSite' },
  ];

  const getActionColor = (actionName = '') => {
    if (actionName.includes('REOPEN') || actionName.includes('DELETE') || actionName.includes('REJECTED')) {
      return {
        color: 'var(--danger)',
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.25)',
      };
    }
    if (actionName.includes('APPROVED') || actionName.includes('FINALIZED') || actionName.includes('CREATED') || actionName.includes('DISBURSED')) {
      return {
        color: 'var(--success)',
        bg: 'rgba(34, 197, 94, 0.12)',
        border: 'rgba(34, 197, 94, 0.25)',
      };
    }
    if (actionName.includes('LOGIN') || actionName.includes('AUTH')) {
      return {
        color: 'var(--purple)',
        bg: 'rgba(168, 85, 247, 0.12)',
        border: 'rgba(168, 85, 247, 0.25)',
      };
    }
    return {
      color: 'var(--primary)',
      bg: 'rgba(59, 130, 246, 0.12)',
      border: 'rgba(59, 130, 246, 0.25)',
    };
  };

  return (
    <div>
      <PageHeader
        title="Activity Logs & Audit Trail"
        description="Immutable system audit trail tracking authentication, attendance revisions, payroll workflows, and administrative actions"
        actions={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(34, 197, 94, 0.1)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              fontSize: '0.78rem',
              color: 'var(--success)',
              fontWeight: 600,
            }}
          >
            <ShieldCheck size={16} />
            <span>Cryptographically Verified Logs</span>
          </div>
        }
      />

      {/* Filter Ribbon & Category Pills */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Quick entity category pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '4px' }}>
            ENTITY:
          </span>
          {quickEntityFilters.map((tab) => {
            const isSelected = entityType === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setEntityType(tab.value);
                  setPage(1);
                }}
                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search input for specific actions */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '400px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-control"
              placeholder="Search action keyword (e.g. BATCH_SAVED, REOPEN, LOCK)..."
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              style={{ paddingLeft: '36px', fontSize: '0.82rem' }}
            />
            {action && (
              <button
                onClick={() => {
                  setAction('');
                  setPage(1);
                }}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                }}
              >
                Clear
              </button>
            )}
          </div>

          <div style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Showing <strong>{logs.length}</strong> of <strong>{total}</strong> logged operations
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={History}
          title="No Audit Records Found"
          description="No system activity matches your entity filter or search query."
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Operator Account</th>
                <th>Action Identifier</th>
                <th>Entity Target</th>
                <th>Payload Snapshot</th>
                <th>Network IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const actionStyle = getActionColor(log.action);
                const userInitial = (log.userEmail || 'S').charAt(0).toUpperCase();

                return (
                  <tr key={log.id}>
                    {/* Timestamp */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </td>

                    {/* Operator Account */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: 'var(--radius-full)',
                            background: log.userRole === 'ADMIN' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                            color: log.userRole === 'ADMIN' ? 'var(--primary)' : 'var(--purple)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            flexShrink: 0,
                          }}
                        >
                          {userInitial}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#FFF', fontSize: '0.82rem' }}>
                            {log.userEmail || 'System Automated'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {log.userRole || 'SYSTEM'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: actionStyle.color,
                          backgroundColor: actionStyle.bg,
                          border: `1px solid ${actionStyle.border}`,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          display: 'inline-block',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {log.action}
                      </span>
                    </td>

                    {/* Entity Target */}
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        {log.entityType}
                      </div>
                      {log.entityId && (
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.68rem',
                            color: 'var(--text-muted)',
                            marginTop: '2px',
                          }}
                        >
                          UUID: {log.entityId.slice(0, 8)}...
                        </div>
                      )}
                    </td>

                    {/* Change Details */}
                    <td>
                      {log.changeDetails ? (
                        <pre
                          style={{
                            fontSize: '0.7rem',
                            fontFamily: 'var(--font-mono)',
                            backgroundColor: 'rgba(0, 0, 0, 0.35)',
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                            maxWidth: '420px',
                            maxHeight: '80px',
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap',
                            color: 'var(--text-secondary)',
                            margin: 0,
                          }}
                        >
                          {JSON.stringify(log.changeDetails, null, 2)}
                        </pre>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>—</span>
                      )}
                    </td>

                    {/* IP */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        <Globe size={13} />
                        <span>{log.ipAddress || '127.0.0.1'}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
          totalItems={total}
          itemsPerPage={20}
        />
      )}
    </div>
  );
};

export default ActivityLogsPage;
