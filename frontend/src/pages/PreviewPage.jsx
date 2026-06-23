import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Navbar from './Navbar';
import { getCityFromPostalCode, postalCodes } from '../data/postalCodes';
import './PreviewPage.css';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Composant pour une colonne déplaçable
const SortableHeader = ({ id, label, isVisible }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    backgroundColor: isDragging ? '#f0f0f0' : undefined,
  };

  if (!isVisible) return null;

  return (
    <th ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {label}
      <span style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.6 }}>⋮⋮</span>
    </th>
  );
};

export default function PreviewPage({ onLogout, user: propUser }) {
  const navigate = useNavigate();
  const { processedData, setProcessedData, clearProcessedData, salonName, setSalonName } = useApp();
  
  const [editingData, setEditingData] = useState(() => {
    return Array.isArray(processedData) ? processedData : [];
  });
  
  const [user, setUser] = useState(propUser || null);
  const [uploading, setUploading] = useState(false);
  
  // État pour la modale
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedErrors, setSelectedErrors] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);

  // État pour la modale d'export
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFileName, setExportFileName] = useState('');

  // État pour la modale d'import direct
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [newSalonName, setNewSalonName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');

  // État pour l'ordre des colonnes et leur visibilité
  const [columnOrder, setColumnOrder] = useState([
    'id','profil', 'nom', 'prenom', 'email', 'telephone', 
    'codePostal', 'ville', 'formation', 'campus', 
    'classeActuelle', 'dateRentreePrev', 'statut', 'info'
  ]);
  
  const [columnVisibility, setColumnVisibility] = useState({
    id: true,
    profil: true,
    nom: true,
    prenom: true,
    email: true,
    telephone: true,
    codePostal: true,
    ville: true,
    formation: true,
    campus: true,
    classeActuelle: true,
    dateRentreePrev: true,
    statut: true,
    info: true,
  });

  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Configuration des colonnes
  const columnLabels = {
    id: '#', 
    profil:'Profil',
    nom: 'Nom',
    prenom: 'Prénom',
    email: 'Email',
    telephone: 'Téléphone',
    codePostal: 'CP',
    ville: 'Ville',
    formation: 'Formation',
    campus: 'Campus',
    classeActuelle: 'Classe',
    dateRentreePrev: 'Rentrée',
    statut: 'Statut',
    info: 'Info'
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Synchroniser avec les props
  useEffect(() => {
    if (propUser) {
      setUser(propUser);
    }
  }, [propUser]);

  // Fallback: charger depuis localStorage si pas de props
  useEffect(() => {
    if (!propUser) {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (e) {
          setUser(null);
        }
      }
    }
  }, [propUser]);

  useEffect(() => {
    if (Array.isArray(processedData)) {
      setEditingData(processedData);
    } else {
      setEditingData([]);
    }
  }, [processedData]);

  // Sauvegarder l'ordre des colonnes dans localStorage
  useEffect(() => {
    const savedOrder = localStorage.getItem('columnOrder');
    const savedVisibility = localStorage.getItem('columnVisibility');
    if (savedOrder) {
      setColumnOrder(JSON.parse(savedOrder));
    }
    if (savedVisibility) {
      setColumnVisibility(JSON.parse(savedVisibility));
    }
  }, []);

  // Sauvegarder l'ordre quand il change
  useEffect(() => {
    localStorage.setItem('columnOrder', JSON.stringify(columnOrder));
  }, [columnOrder]);

  useEffect(() => {
    localStorage.setItem('columnVisibility', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleColumnVisibility = (columnKey) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  const resetColumnOrder = () => {
    const defaultOrder = [
      'id', 'profil', 'nom', 'prenom', 'email', 'telephone', 
      'codePostal', 'ville', 'formation', 'campus', 
      'classeActuelle', 'dateRentreePrev', 'statut', 'info'
    ];
    setColumnOrder(defaultOrder);
    setColumnVisibility({
      id: true,
      profil: true,
      nom: true,
      prenom: true,
      email: true,
      telephone: true,
      codePostal: true,
      ville: true,
      formation: true,
      campus: true,
      classeActuelle: true,
      dateRentreePrev: true,
      statut: true,
      info: true,
    });
  };

  // Fonction pour trouver le code postal à partir de la ville
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
      case 'profil':
        if (!value || value.trim() === '') {
          newErrors.push({ field: 'profil', type: 'error', message: 'Profil manquant' });
        }
        break;

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

  // Fonction pour importer un nouveau fichier directement
  const handleImportNewFile = async () => {
    if (!newSalonName.trim()) {
      alert('Veuillez entrer un nom de salon.');
      return;
    }
    if (!selectedFile) {
      alert('Veuillez sélectionner un fichier.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('http://localhost:5000/process-and-preview', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur API');
      }

      const result = await response.json();
      
      const dataArray = Array.isArray(result.data) ? result.data : [];
      
      const enrichedData = dataArray.map(row => {
        const newRow = { ...row };
        
        // Auto-remplissage ville
        if ((!newRow.ville || newRow.ville === '') && newRow.codePostal) {
          const city = getCityFromPostalCode(newRow.codePostal);
          if (city) {
            newRow.ville = city;
            if (!newRow.errors) newRow.errors = [];
            newRow.errors.push({
              field: 'ville',
              type: 'warning',
              message: `Ville auto-remplie depuis le code postal: ${city}`
            });
          }
        }
        
        // Auto-remplissage code postal
        if ((!newRow.codePostal || newRow.codePostal === '') && newRow.ville) {
          const postalCode = getPostalCodeFromCity(newRow.ville);
          if (postalCode) {
            newRow.codePostal = postalCode;
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
      setSalonName(newSalonName.trim());
      setEditingData(enrichedData);
      
      // Fermer la modale
      setImportModalOpen(false);
      setNewSalonName('');
      setSelectedFile(null);
      setSelectedFileName('');
      
    } catch (err) {
      console.error(err);
      alert('Erreur lors du traitement du fichier');
    } finally {
      setUploading(false);
    }
  };

  const handleNewFile = () => {
    // Ouvrir la modale d'import au lieu de naviguer
    setNewSalonName('');
    setSelectedFile(null);
    setSelectedFileName('');
    setImportModalOpen(true);
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
      
      const otherErrors = (currentRow.errors || []).filter(e => e.field !== field);
      
      let updatedRow = { 
        ...currentRow, 
        [field]: value,
      };
      
      // SENS 1: Code Postal → Ville
      if (field === 'codePostal' && value) {
        const city = getCityFromPostalCode(value);
        if (city) {
          updatedRow.ville = city;
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
        }
      }
      
      // SENS 2: Ville → Code Postal
      if (field === 'ville' && value) {
        const postalCode = getPostalCodeFromCity(value);
        if (postalCode) {
          updatedRow.codePostal = postalCode;
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
        }
      }
      
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
      
      const dataArray = Array.isArray(result.data) ? result.data : [];
      
      const enrichedData = dataArray.map(row => {
        const newRow = { ...row };
        
        // Auto-remplissage ville
        if ((!newRow.ville || newRow.ville === '') && newRow.codePostal) {
          const city = getCityFromPostalCode(newRow.codePostal);
          if (city) {
            newRow.ville = city;
            if (!newRow.errors) newRow.errors = [];
            newRow.errors.push({
              field: 'ville',
              type: 'warning',
              message: `Ville auto-remplie depuis le code postal: ${city}`
            });
          }
        }
        
        // Auto-remplissage code postal
        if ((!newRow.codePostal || newRow.codePostal === '') && newRow.ville) {
          const postalCode = getPostalCodeFromCity(newRow.ville);
          if (postalCode) {
            newRow.codePostal = postalCode;
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

  const openExportModal = async () => {
    const defaultName = `${salonName || 'export'}_${new Date().toISOString().split('T')[0]}`;
    setExportFileName(defaultName);
    setExportModalOpen(true);
  };

  const handleExport = async () => {
    if (!Array.isArray(editingData) || editingData.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }
    
    let fileName = exportFileName.trim();

    if (!fileName.endsWith(".xlsx")) {
      fileName = `${fileName}.xlsx`;
    }
    console.log("editingData avant export :", editingData);
    console.log("Nombre de lignes :", editingData?.length);

    const response = await fetch("http://localhost:5000/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        rows: editingData,
        filename: fileName
      })
    });

    if (!response.ok) {
      alert("Erreur lors de l'export");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    setExportModalOpen(false);
    setExportFileName("");
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
            <div className="column-controls">
              <button 
                className="column-menu-btn" 
                onClick={() => setShowColumnMenu(!showColumnMenu)}
              >
                📋 Colonnes
              </button>
              {showColumnMenu && (
                <div className="column-menu-dropdown">
                  <div className="column-menu-header">
                    <strong>Afficher/Masquer les colonnes</strong>
                    <button onClick={resetColumnOrder} className="reset-order-btn">
                      Réinitialiser
                    </button>
                  </div>
                  {Object.keys(columnLabels).map(key => (
                    <label key={key} className="column-menu-item">
                      <input
                        type="checkbox"
                        checked={columnVisibility[key]}
                        onChange={() => toggleColumnVisibility(key)}
                      />
                      {columnLabels[key]}
                    </label>
                  ))}
                  <div className="column-menu-hint">
                    💡 Glissez les en-têtes pour réorganiser
                  </div>
                </div>
              )}
            </div>
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="data-table">
                <thead>
                  <SortableContext
                    items={columnOrder}
                    strategy={horizontalListSortingStrategy}
                  >
                    <tr>
                      {columnOrder.map((colId) => {
                        if (!columnVisibility[colId]) return null;
                        return (
                          <SortableHeader
                            key={colId}
                            id={colId}
                            label={columnLabels[colId]}
                            isVisible={columnVisibility[colId]}
                          />
                        );
                      })}
                    </tr>
                  </SortableContext>
                </thead>
                <tbody>
                  {editingData.map((row, index) => {
                    const hasErrors = row.errors?.some(e => e.type === 'error') || false;
                    const hasWarnings = row.errors?.some(e => e.type === 'warning') || false;
                    const hasAnyIssue = hasErrors || hasWarnings;
                    
                    return (
                      <tr key={index} className={hasErrors ? 'row-error' : hasWarnings ? 'row-warning' : ''}>
                        {columnOrder.map((colId) => {
                          if (!columnVisibility[colId]) return null;
                          
                          if (colId === 'statut') {
                            return (
                              <td key={colId}>
                                {hasErrors ? <span className="badge badge-error">Erreur</span> : 
                                 hasWarnings ? <span className="badge badge-warning">Corrigé</span> : 
                                 <span className="badge badge-success">OK</span>}
                              </td>
                            );
                          }
                          
                          if (colId === 'info') {
                            return (
                              <td key={colId}>
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
                            );
                          }
                          
                          const fieldMap = {
                            id: 'id',
                            profil:'profil',
                            nom: 'nom',
                            prenom: 'prenom',
                            email: 'email',
                            telephone: 'telephone',
                            codePostal: 'codePostal',
                            ville: 'ville',
                            formation: 'formation',
                            campus: 'campus',
                            classeActuelle: 'classeActuelle',
                            dateRentreePrev: 'dateRentreePrev'
                          };
                          
                          const fieldName = fieldMap[colId];
                          const value = row[fieldName] || '';
                          const fieldError = row.errors?.some(e => e.field === fieldName && e.type === 'error');
                          const fieldWarning = row.errors?.some(e => e.field === fieldName && e.type === 'warning');
                          
                          let inputClass = "cell-input";
                          if (fieldError) inputClass += " input-error";
                          else if (fieldWarning) inputClass += " input-warning";
                          
                          return (
                            <td key={colId}>
                              <input 
                                value={value}
                                onChange={(e) => handleCellEdit(index, fieldName, e.target.value)} 
                                className={inputClass}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DndContext>
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
                <p className="export-hint">L'extension .xlsx sera ajoutée automatiquement</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn-cancel" onClick={closeExportModal}>Annuler</button>
              <button className="modal-btn" onClick={handleExport}>Exporter</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE D'IMPORT DIRECT */}
      {importModalOpen && (
        <div className="modal-overlay" onClick={() => !uploading && setImportModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📁 Importer un nouveau fichier</h3>
              <button 
                className="modal-close" 
                onClick={() => !uploading && setImportModalOpen(false)}
                disabled={uploading}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-row-info">
                Les données actuelles seront remplacées par ce nouveau fichier.
              </p>
              
              <div className="import-form">
                <div className="import-group">
                  <label>Nom du salon</label>
                  <input
                    type="text"
                    placeholder="Ex: Salon de l'Étudiant Paris 2026"
                    value={newSalonName}
                    onChange={(e) => setNewSalonName(e.target.value)}
                    disabled={uploading}
                    autoFocus
                  />
                </div>

                <div className="import-group">
                  <label>Fichier</label>
                  <div className="file-input-wrapper">
                    <input
                      type="file"
                      id="importFileInput"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setSelectedFile(file);
                          setSelectedFileName(file.name);
                        }
                      }}
                      style={{ display: 'none' }}
                      disabled={uploading}
                    />
                    <button 
                      type="button" 
                      className="browse-file-btn"
                      onClick={() => document.getElementById('importFileInput').click()}
                      disabled={uploading}
                    >
                      Parcourir...
                    </button>
                    <span className="file-name-display">
                      {selectedFileName || 'Aucun fichier sélectionné'}
                    </span>
                  </div>
                </div>

                {uploading && (
                  <div className="upload-progress">
                    <span className="spinner"></span>
                    Traitement en cours...
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-btn-cancel" 
                onClick={() => !uploading && setImportModalOpen(false)}
                disabled={uploading}
              >
                Annuler
              </button>
              <button 
                className="modal-btn import-btn" 
                onClick={handleImportNewFile}
                disabled={uploading || !newSalonName.trim() || !selectedFile}
              >
                {uploading ? 'Importation...' : '📤 Importer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}