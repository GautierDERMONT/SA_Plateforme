import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getData, createData } from '../services/api';
import { useApp } from '../context/AppContext';
import Navbar from './Navbar';
import './Dashboard.css';

function Dashboard({ onLogout }) {
  const navigate = useNavigate();
  const { setProcessedData, setSalonName } = useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('Détection automatique');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [user, setUser] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const fetchData = async () => {
    try {
      const response = await getData();
      setItems(response.data);
      setLoading(false);
      setError(null);
    } catch (err) {
      setError('Erreur de connexion au backend');
      setLoading(false);
    }
  };

  const handleProcess = async (e) => {
    e.preventDefault();
    if (!newItemName) return alert('Veuillez entrer un nom de salon.');
    if (!file) return alert('Veuillez sélectionner un fichier.');
  
    setProcessing(true);

    try {
      await createData({ name: newItemName, description: `Format: ${selectedFormat}` });

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:5000/process-and-preview', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur API');
      }

      const result = await response.json();
      
      setProcessedData(result.data);
      setSalonName(newItemName);
      
      navigate('/preview');
      
    } catch (err) {
      alert('Erreur lors du traitement');
    } finally {
      setProcessing(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setFileName(selectedFile ? selectedFile.name : '');
  };

  if (loading) return <div className="loading-screen">Chargement de la plateforme...</div>;

  return (
    <div className="dashboard-wrapper">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="dashboard-container">
        <header className="hero-section">
          <h1>Transformateur CSV CRM</h1>
          <p>Importez et transformez vos fichiers CSV de salons pour le CRM</p>
        </header>

        <div className="main-card">
          <div className="card-header">
            <div className="header-text">
              <h3>Importer un fichier CSV</h3>
              <p>Sélectionnez votre fichier CSV et configurez le traitement</p>
            </div>
          </div>

          <form className="transform-form" onSubmit={handleProcess}>
            <div className="input-group">
              <label>Nom du salon</label>
              <input 
                type="text" 
                placeholder="Ex: Salon de l'Étudiant Paris 2026"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Format du fichier</label>
              <select 
                value={selectedFormat} 
                onChange={(e) => setSelectedFormat(e.target.value)}
              >
                <option>Détection automatique</option>
                <option>Format Standard</option>
              </select>
            </div>

            <div className="input-group">
              <label>Fichier CSV</label>
              <input
                type="file"
                id="fileInput"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div className="file-input-custom">
                <button type="button" className="browse-btn" onClick={() => document.getElementById('fileInput').click()}>
                  Parcourir...
                </button>
                <span className="file-name">{fileName || 'Aucun fichier sélectionné.'}</span>
              </div>
            </div>

            <div className="features-highlight">
              <h4>Fonctionnalités automatiques</h4>
              <ul>
                <li>Validation et correction des emails</li>
                <li>Validation et formatage des numéros de téléphone (+33)</li>
                <li>Auto-remplissage de la ville selon le code postal</li>
                <li>Attribution du campus selon la formation</li>
                <li>Calcul de la date de rentrée prévisionnelle</li>
              </ul>
            </div>

            <button type="submit" className="submit-btn" disabled={processing}>
              {processing ? 'Traitement en cours...' : 'Traiter le fichier'}
            </button>
          </form>
        </div>

        <p className="legal-footer">
          Les fichiers ne sont pas stockés. Vos données sont traitées localement et disparaissent une fois la page fermée.
        </p>
        
        {error && <p className="error-msg">{error}</p>}
      </main>
    </div>
  );
}

export default Dashboard;