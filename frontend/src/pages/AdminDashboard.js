import React, { useEffect, useMemo, useState } from 'react';
import axiosClient from '../api/axiosClient';
import '../styles/AdminDashboard.css';

const STATUSES = ['Open', 'Under Review', 'Resolved'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Unclassified'];
const STATUS_CLASS = {
  Open: 'status-pill-open',
  'Under Review': 'status-pill-review',
  Resolved: 'status-pill-resolved'
};

const CATEGORIES = [
  'Theft',
  'Robbery',
  'Assault',
  'Vandalism',
  'Suspicious Activity',
  'Road Hazard',
  'Fire',
  'Other'
];

// Status updates can involve a cold-started backend/SMTP dependency, so they get a
// longer timeout than the rest of the app's requests (which keep the 10s default).
const STATUS_UPDATE_TIMEOUT_MS = 30000;

function riskBadgeClass(score) {
  if (score >= 7) return 'risk-badge-high';
  if (score >= 4) return 'risk-badge-medium';
  return 'risk-badge-low';
}

export default function AdminDashboard() {
  const [incidents, setIncidents] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [areasError, setAreasError] = useState('');

  const [filters, setFilters] = useState({ severity: '', category: '', status: '' });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const [recalculatingId, setRecalculatingId] = useState(null);
  const [updatingStatusIds, setUpdatingStatusIds] = useState({});
  const [statusErrors, setStatusErrors] = useState({});

  const fetchIncidents = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.severity) params.severity = filters.severity;
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;

      const { data } = await axiosClient.get('/api/incidents', { params });
      setIncidents(data.incidents || []);
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
      setError('Failed to load incidents.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAreas = async () => {
    setAreasError('');
    try {
      const { data } = await axiosClient.get('/api/areas');
      setAreas(data.areas || []);
    } catch (err) {
      console.error('Failed to fetch areas:', err);
      setAreasError('Failed to load area risk scores.');
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchAreas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const summary = useMemo(() => {
    return {
      total: incidents.length,
      high: incidents.filter((i) => i.ai_severity === 'High').length,
      pending: incidents.filter((i) => i.status === 'Under Review').length,
      resolved: incidents.filter((i) => i.status === 'Resolved').length
    };
  }, [incidents]);

  const sortedIncidents = useMemo(() => {
    const severityRank = { Low: 1, Medium: 2, High: 3, Unclassified: 0 };
    const query = search.trim().toLowerCase();
    const filtered = query
      ? incidents.filter(
          (i) =>
            i.description?.toLowerCase().includes(query) ||
            i.category?.toLowerCase().includes(query)
        )
      : incidents;
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'severity') {
        return (severityRank[a.ai_severity] || 0) - (severityRank[b.ai_severity] || 0);
      }
      return new Date(a.created_at) - new Date(b.created_at);
    });
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [incidents, search, sortBy, sortDir]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleStatusUpdate = async (incidentId, newStatus) => {
    if (updatingStatusIds[incidentId]) return; // already in flight - ignore duplicate submits

    setUpdatingStatusIds((prev) => ({ ...prev, [incidentId]: true }));
    setStatusErrors((prev) => ({ ...prev, [incidentId]: '' }));
    try {
      await axiosClient.patch(
        `/api/incidents/${incidentId}/status`,
        { status: newStatus },
        { timeout: STATUS_UPDATE_TIMEOUT_MS }
      );
      setIncidents((prev) =>
        prev.map((inc) => (inc.incident_id === incidentId ? { ...inc, status: newStatus } : inc))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
      setStatusErrors((prev) => ({
        ...prev,
        [incidentId]: err.response?.data?.error || 'Failed to update status. Please try again.'
      }));
    } finally {
      setUpdatingStatusIds((prev) => {
        const next = { ...prev };
        delete next[incidentId];
        return next;
      });
    }
  };

  const handleDelete = async (incidentId) => {
    if (!window.confirm('Delete this report? This cannot be undone.')) return;
    try {
      await axiosClient.delete(`/api/incidents/${incidentId}`);
      setIncidents((prev) => prev.filter((inc) => inc.incident_id !== incidentId));
    } catch (err) {
      console.error('Failed to remove report:', err);
      alert('Failed to remove report.');
    }
  };

  const handleRecalculate = async (areaId) => {
    setRecalculatingId(areaId);
    try {
      const { data } = await axiosClient.post(`/api/areas/${areaId}/recalculate`);
      setAreas((prev) => prev.map((a) => (a.area_id === areaId ? data.area : a)));
    } catch (err) {
      console.error('Failed to recalculate area risk:', err);
      alert('Failed to recalculate area risk score.');
    } finally {
      setRecalculatingId(null);
    }
  };

  return (
    <div className="admin-page">
      <h2>Admin Dashboard</h2>

      <div className="summary-row">
        <div className="summary-card summary-total">
          <span className="summary-icon" aria-hidden="true">📋</span>
          <div className="summary-text">
            <span className="summary-value">{summary.total}</span>
            <span className="summary-label">Total Incidents</span>
          </div>
        </div>
        <div className="summary-card summary-high">
          <span className="summary-icon" aria-hidden="true">🚨</span>
          <div className="summary-text">
            <span className="summary-value">{summary.high}</span>
            <span className="summary-label">High Severity</span>
          </div>
        </div>
        <div className="summary-card summary-pending">
          <span className="summary-icon" aria-hidden="true">🕒</span>
          <div className="summary-text">
            <span className="summary-value">{summary.pending}</span>
            <span className="summary-label">Under Review</span>
          </div>
        </div>
        <div className="summary-card summary-resolved">
          <span className="summary-icon" aria-hidden="true">✅</span>
          <div className="summary-text">
            <span className="summary-value">{summary.resolved}</span>
            <span className="summary-label">Resolved</span>
          </div>
        </div>
      </div>

      <section className="admin-card">
        <h3>Incidents</h3>

        <div className="filters-bar">
          <label className="filter-field filter-field-search">
            <span className="filter-label">Search</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by description or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <label className="filter-field">
            <span className="filter-label">Severity</span>
            <select name="severity" value={filters.severity} onChange={handleFilterChange}>
              <option value="">All Severities</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span className="filter-label">Category</span>
            <select name="category" value={filters.category} onChange={handleFilterChange}>
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span className="filter-label">Status</span>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span className="filter-label">Sort by</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date">Date</option>
              <option value="severity">Severity</option>
            </select>
          </label>

          <label className="filter-field">
            <span className="filter-label">Order</span>
            <select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <p className="loading-state">Loading incidents...</p>
        ) : (
          <div className="table-wrapper">
            <table className="incidents-table">
              <colgroup>
                <col className="col-category" />
                <col className="col-description" />
                <col className="col-area" />
                <col className="col-severity" />
                <col className="col-spam" />
                <col className="col-status" />
                <col className="col-date" />
                <col className="col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Area</th>
                  <th>Severity</th>
                  <th>Spam</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedIncidents.map((incident) => {
                  const isUpdating = !!updatingStatusIds[incident.incident_id];
                  const statusError = statusErrors[incident.incident_id];
                  return (
                    <tr key={incident.incident_id}>
                      <td>{incident.category}</td>
                      <td className="description-cell" title={incident.description}>
                        {incident.description}
                      </td>
                      <td>{incident.area_name || '-'}</td>
                      <td>
                        <span className={`severity-badge severity-${incident.ai_severity}`}>
                          {incident.ai_severity}
                        </span>
                      </td>
                      <td>
                        {incident.spam_flag ? (
                          <span className="spam-badge">Spam</span>
                        ) : (
                          <span className="spam-badge-none">No</span>
                        )}
                      </td>
                      <td>
                        <div className="status-cell">
                          <span className={`status-pill ${STATUS_CLASS[incident.status] || ''}`}>
                            {incident.status}
                          </span>
                          {isUpdating && <span className="spinner" aria-label="Updating status" />}
                        </div>
                        {statusError && <div className="status-error">{statusError}</div>}
                      </td>
                      <td>{new Date(incident.created_at).toLocaleString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="action-button action-resolve"
                            disabled={isUpdating || incident.status === 'Resolved'}
                            onClick={() => handleStatusUpdate(incident.incident_id, 'Resolved')}
                          >
                            Resolve
                          </button>
                          <button
                            type="button"
                            className="action-button action-review"
                            disabled={isUpdating || incident.status === 'Under Review'}
                            onClick={() => handleStatusUpdate(incident.incident_id, 'Under Review')}
                          >
                            Review
                          </button>
                          <button
                            type="button"
                            className="action-button action-delete"
                            onClick={() => handleDelete(incident.incident_id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {sortedIncidents.length === 0 && (
                  <tr>
                    <td colSpan={8} className="empty-state">
                      No incidents match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card">
        <h3>Area Risk Scores</h3>
        {areasError && <div className="error-banner">{areasError}</div>}
        {areas.length === 0 ? (
          <p className="empty-state">No areas registered yet</p>
        ) : (
          <div className="table-wrapper">
            <table className="areas-table">
              <thead>
                <tr>
                  <th>Area Name</th>
                  <th>Current Risk Score</th>
                  <th>Recalculate</th>
                </tr>
              </thead>
              <tbody>
                {areas.map((area) => (
                  <tr key={area.area_id}>
                    <td>{area.area_name}</td>
                    <td>
                      <span className={`risk-badge ${riskBadgeClass(area.risk_score)}`}>
                        {area.risk_score}
                      </span>
                    </td>
                    <td>
                      <button
                        className="secondary-button"
                        onClick={() => handleRecalculate(area.area_id)}
                        disabled={recalculatingId === area.area_id}
                      >
                        {recalculatingId === area.area_id ? 'Recalculating...' : 'Recalculate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
