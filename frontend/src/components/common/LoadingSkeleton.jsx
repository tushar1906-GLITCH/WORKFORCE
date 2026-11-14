import React from 'react';

export const TableSkeleton = ({ rows = 6, cols = 5 }) => (
  <div className="table-container">
    <table className="data-table" style={{ width: '100%' }}>
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} style={{ padding: '12px 16px' }}>
              <div
                className="skeleton"
                style={{ height: '11px', width: '60%', borderRadius: 'var(--radius-sm)' }}
              />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i}>
            {Array.from({ length: cols }).map((_, j) => (
              <td key={j} style={{ padding: '14px 16px' }}>
                <div
                  className="skeleton"
                  style={{
                    height: '14px',
                    borderRadius: 'var(--radius-sm)',
                    width: j === 0 ? '75%' : j === cols - 1 ? '45%' : '65%',
                  }}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const CardSkeleton = ({ count = 4 }) => (
  <div className="stats-grid">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card" style={{ padding: '20px' }}>
        <div
          className="skeleton"
          style={{ height: '11px', width: '40%', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }}
        />
        <div
          className="skeleton"
          style={{ height: '28px', width: '55%', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}
        />
        <div
          className="skeleton"
          style={{ height: '10px', width: '70%', borderRadius: 'var(--radius-sm)' }}
        />
      </div>
    ))}
  </div>
);

export const LoadingSpinner = ({ label = 'Loading operational data...' }) => (
  <div
    style={{
      padding: '48px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      color: 'var(--text-muted)',
    }}
  >
    <div
      className="skeleton"
      style={{
        width: '36px',
        height: '36px',
        borderRadius: 'var(--radius-md)',
      }}
    />
    <span style={{ fontSize: '0.86rem' }}>{label}</span>
  </div>
);

export default TableSkeleton;
