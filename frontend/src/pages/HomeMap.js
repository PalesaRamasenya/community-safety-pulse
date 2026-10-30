import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import axiosClient from '../api/axiosClient';
import '../styles/HomeMap.css';

const DEFAULT_CENTER = [-26.2041, 28.0473]; // Johannesburg, used as a sane default map center
const DEFAULT_ZOOM = 11;

const SEVERITY_COLOR = {
  High: '#ef4444',
  Medium: '#f97316',
  Low: '#22c55e',
  Unclassified: '#94a3b8'
};

const STATUS_CLASS = {
  Open: 'status-badge-open',
  'Under Review': 'status-badge-review',
  Resolved: 'status-badge-resolved'
};

const LEGEND_ITEMS = [
  { label: 'High Risk', color: SEVERITY_COLOR.High },
  { label: 'Medium Risk', color: SEVERITY_COLOR.Medium },
  { label: 'Low Risk', color: SEVERITY_COLOR.Low },
  { label: 'Unclassified', color: SEVERITY_COLOR.Unclassified }
];

const MAP_TABS = [
  { key: 'All', label: 'All Incidents' },
  { key: 'High', label: 'High Severity' },
  { key: 'Medium', label: 'Medium' },
  { key: 'Low', label: 'Low' }
];

function timeAgo(value) {
  if (!value) return 'Unknown';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return 'Unknown';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.toDateString() === new Date().toDateString();
}

