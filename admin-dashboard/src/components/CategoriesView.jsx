import React, { useState, useEffect } from 'react';
import { Shapes } from 'lucide-react';
import { apiFetch, formatINR } from '../api';

export default function CategoriesView({ showToast }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/categories');
      if (res.success) {
        setCategories(res.categories);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  return (
    <div className="view-section">
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Categories Analytics</h3>
            <p className="card-subtitle">Overview of transaction classification and usage metrics</p>
          </div>
        </div>

        <div className="card-body">
          {loading ? (
            <p className="text-muted text-center" style={{ padding: 30 }}>Loading categories...</p>
          ) : categories.length === 0 ? (
            <p className="text-muted text-center" style={{ padding: 30 }}>No categories registered.</p>
          ) : (
            <div className="categories-grid">
              {categories.map((c) => (
                <div key={c.id} className="category-card">
                  <div
                    className="category-badge-icon"
                    style={{ backgroundColor: c.color || '#438883' }}
                  >
                    <Shapes size={20} />
                  </div>
                  <div className="category-card-content">
                    <strong>{c.title}</strong>
                    <span>{c.usage_count || 0} transactions ({formatINR(c.total_volume || 0)})</span>
                    <span
                      className={`badge ${c.type === 'income' ? 'badge-income' : 'badge-expense'}`}
                      style={{ marginTop: 4 }}
                    >
                      {(c.type || 'expense').toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

