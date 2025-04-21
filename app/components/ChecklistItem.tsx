import React from 'react';

interface ChecklistItemProps {
  label: string;
  itemKey: string;
  checked?: boolean;
  progress?: number; // Progress percentage (0-100)
  pattern?: string; // Pattern to detect completion (not displayed)
  onClick?: () => void;
  children?: React.ReactNode; // For nested content
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({ 
  label, 
  itemKey, 
  checked = false, 
  progress = 0,
  onClick,
  children
}) => {
  // Calculate the progress percentage (either from passed prop or based on checked state)
  const actualProgress = progress > 0 ? progress : (checked ? 100 : 0);
  
  // Calculate stroke dasharray and dashoffset for the progress circle - 2x larger than original
  const circleRadius = 16;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (actualProgress / 100) * circumference;
  return (
    <div className="w-full mb-0.5">
      <div 
        className="w-full bg-gradient-to-r from-[#D3C2FF] via-[#CEF3FF] via-[#FFFFFF] via-[#FFE0BA] to-[#E1FFA3] transition-all duration-300 cursor-pointer overflow-hidden"
        style={{
          background: 'linear-gradient(90deg, #D3C2FF 0%, #CEF3FF 36%, #FFFFFF 63%, #FFE0BA 76%, #E1FFA3 100%)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          minHeight: '0px',
          borderRadius: '16px', // iPhone-style border radius
          WebkitBackdropFilter: 'blur(8px)',
          backdropFilter: 'blur(8px)',
        }}
        onClick={onClick}
        data-item={itemKey}
      >
        <div className="px-5 py-3.5 flex justify-between items-center">
          <span className="text-sm text-gray-800">{label}</span>
          <div className="text-primary relative">
            <svg 
              width="44" 
              height="44" 
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="transform"
            >
              {/* Background circle */}
              <circle 
                cx="24" 
                cy="24" 
                r="16"
                stroke="#E2F0FF"
                strokeWidth="2"
                fill="none"
              />
              
              {/* Progress circle with animation */}
              <circle 
                cx="24" 
                cy="24" 
                r="16"
                stroke="#3B82F6" 
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition: 'stroke-dashoffset 0.6s ease-in-out',
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center',
                }}
              />
              
              {/* Percentage text */}
              <text 
                x="24" 
                y="25.5" 
                textAnchor="middle" 
                fontSize="10" 
                fill="#3B82F6"
                fontWeight="500"
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                {actualProgress}%
              </text>
            </svg>
          </div>
        </div>
      </div>
      {children && (
        <div className="pl-4 mt-1 border-l border-purple-300/30 bg-gray-800/90 rounded-r-2xl overflow-hidden backdrop-blur-lg" 
          style={{
            borderBottomRightRadius: '16px',
            borderTopRightRadius: '16px',
            marginLeft: '6px',
            WebkitBackdropFilter: 'blur(12px)',
            backdropFilter: 'blur(12px)',
          }}>
          {children}
        </div>
      )}
    </div>
  );
};

export default ChecklistItem;
