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
} from 'lucide-react';

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

  // Modal
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [d, s, ws] = await Promise.all([
          apiClient.get('/departments'),
          apiClient.get('/skills'),
          apiClient.get('/sites'),
        ]);
        setDepartments(d);
        setSkills(s);
        setSites(ws);
        if (ws.length > 0) {
          setNewWorker((prev) => ({ ...prev, workSiteId: ws[0].id }));
        }
      } catch (err) {
        console.error(err);
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

  const handleCreateWorker = async (e) => {
    e.preventDefault();
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
      fetchWorkers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
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
          onClick={() => setCreateModalOpen(true)}
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
                      <span>{w.phone}</span>
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
                    <button
                      onClick={() => navigate(`/workers/${w.id}`)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Eye size={14} /> View Details
                    </button>
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
              disabled={submitting || !newWorker.fullName || !newWorker.phone || !newWorker.address}
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
              <label className="form-label">Phone Number *</label>
              <input
                type="text"
                className="form-control"
                placeholder="+91 98450 11001"
                value={newWorker.phone}
                onChange={(e) => setNewWorker({ ...newWorker, phone: e.target.value })}
                required
              />
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
              placeholder="Full residential address..."
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
              <label className="form-label">Employment Type</label>
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
              <label className="form-label">Initial Assigned Work Site</label>
              <select
                className="form-control"
                value={newWorker.workSiteId}
                onChange={(e) => setNewWorker({ ...newWorker, workSiteId: e.target.value })}
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

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
                <option value="MONTHLY">Monthly Salary (₹/month)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Applicable Rate (₹)</label>
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
        </form>
      </Modal>
    </div>
  );
};

export default WorkersPage;
