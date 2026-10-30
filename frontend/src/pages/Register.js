import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import '../styles/Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'resident',
    registered_area: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    const newErrors = {};
    if (!form.email.trim()) newErrors.email = 'Email is required';
    if (!form.password || form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!form.registered_area.trim()) newErrors.registered_area = 'Registered area is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Backend creates the Firebase Auth user (via Admin SDK) and the Supabase profile
      await axiosClient.post('/api/auth/register', form);

      // Sign in on the client so an auth session/ID token exists immediately
      await signInWithEmailAndPassword(auth, form.email, form.password);

      navigate('/');
    } catch (err) {
      console.error('Registration failed:', err);
      setSubmitError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <h2>Register</h2>

        {submitError && <div className="error-banner">{submitError}</div>}

        <label>
          Email
          <input type="email" name="email" value={form.email} onChange={handleChange} />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </label>

        <label>
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </label>

        <label>
          Role
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="resident">Resident</option>
            <option value="coordinator">Coordinator</option>
          </select>
        </label>

        <label>
          Registered Area
          <input
            type="text"
            name="registered_area"
            value={form.registered_area}
            onChange={handleChange}
            placeholder="e.g. Sandton"
          />
          {errors.registered_area && (
            <span className="field-error">{errors.registered_area}</span>
          )}
        </label>

        <button type="submit" className="submit-button" disabled={submitting}>
          {submitting ? 'Registering...' : 'Register'}
        </button>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
