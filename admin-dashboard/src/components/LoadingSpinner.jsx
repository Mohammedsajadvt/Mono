import React from 'react';

/**
 * Centered Circular Progress Indicator with Shimmer Glow Effect
 */
export function CircularSpinner({ size = 'md', text = '', style = {} }) {
  const sizeMap = {
    sm: { width: 28, height: 28, borderWidth: 3 },
    md: { width: 44, height: 44, borderWidth: 4 },
    lg: { width: 56, height: 56, borderWidth: 5 },
  };

  const dim = sizeMap[size] || sizeMap.md;

  return (
    <div className="centered-spinner-container" style={style}>
      <div
        className="circular-spinner"
        style={{
          width: dim.width,
          height: dim.height,
          borderWidth: dim.borderWidth,
        }}
      />
      {text && <span className="spinner-label">{text}</span>}
    </div>
  );
}

/**
 * Shimmer Table Skeleton Rows
 */
export function ShimmerTableRows({ rows = 5, cols = 8 }) {
  return (
    <>
      <tr>
        <td colSpan={cols} style={{ padding: '24px 0' }}>
          <CircularSpinner size="sm" />
        </td>
      </tr>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={`shimmer-row-${rIdx}`} className="shimmer-table-row">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={`shimmer-cell-${rIdx}-${cIdx}`}>
              <div
                className="skeleton"
                style={{
                  height: 16,
                  width: cIdx === 0 ? 36 : cIdx === 1 ? '70%' : '55%',
                  borderRadius: 6,
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Shimmer Card Skeleton Grid
 */
export function ShimmerCardGrid({ count = 6, height = 90 }) {
  return (
    <div>
      <CircularSpinner size="md" style={{ padding: '20px 0 24px' }} />
      <div className="categories-grid">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={`shimmer-card-${idx}`}
            className="category-card"
            style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: height }}
          >
            <div className="skeleton skeleton-circle" style={{ width: 42, height: 42 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: '65%', height: 16, marginBottom: 8 }} />
              <div className="skeleton skeleton-badge" style={{ width: 75, height: 18 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CircularSpinner;
