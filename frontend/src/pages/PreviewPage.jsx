import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Navbar from '../pages/Navbar';
import './PreviewPage.css';


export default function PreviewPage() {
  const navigate = useNavigate();
  const { processedData, setProcessedData, clearProcessedData, salonName, setSalonName } = useApp();
  const [editingData, setEditingData] = useState(processedData);
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    setEditingData(processedData);
  }, [processedData]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearProcessedData();
    navigate('/login');
  };

  const handleNewFile = () => {
    clearProcessedData();
    navigate('/');
  };

  const handleCellEdit = (rowIndex, field, value) => {
    setEditingData(prev => {
      const newData = [...prev];
      newData[rowIndex] = { ...newData[rowIndex], [field]: value };
      return newData;
    });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
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
      setSalonName(result.salon_name || 'Salon importé');
      setEditingData(result.data);
      
    } catch (err) {
      alert('Erreur lors du traitement');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleExport = () => {
    const headers = ['Nom', 'Prénom', 'Email', 'Téléphone', 'Code Postal', 'Ville', 'Formation', 'Campus', 'Classe', 'Date Rentrée'];
    const csvRows = [headers];
    
    editingData.forEach(row => {
      csvRows.push([
        row.nom,
        row.prenom,
        row.email,
        row.telephone,
        row.codePostal,
        row.ville,
        row.formation,
        row.campus,
        row.classeActuelle,
        row.dateRentreePrev
      ]);
    });
    
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `export_crm_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const errorCount = editingData.reduce((acc, row) => 
    acc + (row.errors?.filter(e => e.type === 'error').length || 0), 0
  );
  const warningCount = editingData.reduce((acc, row) => 
    acc + (row.errors?.filter(e => e.type === 'warning').length || 0), 0
  );

  if (processedData.length === 0) {
    return (
      <div className="preview-container">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="preview-empty">
          <div className="empty-card">
            <h2>Aucune donnée</h2>
            <p>Importez un nouveau fichier CSV</p>
            <div className="upload-area">
              <label className="upload-label">
                {uploading ? 'Traitement...' : 'Choisir un fichier'}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-container">
      <Navbar user={user} onLogout={handleLogout} />
      
      <main className="preview-main">
        <div className="preview-header">
          <div>
            <h1>Aperçu des données</h1>
            <p className="salon-name">Salon : {salonName || 'Non spécifié'}</p>
            <p className="row-count">{editingData.length} lignes traitées</p>
          </div>
          <div className="header-buttons">
            <button className="new-file-btn" onClick={handleNewFile}>
              Nouveau fichier
            </button>
            <button className="export-btn" onClick={handleExport}>
              Exporter pour CRM
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon green">✓</div>
            <div>
              <div className="stat-number">{editingData.length}</div>
              <div className="stat-label">Lignes traitées</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon yellow">⚠</div>
            <div>
              <div className="stat-number">{warningCount}</div>
              <div className="stat-label">Corrections auto</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon red">✗</div>
            <div>
              <div className="stat-number">{errorCount}</div>
              <div className="stat-label">Erreurs détectées</div>
            </div>
          </div>
        </div>

        <div className="table-container">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>CP</th>
                  <th>Ville</th>
                  <th>Formation</th>
                  <th>Campus</th>
                  <th>Classe</th>
                  <th>Rentrée</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {editingData.map((row, index) => {
                  const hasErrors = row.errors?.some(e => e.type === 'error') || false;
                  const hasWarnings = row.errors?.some(e => e.type === 'warning') || false;
                  
                  return (
                    <tr key={index} className={hasErrors ? 'row-error' : ''}>
                      <td>{index + 1}</td>
                      <td><input value={row.nom || ''} onChange={(e) => handleCellEdit(index, 'nom', e.target.value)} className="cell-input" /></td>
                      <td><input value={row.prenom || ''} onChange={(e) => handleCellEdit(index, 'prenom', e.target.value)} className="cell-input" /></td>
                      <td><input value={row.email || ''} onChange={(e) => handleCellEdit(index, 'email', e.target.value)} className={`cell-input ${row.errors?.some(e => e.field === 'email') ? 'input-warning' : ''}`} /></td>
                      <td><input value={row.telephone || ''} onChange={(e) => handleCellEdit(index, 'telephone', e.target.value)} className={`cell-input ${row.errors?.some(e => e.field === 'telephone') ? 'input-warning' : ''}`} /></td>
                      <td><input value={row.codePostal || ''} onChange={(e) => handleCellEdit(index, 'codePostal', e.target.value)} className="cell-input" /></td>
                      <td><input value={row.ville || ''} onChange={(e) => handleCellEdit(index, 'ville', e.target.value)} className="cell-input" /></td>
                      <td><input value={row.formation || ''} onChange={(e) => handleCellEdit(index, 'formation', e.target.value)} className="cell-input" /></td>
                      <td><input value={row.campus || ''} onChange={(e) => handleCellEdit(index, 'campus', e.target.value)} className="cell-input" /></td>
                      <td><input value={row.classeActuelle || ''} onChange={(e) => handleCellEdit(index, 'classeActuelle', e.target.value)} className="cell-input" /></td>
                      <td><input value={row.dateRentreePrev || ''} onChange={(e) => handleCellEdit(index, 'dateRentreePrev', e.target.value)} className="cell-input" /></td>
                      <td>
                        {hasErrors ? <span className="badge badge-error">Erreur</span> : hasWarnings ? <span className="badge badge-warning">Corrigé</span> : <span className="badge badge-success">OK</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {(errorCount > 0 || warningCount > 0) && (
          <div className="errors-card">
            <h3>Détails des corrections et erreurs</h3>
            <div className="errors-list">
              {editingData.map((row, index) => {
                if (!row.errors || row.errors.length === 0) return null;
                return (
                  <div key={index} className="error-item">
                    <p className="error-row">Ligne {index + 1}: {row.nom} {row.prenom}</p>
                    {row.errors.map((error, errorIndex) => (
                      <div key={errorIndex} className={`error-detail ${error.type}`}>
                        <span className="error-icon">{error.type === 'error' ? '✗' : '⚠'}</span>
                        <span>{error.field}: {error.message}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}