import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import PageHeader from '../../components/common/PageHeader';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  Users,
  Search,
  Plus,
  Filter,
  Eye,
  Building2,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Edit2,
  UserCheck,
  UserX,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react';

const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

export const WorkersPage = () => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [workers, setWorkers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [skillCategoryId, setSkillCategoryId] = useState('');
  const [status, setStatus] = useState('');

  // Dropdown options
  const [departments, setDepartments] = useState([]);
  const [skills, setSkills] = useState([]);
  const [sites, setSites] = useState([]);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newWorker, setNewWorker] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    joiningDate: new Date().toISOString().split('T')[0],
    departmentId: '',
    skillCategoryId: '',
    employmentType: 'DAILY_WAGE',
    emergencyContact: '',
    workSiteId: '',
    wageType: 'DAILY',
    wageRate: '800.00',
  });
  const [phoneError, setPhoneError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [editPhoneError, setEditPhoneError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Bulk Import Modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkSiteId, setBulkSiteId] = useState('');

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [d, s, ws] = await Promise.all([
          apiClient.get('/departments'),
          apiClient.get('/skills'),
          apiClient.get('/sites', { params: { status: 'ACTIVE' } }),
        ]);
        setDepartments(d);
        setSkills(s);
        setSites(ws);
        if (ws.length > 0) {
          setNewWorker((prev) => ({ ...prev, workSiteId: ws[0].id }));
        }
      } catch (err) {
        console.error('Failed to load form options:', err);
      }
    };
    loadDropdowns();
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/workers', {
        params: {
          search: search || undefined,
          departmentId: departmentId || undefined,
          skillCategoryId: skillCategoryId || undefined,
          status: status || undefined,
          page,
          limit: 15,
        },
      });
      setWorkers(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, [page, departmentId, skillCategoryId, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchWorkers();
  };

  const handleResetFilters = () => {
    setSearch('');
    setDepartmentId('');
    setSkillCategoryId('');
    setStatus('');
    setPage(1);
  };

  const handleParseCsv = (rawText) => {
    setBulkText(rawText);
    setBulkResult(null);
    if (!rawText.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) {
      setParsedRows([]);
      return;
    }

    const startIndex = /name|phone/i.test(lines[0]) ? 1 : 0;
    const parsed = [];

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length >= 2) {
        const fullName = parts[0] || '';
        const phone = (parts[1] || '').replace(/\s+/g, '');
        const address = parts[2] || 'Work Site Accommodation';
        const gender = parts[3] || 'MALE';
        const wageRate = parseFloat(parts[4]) || 700;

        const isValidPhone = INDIAN_PHONE_REGEX.test(phone);
        const isValidName = fullName.length > 1;

        parsed.push({
          rowNum: i + 1,
          fullName,
          phone,
          address,
          gender,
          wageRate,
          isValid: isValidPhone && isValidName,
          error: !isValidName ? 'Name is too short' : !isValidPhone ? 'Invalid 10-digit Indian mobile' : null,
        });
      }
    }
    setParsedRows(parsed);
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      'Full Name,Phone,Address,Gender,Daily Wage\n' +
      'Ramesh Kumar,9876543210,Site Camp Block A,MALE,750\n' +
      'Suresh Patil,8765432109,Site Camp Block B,MALE,800\n' +
      'Sunita Devi,9123456780,Labour Quarters,FEMALE,750\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'ShramSetu_Worker_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteBulkImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      showToast('No valid worker rows to import.', 'error');
      return;
    }

    setBulkImporting(true);
    try {
      const payload = validRows.map((r) => ({
        fullName: r.fullName,
        phone: r.phone,
        address: r.address,
        gender: r.gender,
        wageRate: r.wageRate,
        workSiteId: bulkSiteId || undefined,
      }));

      const res = await apiClient.post('/workers/bulk-import', { workers: payload });
      setBulkResult(res);
      showToast(`Successfully imported ${res.imported} worker(s)!`, 'success');
      fetchWorkers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBulkImporting(false);
    }
  };

  // Indian Phone validation for new worker
  const handlePhoneChange = (val) => {
    const clean = val.replace(/\s+/g, '');
    setNewWorker((prev) => ({ ...prev, phone: clean }));
    if (!clean) {
      setPhoneError('Phone number is required');
    } else if (!INDIAN_PHONE_REGEX.test(clean)) {
      setPhoneError('Must be a 10-digit Indian mobile number starting with 6, 7, 8, or 9');
    } else {
      setPhoneError('');
    }
  };

  const handleCreateWorker = async (e) => {
    e.preventDefault();
    if (!INDIAN_PHONE_REGEX.test(newWorker.phone)) {
      setPhoneError('Must be a 10-digit Indian mobile number starting with 6, 7, 8, or 9');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/workers', newWorker);
      showToast('Worker registered successfully!', 'success');
      setCreateModalOpen(false);
      setNewWorker({
        fullName: '',
        phone: '',
        email: '',
        address: '',
        joiningDate: new Date().toISOString().split('T')[0],
        departmentId: '',
        skillCategoryId: '',
        employmentType: 'DAILY_WAGE',
        emergencyContact: '',
        workSiteId: sites[0]?.id || '',
        wageType: 'DAILY',
        wageRate: '800.00',
      });
      setPhoneError('');
      fetchWorkers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (w) => {
    setEditingWorker({
      id: w.id,
      workerCode: w.workerCode,
      fullName: w.fullName,
      phone: w.phone,
      email: w.email || '',
      address: w.address,
      departmentId: w.department?.id || '',
      skillCategoryId: w.skillCategory?.id || '',
      employmentType: w.employmentType || 'DAILY_WAGE',
      emergencyContact: w.emergencyContact || '',
    });
    setEditPhoneError('');
    setEditModalOpen(true);
  };

  const handleEditPhoneChange = (val) => {
    const clean = val.replace(/\s+/g, '');
    setEditingWorker((prev) => ({ ...prev, phone: clean }));
    if (!clean) {
      setEditPhoneError('Phone number is required');
    } else if (!INDIAN_PHONE_REGEX.test(clean)) {
      setEditPhoneError('Must be a 10-digit Indian mobile number starting with 6, 7, 8, or 9');
    } else {
      setEditPhoneError('');
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (editingWorker.phone && !INDIAN_PHONE_REGEX.test(editingWorker.phone)) {
      setEditPhoneError('Must be a 10-digit Indian mobile number starting with 6, 7, 8, or 9');
      return;
    }

    setSavingEdit(true);
    try {
      await apiClient.patch(`/workers/${editingWorker.id}`, {
        fullName: editingWorker.fullName,
        phone: editingWorker.phone,
        email: editingWorker.email || undefined,
        address: editingWorker.address,
        departmentId: editingWorker.departmentId || undefined,
        skillCategoryId: editingWorker.skillCategoryId || undefined,
        employmentType: editingWorker.employmentType,
        emergencyContact: editingWorker.emergencyContact || undefined,
      });
      showToast('Worker information updated successfully!', 'success');
      setEditModalOpen(false);
      fetchWorkers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStatus = async (worker) => {
    const isActivating = worker.status === 'INACTIVE';
    try {
      if (isActivating) {
        await apiClient.patch(`/workers/${worker.id}/reactivate`);
        showToast(`Worker ${worker.workerCode} reactivated successfully!`, 'success');
      } else {
        await apiClient.patch(`/workers/${worker.id}/deactivate`);
        showToast(`Worker ${worker.workerCode} has been deactivated.`, 'success');
      }
      fetchWorkers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Workers Directory"
        description="Comprehensive personnel database of organization craftspeople, technicians and warehouse workforce"
        actions={
          <>
            {isAdmin && (
              <button
                onClick={() => {
                  setBulkModalOpen(true);
                  setBulkResult(null);
                  setParsedRows([]);
                  setBulkText('');
                }}
                className="btn btn-secondary btn-sm"
                style={{ gap: '6px', height: '36px' }}
              >
                <FileSpreadsheet size={15} />
                <span>Bulk Import (CSV)</span>
              </button>
            )}
            <button
              onClick={() => {
                setPhoneError('');
                setCreateModalOpen(true);
              }}
              className="btn btn-primary btn-sm"
              style={{ gap: '6px', height: '36px' }}
            >
              <Plus size={16} />
              <span>Register New Worker</span>
            </button>
          </>
        }
      />

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          backgroundColor: 'var(--bg-surface, #111827)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
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
              style={{ paddingLeft: '36px', height: '38px', fontSize: '0.84rem' }}
              placeholder="Search by code, full name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-control"
            style={{ width: '180px', height: '38px', fontSize: '0.84rem' }}
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            className="form-control"
            style={{ width: '180px', height: '38px', fontSize: '0.84rem' }}
            value={skillCategoryId}
            onChange={(e) => {
              setSkillCategoryId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Skills</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            className="form-control"
            style={{ width: '140px', height: '38px', fontSize: '0.84rem' }}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          <button
            type="submit"
            className="btn btn-secondary btn-sm"
            style={{ height: '38px', padding: '0 16px' }}
          >
            Filter
          </button>

          {(search || departmentId || skillCategoryId || status) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn-outline btn-sm"
              style={{ height: '38px', padding: '0 12px', gap: '4px' }}
              title="Reset All Filters"
            >
              <X size={14} />
              <span>Reset</span>
            </button>
          )}
        </form>
      </div>

      {/* Workers Data Table */}
      {loading ? (
        <TableSkeleton rows={7} cols={8} />
      ) : workers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No worker records found"
          description="Try adjusting your search criteria or clearing active filters."
          action={
            <button
              onClick={() => {
                handleResetFilters();
                fetchWorkers();
              }}
              className="btn btn-secondary btn-sm"
              style={{ gap: '6px' }}
            >
              <RefreshCw size={14} />
              <span>Reset Filters</span>
            </button>
          }
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Personnel</th>
                <th>Worker Code</th>
                <th>Contact</th>
                <th>Department</th>
                <th>Skill Category</th>
                <th>Employment</th>
                <th>Wage Rate</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => {
                const initials = w.fullName
                  ? w.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'W';

                return (
                  <tr key={w.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'rgba(59, 130, 246, 0.12)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.74rem',
                            flexShrink: 0,
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                            {w.fullName}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Joined {w.joiningDate}
                          </div>
                        </div>
                      </div>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                        <Phone size={12} color="var(--text-muted)" />
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{w.phone}</span>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        {w.department?.name || '—'}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        {w.skillCategory?.name || '—'}
                      </span>
                    </td>

                    <td>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {w.employmentType?.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </td>

                    <td>
                      {w.currentWage ? (
                        <div style={{ fontSize: '0.84rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            ₹{parseFloat(w.currentWage.rate).toLocaleString('en-IN')}
                          </span>{' '}
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            /{w.currentWage.wageType.toLowerCase()}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    <td>
                      <StatusBadge status={w.status} />
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          onClick={() => navigate(`/workers/${w.id}`)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: '0.78rem', gap: '4px' }}
                          title="View Profile"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>

                        <button
                          onClick={() => openEditModal(w)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: '0.78rem', gap: '4px' }}
                          title="Edit Worker Details"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>

                        {w.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleToggleStatus(w)}
                            className="btn btn-outline btn-sm"
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.78rem',
                              color: 'var(--danger)',
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                              gap: '4px',
                            }}
                            title="Deactivate worker"
                          >
                            <UserX size={13} />
                            <span>Deactivate</span>
                          </button>
                        ) : (
                          isAdmin && (
                            <button
                              onClick={() => handleToggleStatus(w)}
                              className="btn btn-primary btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.78rem', gap: '4px' }}
                              title="Reactivate worker"
                            >
                              <UserCheck size={13} />
                              <span>Reactivate</span>
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={15}
        onPageChange={(p) => setPage(p)}
      />

      {/* Register Worker Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Register New Worker"
        subtitle="Create an official profile with employment classification and initial wage rate"
        maxWidth="640px"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateWorker}
              className="btn btn-primary"
              disabled={
                submitting ||
                !newWorker.fullName ||
                !newWorker.phone ||
                !newWorker.address ||
                !!phoneError
              }
            >
              {submitting ? 'Registering...' : 'Complete Registration'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateWorker}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Ramesh Kumar"
                value={newWorker.fullName}
                onChange={(e) => setNewWorker({ ...newWorker, fullName: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number * (10 Digits)</label>
              <input
                type="tel"
                maxLength={10}
                className="form-control"
                style={{
                  borderColor: phoneError ? 'var(--danger)' : undefined,
                  backgroundColor: phoneError ? 'rgba(239, 68, 68, 0.05)' : undefined,
                }}
                placeholder="9845011001"
                value={newWorker.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                required
              />
              {phoneError && (
                <div style={{ color: 'var(--danger)', fontSize: '0.74rem', marginTop: '4px' }}>
                  {phoneError}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Email (Optional)</label>
              <input
                type="email"
                className="form-control"
                placeholder="worker@shramsetu.internal"
                value={newWorker.email}
                onChange={(e) => setNewWorker({ ...newWorker, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Joining Date *</label>
              <input
                type="date"
                className="form-control"
                value={newWorker.joiningDate}
                onChange={(e) => setNewWorker({ ...newWorker, joiningDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Residential Address *</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Full address, village or worker camp accommodation"
              value={newWorker.address}
              onChange={(e) => setNewWorker({ ...newWorker, address: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select
                className="form-control"
                value={newWorker.departmentId}
                onChange={(e) => setNewWorker({ ...newWorker, departmentId: e.target.value })}
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Skill Category</label>
              <select
                className="form-control"
                value={newWorker.skillCategoryId}
                onChange={(e) => setNewWorker({ ...newWorker, skillCategoryId: e.target.value })}
              >
                <option value="">Select Skill</option>
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Employment Classification</label>
              <select
                className="form-control"
                value={newWorker.employmentType}
                onChange={(e) => setNewWorker({ ...newWorker, employmentType: e.target.value })}
              >
                <option value="DAILY_WAGE">Daily Wage</option>
                <option value="CONTRACT">Contract</option>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Work Site (Active Only)</label>
              <select
                className="form-control"
                value={newWorker.workSiteId}
                onChange={(e) => setNewWorker({ ...newWorker, workSiteId: e.target.value })}
              >
                <option value="">Select Site (Optional)</option>
                {sites.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isAdmin && (
            <div
              style={{
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '14px',
                marginTop: '10px',
              }}
            >
              <h4 style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Wage Configuration
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Wage Type</label>
                  <select
                    className="form-control"
                    value={newWorker.wageType}
                    onChange={(e) => setNewWorker({ ...newWorker, wageType: e.target.value })}
                  >
                    <option value="DAILY">Daily Rate (₹/day)</option>
                    <option value="HOURLY">Hourly Rate (₹/hr)</option>
                    <option value="MONTHLY">Monthly Fixed (₹/mo)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Wage Rate Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="800.00"
                    value={newWorker.wageRate}
                    onChange={(e) => setNewWorker({ ...newWorker, wageRate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Edit Worker Modal */}
      {editingWorker && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Edit Worker Profile — ${editingWorker.workerCode}`}
          maxWidth="620px"
          footer={
            <>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="btn btn-secondary"
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="btn btn-primary"
                disabled={savingEdit || !editingWorker.fullName || !!editPhoneError}
              >
                {savingEdit ? 'Saving Changes...' : 'Save Worker Profile'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveEdit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingWorker.fullName}
                  onChange={(e) =>
                    setEditingWorker({ ...editingWorker, fullName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number * (10 Digits)</label>
                <input
                  type="tel"
                  maxLength={10}
                  className="form-control"
                  style={{
                    borderColor: editPhoneError ? 'var(--danger)' : undefined,
                    backgroundColor: editPhoneError ? 'rgba(239, 68, 68, 0.05)' : undefined,
                  }}
                  value={editingWorker.phone}
                  onChange={(e) => handleEditPhoneChange(e.target.value)}
                  required
                />
                {editPhoneError && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.74rem', marginTop: '4px' }}>
                    {editPhoneError}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  value={editingWorker.email}
                  onChange={(e) => setEditingWorker({ ...editingWorker, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Emergency Contact</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contact Name & Number"
                  value={editingWorker.emergencyContact}
                  onChange={(e) =>
                    setEditingWorker({ ...editingWorker, emergencyContact: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Residential Address</label>
              <textarea
                className="form-control"
                rows={2}
                value={editingWorker.address}
                onChange={(e) => setEditingWorker({ ...editingWorker, address: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select
                  className="form-control"
                  value={editingWorker.departmentId}
                  onChange={(e) =>
                    setEditingWorker({ ...editingWorker, departmentId: e.target.value })
                  }
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Skill Category</label>
                <select
                  className="form-control"
                  value={editingWorker.skillCategoryId}
                  onChange={(e) =>
                    setEditingWorker({ ...editingWorker, skillCategoryId: e.target.value })
                  }
                >
                  <option value="">Select Skill</option>
                  {skills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Employment Classification</label>
              <select
                className="form-control"
                value={editingWorker.employmentType}
                onChange={(e) =>
                  setEditingWorker({ ...editingWorker, employmentType: e.target.value })
                }
              >
                <option value="DAILY_WAGE">Daily Wage</option>
                <option value="CONTRACT">Contract</option>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
              </select>
            </div>
          </form>
        </Modal>
      )}

      {/* Bulk Worker Import Modal */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="Bulk Worker Import (CSV / Spreadsheets)"
        subtitle="Validate and register multiple workers in a single batch with auto-error detection"
        maxWidth="780px"
        footer={
          <>
            <button
              type="button"
              onClick={() => setBulkModalOpen(false)}
              className="btn btn-secondary"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleExecuteBulkImport}
              className="btn btn-primary"
              disabled={bulkImporting || parsedRows.filter((r) => r.isValid).length === 0}
            >
              {bulkImporting
                ? 'Importing Workers...'
                : `Import ${parsedRows.filter((r) => r.isValid).length} Valid Worker(s)`}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Paste comma-separated rows below: Full Name, Phone, Address, Gender, Daily Wage
            </span>
            <button
              onClick={handleDownloadTemplate}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={14} /> Download Template
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Assign To Work Location (Optional)</label>
            <select
              className="form-control"
              value={bulkSiteId}
              onChange={(e) => setBulkSiteId(e.target.value)}
            >
              <option value="">Unassigned (Assign later)</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">CSV Data Input</label>
            <textarea
              className="form-control"
              rows={5}
              placeholder="Ramesh Kumar, 9876543210, Camp A Block 1, MALE, 750&#10;Suresh Patil, 8765432109, Camp B Block 2, MALE, 800"
              value={bulkText}
              onChange={(e) => handleParseCsv(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
            />
          </div>

          {/* Validation & Preview Strip */}
          {parsedRows.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                  Validation Preview: {parsedRows.length} Rows ({parsedRows.filter((r) => r.isValid).length} Valid,{' '}
                  {parsedRows.filter((r) => !r.isValid).length} Invalid)
                </span>
              </div>

              <div
                style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <table className="data-table" style={{ fontSize: '0.78rem' }}>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Row</th>
                      <th>Full Name</th>
                      <th>Phone</th>
                      <th>Daily Wage</th>
                      <th>Validation Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((r, idx) => (
                      <tr
                        key={idx}
                        style={{
                          backgroundColor: r.isValid ? 'transparent' : 'rgba(239, 68, 68, 0.08)',
                        }}
                      >
                        <td>
                          {r.isValid ? (
                            <CheckCircle2 size={14} color="var(--success)" />
                          ) : (
                            <AlertCircle size={14} color="var(--danger)" />
                          )}
                        </td>
                        <td>#{r.rowNum}</td>
                        <td style={{ fontWeight: 600 }}>{r.fullName}</td>
                        <td>{r.phone}</td>
                        <td>₹{r.wageRate}</td>
                        <td
                          style={{
                            color: r.isValid ? 'var(--success)' : 'var(--danger)',
                            fontSize: '0.74rem',
                          }}
                        >
                          {r.isValid ? 'Valid Indian 10-digit format' : r.error}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Success Summary if imported */}
          {bulkResult && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid var(--success-border)',
                color: 'var(--success)',
                fontSize: '0.84rem',
              }}
            >
              <div>
                <strong>Batch Imported:</strong> {bulkResult.imported} worker(s) successfully registered!
                {bulkResult.failed > 0 && ` (${bulkResult.failed} failed)`}
              </div>
              {bulkResult.createdWorkerCodes?.length > 0 && (
                <div style={{ fontSize: '0.74rem', marginTop: '4px', color: 'var(--text-secondary)' }}>
                  Generated Codes: {bulkResult.createdWorkerCodes.slice(0, 6).join(', ')}
                  {bulkResult.createdWorkerCodes.length > 6 ? '...' : ''}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default WorkersPage;
