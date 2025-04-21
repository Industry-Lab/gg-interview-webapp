"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { LeetCodeProblem } from '../models/leetcode';
import { LeetcodeService } from '../services/leetcodeService';

// Use dynamic import to ensure the component is only loaded client-side
const GeminiTextChat = dynamic(
  () => import('../components/GeminiTextChat'),
  { ssr: false }
);

export default function GeminiTextPage() {
  const [problems, setProblems] = useState<LeetCodeProblem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<LeetCodeProblem | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch problems on component mount
  useEffect(() => {
    async function fetchProblems() {
      try {
        setLoading(true);
        const data = await LeetcodeService.getProblems();
        if (Array.isArray(data) && data.length > 0) {
          setProblems(data);
          // Select the first problem by default
          setSelectedProblem(data[0]);
        }
      } catch (error) {
        console.error('Error fetching problems:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProblems();
  }, []);

  const handleProblemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const problemId = e.target.value;
    const problem = problems.find(p => p.id === problemId);
    if (problem) {
      setSelectedProblem(problem);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Gemini Text Chat</h1>
          <p className="text-gray-400">
            This page demonstrates the text-only Gemini API integration, separate from the audio functionality.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Problem selection and details */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <h2 className="text-lg font-semibold mb-3">Select a Problem</h2>
              
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <select
                  className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
                  value={selectedProblem?.id || ''}
                  onChange={handleProblemSelect}
                >
                  {problems.map((problem) => (
                    <option key={problem.id} value={problem.id}>
                      {problem.title} ({problem.difficulty})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedProblem && (
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <h2 className="text-lg font-semibold mb-2">{selectedProblem.title}</h2>
                <div className="mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    selectedProblem.difficulty === 'Easy' ? 'bg-green-900/30 text-green-400' : 
                    selectedProblem.difficulty === 'Medium' ? 'bg-yellow-900/30 text-yellow-400' : 
                    'bg-red-900/30 text-red-400'
                  }`}>
                    {selectedProblem.difficulty}
                  </span>
                </div>
                <div className="mt-4 text-sm text-gray-300 overflow-y-auto max-h-[400px] prose prose-invert">
                  <div dangerouslySetInnerHTML={{ __html: selectedProblem.description || selectedProblem.content || '' }} />
                  
                  {selectedProblem.exampleTestcases && (
                    <div className="mt-4">
                      <h3 className="text-md font-semibold mb-2">Examples:</h3>
                      <pre className="bg-gray-800 p-2 rounded overflow-x-auto">
                        {selectedProblem.exampleTestcases}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Gemini Text Chat */}
          <div className="lg:col-span-2 h-[700px]">
            <GeminiTextChat problem={selectedProblem || undefined} />
          </div>
        </div>
      </div>
    </div>
  );
}