export default function HomeMap() {
  const [incidents, setIncidents] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    // Real-time incident updates for the map + recent incidents sidebar.
    // Only one listener is created (cleaned up via unsubscribe on unmount), so
    // re-renders never stack up duplicate onSnapshot subscriptions.
    const unsubscribe = onSnapshot(
      collection(db, 'incidents'),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const raw = doc.data();
          return {
            ...raw,
            // Fall back to the Firestore document ID if a doc is missing its own
            // incident_id field (e.g. was written outside the normal create flow).
            incident_id: raw.incident_id || doc.id,
            // Firestore may store these as strings (or omit them); coerce explicitly
            // so downstream numeric use (Leaflet marker positions, math) is safe.
            latitude: parseFloat(raw.latitude),
            longitude: parseFloat(raw.longitude)
          };
        });
        setIncidents(data);
        setLoading(false);
        setError('');
      },
      (err) => {
        console.error('Firestore incidents listener error:', err);
        setError('Unable to load live incident data.');
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    async function fetchAreas() {
      try {
        const { data } = await axiosClient.get('/api/areas');
        setAreas(data.areas || []);
      } catch (err) {
        console.error('Failed to fetch area risk scores:', err);
      }
    }
    fetchAreas();
  }, []);

  const recentIncidents = useMemo(() => {
    return [...incidents]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8);
  }, [incidents]);

  // Incidents with missing/invalid coordinates can't be placed on the map, but
  // should still count toward the live totals and still show in the sidebar.
  const mappableIncidents = useMemo(
    () => incidents.filter((i) => Number.isFinite(i.latitude) && Number.isFinite(i.longitude)),
    [incidents]
  );

  const tabFilteredIncidents = useMemo(() => {
    if (activeTab === 'All') return mappableIncidents;
    return mappableIncidents.filter((i) => i.ai_severity === activeTab);
  }, [mappableIncidents, activeTab]);

  const activeIncidentCount = useMemo(
    () => incidents.filter((i) => (i.status || 'Open') !== 'Resolved').length,
    [incidents]
  );

  const quickStats = useMemo(
    () => ({
      today: incidents.filter((i) => isToday(i.created_at)).length,
      high: incidents.filter((i) => i.ai_severity === 'High').length,
      review: incidents.filter((i) => i.status === 'Under Review').length,
      resolved: incidents.filter((i) => i.status === 'Resolved').length
    }),
    [incidents]
  );

  const areaBadgeColor = (score) => {
    if (score >= 60) return SEVERITY_COLOR.High;
    if (score >= 30) return SEVERITY_COLOR.Medium;
    return SEVERITY_COLOR.Low;
  };

  const formatDate = (value) => (value ? new Date(value).toLocaleString() : 'Unknown date');

  const handleIncidentClick = (incident) => {
    console.log('Incident clicked:', incident);
  };

  return (
    <div className="home-page">
      <div className="stats-bar">
        <div className="stats-bar-item">
          <span className="stats-bar-value">{incidents.length}</span>
          <span className="stats-bar-label">Total Incidents</span>
        </div>
        <div className="stats-bar-item stats-bar-high">
          <span className="stats-bar-value">{quickStats.high}</span>
          <span className="stats-bar-label">High Severity</span>
        </div>
        <div className="stats-bar-item">
          <span className="stats-bar-value">{activeIncidentCount}</span>
          <span className="stats-bar-label">Active Incidents</span>
        </div>
      </div>

      <div className="home-container">
        <div className="dashboard-content">
          <div className="map-card">
            <div className="map-card-header">
              <div className="map-tabs">
                {MAP_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`map-tab ${activeTab === tab.key ? 'map-tab-active' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <span className="live-count-badge">{activeIncidentCount} Active Incidents</span>
            </div>

            <div className="map-container-wrapper">
              {error && <div className="map-error-banner">{error}</div>}
              {loading && <div className="map-loading-banner">Loading incidents...</div>}

              {areas.length > 0 && (
                <div className="area-risk-panel">
                  <h4>Area Risk Scores</h4>
                  {areas.map((area) => (
                    <div key={area.area_id} className="area-risk-badge">
                      <span>{area.area_name}</span>
                      <span
                        className="risk-score-pill"
                        style={{ backgroundColor: areaBadgeColor(area.risk_score) }}
                      >
                        {area.risk_score}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* center/zoom only set the INITIAL view - react-leaflet does not react to prop
                  changes after mount. Do not add a `key` here or call setView/flyTo/fitBounds
                  from an effect keyed on auth state; the view must stay fixed regardless of
                  login/logout. */}
              <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="leaflet-container">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {tabFilteredIncidents.map((incident) => (
                  <CircleMarker
                    key={incident.incident_id}
                    center={[incident.latitude, incident.longitude]}
                    radius={8}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 2,
                      fillColor: SEVERITY_COLOR[incident.ai_severity] || SEVERITY_COLOR.Unclassified,
                      fillOpacity: 0.9
                    }}
                  >
                    <Popup>
                      <div className="marker-popup">
                        <strong>{incident.category}</strong>
                        <p>{incident.description}</p>
                        <p className="marker-popup-badges">
                          <span
                            className="recent-severity-badge"
                            style={{
                              backgroundColor:
                                SEVERITY_COLOR[incident.ai_severity] || SEVERITY_COLOR.Unclassified
                            }}
                          >
                            {incident.ai_severity || 'Unclassified'}
                          </span>
                          <span
                            className={`recent-status-badge ${
                              STATUS_CLASS[incident.status || 'Open'] || ''
                            }`}
                          >
                            {incident.status || 'Open'}
                          </span>
                        </p>
                        <p className="popup-date" title={formatDate(incident.created_at)}>
                          {timeAgo(incident.created_at)}
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>

              <div className="map-legend">
                {LEGEND_ITEMS.map((item) => (
                  <div key={item.label} className="map-legend-item">
                    <span className="map-legend-dot" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="sidebar-panel">
            <div className="quick-stats-grid">
              <div className="quick-stat-card quick-stat-today">
                <span className="quick-stat-value">{quickStats.today}</span>
                <span className="quick-stat-label">Total Today</span>
              </div>
              <div className="quick-stat-card quick-stat-review">
                <span className="quick-stat-value">{quickStats.review}</span>
                <span className="quick-stat-label">Under Review</span>
              </div>
              <div className="quick-stat-card quick-stat-resolved">
                <span className="quick-stat-value">{quickStats.resolved}</span>
                <span className="quick-stat-label">Resolved</span>
              </div>
            </div>

            <div className="recent-incidents-section">
              <div className="recent-incidents-header">
                <h3>Recent Incidents</h3>
                <Link to="/admin" className="view-all-link">
                  View All
                </Link>
              </div>
              <div className="recent-incidents-list">
                {recentIncidents.length === 0 && (
                  <p className="recent-empty">No incidents reported yet.</p>
                )}
                {recentIncidents.map((incident) => (
                  <div
                    key={incident.incident_id}
                    className="recent-incident-card"
                    onClick={() => handleIncidentClick(incident)}
                  >
                    <span
                      className="recent-incident-dot"
                      style={{
                        backgroundColor: SEVERITY_COLOR[incident.ai_severity] || SEVERITY_COLOR.Unclassified
                      }}
                    />
                    <div className="recent-incident-body">
                      <span className="recent-incident-category">{incident.category}</span>
                      <p className="recent-incident-description">{incident.description}</p>
                      <div className="recent-incident-meta">
                        <span className="recent-incident-area">
                          {incident.area_name || 'Unknown area'}
                        </span>
                        <span className="recent-incident-date">{timeAgo(incident.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link to="/report" className="report-cta-button">
              Report an Incident
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
