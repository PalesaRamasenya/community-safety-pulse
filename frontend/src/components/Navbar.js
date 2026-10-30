import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Navbar.css';

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/');
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-row">
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          <span className="navbar-brand-icon" aria-hidden="true">
            🛡️
          </span>
          Community Safety Pulse
        </Link>

        <button
          type="button"
          className="navbar-toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`navbar-links ${menuOpen ? 'navbar-links-open' : ''}`}>
        <Link to="/" className="navbar-link" onClick={closeMenu}>
          Home
        </Link>
        <Link to="/report" className="navbar-link" onClick={closeMenu}>
          Report Incident
        </Link>
        {role === 'admin' && (
          <Link to="/admin" className="navbar-link" onClick={closeMenu}>
            Dashboard
          </Link>
        )}

        {user ? (
          <div className="navbar-user">
            <span className="navbar-user-email">{user.email}</span>
            <button className="navbar-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <div className="navbar-auth-links">
            <Link to="/login" className="navbar-link" onClick={closeMenu}>
              Login
            </Link>
            <Link to="/register" className="navbar-link navbar-link-cta" onClick={closeMenu}>
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
