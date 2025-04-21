// app/components/VisualizationPanel.tsx
"use client";

import { useState, useEffect } from 'react';
import { LeetCodeProblem } from '../models/leetcode';
import PremiumOverlay from './PremiumOverlay';

// Solution data structure based on API response
interface SolutionItem {
  rank: number;
  title: string;
  content: string;
  time_complexity: string;
  space_complexity: string;
  code: string;
  edge_cases: string;
  test_examples: string;
}

interface LeetCodeSolutionResponse {
  status: string;
  problem: {
    title: string;
    category: string[];
    url: string;
  };
  introduction: string;
  solutions: SolutionItem[];
  error: string | null;
  approach_count: number;
  approaches: string[];
  language: string;
  performance: {
    elapsedTimeSeconds: number;
  };
}

interface VisualizationPanelProps {
  problem: LeetCodeProblem;
  solution: SolutionItem | string | null;
  solutions: (SolutionItem | string)[];
  className?: string;
  apiResponse?: LeetCodeSolutionResponse | null;
}

export default function VisualizationPanel({ problem, solution, solutions, className = '', apiResponse }: VisualizationPanelProps) {
  // State for currently active solution (when multiple solutions are available)
  const [activeSolutionIndex, setActiveSolutionIndex] = useState(0);
  // State to track if the visualization panel is unlocked
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  // Helper function to determine if the solution is the structured SolutionItem
  const isSolutionItem = (sol: any): sol is SolutionItem => {
    return sol && typeof sol === 'object' && 'code' in sol && 'title' in sol;
  };
  
  // Get solutions from the API response if available
  const allSolutions = apiResponse?.solutions || solutions;
  
  // Get active solution (either from API response or from solutions array)
  const activeSolution = apiResponse?.solutions && apiResponse.solutions.length > activeSolutionIndex
    ? apiResponse.solutions[activeSolutionIndex]
    : solution
      ? (isSolutionItem(solution) ? solution : null) 
      : (allSolutions && allSolutions.length > activeSolutionIndex 
        ? (isSolutionItem(allSolutions[activeSolutionIndex]) ? allSolutions[activeSolutionIndex] as SolutionItem : null) 
        : null);
  
  // Reset unlock state when problem changes
  useEffect(() => {
    // When a new problem is selected, reset the unlock state
    if (problem) {
      setIsUnlocked(false);
    }
  }, [problem]);

  // Handle unlock action
  const handleUnlock = () => {
    setIsUnlocked(true);
    localStorage.setItem('visualizationUnlocked', 'true');
  };
  
  return (
    <div className={`bg-[#131825] flex flex-col h-full ${className} relative`}>
      <div className="p-3 border-b border-[#3a3a3a]">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          <span className="text-white font-medium">Algorithm Visualization</span>
          {!isUnlocked && (
            <span className="ml-auto text-xs text-yellow-400 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Premium Feature
            </span>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-3">
        {activeSolution ? (
          // Structured solution display
          <div className="bg-[#1a1a1a] rounded-md border border-[#3a3a3a] overflow-hidden">
            {/* Solution selector tabs */}
            {(() => {
              // Determine which approaches to show
              const approachCount = apiResponse?.approach_count || (allSolutions ? allSolutions.length : 0);
              const hasMultipleApproaches = approachCount > 1;
              
              if (!hasMultipleApproaches) return null;
              
              return (
                <div className="flex border-b border-[#3a3a3a] bg-[#202020] overflow-x-auto">
                  {/* Use approaches from API response if available */}
                  {apiResponse?.approaches ? (
                    // Use preformatted approach labels from API
                    apiResponse.approaches.map((approach, index) => (
                      <button
                        key={index}
                        className={`px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${activeSolutionIndex === index ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-300'}`}
                        onClick={() => setActiveSolutionIndex(index)}
                      >
                        {approach}
                      </button>
                    ))
                  ) : (
                    // Fallback to generating labels from solutions array
                    allSolutions.map((sol, index) => {
                      const solutionTitle = isSolutionItem(sol) ? 
                        `${sol.rank || (index + 1)}: ${sol.title}` : 
                        `Solution ${index + 1}`;
                      
                      return (
                        <button
                          key={index}
                          className={`px-3 py-2 text-xs font-medium transition-colors ${activeSolutionIndex === index ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-300'}`}
                          onClick={() => setActiveSolutionIndex(index)}
                        >
                          {solutionTitle}
                        </button>
                      );
                    })
                  )}
                </div>
              );
            })()}
            
            {/* Solution content */}
            <div className="p-4">
              {/* Solution title */}
              <h3 className="text-lg font-medium text-white mb-2">
                {activeSolution.title}
              </h3>
              
              {/* Solution complexity */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-blue-900/30 text-blue-400 px-2 py-1 rounded text-xs">
                  Time: {activeSolution.time_complexity}
                </span>
                <span className="bg-purple-900/30 text-purple-400 px-2 py-1 rounded text-xs">
                  Space: {activeSolution.space_complexity}
                </span>
              </div>
              
              {/* Solution explanation */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Approach:</h4>
                <p className="text-sm text-gray-400 whitespace-pre-line">{activeSolution.content}</p>
              </div>
              
              {/* Code implementation */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Implementation:</h4>
                <div className="bg-[#151515] rounded border border-[#2a2a2a] p-3 overflow-x-auto">
                  <pre className="text-xs text-white font-mono whitespace-pre">{activeSolution.code}</pre>
                </div>
              </div>
              
              {/* Edge cases */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Edge Cases:</h4>
                <p className="text-sm text-gray-400 whitespace-pre-line">{activeSolution.edge_cases}</p>
              </div>
              
              {/* Test examples */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Test Examples:</h4>
                <p className="text-sm text-gray-400 whitespace-pre-line">{activeSolution.test_examples}</p>
              </div>
            </div>
          </div>
        ) : solution && typeof solution === 'string' ? (
          // Legacy string solution format
          <div className="bg-[#1e1e1e] rounded border border-[#3a3a3a] p-3">
            <div className="mb-2 text-sm font-medium text-purple-400">Solution:</div>
            <pre className="text-xs text-white font-mono overflow-x-auto whitespace-pre-wrap">{solution}</pre>
          </div>
        ) : (
          // Empty state - clean minimal design with helpful text
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-16 h-16 mb-4 text-purple-400/50">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
                <line x1="12" y1="2" x2="12" y2="22"></line>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white/80 mb-2">Algorithm Visualization</h3>
            <p className="text-sm text-gray-400 text-center max-w-md">
              {problem ? 
                "The algorithm visualization will appear here after you start discussing the problem with the Interview Expert." :
                "Select a problem from the list to see its algorithm visualization."}
            </p>
          </div>
        )}
      </div>
      
      {/* Premium overlay component */}
      <PremiumOverlay onUnlock={handleUnlock} isUnlocked={isUnlocked} />
    </div>
  );
}
