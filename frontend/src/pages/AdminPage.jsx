import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import './AdminPage.css';

export default function AdminPage({ onLogout }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [formations, setFormations] = useState([]);
  const [enrollmentDates, setEnrollmentDates] = useState([]);
  
  const [newFormationName, setNewFormationName] = useState('');
  const [newFormationCampus, setNewFormationCampus] = useState('');
  const [editingFormationId, setEditingFormationId] = useState(null);
  const [editFormationName, setEditFormationName] = useState('');
  const [editFormationCampus, setEditFormationCampus] = useState('');
  
  const [newEnrollmentYear, setNewEnrollmentYear] = useState('');
  const [newEnrollmentDate, setNewEnrollmentDate] = useState('');
  const [activeTab, setActiveTab] = useState('formations');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    const savedFormations = localStorage.getItem('formations');
    if (savedFormations) {
      setFormations(JSON.parse(savedFormations));
    } else {
      setFormations([
        { id: '1', name: 'E3IN', campus: 'Pontoise' },
        { id: '2', name: 'E3COM', campus: 'Paris' },
      ]);
    }
    
    const savedDates = localStorage.getItem('enrollmentDates');
    if (savedDates) {
      setEnrollmentDates(JSON.parse(savedDates));
    } else {
      setEnrollmentDates([
        { id: '1', year: '2029-2030', date: '2029-09-15' },
        { id: '2', year: '2030-2031', date: '2030-09-14' },
      ]);
    }
  }, []);

  const saveFormations = (newFormations) => {
    setFormations(newFormations);
    localStorage.setItem('formations', JSON.stringify(newFormations));
  };

  const saveEnrollmentDates = (newDates) => {
    setEnrollmentDates(newDates);
    localStorage.setItem('enrollmentDates', JSON.stringify(newDates));
  };

  const handleAddFormation = () => {
    if (newFormationName.trim()) {
      const newFormation = {
        id: Date.now().toString(),
        name: newFormationName.trim(),
        campus: newFormationCampus.trim() || undefined
      };
      saveFormations([...formations, newFormation]);
      setNewFormationName('');
      setNewFormationCampus('');
    }
  };

  const handleStartEditFormation = (formation) => {
    setEditingFormationId(formation.id);
    setEditFormationName(formation.name);
    setEditFormationCampus(formation.campus || '');
  };

  const handleSaveFormation = (id) => {
    const updatedFormations = formations.map(formation =>
      formation.id === id
        ? { ...formation, name: editFormationName.trim(), campus: editFormationCampus.trim() || undefined }
        : formation
    );
    saveFormations(updatedFormations);
    setEditingFormationId(null);
  };

  const handleCancelEdit = () => {
    setEditingFormationId(null);
    setEditFormationName('');
    setEditFormationCampus('');
  };

  const handleDeleteFormation = (id) => {
    saveFormations(formations.filter(formation => formation.id !== id));
  };

  const handleAddEnrollmentDate = () => {
    if (newEnrollmentYear.trim() && newEnrollmentDate.trim()) {
      const newDate = {
        id: Date.now().toString(),
        year: newEnrollmentYear.trim(),
        date: newEnrollmentDate.trim()
      };
      saveEnrollmentDates([...enrollmentDates, newDate]);
      setNewEnrollmentYear('');
      setNewEnrollmentDate('');
    }
  };

  const handleDeleteEnrollmentDate = (id) => {
    saveEnrollmentDates(enrollmentDates.filter(date => date.id !== id));
  };

  return (
    <div className="admin-page">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Administration</h1>
            <p>Gérer les formations et les dates de rentrée</p>
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
          <button 
            className={`tab-btn ${activeTab === 'dates' ? 'active' : ''}`}
            onClick={() => setActiveTab('dates')}
          >
            Dates de rentrée
          </button>
        </div>

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
                            <button className="cancel-btn" onClick={handleCancelEdit}>✗</button>
                          </div>
                        ) : (
                          <div className="action-buttons">
                            <button className="edit-btn" onClick={() => handleStartEditFormation(formation)}>✏️</button>
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
                      <td>{date.year}</td>
                      <td>{date.date}</td>
                      <td className="actions-cell">
                        <button className="delete-btn" onClick={() => handleDeleteEnrollmentDate(date.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}