import React, { useState, useEffect } from 'react';
import { Shapes, Search, ChevronLeft, ChevronRight, Filter, Tag, X, TrendingDown, TrendingUp, Layers } from 'lucide-react';
import { apiFetch, formatINR } from '../api';

export default function CategoriesView({ showToast }) {
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [limit, setLimit] = useState(12);
  const [loading, setLoading] = useState(true);

  const loadCategories = async (
    page = 1,
    searchQuery = search,
    type = typeFilter,
    pageSize = limit
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (type) {
        params.append('type', type);
      }

      const res = await apiFetch(`/categories?${params.toString()}`);
      if (res.success) {
        const list = res.categories || [];
        if (res.pagination) {
          setCategories(list);
          setPagination(res.pagination);
        } else {
          // Client-side fallback pagination for older backend or static data
          let filtered = list;
          if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            filtered = filtered.filter(c => (c.title || c.name || '').toLowerCase().includes(q));
          }
          if (type) {
            filtered = filtered.filter(c => c.type === type || c.type === 'both');
          }
          const total = filtered.length;
          const totalPages = Math.ceil(total / pageSize) || 1;
          const offset = (page - 1) * pageSize;
          setCategories(filtered.slice(offset, offset + pageSize));
          setPagination({ page, limit: pageSize, total, totalPages });
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories(1, search, typeFilter, limit);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    loadCategories(1, val, typeFilter, limit);
  };

  const handleTypeChange = (e) => {
    const val = e.target.value;
    setTypeFilter(val);
    loadCategories(1, search, val, limit);
  };

  const handleLimitChange = (e) => {
    const val = parseInt(e.target.value, 10) || 12;
    setLimit(val);
    loadCategories(1, search, typeFilter, val);
  };

  const handleClearFilters = () => {
    setSearch('');
    setTypeFilter('');
    loadCategories(1, '', '', limit);
  };

  const startRecord = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total);

  // Generate visible page numbers for pagination
  const getPageNumbers = () => {
    const totalPages = pagination.totalPages || 1;
    const current = pagination.page;
    const pages = [];
    const maxButtons = 5;

    let start = Math.max(1, current - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }

    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    return pages;
  };

  return (
    <div className="view-section">
      <div className="card">
        {/* HEADER WITH SEARCH, FILTER AND LIMIT CONTROLS */}
        <div className="card-header filter-header">
          <div>
            <h3 className="card-title">
              <Tag size={18} color="var(--primary)" />
              Categories Directory & Analytics
            </h3>
            <p className="card-subtitle">
              Browse, filter and audit all transaction categories with paginated analytics
            </p>
          </div>

          <div className="filter-controls">
            {/* Search Input */}
            <div className="search-box">
              <Search size={15} color="#8E9F9D" />
              <input
                type="text"
                placeholder="Search category name..."
                value={search}
                onChange={handleSearchChange}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    loadCategories(1, '', typeFilter, limit);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                >
                  <X size={14} color="#8E9F9D" />
                </button>
              )}
            </div>

            {/* Type Filter */}
            <select
              className="select-input"
              value={typeFilter}
              onChange={handleTypeChange}
            >
              <option value="">All Types</option>
              <option value="expense">Expense Categories</option>
              <option value="income">Income Categories</option>
            </select>

            {/* Page Size Selector */}
            <select
              className="select-input"
              value={limit}
              onChange={handleLimitChange}
              title="Items per page"
            >
              <option value="8">8 per page</option>
              <option value="12">12 per page</option>
              <option value="24">24 per page</option>
              <option value="48">48 per page</option>
            </select>
          </div>
        </div>

        {/* CATEGORIES BODY */}
        <div className="card-body">
          {loading ? (
            <p className="text-muted text-center" style={{ padding: 40 }}>
              Loading categories...
            </p>
          ) : categories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Layers size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
              <p className="text-muted" style={{ fontSize: 14, marginBottom: 12 }}>
                No categories found matching your criteria.
              </p>
              {(search || typeFilter) && (
                <button className="btn btn-secondary btn-sm" onClick={handleClearFilters}>
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="categories-grid">
              {categories.map((c) => {
                const isIncome = c.type === 'income';
                return (
                  <div key={c.id} className="category-card">
                    <div
                      className="category-badge-icon"
                      style={{ backgroundColor: c.color || '#438883' }}
                    >
                      <Shapes size={20} />
                    </div>
                    <div className="category-card-content">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <strong>{c.title || c.name}</strong>
                        <span
                          className={`badge ${isIncome ? 'badge-income' : 'badge-expense'}`}
                          style={{ fontSize: 10, padding: '2px 7px' }}
                        >
                          {(c.type || 'expense').toUpperCase()}
                        </span>
                      </div>
                      <span>
                        {c.usage_count || 0} transactions
                      </span>
                      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isIncome ? (
                          <TrendingUp size={12} className="text-income" />
                        ) : (
                          <TrendingDown size={12} className="text-expense" />
                        )}
                        <strong className={isIncome ? 'text-income' : 'text-expense'} style={{ fontSize: 12.5 }}>
                          {formatINR(c.total_volume || 0)}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PAGINATION FOOTER */}
        <div className="card-footer pagination-footer">
          <span>
            Showing {startRecord} to {endRecord} of {pagination.total} categories
          </span>

          <div className="pagination-buttons">
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadCategories(pagination.page - 1, search, typeFilter, limit)}
            >
              <ChevronLeft size={14} /> Previous
            </button>

            {/* Clickable Page Numbers */}
            <div className="pagination-numbers">
              {getPageNumbers().map((pageNum) => (
                <button
                  key={pageNum}
                  className={`btn-page ${pageNum === pagination.page ? 'active' : ''}`}
                  disabled={loading}
                  onClick={() => loadCategories(pageNum, search, typeFilter, limit)}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page >= (pagination.totalPages || 1) || loading}
              onClick={() => loadCategories(pagination.page + 1, search, typeFilter, limit)}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
