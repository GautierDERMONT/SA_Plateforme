// components/Navbar.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { deleteMyAccount } from '../services/api';
import './Navbar.css';

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteMyAccount();
      // Déconnexion après suppression
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (onLogout) onLogout();
      setShowDeleteModal(false);
      navigate('/login');
      alert('Votre compte a été supprimé avec succès.');
    } catch (err) {
      alert(err.response?.data?.detail || '❌ Erreur lors de la suppression du compte');
    } finally {
      setDeleting(false);
    }
  };

  // Vérifier si l'utilisateur est administrateur
  const isAdmin = user?.full_name === 'Administrateur';

  if (location.pathname === '/login') {
    return null;
  }

  return (
    <>
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
            <span className="user-name">
               {user?.full_name || 'Utilisateur'}
            </span>
            
            {isAdmin && (
              <button className="navbar-btn admin" onClick={goToAdmin}>
                Administration
              </button>
            )}

            {!isAdmin && (
              <button 
                className="navbar-btn delete-account"
                onClick={() => setShowDeleteModal(true)}
                title="Supprimer mon compte"
              >
                🗑️
              </button>
            )}
            
            <button className="navbar-btn logout" onClick={handleLogout}>
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Supprimer votre compte</h3>
            </div>
            <div className="modal-body">
              <p>
                
              
                <strong>Êtes-vous sûr de vouloir supprimer votre compte ?</strong>
              </p>
              
            </div>
            <div className="modal-footer">
              <button 
                className="modal-btn cancel"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Annuler
              </button>
              <button 
                className="modal-btn danger"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? 'Suppression...' : 'Oui, supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;