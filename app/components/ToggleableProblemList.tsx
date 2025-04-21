"use client";

import React, { useState, Suspense } from 'react';
import { Code } from 'lucide-react';
import dynamic from 'next/dynamic';
import { LeetCodeProblem } from '../models/leetcode';

// Dynamically import the LeetCodeProblemList component with no SSR
const LeetCodeProblemList = dynamic(
  () => import('./LeetCodeProblemList'),
  { ssr: false, loading: () => <ProblemListSkeleton /> }
);

// Loading skeleton
function ProblemListSkeleton() {
  return (
    <div className="w-full h-full flex flex-col bg-gray-900 animate-pulse">
      <div className="p-2 bg-gray-800 border-b border-gray-700">
        <div className="h-6 bg-gray-700 rounded w-1/2"></div>
      </div>
      <div className="flex-1 p-2 space-y-2">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-800 rounded"></div>
        ))}
      </div>
    </div>
  );
}

// Error fallback
function ErrorFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 p-4 text-center">
      <div>
        <h3 className="text-red-400 font-medium mb-2">Something went wrong</h3>
        <p className="text-gray-400 mb-4">Failed to load problem list</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

interface ToggleableProblemListProps {
  onSelectProblem: (problem: LeetCodeProblem) => void;
}

export default function ToggleableProblemList({ onSelectProblem }: ToggleableProblemListProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Error handler
  const handleError = () => {
    setHasError(true);
  };

  return (
    <div 
      className={`overflow-hidden bg-[#111827]/60 transition-all duration-300 relative ${isExpanded ? 'w-1/4 min-w-[300px]' : 'w-[50px] min-w-[50px]'}`} 
      style={{ height: '100%', maxHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <div className="sticky top-0 bg-[#111827]/80 backdrop-blur-sm p-3 border-b border-[#3a3a3a] z-10 flex items-center justify-between">
        <h2 className={`text-sm font-medium flex items-center gap-1.5 ${!isExpanded && 'opacity-0'}`}>
          <Code className="h-4 w-4 text-blue-400" />
          Interview Questions
        </h2>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-600/20 rounded-md transition-colors absolute right-2 top-2.5"
          title={isExpanded ? "Collapse problem list" : "Expand problem list"}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={`w-4 h-4 text-blue-400 transition-transform duration-300 ${isExpanded ? 'rotate-0' : 'rotate-180'}`}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>
      
      <div 
        className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`} 
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {hasError ? (
          <ErrorFallback />
        ) : (
          <Suspense fallback={<ProblemListSkeleton />}>
            <div className="h-full">
              <LeetCodeProblemList onSelectProblem={onSelectProblem} />
            </div>
          </Suspense>
        )}
      </div>
      
      {/* Vertical label when collapsed */}
      {!isExpanded && (
        <div className="absolute left-0 top-0 bottom-0 w-[50px] flex items-center justify-center">
          <div className="rotate-90 whitespace-nowrap text-xs font-medium text-blue-400">
            Problem List
          </div>
        </div>
      )}
    </div>
  );
}
