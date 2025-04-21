"use client";

import React, { useState, useEffect } from 'react';
import { LeetCodeProblem } from '../models/leetcode';
import { LeetcodeService } from '../services/leetcodeService';

interface LeetCodeProblemListProps {
  onSelectProblem?: (problem: LeetCodeProblem) => void;
}

export default function LeetCodeProblemList({ onSelectProblem }: LeetCodeProblemListProps) {
  const [problems, setProblems] = useState<LeetCodeProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Constants
  const PROBLEMS_PER_PAGE = 50;

  // Fetch problems on mount
  useEffect(() => {
    let isMounted = true;
    
    async function fetchProblems() {
      try {
        const data = await LeetcodeService.getProblems();
        if (isMounted && Array.isArray(data)) {
          setProblems(data);
        }
      } catch (error) {
        console.error('Error fetching problems:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    fetchProblems();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Pagination calculations
  const startIndex = currentPage * PROBLEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + PROBLEMS_PER_PAGE, problems.length);
  const displayProblems = problems.slice(startIndex, endIndex);
  const totalPages = Math.max(1, Math.ceil(problems.length / PROBLEMS_PER_PAGE));

  const handleSelectProblem = (problem: LeetCodeProblem) => {
    if (onSelectProblem) {
      onSelectProblem(problem);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full p-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
    </div>;
  }

  if (problems.length === 0) {
    return <div className="p-4 text-center">No problems available</div>;
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-900">
      {/* Header with pagination */}
      <div className="p-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <span className="text-sm text-white">Page {currentPage + 1} of {totalPages}</span>
        <span className="text-xs text-gray-400">{problems.length} problems</span>
      </div>

      {/* Problem list */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-700">
          {displayProblems.map((problem) => (
            <div 
              key={problem.id}
              className="p-3 hover:bg-gray-800 cursor-pointer"
              onClick={() => handleSelectProblem(problem)}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm text-white">{problem.title}</div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${problem.difficulty === 'Easy' ? 'bg-green-900/30 text-green-400' : problem.difficulty === 'Medium' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-red-900/30 text-red-400'}`}>
                  {problem.difficulty}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom pagination */}
      <div className="p-2 bg-gray-800 border-t border-gray-700 flex justify-between items-center">
        <button 
          className="px-2 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
          onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
          disabled={currentPage === 0}
        >
          Previous
        </button>
        
        <span className="text-xs text-gray-400">
          Showing {startIndex + 1}-{endIndex} of {problems.length}
        </span>
        
        <button 
          className="px-2 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
          onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
          disabled={currentPage >= totalPages - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}
