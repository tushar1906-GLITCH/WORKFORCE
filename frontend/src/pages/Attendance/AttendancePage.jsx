import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  Save,
  Users,
  Filter,
  CheckSquare,
  Square,
  Edit3,
  Sparkles,
  ChevronRight,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';

export const AttendancePage = () => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useNotification();

  // Selectors
  const [sites, setSites] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Attendance state
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Bulk selection
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);

  // Modals
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeWorkerForDetail, setActiveWorkerForDetail] = useState(null);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [saving, setSaving] = useState(false);

  // 1. Initial Load: Sites & Shifts
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [sitesData, shiftsData] = await Promise.all([
          apiClient.get('/sites', { params: { status: 'ACTIVE' } }),
          apiClient.get('/shifts'),
        ]);
        setSites(sitesData);
        setShifts(shiftsData);
        if (sitesData.length > 0) setSelectedSiteId(sitesData[0].id);
        if (shiftsData.length > 0) setSelectedShiftId(shiftsData[0].id);
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
    loadInitial();
  }, []);

  // 2. Fetch Eligible Workers when Site, Shift or Date changes
  const fetchEligibleWorkers = async () => {
    if (!selectedSiteId || !selectedShiftId || !selectedDate) return;
    setLoading(true);
    setSelectedWorkerIds([]);
    try {
      const data = await apiClient.get('/attendance/eligible-workers', {
        params: {
          workSiteId: selectedSiteId,
          shiftId: selectedShiftId,
          date: selectedDate,
        },
      });
      setWorkers(data.workers || []);
      setIsFinalized(data.isBatchFinalized);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEligibleWorkers();
  }, [selectedSiteId, selectedShiftId, selectedDate]);

  // 3. Status change for single row
  const handleStatusChange = (workerId, newStatus) => {
    if (isFinalized && !isAdmin) {
      showToast('Attendance is finalized. Unlock required to edit.', 'error');
      return;
    }
    setWorkers((prev) =>
      prev.map((w) =>
        w.workerId === workerId
          ? {
              ...w,
              currentStatus: newStatus,
              isDirty: true,
              checkIn: newStatus === 'PRESENT' || newStatus === 'HALF_DAY' ? w.checkIn || '08:00' : null,
              checkOut:
                newStatus === 'PRESENT'
                  ? w.checkOut || '17:00'
                  : newStatus === 'HALF_DAY'
                  ? w.checkOut || '12:30'
                  : null,
            }
          : w,
      ),
    );
  };

  // 4. Smart Shortcut: Mark All Present (ONLY affects NOT_MARKED workers)
  const handleMarkAllPresent = () => {
    if (isFinalized && !isAdmin) {
      showToast('Attendance is finalized.', 'error');
      return;
    }
    let countMarked = 0;
    setWorkers((prev) =>
      prev.map((w) => {
        if (w.currentStatus === 'NOT_MARKED') {
          countMarked++;
          return {
            ...w,
            currentStatus: 'PRESENT',
            isDirty: true,
            checkIn: '08:00',
            checkOut: '17:00',
          };
        }
        return w;
      }),
    );
    showToast(`Marked ${countMarked} unmarked worker(s) as Present. Existing records preserved.`, 'info');
  };

  // 5. Bulk selection & bulk status update
  const handleToggleSelectAll = () => {
    if (selectedWorkerIds.length === filteredWorkers.length) {
      setSelectedWorkerIds([]);
    } else {
      setSelectedWorkerIds(filteredWorkers.map((w) => w.workerId));
    }
  };

  const handleToggleWorkerSelect = (workerId) => {
    setSelectedWorkerIds((prev) =>
      prev.includes(workerId) ? prev.filter((id) => id !== workerId) : [...prev, workerId],
    );
  };

  const handleApplyBulkStatus = (status) => {
    if (isFinalized && !isAdmin) {
      showToast('Attendance is finalized.', 'error');
      return;
    }
    setWorkers((prev) =>
      prev.map((w) =>
        selectedWorkerIds.includes(w.workerId)
          ? {
              ...w,
              currentStatus: status,
              isDirty: true,
              checkIn: status === 'PRESENT' || status === 'HALF_DAY' ? '08:00' : null,
              checkOut: status === 'PRESENT' ? '17:00' : status === 'HALF_DAY' ? '12:30' : null,
            }
          : w,
      ),
    );
    showToast(`Updated status to ${status} for ${selectedWorkerIds.length} worker(s)`, 'success');
    setSelectedWorkerIds([]);
  };

  // 6. Live Summary Counters
  const summary = useMemo(() => {
    const counts = {
      TOTAL: workers.length,
      PRESENT: 0,
      ABSENT: 0,
      HALF_DAY: 0,
      ON_LEAVE: 0,
      WEEKLY_OFF: 0,
      HOLIDAY: 0,
      NOT_MARKED: 0,
    };
    workers.forEach((w) => {
      if (counts[w.currentStatus] !== undefined) {
        counts[w.currentStatus]++;
      } else {
        counts.NOT_MARKED++;
      }
    });
    const marked = counts.TOTAL - counts.NOT_MARKED;
    const completionPct = counts.TOTAL > 0 ? Math.round((marked / counts.TOTAL) * 100) : 0;
    return { ...counts, marked, completionPct };
  }, [workers]);

  // 7. Filtered workers for display
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const matchSearch =
        w.fullName.toLowerCase().includes(search.toLowerCase()) ||
        w.workerCode.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || w.currentStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [workers, search, statusFilter]);

  // 8. Save Attendance Batch
  const handleSaveBatch = async () => {
    setSaving(true);
    try {
      const recordsToSave = workers
        .filter((w) => w.currentStatus !== 'NOT_MARKED')
        .map((w) => ({
          workerId: w.workerId,
          status: w.currentStatus,
          checkIn: w.checkIn,
          checkOut: w.checkOut,
          overtimeMinutes: w.overtimeMinutes || 0,
          remarks: w.remarks,
        }));

      await apiClient.post('/attendance/bulk', {
        workSiteId: selectedSiteId,
        shiftId: selectedShiftId,
        date: selectedDate,
        records: recordsToSave,
      });

      showToast('Attendance records saved successfully!', 'success');
      setReviewModalOpen(false);
      fetchEligibleWorkers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // 9. Finalize Attendance Batch
  const handleFinalize = async () => {
    if (summary.NOT_MARKED > 0) {
      showToast(
        `Finalization blocked: ${summary.NOT_MARKED} worker(s) remain NOT MARKED. Please mark all workers.`,
        'error',
      );
      return;
    }

    setSaving(true);
    try {
      await handleSaveBatch();
      await apiClient.post('/attendance/finalize', {
        workSiteId: selectedSiteId,
        shiftId: selectedShiftId,
        date: selectedDate,
      });
      showToast('Attendance finalized and locked successfully!', 'success');
      setReviewModalOpen(false);
      fetchEligibleWorkers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // 10. Reopen Attendance Batch (Admin only)
  const handleReopen = async () => {
    if (!reopenReason || reopenReason.trim().length < 5) {
      showToast('Please enter an audit reason to unlock attendance.', 'error');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/attendance/reopen', {
        workSiteId: selectedSiteId,
        shiftId: selectedShiftId,
        date: selectedDate,
        reason: reopenReason,
      });
      showToast('Attendance reopened for edits. Audit reason recorded.', 'success');
      setReopenModalOpen(false);
      setReopenReason('');
      fetchEligibleWorkers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <PageHeader
        title="Daily Attendance Operations"
        description="Shift-scoped attendance verification with rapid bulk workflows and immutable audit locking"
        actions={
          isFinalized ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                className="badge badge-approved"
                style={{
                  padding: '8px 14px',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Lock size={14} /> Batch Finalized & Locked
              </span>
              {isAdmin && (
                <button
                  onClick={() => setReopenModalOpen(true)}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '6px', height: '36px' }}
                >
                  <Unlock size={14} /> Reopen Batch
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleMarkAllPresent}
                className="btn btn-secondary btn-sm"
                disabled={workers.length === 0}
                style={{ gap: '6px', height: '36px' }}
                title="Marks ONLY eligible workers currently Not Marked"
              >
                <CheckCircle2 size={15} color="var(--success)" />
                <span>Mark All Unmarked Present</span>
              </button>
              <button
                onClick={() => setReviewModalOpen(true)}
                className="btn btn-primary btn-sm"
                disabled={workers.length === 0}
                style={{ gap: '6px', height: '36px' }}
              >
                <Save size={15} />
                <span>Review & Save Batch</span>
              </button>
            </div>
          )
        }
      />

      {/* Operational Selectors Bar */}
      <div
        className="card"
        style={{
          padding: '18px 20px',
          backgroundColor: 'var(--bg-surface, #111827)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          <div className="form-group" style={{ margin: 0 }}>
            <label
              className="form-label"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
            >
              <MapPin size={13} color="var(--primary)" /> Work Location
            </label>
            <select
              className="form-control"
              style={{ height: '38px', fontSize: '0.84rem' }}
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label
              className="form-label"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
            >
              <Calendar size={13} color="var(--primary)" /> Attendance Date
            </label>
            <input
              type="date"
              className="form-control"
              style={{ height: '38px', fontSize: '0.84rem' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label
              className="form-label"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
            >
              <Clock size={13} color="var(--primary)" /> Shift Schedule
            </label>
            <select
              className="form-control"
              style={{ height: '38px', fontSize: '0.84rem' }}
              value={selectedShiftId}
              onChange={(e) => setSelectedShiftId(e.target.value)}
            >
              {shifts.map((sh) => (
                <option key={sh.id} value={sh.id}>
                  {sh.name} ({sh.startTime} - {sh.endTime})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Live Counter Badges Ribbon */}
      <div
        className="card"
        style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '6px' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Eligible:
            </span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.94rem' }}>
              {summary.TOTAL}
            </span>
          </div>

          <span
            onClick={() => setStatusFilter(statusFilter === 'PRESENT' ? 'ALL' : 'PRESENT')}
            style={{ cursor: 'pointer' }}
          >
            <StatusBadge status="PRESENT" />
            <strong style={{ marginLeft: '4px', fontSize: '0.78rem' }}>{summary.PRESENT}</strong>
          </span>

          <span
            onClick={() => setStatusFilter(statusFilter === 'ABSENT' ? 'ALL' : 'ABSENT')}
            style={{ cursor: 'pointer' }}
          >
            <StatusBadge status="ABSENT" />
            <strong style={{ marginLeft: '4px', fontSize: '0.78rem' }}>{summary.ABSENT}</strong>
          </span>

          <span
            onClick={() => setStatusFilter(statusFilter === 'HALF_DAY' ? 'ALL' : 'HALF_DAY')}
            style={{ cursor: 'pointer' }}
          >
            <StatusBadge status="HALF_DAY" />
            <strong style={{ marginLeft: '4px', fontSize: '0.78rem' }}>{summary.HALF_DAY}</strong>
          </span>

          <span
            onClick={() => setStatusFilter(statusFilter === 'ON_LEAVE' ? 'ALL' : 'ON_LEAVE')}
            style={{ cursor: 'pointer' }}
          >
            <StatusBadge status="ON_LEAVE" />
            <strong style={{ marginLeft: '4px', fontSize: '0.78rem' }}>{summary.ON_LEAVE}</strong>
          </span>

          <span
            onClick={() => setStatusFilter(statusFilter === 'WEEKLY_OFF' ? 'ALL' : 'WEEKLY_OFF')}
            style={{ cursor: 'pointer' }}
          >
            <StatusBadge status="WEEKLY_OFF" />
            <strong style={{ marginLeft: '4px', fontSize: '0.78rem' }}>{summary.WEEKLY_OFF}</strong>
          </span>

          <span
            onClick={() => setStatusFilter(statusFilter === 'NOT_MARKED' ? 'ALL' : 'NOT_MARKED')}
            style={{ cursor: 'pointer' }}
          >
            <span
              className="badge badge-not-marked"
              style={{
                borderColor: summary.NOT_MARKED > 0 ? 'rgba(245, 158, 11, 0.5)' : undefined,
                backgroundColor: summary.NOT_MARKED > 0 ? 'rgba(245, 158, 11, 0.1)' : undefined,
              }}
            >
              Not Marked: {summary.NOT_MARKED}
            </span>
          </span>
        </div>

        {/* Completion Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Completion:</span>
          <div
            style={{
              width: '90px',
              height: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${summary.completionPct}%`,
                height: '100%',
                backgroundColor: summary.completionPct === 100 ? 'var(--success)' : 'var(--primary)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {summary.completionPct}%
          </span>
        </div>
      </div>

      {/* Floating Bulk Action Bar when rows selected */}
      {selectedWorkerIds.length > 0 && !isFinalized && (
        <div
          className="card"
          style={{
            padding: '12px 18px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'rgba(59, 130, 246, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {selectedWorkerIds.length} worker(s) selected
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>Apply Status:</span>
            <button
              onClick={() => handleApplyBulkStatus('PRESENT')}
              className="btn btn-sm btn-success"
              style={{ padding: '4px 10px', fontSize: '0.76rem' }}
            >
              Present
            </button>
            <button
              onClick={() => handleApplyBulkStatus('ABSENT')}
              className="btn btn-sm btn-danger"
              style={{ padding: '4px 10px', fontSize: '0.76rem' }}
            >
              Absent
            </button>
            <button
              onClick={() => handleApplyBulkStatus('HALF_DAY')}
              className="btn btn-sm btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.76rem' }}
            >
              Half Day
            </button>
            <button
              onClick={() => handleApplyBulkStatus('WEEKLY_OFF')}
              className="btn btn-sm btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.76rem' }}
            >
              Weekly Off
            </button>
            <button
              onClick={() => setSelectedWorkerIds([])}
              className="btn btn-sm btn-outline"
              style={{ padding: '4px 10px', fontSize: '0.76rem' }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '280px' }}>
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
            style={{ paddingLeft: '36px', height: '36px', fontSize: '0.82rem' }}
            placeholder="Search worker by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-control"
          style={{ width: '190px', height: '36px', fontSize: '0.82rem' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses ({workers.length})</option>
          <option value="NOT_MARKED">Not Marked ({summary.NOT_MARKED})</option>
          <option value="PRESENT">Present ({summary.PRESENT})</option>
          <option value="ABSENT">Absent ({summary.ABSENT})</option>
          <option value="HALF_DAY">Half Day ({summary.HALF_DAY})</option>
          <option value="ON_LEAVE">On Leave ({summary.ON_LEAVE})</option>
          <option value="WEEKLY_OFF">Weekly Off ({summary.WEEKLY_OFF})</option>
        </select>
      </div>

      {/* Workers Attendance Table */}
      {loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : filteredWorkers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No eligible workers found"
          description="No active assignments match this location, shift schedule, and date."
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '36px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={
                      selectedWorkerIds.length > 0 &&
                      selectedWorkerIds.length === filteredWorkers.length
                    }
                    onChange={handleToggleSelectAll}
                    disabled={isFinalized}
                  />
                </th>
                <th>Worker Code</th>
                <th>Personnel</th>
                <th>Department / Trade</th>
                <th>Policy & Leave Flags</th>
                <th>Inline Status Selector</th>
                <th>Timings & Overtime</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkers.map((w) => {
                const initials = w.fullName
                  ? w.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'W';

                return (
                  <tr
                    key={w.workerId}
                    style={{
                      backgroundColor: selectedWorkerIds.includes(w.workerId)
                        ? 'rgba(59, 130, 246, 0.05)'
                        : w.currentStatus === 'NOT_MARKED'
                        ? 'rgba(245, 158, 11, 0.02)'
                        : undefined,
                    }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedWorkerIds.includes(w.workerId)}
                        onChange={() => handleToggleWorkerSelect(w.workerId)}
                        disabled={isFinalized}
                      />
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          color: 'var(--primary)',
                          backgroundColor: 'rgba(59, 130, 246, 0.08)',
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                        }}
                      >
                        {w.workerCode}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: 'var(--text-secondary)',
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                            {w.fullName}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{w.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem' }}>{w.department}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {w.roleTitle || w.skillCategory}
                      </div>
                    </td>
                    <td>
                      {w.hasApprovedLeave && (
                        <span className="badge badge-on-leave" style={{ marginRight: '4px' }}>
                          Approved Leave: {w.leaveDetails?.type}
                        </span>
                      )}
                      {w.isHoliday && (
                        <span className="badge badge-holiday">
                          Holiday: {w.holidayDetails?.name}
                        </span>
                      )}
                      {!w.hasApprovedLeave && !w.isHoliday && (
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          Standard Shift
                        </span>
                      )}
                    </td>
                    <td>
                      <select
                        className="form-control"
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          width: '135px',
                          height: '32px',
                          borderColor:
                            w.currentStatus === 'NOT_MARKED'
                              ? 'var(--warning)'
                              : w.currentStatus === 'PRESENT'
                              ? 'var(--success)'
                              : w.currentStatus === 'ABSENT'
                              ? 'var(--danger)'
                              : 'var(--border-subtle)',
                        }}
                        value={w.currentStatus}
                        onChange={(e) => handleStatusChange(w.workerId, e.target.value)}
                        disabled={isFinalized && !isAdmin}
                      >
                        <option value="NOT_MARKED">-- NOT MARKED --</option>
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                        <option value="HALF_DAY">Half Day</option>
                        <option value="ON_LEAVE">On Leave</option>
                        <option value="WEEKLY_OFF">Weekly Off</option>
                        <option value="HOLIDAY">Holiday</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {w.checkIn ? `${w.checkIn} - ${w.checkOut || 'Active'}` : '—'}
                      </div>
                      {w.overtimeMinutes > 0 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 600 }}>
                          +{w.overtimeMinutes}m OT
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setActiveWorkerForDetail(w);
                          setDetailModalOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.76rem', gap: '4px' }}
                        title="Edit check-in times and remarks"
                      >
                        <Edit3 size={13} />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Review & Finalization Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Review & Save Attendance Batch"
        subtitle="Confirm daily status records before committing to PostgreSQL database"
        maxWidth="600px"
        footer={
          <>
            <button
              onClick={() => setReviewModalOpen(false)}
              className="btn btn-secondary"
              disabled={saving}
            >
              Keep Editing
            </button>
            <button onClick={handleSaveBatch} className="btn btn-secondary" disabled={saving}>
              Save Draft
            </button>
            <button
              onClick={handleFinalize}
              className="btn btn-primary"
              disabled={saving || summary.NOT_MARKED > 0}
            >
              {saving ? 'Processing...' : 'Finalize & Lock Batch'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.84rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '8px',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.74rem' }}>
                Location
              </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {sites.find((s) => s.id === selectedSiteId)?.name}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.74rem' }}>
                Shift
              </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {shifts.find((s) => s.id === selectedShiftId)?.name}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.74rem' }}>
                Date
              </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {selectedDate}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
            }}
          >
            <div className="card" style={{ padding: '12px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Total Eligible</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {summary.TOTAL}
              </div>
            </div>
            <div className="card" style={{ padding: '12px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Marked Personnel</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>
                {summary.marked}
              </div>
            </div>
            <div className="card" style={{ padding: '12px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Present / Half Day</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                {summary.PRESENT} / {summary.HALF_DAY}
              </div>
            </div>
            <div className="card" style={{ padding: '12px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Unmarked Personnel</span>
              <div
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: summary.NOT_MARKED > 0 ? 'var(--danger)' : 'var(--text-muted)',
                }}
              >
                {summary.NOT_MARKED}
              </div>
            </div>
          </div>

          {summary.NOT_MARKED > 0 ? (
            <div
              style={{
                backgroundColor: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Finalization Blocked:</strong> {summary.NOT_MARKED} worker(s) remain Not Marked. You can save as a working draft, but cannot finalize until every eligible worker has an explicit status.
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: 'var(--success-bg)',
                border: '1px solid var(--success-border)',
                color: 'var(--success)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <CheckCircle2 size={17} style={{ flexShrink: 0 }} />
              <span>
                All eligible workers have been verified. Finalizing will lock these records and update payroll calculations.
              </span>
            </div>
          )}
        </div>
      </Modal>

      {/* Row Detail Edit Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Attendance Record: ${activeWorkerForDetail?.fullName}`}
        subtitle={`Worker code ${activeWorkerForDetail?.workerCode} • Shift details`}
        maxWidth="500px"
        footer={
          <button onClick={() => setDetailModalOpen(false)} className="btn btn-primary">
            Apply Changes
          </button>
        }
      >
        {activeWorkerForDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Attendance Status</label>
              <select
                className="form-control"
                value={activeWorkerForDetail.currentStatus}
                onChange={(e) => {
                  const val = e.target.value;
                  setActiveWorkerForDetail((prev) => ({ ...prev, currentStatus: val }));
                  handleStatusChange(activeWorkerForDetail.workerId, val);
                }}
              >
                <option value="NOT_MARKED">-- NOT MARKED --</option>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="WEEKLY_OFF">Weekly Off</option>
                <option value="HOLIDAY">Holiday</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Check-In Time</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="08:00"
                  value={activeWorkerForDetail.checkIn || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setActiveWorkerForDetail((prev) => ({ ...prev, checkIn: val }));
                    setWorkers((prev) =>
                      prev.map((w) =>
                        w.workerId === activeWorkerForDetail.workerId
                          ? { ...w, checkIn: val, isDirty: true }
                          : w,
                      ),
                    );
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Check-Out Time</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="17:00"
                  value={activeWorkerForDetail.checkOut || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setActiveWorkerForDetail((prev) => ({ ...prev, checkOut: val }));
                    setWorkers((prev) =>
                      prev.map((w) =>
                        w.workerId === activeWorkerForDetail.workerId
                          ? { ...w, checkOut: val, isDirty: true }
                          : w,
                      ),
                    );
                  }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Overtime (Minutes)</label>
              <input
                type="number"
                className="form-control"
                placeholder="0"
                value={activeWorkerForDetail.overtimeMinutes || 0}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setActiveWorkerForDetail((prev) => ({ ...prev, overtimeMinutes: val }));
                  setWorkers((prev) =>
                    prev.map((w) =>
                      w.workerId === activeWorkerForDetail.workerId
                        ? { ...w, overtimeMinutes: val, isDirty: true }
                        : w,
                    ),
                  );
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Remarks / Correction Audit Note</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Reason for late check-in or manual override..."
                value={activeWorkerForDetail.remarks || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setActiveWorkerForDetail((prev) => ({ ...prev, remarks: val }));
                  setWorkers((prev) =>
                    prev.map((w) =>
                      w.workerId === activeWorkerForDetail.workerId
                        ? { ...w, remarks: val, isDirty: true }
                        : w,
                    ),
                  );
                }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Admin Reopen Attendance Modal */}
      <Modal
        isOpen={reopenModalOpen}
        onClose={() => setReopenModalOpen(false)}
        title="Authorize Reopening Finalized Batch"
        subtitle="Unlocking recorded shifts requires an auditable justification"
        maxWidth="500px"
        footer={
          <>
            <button onClick={() => setReopenModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleReopen} className="btn btn-danger" disabled={saving}>
              {saving ? 'Unlocking...' : 'Authorize Reopening'}
            </button>
          </>
        }
      >
        <div>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Reopening finalized records will unlock this batch for supervisor modifications. This action is permanently logged in the audit trail.
          </p>
          <div className="form-group">
            <label className="form-label">Mandatory Audit Reason *</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="e.g. Supervisor corrected overtime dispute approved by site manager..."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              required
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AttendancePage;
