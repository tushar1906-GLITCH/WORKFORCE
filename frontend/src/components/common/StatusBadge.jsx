import React from 'react';

const STATUS_CONFIG = {
  present: { class: 'badge-present', label: 'Present' },
  absent: { class: 'badge-absent', label: 'Absent' },
  'half-day': { class: 'badge-half-day', label: 'Half Day' },
  'on-leave': { class: 'badge-on-leave', label: 'On Leave' },
  'weekly-off': { class: 'badge-weekly-off', label: 'Weekly Off' },
  holiday: { class: 'badge-holiday', label: 'Holiday' },
  'not-marked': { class: 'badge-not-marked', label: 'Not Marked' },
  active: { class: 'badge-active', label: 'Active' },
  inactive: { class: 'badge-inactive', label: 'Inactive' },
  approved: { class: 'badge-approved', label: 'Approved' },
  pending: { class: 'badge-pending', label: 'Pending' },
  rejected: { class: 'badge-rejected', label: 'Rejected' },
  cancelled: { class: 'badge-cancelled', label: 'Cancelled' },
  paid: { class: 'badge-paid', label: 'Paid' },
  unpaid: { class: 'badge-unpaid', label: 'Unpaid' },
  'partially-paid': { class: 'badge-partially-paid', label: 'Partial' },
  draft: { class: 'badge-draft', label: 'Draft' },
  locked: { class: 'badge-draft', label: 'Locked' },
  completed: { class: 'badge-paid', label: 'Completed' },
};

export const StatusBadge = ({ status, showDot = true }) => {
  if (!status) return null;

  const key = String(status).toLowerCase().replace(/[_\s]+/g, '-');
  const conf = STATUS_CONFIG[key] || {
    class: `badge-${key}`,
    label: String(status).replace(/_/g, ' '),
  };

  return (
    <span className={`badge ${conf.class}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      {showDot && (
        <span
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            opacity: 0.85,
          }}
        />
      )}
      <span>{conf.label}</span>
    </span>
  );
};

export default StatusBadge;
