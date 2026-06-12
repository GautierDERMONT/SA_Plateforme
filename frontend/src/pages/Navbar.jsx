import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Remonte en haut de page à chaque changement de route
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleLogout = () => {
    const confirmed = window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?');
    
    if (confirmed) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (onLogout) onLogout();
      navigate('/login');
    }
  };

  const goToDashboard = () => {
    navigate('/');
  };

  const goToAdmin = () => {
    navigate('/admin');
  };

  // Vérifier si l'utilisateur est administrateur
  const isAdmin = user?.full_name === 'Administrateur';

  if (location.pathname === '/login') {
    return null;
  }

  return (
    <nav className="universal-navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <div className="navbar-logo">
            <span className="logo-text">CSV CRM Transformer</span>
          </div>
          <button className="navbar-btn home" onClick={goToDashboard}>
            Accueil
          </button>
        </div>
        <div className="navbar-actions">
          <span className="user-email">{user?.email || 'Utilisateur'}</span>
          {/* 🔒 Le bouton Admin n'apparaît que pour les administrateurs */}
          {isAdmin && (
            <button className="navbar-btn admin" onClick={goToAdmin}>
              Administration
            </button>
          )}
          <button className="navbar-btn logout" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;