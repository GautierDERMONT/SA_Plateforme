import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onLogout) onLogout();
    navigate('/login');
  };

  const goToDashboard = () => {
    navigate('/');
  };

  // Ne pas afficher la navbar sur la page de login
  if (location.pathname === '/login') {
    return null;
  }

  return (
    <nav className="universal-navbar">
      <div className="navbar-logo" onClick={goToDashboard}>
        <span className="logo-text">CSV CRM Transformer</span>
      </div>
      <div className="navbar-actions">
        <span className="user-email">{user?.email || 'Utilisateur'}</span>
        <button className="navbar-btn logout" onClick={handleLogout}>
          🔓 Déconnexion
        </button>
      </div>
    </nav>
  );
}

export default Navbar;