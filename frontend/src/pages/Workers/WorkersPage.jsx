import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
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

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        // Bug Fix 3: Operational dropdown only loads ACTIVE work locations
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

  // Bug Fix 1: Phone validation handler for new worker
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

  // Edit worker handler
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

  // Bug Fix 1: Phone validation handler for editing worker
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

  // Bug Fix 2: Reactivate / Deactivate workers
  const handleToggleStatus = async (worker) => {
    const isActivating = worker.status === 'INACTIVE';
    try {
      if (isActivating) {
        await apiClient.patch(`/workers/${worker.id}/reactivate`);
        showToast(`Worker ${worker.workerCode} has been reactivated successfully!`, 'success');
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
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Workers Directory</h1>
          <p className="page-description">
            Complete database of organization labourers, craftspeople and warehouse personnel
          </p>
        </div>

        <button
          onClick={() => {
            setPhoneError('');
            setCreateModalOpen(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={16} /> Register New Worker
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '36px' }}
              placeholder="Search by worker code, full name, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-control"
            style={{ width: '180px' }}
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            className="form-control"
            style={{ width: '180px' }}
            value={skillCategoryId}
            onChange={(e) => {
              setSkillCategoryId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Skills</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            className="form-control"
            style={{ width: '140px' }}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>
      </div>

      {/* Table Container */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading workforce personnel records...
          </div>
        ) : workers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No worker records found matching filters.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Worker Code</th>
                <th>Full Name</th>
                <th>Phone / Contact</th>
                <th>Department</th>
                <th>Skill Category</th>
                <th>Employment Type</th>
                <th>Current Wage Rate</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => (
                <tr key={w.id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary)' }}>
                      {w.workerCode}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#FFF' }}>{w.fullName}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Joined {w.joiningDate}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={13} color="var(--text-muted)" />
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{w.phone}</span>
                    </div>
                  </td>
                  <td>{w.department?.name || '—'}</td>
                  <td>{w.skillCategory?.name || '—'}</td>
                  <td>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {w.employmentType?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    {w.currentWage ? (
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        ₹{parseFloat(w.currentWage.rate).toLocaleString()}{' '}
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          / {w.currentWage.wageType.toLowerCase()}
                        </span>
                      </span>
                    ) : (
                      '—'
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
                        title="View Details"
                      >
                        <Eye size={14} /> View
                      </button>

                      <button
                        onClick={() => openEditModal(w)}
                        className="btn btn-secondary btn-sm"
                        title="Edit Details"
                      >
                        <Edit2 size={14} /> Edit
                      </button>

                      {/* Bug Fix 2: Reactivate / Deactivate Action */}
                      {w.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleToggleStatus(w)}
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                          title="Deactivate worker"
                        >
                          <UserX size={14} /> Deactivate
                        </button>
                      ) : (
                        isAdmin && (
                          <button
                            onClick={() => handleToggleStatus(w)}
                            className="btn btn-primary btn-sm"
                            title="Reactivate worker"
                          >
                            <UserCheck size={14} /> Reactivate
                          </button>
                        )
                      )}
                    </div>
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

      {/* Register Worker Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Register New Worker"
        maxWidth="620px"
        footer={
          <>
            <button
              onClick={() => setCreateModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateWorker}
              className="btn btn-primary"
              disabled={submitting || !newWorker.fullName || !newWorker.phone || !newWorker.address || !!phoneError}
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
                <div style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '4px' }}>
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
                placeholder="worker@workforce.internal"
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
              placeholder="Full residential address, village, or labour camp block"
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
                  <option key={d.id} value={d.id}>{d.name}</option>
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
                  <option key={s.id} value={s.id}>{s.name}</option>
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
              <label className="form-label">Initial Assigned Work Site (Active Only)</label>
              <select
                className="form-control"
                value={newWorker.workSiteId}
                onChange={(e) => setNewWorker({ ...newWorker, workSiteId: e.target.value })}
              >
                <option value="">Select Site (Optional)</option>
                {sites.map((ws) => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
            </div>
          </div>

          {isAdmin && (
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', marginTop: '10px' }}>
              <h4 style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Initial Wage Rate Configuration
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
          title={`Edit Worker — ${editingWorker.workerCode}`}
          maxWidth="600px"
          footer={
            <>
              <button
                onClick={() => setEditModalOpen(false)}
                className="btn btn-secondary"
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="btn btn-primary"
                disabled={savingEdit || !editingWorker.fullName || !!editPhoneError}
              >
                {savingEdit ? 'Saving Changes...' : 'Save Worker Details'}
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
                  onChange={(e) => setEditingWorker({ ...editingWorker, fullName: e.target.value })}
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
                  <div style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '4px' }}>
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
                  onChange={(e) => setEditingWorker({ ...editingWorker, emergencyContact: e.target.value })}
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
                  onChange={(e) => setEditingWorker({ ...editingWorker, departmentId: e.target.value })}
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Skill Category</label>
                <select
                  className="form-control"
                  value={editingWorker.skillCategoryId}
                  onChange={(e) => setEditingWorker({ ...editingWorker, skillCategoryId: e.target.value })}
                >
                  <option value="">Select Skill</option>
                  {skills.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Employment Classification</label>
              <select
                className="form-control"
                value={editingWorker.employmentType}
                onChange={(e) => setEditingWorker({ ...editingWorker, employmentType: e.target.value })}
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
    </div>
  );
};

export default WorkersPage;
