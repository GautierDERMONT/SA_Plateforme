import React, { useState, useEffect } from 'react';
import { getData, createData, updateData, deleteData } from './services/api';
import './App.css';

function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await getData();
      setItems(response.data);
      setLoading(false);
    } catch (err) {
      setError('Erreur de connexion au backend');
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createData({ name: newItemName, description: newItemDesc });
      setNewItemName('');
      setNewItemDesc('');
      fetchData(); // Rafraîchir la liste
    } catch (err) {
      alert('Erreur lors de la création');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cet item ?')) {
      try {
        await deleteData(id);
        fetchData();
      } catch (err) {
        alert('Erreur lors de la suppression');
      }
    }
  };

  if (loading) return <div className="container">Chargement...</div>;
  if (error) return <div className="container error">{error}</div>;

  return (
    <div className="App">
      <header className="App-header">
        <h1>Services Admission Plateforme </h1>
        <p>React + Python (Fast Api)</p>
         <p>tests:</p>
        
        {/* Formulaire d'ajout */}
        <form onSubmit={handleCreate} className="form">
          <input
            type="text"
            placeholder="Nom"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Description"
            value={newItemDesc}
            onChange={(e) => setNewItemDesc(e.target.value)}
          />
          <button type="submit">Ajouter</button>
        </form>

        {/* Liste des items */}
        <div className="data-container">
          <h2>Items ({items.length})</h2>
          <ul>
            {items.map(item => (
              <li key={item.id}>
                <strong>{item.name}</strong> - {item.description || 'Pas de description'}
                <button onClick={() => handleDelete(item.id)} className="delete-btn">
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        </div>
      </header>
    </div>
  );
}

export default App;