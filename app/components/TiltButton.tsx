'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface TiltButtonProps {
  onClick?: () => void;
  className?: string;
  alt?: string;
}

const TiltButton: React.FC<TiltButtonProps> = ({ onClick, className = '', alt = 'Start Button' }) => {
  const [tiltStyle, setTiltStyle] = useState({
    transform: 'perspective(500px) rotateX(0) rotateY(0)',
    boxShadow: '0 15px 35px rgba(0, 255, 204, 0.1), 0 3px 10px rgba(0, 0, 0, 0.1)',
  });
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    
    const button = buttonRef.current;
    const rect = button.getBoundingClientRect();
    
    // Calculate mouse position relative to the button center
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Calculate rotation (max 10 degrees)
    const rotateY = (x / (rect.width / 2)) * 10;
    const rotateX = -(y / (rect.height / 2)) * 10;
    
    setTiltStyle({
      transform: `perspective(500px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`,
      boxShadow: `
        0 15px 35px rgba(0, 255, 204, 0.2), 
        0 3px 10px rgba(0, 0, 0, 0.2),
        ${rotateY / 3}px ${rotateX / 3}px 10px rgba(0, 0, 0, 0.1)
      `,
    });
  };
  
  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(500px) rotateX(0) rotateY(0) scale(1)',
      boxShadow: '0 15px 35px rgba(0, 255, 204, 0.1), 0 3px 10px rgba(0, 0, 0, 0.1)',
    });
  };

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl transition-all duration-200 ${className}`}
      style={{
        ...tiltStyle,
        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* The button with 3D effect */}
      <div className="relative transform-gpu">
        <Image 
          src="/logo/letstart.png" 
          alt={alt}
          width={200}
          height={60}
          className="w-auto h-auto transition-transform"
          priority
        />
        
        {/* 3D effect elements */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-teal-300/10 to-blue-500/10 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
        <div className="absolute -bottom-2 -right-2 -left-2 h-2 bg-black/40 blur-sm rounded-full transform-gpu"></div>
      </div>
    </button>
  );
};

export default TiltButton;
