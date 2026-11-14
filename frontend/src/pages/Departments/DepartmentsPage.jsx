import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import { Building2, Plus, Edit, Check, Wrench, Layers } from 'lucide-react';

export const DepartmentsPage = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useNotification();

  const [departments, setDepartments] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('departments');

  // Modals
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [skillModalOpen, setSkillModalOpen] = useState(false);

  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });
  const [skillForm, setSkillForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [d, s] = await Promise.all([
        apiClient.get('/departments'),
        apiClient.get('/skills'),
      ]);
      setDepartments(d);
      setSkills(s);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDept = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/departments', deptForm);
      showToast('Department created successfully!', 'success');
      setDeptModalOpen(false);
      setDeptForm({ name: '', code: '', description: '' });
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSkill = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/skills', skillForm);
      showToast('Skill category created successfully!', 'success');
      setSkillModalOpen(false);
      setSkillForm({ name: '', description: '' });
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Departments & Skill Classifications"
        description="Define organizational business units, operational branches, and workforce qualification categories"
        actions={
          isAdmin && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setDeptModalOpen(true)}
                className="btn btn-primary btn-sm"
                style={{ gap: '6px', height: '36px' }}
              >
                <Plus size={16} />
                <span>New Department</span>
              </button>
              <button
                onClick={() => setSkillModalOpen(true)}
                className="btn btn-secondary btn-sm"
                style={{ gap: '6px', height: '36px' }}
              >
                <Plus size={16} />
                <span>New Skill Category</span>
              </button>
            </div>
          )
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => setActiveTab('departments')}
          className="btn"
          style={{
            borderBottom: activeTab === 'departments' ? '2px solid var(--primary)' : '2px solid transparent',
            borderRadius: '0',
            color: activeTab === 'departments' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'departments' ? 600 : 500,
            padding: '10px 18px',
            fontSize: '0.86rem',
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Building2 size={16} />
          <span>Departments ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('skills')}
          className="btn"
          style={{
            borderBottom: activeTab === 'skills' ? '2px solid var(--primary)' : '2px solid transparent',
            borderRadius: '0',
            color: activeTab === 'skills' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'skills' ? 600 : 500,
            padding: '10px 18px',
            fontSize: '0.86rem',
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Wrench size={16} />
          <span>Skill Qualifications ({skills.length})</span>
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : activeTab === 'departments' ? (
        departments.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No departments found"
            description="Create organizational departments to allocate personnel."
          />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Department Code</th>
                  <th>Department Name</th>
                  <th>Description</th>
                  <th>Allocated Personnel</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          color: 'var(--primary)',
                          backgroundColor: 'rgba(59, 130, 246, 0.08)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                        }}
                      >
                        {d.code || 'DEPT'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                        {d.name}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {d.description || 'Core organizational operational division'}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {d.workersCount ?? 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : skills.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No skill categories found"
          description="Define craft and skill classifications for workers."
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Skill / Qualification Title</th>
                <th>Classification Description</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Wrench size={14} />
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                        {s.name}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {s.description || 'Specialized craft classification'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Department Modal */}
      <Modal
        isOpen={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        title="Add Organizational Department"
        maxWidth="500px"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeptModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateDept}
              className="btn btn-primary"
              disabled={submitting || !deptForm.name || !deptForm.code}
            >
              {submitting ? 'Creating...' : 'Create Department'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateDept}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Department Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Electrical Engineering"
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Department Code (Short Identifier) *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. ELEC"
                value={deptForm.code}
                onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Operational scope of this department..."
                value={deptForm.description}
                onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Create Skill Category Modal */}
      <Modal
        isOpen={skillModalOpen}
        onClose={() => setSkillModalOpen(false)}
        title="Add Skill Qualification Category"
        maxWidth="500px"
        footer={
          <>
            <button
              type="button"
              onClick={() => setSkillModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateSkill}
              className="btn btn-primary"
              disabled={submitting || !skillForm.name}
            >
              {submitting ? 'Creating...' : 'Create Skill Category'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateSkill}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Skill Qualification Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Heavy Equipment Operator"
                value={skillForm.name}
                onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description / Required Competencies</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Competency description, certifications or craft requirements..."
                value={skillForm.description}
                onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DepartmentsPage;
