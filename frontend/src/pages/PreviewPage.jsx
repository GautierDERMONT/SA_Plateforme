import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Navbar from './Navbar';
import { getCityFromPostalCode, postalCodes } from '../data/postalCodes';
import './PreviewPage.css';

export default function PreviewPage({ onLogout }) {
  const navigate = useNavigate();
  const { processedData, setProcessedData, clearProcessedData, salonName, setSalonName } = useApp();
  
  const [editingData, setEditingData] = useState(() => {
    return Array.isArray(processedData) ? processedData : [];
  });
  
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // État pour la modale
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedErrors, setSelectedErrors] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);

  // État pour la modale d'export
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFileName, setExportFileName] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    if (Array.isArray(processedData)) {
      setEditingData(processedData);
    } else {
      setEditingData([]);
    }
  }, [processedData]);

  // Fonction pour trouver le code postal à partir de la ville (recherche inverse)
  const getPostalCodeFromCity = (city) => {
    if (!city) return null;
    const cityLower = city.toLowerCase().trim();
    
    for (const [code, cityName] of Object.entries(postalCodes)) {
      if (cityName.toLowerCase() === cityLower || 
          cityName.toLowerCase().includes(cityLower)) {
        return code;
      }
    }
    return null;
  };

  // Fonction de validation en temps réel
  const validateField = (field, value, rowIndex) => {
    const newErrors = [];
    
    switch(field) {
      case 'nom':
        if (!value || value.trim() === '') {
          newErrors.push({ field: 'nom', type: 'error', message: 'Nom manquant' });
        }
        break;
        
      case 'prenom':
        if (!value || value.trim() === '') {
          newErrors.push({ field: 'prenom', type: 'error', message: 'Prénom manquant' });
        }
        break;
        
      case 'email':
        if (!value || value.trim() === '') {
          newErrors.push({ field: 'email', type: 'error', message: 'Email manquant' });
        } else {
          const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
          if (!emailRegex.test(value)) {
            newErrors.push({ field: 'email', type: 'error', message: 'Format email invalide' });
          } else {
            const validDomains = ['@gmail.com', '@yahoo.com', '@outlook.com', '@hotmail.com', '@live.com', '@icloud.com', '@orange.fr', '@sfr.fr', '@free.fr', '@wanadoo.fr', '@laposte.net', '@protonmail.com'];
            const hasValidDomain = validDomains.some(domain => value.toLowerCase().endsWith(domain));
            
            // 🔥 CHANGEMENT : Domaine non standard = ERREUR (rouge), plus warning (orange)
            if (!hasValidDomain) {
              newErrors.push({ field: 'email', type: 'error', message: 'Domaine email non standard' });
            }
          }
        }
        break;
        
      case 'telephone':
        if (!value || value.trim() === '') {
          newErrors.push({ field: 'telephone', type: 'error', message: 'Téléphone manquant' });
        } else {
          const phoneDigits = value.replace(/\D/g, '');
          if (phoneDigits.length === 0) {
            newErrors.push({ field: 'telephone', type: 'error', message: 'Téléphone invalide' });
          } else if (phoneDigits.length === 10 && phoneDigits.startsWith('0')) {
            newErrors.push({ field: 'telephone', type: 'warning', message: `Format recommandé: +33${phoneDigits.slice(1)}` });
          } else if (!value.startsWith('+')) {
            newErrors.push({ field: 'telephone', type: 'error', message: 'Utilisez le format +33XXXXXXXXX' });
          } else if (phoneDigits.length !== 11) {
            newErrors.push({ field: 'telephone', type: 'error', message: 'Le numéro doit contenir 11 chiffres' });
          }
        }
        break;
        
      case 'codePostal':
        if (value && !/^\d{5}$/.test(value)) {
          newErrors.push({ field: 'codePostal', type: 'error', message: 'Code postal à 5 chiffres' });
        }
        break;
        
      default:
        break;
    }
    
    return newErrors;
  };

  const handleNewFile = () => {
    clearProcessedData();
    navigate('/');
  };

  // Fonction principale d'édition avec auto-remplissage bidirectionnel
  const handleCellEdit = (rowIndex, field, value) => {
    console.log(`📝 Édition du champ "${field}" avec valeur: "${value}"`);
    
    setEditingData(prev => {
      if (!Array.isArray(prev)) {
        return [];
      }
      
      const newData = [...prev];
      const currentRow = newData[rowIndex];
      
      if (!currentRow) {
        return prev;
      }
      
      // Garder les autres erreurs (sauf celles du champ modifié)
      const otherErrors = (currentRow.errors || []).filter(e => e.field !== field);
      
      let updatedRow = { 
        ...currentRow, 
        [field]: value,
      };
      
      // SENS 1: Code Postal → Ville (auto-remplissage)
      if (field === 'codePostal' && value) {
        const city = getCityFromPostalCode(value);
        console.log(`🔍 Recherche ville pour CP "${value}":`, city);
        
        if (city) {
          updatedRow.ville = city;
          console.log(`✅ Auto-remplissage réussi: CP ${value} → ${city}`);
          
          const existingCityWarning = otherErrors.findIndex(e => e.field === 'ville');
          const warningMessage = {
            field: 'ville',
            type: 'warning',
            message: `Ville auto-remplie depuis le code postal: ${city}`
          };
          
          if (existingCityWarning !== -1) {
            otherErrors[existingCityWarning] = warningMessage;
          } else {
            otherErrors.push(warningMessage);
          }
        } else {
          console.log(`❌ Aucune ville trouvée pour le CP ${value}`);
        }
      }
      
      // SENS 2: Ville → Code Postal (auto-remplissage)
      if (field === 'ville' && value) {
        const postalCode = getPostalCodeFromCity(value);
        console.log(`🔍 Recherche CP pour ville "${value}":`, postalCode);
        
        if (postalCode) {
          updatedRow.codePostal = postalCode;
          console.log(`✅ Auto-remplissage réussi: Ville ${value} → CP ${postalCode}`);
          
          const existingZipWarning = otherErrors.findIndex(e => e.field === 'codePostal');
          const warningMessage = {
            field: 'codePostal',
            type: 'warning',
            message: `Code postal auto-rempli depuis la ville: ${postalCode}`
          };
          
          if (existingZipWarning !== -1) {
            otherErrors[existingZipWarning] = warningMessage;
          } else {
            otherErrors.push(warningMessage);
          }
        } else {
          console.log(`❌ Aucun CP trouvé pour la ville ${value}`);
        }
      }
      
      // Valider le champ modifié après auto-remplissage
      const newFieldErrors = validateField(field, updatedRow[field], rowIndex);
      const updatedErrors = [...otherErrors, ...newFieldErrors];
      updatedRow.errors = updatedErrors;
      
      newData[rowIndex] = updatedRow;
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
      
      console.log("Données reçues du backend:", result.data[0]);
      
      const dataArray = Array.isArray(result.data) ? result.data : [];
      
      // Auto-remplir les villes à partir des codes postaux à l'import
      const enrichedData = dataArray.map(row => {
        const newRow = { ...row };
        
        // Si la ville est vide mais qu'on a un code postal valide
        if ((!newRow.ville || newRow.ville === '') && newRow.codePostal) {
          const city = getCityFromPostalCode(newRow.codePostal);
          if (city) {
            newRow.ville = city;
            console.log(`Auto-remplissage (import): CP ${newRow.codePostal} → ${city}`);
            
            if (!newRow.errors) newRow.errors = [];
            newRow.errors.push({
              field: 'ville',
              type: 'warning',
              message: `Ville auto-remplie depuis le code postal: ${city}`
            });
          }
        }
        
        // Si le code postal est vide mais qu'on a une ville
        if ((!newRow.codePostal || newRow.codePostal === '') && newRow.ville) {
          const postalCode = getPostalCodeFromCity(newRow.ville);
          if (postalCode) {
            newRow.codePostal = postalCode;
            console.log(`Auto-remplissage (import): Ville ${newRow.ville} → CP ${postalCode}`);
            
            if (!newRow.errors) newRow.errors = [];
            newRow.errors.push({
              field: 'codePostal',
              type: 'warning',
              message: `Code postal auto-rempli depuis la ville: ${postalCode}`
            });
          }
        }
        
        return newRow;
      });
      
      setProcessedData(enrichedData);
      setSalonName(result.salon_name || 'Salon importé');
      setEditingData(enrichedData);
      
    } catch (err) {
      console.error(err);
      alert('Erreur lors du traitement');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };
  
  // Ouvrir la modale d'export
  const openExportModal = () => {
    const defaultName = `${salonName || 'export'}_${new Date().toISOString().split('T')[0]}`;
    setExportFileName(defaultName);
    setExportModalOpen(true);
  };

  // Exporter avec le nom choisi
  const handleExport = () => {
    if (!Array.isArray(editingData) || editingData.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }
    
    const headers = ['Nom', 'Prénom', 'Email', 'Téléphone', 'Code Postal', 'Ville', 'Formation', 'Campus', 'Classe', 'Date Rentrée'];
    const csvRows = [headers];
    
    editingData.forEach(row => {
      csvRows.push([
        row.nom || '',
        row.prenom || '',
        row.email || '',
        row.telephone || '',
        row.codePostal || '',
        row.ville || '',
        row.formation || '',
        row.campus || '',
        row.classeActuelle || '',
        row.dateRentreePrev || ''
      ]);
    });
    
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    let fileName = exportFileName.trim();
    if (!fileName) {
      fileName = `export_crm_${new Date().toISOString().split('T')[0]}`;
    }
    if (!fileName.endsWith('.csv')) {
      fileName = `${fileName}.csv`;
    }
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setExportModalOpen(false);
    setExportFileName('');
  };

  const closeExportModal = () => {
    setExportModalOpen(false);
    setExportFileName('');
  };

  const openErrorModal = (rowIndex, row) => {
    if (row.errors && row.errors.length > 0) {
      setSelectedRow(rowIndex);
      setSelectedErrors(row.errors);
      setModalOpen(true);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedErrors([]);
    setSelectedRow(null);
  };

  const errorCount = Array.isArray(editingData) ? editingData.reduce((acc, row) => 
    acc + (row.errors?.filter(e => e.type === 'error').length || 0), 0
  ) : 0;
  
  const warningCount = Array.isArray(editingData) ? editingData.reduce((acc, row) => 
    acc + (row.errors?.filter(e => e.type === 'warning').length || 0), 0
  ) : 0;

  if (!Array.isArray(editingData) || editingData.length === 0) {
    return (
      <div className="preview-container">
        <Navbar user={user} onLogout={onLogout} />
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
      <Navbar user={user} onLogout={onLogout} />
      
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
            <button className="export-btn" onClick={openExportModal}>
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
                  <th>Info</th>
                </tr>
              </thead>
              <tbody>
                {editingData.map((row, index) => {
                  const hasErrors = row.errors?.some(e => e.type === 'error') || false;
                  const hasWarnings = row.errors?.some(e => e.type === 'warning') || false;
                  const hasAnyIssue = hasErrors || hasWarnings;
                  
                  return (
                    <tr key={index} className={hasErrors ? 'row-error' : hasWarnings ? 'row-warning' : ''}>
                      <td className="font-medium">{index + 1}</td>
                      <td>
                        <input 
                          value={row.nom || ''} 
                          onChange={(e) => handleCellEdit(index, 'nom', e.target.value)} 
                          className={`cell-input ${row.errors?.some(e => e.field === 'nom' && e.type === 'error') ? 'input-error' : ''}`} 
                        />
                      </td>
                      <td>
                        <input 
                          value={row.prenom || ''} 
                          onChange={(e) => handleCellEdit(index, 'prenom', e.target.value)} 
                          className={`cell-input ${row.errors?.some(e => e.field === 'prenom' && e.type === 'error') ? 'input-error' : ''}`} 
                        />
                      </td>
                      <td>
                        <input 
                          value={row.email || ''} 
                          onChange={(e) => handleCellEdit(index, 'email', e.target.value)} 
                          className={`cell-input ${row.errors?.some(e => e.field === 'email' && e.type === 'error') ? 'input-error' : row.errors?.some(e => e.field === 'email' && e.type === 'warning') ? 'input-warning' : ''}`} 
                        />
                      </td>
                      <td>
                        <input 
                          value={row.telephone || ''} 
                          onChange={(e) => handleCellEdit(index, 'telephone', e.target.value)} 
                          className={`cell-input ${row.errors?.some(e => e.field === 'telephone' && e.type === 'error') ? 'input-error' : row.errors?.some(e => e.field === 'telephone' && e.type === 'warning') ? 'input-warning' : ''}`} 
                        />
                      </td>
                      <td>
                        <input 
                          value={row.codePostal || ''} 
                          onChange={(e) => handleCellEdit(index, 'codePostal', e.target.value)} 
                          className={`cell-input ${row.errors?.some(e => e.field === 'codePostal' && e.type === 'error') ? 'input-error' : ''}`} 
                        />
                      </td>
                      <td>
                        <input 
                          value={row.ville || ''} 
                          onChange={(e) => handleCellEdit(index, 'ville', e.target.value)} 
                          className={`cell-input ${row.errors?.some(e => e.field === 'ville' && e.type === 'warning') ? 'input-warning' : ''}`} 
                        />
                      </td>
                      <td>
                        <input 
                          value={row.formation || ''} 
                          onChange={(e) => handleCellEdit(index, 'formation', e.target.value)} 
                          className={`cell-input ${row.errors?.some(e => e.field === 'formation' && e.type === 'warning') ? 'input-warning' : ''}`} 
                        />
                      </td>
                      <td>
                        <input 
                          value={row.campus || ''} 
                          onChange={(e) => handleCellEdit(index, 'campus', e.target.value)} 
                          className={`cell-input ${row.errors?.some(e => e.field === 'campus' && e.type === 'warning') ? 'input-warning' : ''}`} 
                        />
                      </td>
                      <td>
                        <input 
                          value={row.classeActuelle || ''} 
                          onChange={(e) => handleCellEdit(index, 'classeActuelle', e.target.value)} 
                          className="cell-input" 
                        />
                      </td>
                      <td>
                        <input 
                          value={row.dateRentreePrev || ''} 
                          onChange={(e) => handleCellEdit(index, 'dateRentreePrev', e.target.value)} 
                          className="cell-input" 
                        />
                      </td>
                      <td>
                        {hasErrors ? <span className="badge badge-error">Erreur</span> : hasWarnings ? <span className="badge badge-warning">Corrigé</span> : <span className="badge badge-success">OK</span>}
                      </td>
                      <td>
                        {hasAnyIssue && (
                          <button 
                            className="info-btn"
                            onClick={() => openErrorModal(index, row)}
                            title="Voir les détails"
                          >
                            ℹ️
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODALE DES ERREURS */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Détails des {selectedErrors.some(e => e.type === 'error') ? 'erreurs' : 'corrections'}
              </h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <p className="modal-row-info">
                Ligne {selectedRow + 1} - {editingData[selectedRow]?.nom} {editingData[selectedRow]?.prenom}
              </p>
              <div className="errors-list-modal">
                {selectedErrors.map((error, idx) => (
                  <div key={idx} className={`error-detail-modal ${error.type}`}>
                    <span className="error-icon-modal">
                      {error.type === 'error' ? '❌' : '⚠️'}
                    </span>
                    <div className="error-text-modal">
                      <strong>{error.field}:</strong> {error.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn" onClick={closeModal}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE D'EXPORT */}
      {exportModalOpen && (
        <div className="modal-overlay" onClick={closeExportModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Exporter les données</h3>
              <button className="modal-close" onClick={closeExportModal}>✕</button>
            </div>
            <div className="modal-body">
              <p className="modal-row-info">
                Nommez votre fichier d'export
              </p>
              <div className="export-name-input">
                <label>Nom du fichier :</label>
                <input
                  type="text"
                  value={exportFileName}
                  onChange={(e) => setExportFileName(e.target.value)}
                  placeholder="ex: crm_salon_paris_2024"
                  className="export-input"
                  autoFocus
                />
                <p className="export-hint">L'extension .csv sera ajoutée automatiquement</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn-cancel" onClick={closeExportModal}>Annuler</button>
              <button className="modal-btn" onClick={handleExport}>Exporter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}