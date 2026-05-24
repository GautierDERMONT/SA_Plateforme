import React, { createContext, useState, useContext } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [processedData, setProcessedData] = useState([]);
  const [salonName, setSalonName] = useState('');

  const clearProcessedData = () => {
    setProcessedData([]);
    setSalonName('');
  };

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