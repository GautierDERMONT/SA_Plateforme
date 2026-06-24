// pages/Login.jsx - Version corrigée
import React, { useState } from 'react';
import { login, register } from '../services/api';
import './Login.css';

function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        // ===== CONNEXION =====
        const response = await login(email, password);
        console.log('🔑 Réponse login:', response.data);
        
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // ✅ PASSER L'UTILISATEUR À onLogin
        onLogin(response.data.user); // <-- CORRECTION ICI
        
      } else {
        // ===== INSCRIPTION =====
        const response = await register(email, password, fullName);
        
        setSuccess('Inscription réussie !');
        
        setEmail('');
        setPassword('');
        setFullName('');
        
        setTimeout(() => {
          setIsLogin(true);
          setSuccess('');
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setPassword('');
    setEmail('');
    setFullName('');
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-page-card">
        <div className="login-page-header">
          <h1>SA Plateforme</h1>
          <p>Transformateur CRM</p>
        </div>

        <form onSubmit={handleSubmit} className="login-page-form">
          <h2 className="login-page-form-title">
            {isLogin ? 'Connexion' : 'Inscription'}
          </h2>

          {!isLogin && (
            <div className="login-page-input-group">
              <label>Nom complet</label>
              <input
                type="text"
                placeholder="Jean Dupont"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength="2"
                disabled={loading}
              />
            </div>
          )}

          <div className="login-page-input-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="exemple@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="login-page-input-group">
            <label>Mot de passe</label>
            <input
              type="password"
              placeholder={isLogin ? "••••••••" : "Minimum 6 caractères"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
              disabled={loading}
            />
          </div>

          {error && <div className="login-page-error">{error}</div>}
          {success && <div className="login-page-success">{success}</div>}

          <button type="submit" className="login-page-btn" disabled={loading}>
            {loading 
              ? (isLogin ? 'Connexion...' : 'Inscription...') 
              : (isLogin ? 'Se connecter' : "S'inscrire")
            }
          </button>

          <div className="login-page-toggle">
            <span>
              {isLogin ? "Pas encore de compte ? " : "Déjà un compte ? "}
              <button 
                type="button" 
                onClick={toggleMode}
                className="login-page-toggle-link"
                disabled={loading}
              >
                {isLogin ? "S'inscrire" : "Se connecter"}
              </button>
            </span>
          </div>
        </form>

        <div className="login-page-footer">
          <p className="login-page-legal">
            {isLogin 
              ? "Connectez-vous pour accéder à la plateforme"
              : "En vous inscrivant, vous acceptez nos conditions d'utilisation."
            }
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;