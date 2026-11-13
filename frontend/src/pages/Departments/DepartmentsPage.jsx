import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { Building2, Plus, Edit, Check, Wrench } from 'lucide-react';

export const DepartmentsPage = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useNotification();

  const [departments, setDepartments] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);

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
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Departments & Skill Categories</h1>
          <p className="page-description">
            Define organizational divisions, functional units and worker skill qualifications
          </p>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setDeptModalOpen(true)}
              className="btn btn-primary"
            >
              <Plus size={16} /> New Department
            </button>
            <button
              onClick={() => setSkillModalOpen(true)}
              className="btn btn-secondary"
            >
              <Plus size={16} /> New Skill Category
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Departments Panel */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color="var(--primary)" />
              Departments ({departments.length})
            </h3>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Department Name</th>
                  <th>Description</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{d.code || '—'}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#FFF' }}>{d.name}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{d.description || '—'}</td>
                    <td>
                      <StatusBadge status={d.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Skill Categories Panel */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={20} color="var(--success)" />
              Skill Categories ({skills.length})
            </h3>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Skill Category</th>
                  <th>Description / Trade Scope</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {skills.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, color: '#FFF' }}>{s.name}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.description || '—'}</td>
                    <td>
                      <StatusBadge status={s.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Department Modal */}
      <Modal
        isOpen={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        title="Add Department"
        maxWidth="480px"
        footer={
          <>
            <button onClick={() => setDeptModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleCreateDept}
              className="btn btn-primary"
              disabled={submitting || !deptForm.name}
            >
              {submitting ? 'Creating...' : 'Save Department'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateDept}>
          <div className="form-group">
            <label className="form-label">Department Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Electrical & Instrumentation"
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Code / Abbreviation</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. ELE"
              value={deptForm.code}
              onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Scope of work and responsibilities..."
              value={deptForm.description}
              onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* New Skill Modal */}
      <Modal
        isOpen={skillModalOpen}
        onClose={() => setSkillModalOpen(false)}
        title="Add Skill Category"
        maxWidth="480px"
        footer={
          <>
            <button onClick={() => setSkillModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleCreateSkill}
              className="btn btn-primary"
              disabled={submitting || !skillForm.name}
            >
              {submitting ? 'Creating...' : 'Save Skill'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateSkill}>
          <div className="form-group">
            <label className="form-label">Skill Category Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Scaffold Inspector / Erector"
              value={skillForm.name}
              onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Trade Qualifications / Scope</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Required competencies..."
              value={skillForm.description}
              onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DepartmentsPage;
