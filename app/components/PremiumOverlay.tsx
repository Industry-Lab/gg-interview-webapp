"use client";

import { useState, useEffect } from 'react';

interface PremiumOverlayProps {
  onUnlock: () => void;
  isUnlocked: boolean;
}

const PremiumOverlay: React.FC<PremiumOverlayProps> = ({ onUnlock, isUnlocked }) => {
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Handle unlock action
  const unlockContent = () => {
    onUnlock();
    setErrorMessage('');
  };
  
  if (isUnlocked) return null;
  
  return (
    <div className="absolute inset-0 z-10 backdrop-blur-xl bg-gradient-to-br from-gray-700/80 via-pink-700/20 to-gray-700/80 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center text-center">
        <h2 className="text-3xl font-bold text-white mb-3">Solution Available</h2>
        <p className="text-white/80 text-sm mb-6">Cost 1 Aura</p>
        
        <div className="w-full max-w-md px-5">
          <button 
            onClick={unlockContent} 
            className="flex items-center bg-white backdrop-blur-md rounded-full overflow-hidden mb-3 border-0 w-full py-3 px-5 text-white text-sm hover:bg-white/30 transition-colors"
            autoFocus
          >
            <span className="mr-2">
              <img src="/icons/key_icon.svg" alt="Key Icon" width="16" height="16" className="opacity-70" />
            </span>
            <span className="flex-grow text-center text-gray-700 font-semibold">Show</span>
          </button>
          {errorMessage && (
            <p className="text-red-300 text-xs mt-2 text-center">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumOverlay;
