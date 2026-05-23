import React, { useState, useEffect } from 'react';
import { getData, createData } from '../services/api';
import './Dashboard.css';

function Dashboard({ onLogout }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('Détection automatique');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [user, setUser] = useState(null);

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
    if (!newItemName) return alert("Veuillez entrer un nom de salon.");
    if (!file) return alert("Veuillez sélectionner un fichier.");
  
    try {
      await createData({ name: newItemName, description: `Format: ${selectedFormat}` });
      setNewItemName('');

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erreur API");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "crm_ready.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      fetchData();
      alert("Traitement terminé !");
    } catch (err) {
      alert("Erreur lors du traitement");
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setFileName(selectedFile ? selectedFile.name : "");
  };

  if (loading) return <div className="loading-screen">Chargement de la plateforme...</div>;

  return (
    <div className="app-wrapper">
      <nav className="navbar">
        <div className="nav-logo">
          <span className="logo-text">CSV CRM Transformer</span>
        </div>
        <div className="nav-actions">
          <span className="user-email">{user?.email || 'Utilisateur'}</span>
          <button className="nav-btn logout" onClick={onLogout}>Déconnexion</button>
        </div>
      </nav>

      <main className="container">
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
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <div className="file-input-custom">
                <button type="button" className="browse-btn" onClick={() => document.getElementById('fileInput').click()}>Parcourir...</button>
                <span className="file-name">{fileName || "Aucun fichier sélectionné."}</span>
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

            <button type="submit" className="submit-btn">
              Traiter le fichier
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