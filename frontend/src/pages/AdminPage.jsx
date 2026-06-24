import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import axios from 'axios';
import './AdminPage.css';

const API_URL = 'https://sa-plateforme-backend.onrender.com';

export default function AdminPage({ onLogout, user: propUser }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(propUser || null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [formations, setFormations] = useState([]);
  // const [enrollmentDates, setEnrollmentDates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // États pour les formations
  const [newFormationName, setNewFormationName] = useState('');
  const [newFormationCampus, setNewFormationCampus] = useState('');
  const [editingFormationId, setEditingFormationId] = useState(null);
  const [editFormationName, setEditFormationName] = useState('');
  const [editFormationCampus, setEditFormationCampus] = useState('');
  
  // // États pour les dates de rentrée
  // const [newEnrollmentYear, setNewEnrollmentYear] = useState('');
  // const [newEnrollmentDate, setNewEnrollmentDate] = useState('');
  // const [editingDateId, setEditingDateId] = useState(null);
  // const [editDateYear, setEditDateYear] = useState('');
  // const [editDateValue, setEditDateValue] = useState('');
  
  const [activeTab, setActiveTab] = useState('formations');

  // Synchroniser avec les props
  useEffect(() => {
    console.log('🔄 AdminPage - propUser reçu:', propUser);
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
          const parsed = JSON.parse(userData);
          setUser(parsed);
        } catch (e) {
          console.error('❌ Erreur parsing user:', e);
          setUser(null);
        }
      }
    }
  }, [propUser]);

  // Fonction pour récupérer le token
  const getAuthHeaders = () => ({
    headers: { 
      Authorization: `Bearer ${localStorage.getItem('token')}` 
    }
  });

  // Charger les formations depuis l'API
  const fetchFormations = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/formations`, getAuthHeaders());
      setFormations(response.data);
    } catch (err) {
      console.error('Erreur chargement formations:', err);
      if (err.response?.status === 403) {
        alert('Accès non autorisé. Vous devez être administrateur.');
        navigate('/');
      }
    }
  };

  // Charger les dates de rentrée depuis l'API A SUPPRIMER
  // const fetchEnrollmentDates = async () => {
  //   try {
  //     const response = await axios.get(`${API_URL}/admin/enrollment-dates`, getAuthHeaders());
  //     setEnrollmentDates(response.data);
  //   } catch (err) {
  //     console.error('Erreur chargement dates:', err);
  //   }
  // };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Vérification admin par nom
    const isAdmin = user.full_name === 'Administrateur';
    
    if (!isAdmin) {
      alert('Accès refusé. Cette page est réservée aux administrateurs.');
      navigate('/');
      return;
    }
    
    setIsAuthorized(true);
    
    // Charger les données depuis l'API
    const loadData = async () => {
      setLoading(true);
      // await Promise.all([fetchFormations(), fetchEnrollmentDates()]);
      await fetchFormations();
      setLoading(false);
    };
    
    loadData();
  }, [user, navigate]);

  if (!isAuthorized || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="admin-page">
        <Navbar user={user} onLogout={onLogout} />
        <div className="admin-container">
          <div className="loading-spinner">Chargement des données...</div>
        </div>
      </div>
    );
  }

  // ============ GESTION DES FORMATIONS ============
  
  // Ajouter une formation
  const handleAddFormation = async () => {
    if (newFormationName.trim()) {
      try {
        await axios.post(
          `${API_URL}/admin/formations`,
          null,
          { 
            params: { 
              name: newFormationName.trim(), 
              campus: newFormationCampus.trim() || null 
            },
            ...getAuthHeaders()
          }
        );
        await fetchFormations();
        setNewFormationName('');
        setNewFormationCampus('');
      } catch (err) {
        console.error('Erreur ajout formation:', err);
        alert('Erreur lors de l\'ajout');
      }
    }
  };

  // Modifier une formation
  const handleSaveFormation = async (id) => {
    try {
      await axios.put(
        `${API_URL}/admin/formations/${id}`,
        null,
        { 
          params: { 
            name: editFormationName.trim(), 
            campus: editFormationCampus.trim() || null 
          },
          ...getAuthHeaders()
        }
      );
      await fetchFormations();
      setEditingFormationId(null);
    } catch (err) {
      console.error('Erreur modification formation:', err);
      alert('Erreur lors de la modification');
    }
  };

  // Supprimer une formation
  const handleDeleteFormation = async (id) => {
    if (window.confirm('Supprimer cette formation ?')) {
      try {
        await axios.delete(`${API_URL}/admin/formations/${id}`, getAuthHeaders());
        await fetchFormations();
      } catch (err) {
        console.error('Erreur suppression formation:', err);
        alert('Erreur lors de la suppression');
      }
    }
  };

  // ============ GESTION DES DATES DE RENTRÉE ============
  
  // Ajouter une date de rentrée
  // const handleAddEnrollmentDate = async () => {
  //   if (newEnrollmentYear.trim() && newEnrollmentDate.trim()) {
  //     try {
  //       await axios.post(
  //         `${API_URL}/admin/enrollment-dates`,
  //         null,
  //         { 
  //           params: { 
  //             year: newEnrollmentYear.trim(), 
  //             date: newEnrollmentDate.trim() 
  //           },
  //           ...getAuthHeaders()
  //         }
  //       );
  //       await fetchEnrollmentDates();
  //       setNewEnrollmentYear('');
  //       setNewEnrollmentDate('');
  //     } catch (err) {
  //       console.error('Erreur ajout date:', err);
  //       alert('Erreur lors de l\'ajout');
  //     }
  //   }
  // };

  // // Modifier une date de rentrée
  // const handleSaveEnrollmentDate = async (id) => {
  //   try {
  //     await axios.put(
  //       `${API_URL}/admin/enrollment-dates/${id}`,
  //       null,
  //       { 
  //         params: { 
  //           year: editDateYear.trim(), 
  //           date: editDateValue.trim() 
  //         },
  //         ...getAuthHeaders()
  //       }
  //     );
  //     await fetchEnrollmentDates();
  //     setEditingDateId(null);
  //   } catch (err) {
  //     console.error('Erreur modification date:', err);
  //     alert('Erreur lors de la modification');
  //   }
  // };

  // // Supprimer une date de rentrée
  // const handleDeleteEnrollmentDate = async (id) => {
  //   if (window.confirm('Supprimer cette date de rentrée ?')) {
  //     try {
  //       await axios.delete(`${API_URL}/admin/enrollment-dates/${id}`, getAuthHeaders());
  //       await fetchEnrollmentDates();
  //     } catch (err) {
  //       console.error('Erreur suppression date:', err);
  //       alert('Erreur lors de la suppression');
  //     }
  //   }
  // };

  return (
    <div className="admin-page">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Administration</h1>
            <p>Gérer les formations</p>
          </div>
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Retour
          </button>
        </div>

        <div className="admin-tabs">
          <button 
            className={`tab-btn ${activeTab === 'formations' ? 'active' : ''}`}
            onClick={() => setActiveTab('formations')}
          >
            Formations
          </button>
          {/* <button 
            className={`tab-btn ${activeTab === 'dates' ? 'active' : ''}`}
            onClick={() => setActiveTab('dates')}
          >
            Dates de rentrée
          </button> */}
        </div>

        {/* ===== ONGLET FORMATIONS ===== */}
        {activeTab === 'formations' && (
          <div className="tab-content">
            <div className="add-section">
              <h3>Ajouter une nouvelle formation</h3>
              <div className="add-form">
                <input
                  type="text"
                  placeholder="Nom de la formation (ex: E3IN)"
                  value={newFormationName}
                  onChange={(e) => setNewFormationName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Campus (optionnel)"
                  value={newFormationCampus}
                  onChange={(e) => setNewFormationCampus(e.target.value)}
                />
                <button onClick={handleAddFormation} disabled={!newFormationName.trim()}>
                  + Ajouter
                </button>
              </div>
            </div>

            <div className="list-section">
              <h3>Formations existantes ({formations.length})</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Campus</th>
                    <th className="actions-cell">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {formations.map((formation) => (
                    <tr key={formation.id}>
                      <td>
                        {editingFormationId === formation.id ? (
                          <input
                            value={editFormationName}
                            onChange={(e) => setEditFormationName(e.target.value)}
                          />
                        ) : (
                          formation.name
                        )}
                      </td>
                      <td>
                        {editingFormationId === formation.id ? (
                          <input
                            value={editFormationCampus}
                            onChange={(e) => setEditFormationCampus(e.target.value)}
                            placeholder="Campus"
                          />
                        ) : (
                          formation.campus || '-'
                        )}
                      </td>
                      <td className="actions-cell">
                        {editingFormationId === formation.id ? (
                          <div className="action-buttons">
                            <button className="save-btn" onClick={() => handleSaveFormation(formation.id)}>✓</button>
                            <button className="cancel-btn" onClick={() => setEditingFormationId(null)}>✗</button>
                          </div>
                        ) : (
                          <div className="action-buttons">
                            <button 
                              className="edit-btn" 
                              onClick={() => {
                                setEditingFormationId(formation.id);
                                setEditFormationName(formation.name);
                                setEditFormationCampus(formation.campus || '');
                              }}
                            >
                              ✏️
                            </button>
                            <button className="delete-btn" onClick={() => handleDeleteFormation(formation.id)}>🗑️</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== ONGLET DATES DE RENTRÉE =====
        {activeTab === 'dates' && (
          <div className="tab-content">
            <div className="add-section">
              <h3>Ajouter une nouvelle date de rentrée</h3>
              <div className="add-form">
                <input
                  type="text"
                  placeholder="Année scolaire (ex: 2029-2030)"
                  value={newEnrollmentYear}
                  onChange={(e) => setNewEnrollmentYear(e.target.value)}
                />
                <input
                  type="date"
                  value={newEnrollmentDate}
                  onChange={(e) => setNewEnrollmentDate(e.target.value)}
                />
                <button onClick={handleAddEnrollmentDate} disabled={!newEnrollmentYear.trim() || !newEnrollmentDate.trim()}>
                  + Ajouter
                </button>
              </div>
            </div>

            <div className="list-section">
              <h3>Dates de rentrée existantes ({enrollmentDates.length})</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Année scolaire</th>
                    <th>Date de rentrée</th>
                    <th className="actions-cell">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollmentDates.map((date) => (
                    <tr key={date.id}>
                      <td>
                        {editingDateId === date.id ? (
                          <input
                            value={editDateYear}
                            onChange={(e) => setEditDateYear(e.target.value)}
                            placeholder="ex: 2029-2030"
                          />
                        ) : (
                          date.year
                        )}
                      </td>
                      <td>
                        {editingDateId === date.id ? (
                          <input
                            type="date"
                            value={editDateValue}
                            onChange={(e) => setEditDateValue(e.target.value)}
                          />
                        ) : (
                          new Date(date.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                        )}
                      </td>
                      <td className="actions-cell">
                        {editingDateId === date.id ? (
                          <div className="action-buttons">
                            <button className="save-btn" onClick={() => handleSaveEnrollmentDate(date.id)}>✓</button>
                            <button className="cancel-btn" onClick={() => setEditingDateId(null)}>✗</button>
                          </div>
                        ) : (
                          <div className="action-buttons">
                            <button 
                              className="edit-btn" 
                              onClick={() => {
                                setEditingDateId(date.id);
                                setEditDateYear(date.year);
                                setEditDateValue(date.date);
                              }}
                            >
                              ✏️
                            </button>
                            <button className="delete-btn" onClick={() => handleDeleteEnrollmentDate(date.id)}>🗑️</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}