"use client";

import React from 'react';
import { X } from 'lucide-react';
import { useProgrammingLanguage } from '../context/ProgrammingLanguageContext';

interface LanguageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LanguageSettingsModal: React.FC<LanguageSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  // Use global language context instead of props
  const { language: selectedLanguage, setLanguage: onSelectLanguage } = useProgrammingLanguage();
  if (!isOpen) return null;
  
  // Use language IDs that match what the API accepts (python, js, java)
  const languages = [
    { id: 'java', name: 'JAVA' },
    { id: 'python', name: 'PYTHON' },
    { id: 'js', name: 'JAVASCRIPT' }, // Changed from 'javascript' to 'js' to match API
    { id: 'cpp', name: 'C++' }
  ];
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="relative w-full max-w-2xl bg-[#222222] rounded-2xl shadow-xl overflow-hidden">
        {/* Black grid background */}
        <div className="absolute inset-0 bg-[#222222] bg-[linear-gradient(rgba(59,130,246,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.09)_1px,transparent_1px)] bg-[size:24px_24px] z-[-1] rounded-2xl"></div>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          <h2 className="text-xl font-medium text-white">Select Programming Language</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Language Selection Grid */}
        <div className="px-6 pb-6 pt-2">
          <div className="grid grid-cols-4 gap-6">
            {languages.map((language) => (
              <LanguageButton 
                key={language.id}
                id={language.id}
                name={language.name}
                isSelected={selectedLanguage === language.id}
                onClick={() => onSelectLanguage(language.id)}
              />
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 flex justify-end bg-[#1d1d1d]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Separate the language button as its own component for better performance
const LanguageButton = React.memo(({
  id,
  name,
  isSelected,
  onClick
}: {
  id: string;
  name: string;
  isSelected: boolean;
  onClick: () => void;
}) => {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-6 rounded-2xl transition-all ${
        isSelected 
          ? 'bg-[#333333] shadow-[0_0_15px_rgba(255,255,255,0.15)]' 
          : 'hover:bg-[#2a2a2a]'
      }`}
    >
      <div className="w-20 h-20 mb-4 relative flex items-center justify-center">
        <img 
          src={`/logo/programming_languages/${id}-logo.png`}
          alt={name} 
          className="w-16 h-16 object-contain" 
        />
        {isSelected && (
          <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-pulse"></div>
        )}
      </div>
      <span className="text-white font-medium">{name}</span>
    </button>
  );
});

LanguageButton.displayName = 'LanguageButton';

export default LanguageSettingsModal;
