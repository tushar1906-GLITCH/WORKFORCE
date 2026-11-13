import React from 'react';

export const StatusBadge = ({ status }) => {
  if (!status) return null;

  const normalized = status.toLowerCase().replace(/_/g, '-');
  const label = status.replace(/_/g, ' ');

  return <span className={`badge badge-${normalized}`}>{label}</span>;
};

export default StatusBadge;
