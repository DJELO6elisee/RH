import React, { createContext, useContext, useState, useEffect } from 'react';

const DRHLanguageContext = createContext();

export const useDRHLanguage = () => {
  const context = useContext(DRHLanguageContext);
  if (!context) {
    throw new Error('useDRHLanguage must be used within a DRHLanguageProvider');
  }
  return context;
};

export const DRHLanguageProvider = ({ children }) => {
  // Récupérer la langue depuis localStorage ou utiliser 'fr' par défaut
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('drh_language');
    return savedLanguage || 'fr';
  });

  // Sauvegarder la langue dans localStorage quand elle change
  useEffect(() => {
    localStorage.setItem('drh_language', language);
  }, [language]);

  const changeLanguage = (lang) => {
    setLanguage(lang);
  };

  return (
    <DRHLanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </DRHLanguageContext.Provider>
  );
};


