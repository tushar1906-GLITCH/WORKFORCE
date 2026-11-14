import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'var(--primary)',
  trend,
  onClick,
}) => {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all var(--transition-normal)',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px',
            }}
          >
            {title}
          </p>
          <div
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
            }}
          >
            {value}
          </div>
          {subtitle && (
            <p
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                marginTop: '6px',
                lineHeight: 1.3,
              }}
            >
              {subtitle}
            </p>
          )}

          {trend && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '8px',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: trend.isPositive ? 'var(--success)' : 'var(--danger)',
                backgroundColor: trend.isPositive ? 'var(--success-bg)' : 'var(--danger-bg)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {trend.isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              <span>{trend.label}</span>
            </div>
          )}
        </div>

        {Icon && (
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color,
              flexShrink: 0,
            }}
          >
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
