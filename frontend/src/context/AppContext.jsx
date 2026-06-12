// frontend/src/context/AppContext.jsx
import React, { createContext, useState, useContext } from 'react';
import { useInactivityTimer } from '../hooks/useInactivityTimer';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [processedData, setProcessedData] = useState([]);
  const [salonName, setSalonName] = useState('');

  const clearProcessedData = () => {
    if (processedData.length > 0) {
      setProcessedData([]);
      setSalonName('');
      if (window.location.pathname === '/preview') {
        window.location.href = '/';
      }
    }
  };

  // Timer d'inactivité
  useInactivityTimer(() => {
    if (processedData.length > 0) {
      clearProcessedData();
      // Notification
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #4f46e5;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 9999;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
    }
  });

  return (
    <AppContext.Provider value={{
      processedData,
      setProcessedData,
      salonName,
      setSalonName,
      clearProcessedData
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}