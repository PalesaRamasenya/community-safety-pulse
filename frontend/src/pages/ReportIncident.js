import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import '../styles/ReportIncident.css';

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

const DEFAULT_CENTER = [-26.2041, 28.0473];

function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    }
  });
  return position ? <Marker position={position} /> : null;
}

export default function ReportIncident() {
  const { user } = useAuth();
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [position, setPosition] = useState(null);
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    // Small demo-scope approach: embed the photo as a base64 data URL directly
    // in photo_url. A production build should upload to object storage instead.
    reader.onload = () => setPhotoDataUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const newErrors = {};
    if (!category) newErrors.category = 'Please select a category';
    if (!description.trim()) newErrors.description = 'Please enter a description';
    if (!position) newErrors.position = 'Please pin the location on the map';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSuccess(false);

    if (!validate()) return;

    setSubmitting(true);
    try {
      await axiosClient.post('/api/incidents', {
        category,
        description,
        latitude: position[0],
        longitude: position[1],
        photo_url: photoDataUrl,
        user_id: user ? user.uid : null
      });

      setSuccess(true);
      setCategory('');
      setDescription('');
      setPosition(null);
      setPhotoDataUrl(null);
      setErrors({});
    } catch (err) {
      console.error('Failed to submit incident:', err);
      setSubmitError(
        err.response?.data?.error || 'Failed to submit the report. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="report-page-wrapper">
      <div className="report-page">
        <h2>Report an Incident</h2>
        <p className="report-subtitle">
          Reports can be submitted anonymously - no login required.
        </p>

        {success && (
          <div className="success-banner">
            Thank you - your report has been submitted successfully.
          </div>
        )}
        {submitError && <div className="error-banner">{submitError}</div>}

        <form className="report-form" onSubmit={handleSubmit} noValidate>
          <div className="report-section">
            <h3 className="report-section-heading">Incident Details</h3>

            <label>
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.category && <span className="field-error">{errors.category}</span>}
            </label>

            <label>
              Description
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened..."
              />
              {errors.description && <span className="field-error">{errors.description}</span>}
            </label>

            <label>
              Photo (optional)
              <input type="file" accept="image/*" onChange={handlePhotoChange} />
            </label>
          </div>

          <div className="report-section">
            <h3 className="report-section-heading">Location</h3>
            <div className="map-picker-label">
              Pin the location on the map (click to place marker)
            </div>
            <div className="map-picker-container">
              <MapContainer center={DEFAULT_CENTER} zoom={12} className="report-map">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationPicker position={position} setPosition={setPosition} />
              </MapContainer>
            </div>
            {errors.position && <span className="field-error">{errors.position}</span>}
          </div>

          <button type="submit" className="submit-button" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  );
}
