"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the context type
type ProgrammingLanguageContextType = {
  language: string;
  setLanguage: (language: string) => void;
};

// Create the context with default values
const ProgrammingLanguageContext = createContext<ProgrammingLanguageContextType>({
  language: 'python', // Default language
  setLanguage: () => {},
});

// Custom hook to use the context
export const useProgrammingLanguage = () => useContext(ProgrammingLanguageContext);

// Provider component
export const ProgrammingLanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use localStorage to persist the selected language
  const [language, setLanguageState] = useState<string>('python');
  
  // Load the saved language from localStorage on initial render
  useEffect(() => {
    const savedLanguage = localStorage.getItem('programmingLanguage');
    if (savedLanguage) {
      setLanguageState(savedLanguage);
    }
  }, []);
  
  // Update localStorage when language changes
  const setLanguage = (newLanguage: string) => {
    setLanguageState(newLanguage);
    localStorage.setItem('programmingLanguage', newLanguage);
    console.log('Programming language set to:', newLanguage);
  };
  
  return (
    <ProgrammingLanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </ProgrammingLanguageContext.Provider>
  );
};

// Export default for convenience
export default ProgrammingLanguageProvider;
