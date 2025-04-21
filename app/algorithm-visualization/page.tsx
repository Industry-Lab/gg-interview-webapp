"use client";

import React, { useState } from 'react';
import DebugMermaidDiagram from '../components/DebugMermaidDiagram';

// Simple test mermaid diagrams for debugging
const SAMPLE_DIAGRAMS = [
  {
    title: "Simple Algorithm Flow",
    mermaid: `graph TD
    A[Start] --> B{Is input sorted?}
    B -->|Yes| C[Return]
    B -->|No| D[Sort input]
    D --> C`
  },
  {
    title: "Binary Search Tree",
    mermaid: `graph TD
    A((8)) --> B((3))
    A --> C((10))
    B --> D((1))
    B --> E((6))
    C --> F((14))
    class A,B,C,D,E,F node`
  },
  {
    title: "Dynamic Programming",
    mermaid: `graph LR
    A[Problem] --> B[Subproblem 1]
    A --> C[Subproblem 2]
    B --> D[Sub-subproblem]
    C --> D
    D --> E[Solution]
    class D highlight`
  },
  {
    title: "Quick Sort",
    mermaid: `graph TD
    A[Array] --> B{Choose Pivot}
    B --> C[Less than pivot]
    B --> D[Equal to pivot]
    B --> E[Greater than pivot]
    C --> F[Recursively sort]
    E --> G[Recursively sort]
    F --> H[Combine results]
    D --> H
    G --> H`
  },
  {
    title: "Problem with Syntax",
    mermaid: `graph TD
    A[Start Process] --> B{Decision?}
    B -->|Yes| C[Process 1]
    B -->|No| D[(Database)]
    C --> E(PS[Bad Syntax Here])
    D --> F{Another Decision}
    F --> |Option 1| G[End Process]}]`
  }
];

export default function AlgorithmVisualizationPage() {
  const [diagramIndex, setDiagramIndex] = useState(0);
  const [customMermaid, setCustomMermaid] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  
  // Get the current diagram code
  const currentDiagram = SAMPLE_DIAGRAMS[diagramIndex];
  const mermaidCode = showCustom ? customMermaid : currentDiagram.mermaid;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-teal-400">Algorithm Visualization Debug</h1>
        <a href="/" className="text-blue-400 hover:text-blue-300">Back to Main App</a>
      </header>
      
      {/* Diagram selection */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Test Diagrams</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {SAMPLE_DIAGRAMS.map((diagram, index) => (
            <button
              key={index}
              onClick={() => {
                setDiagramIndex(index);
                setShowCustom(false);
              }}
              className={`px-3 py-1 rounded ${diagramIndex === index && !showCustom ? 'bg-teal-600' : 'bg-gray-700'}`}
            >
              {diagram.title}
            </button>
          ))}
          <button
            onClick={() => setShowCustom(true)}
            className={`px-3 py-1 rounded ${showCustom ? 'bg-teal-600' : 'bg-gray-700'}`}
          >
            Custom Input
          </button>
        </div>
      </div>
      
      {/* Custom Mermaid input */}
      {showCustom && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Custom Mermaid Input</h2>
          <textarea
            value={customMermaid}
            onChange={(e) => setCustomMermaid(e.target.value)}
            className="w-full h-40 p-3 bg-gray-800 text-white rounded font-mono text-sm"
            placeholder="Enter Mermaid code here..."
          />
        </div>
      )}
      
      {/* Visualization */}
      <div className="border border-teal-700 rounded-lg overflow-hidden">
        <h2 className="bg-teal-800 px-4 py-2 text-xl">
          Diagram: {showCustom ? 'Custom' : currentDiagram.title}
        </h2>
        <div className="p-4 bg-gray-800">
          <DebugMermaidDiagram 
            code={mermaidCode}
            className="w-full"
          />
        </div>
      </div>
      
      {/* Debug view of Mermaid code */}
      <div className="mt-8 border border-gray-700 rounded-lg overflow-hidden">
        <h2 className="bg-gray-800 px-4 py-2 text-xl">Raw Mermaid Code</h2>
        <div className="p-4 bg-gray-900">
          <pre className="bg-gray-800 p-4 rounded overflow-auto max-h-60 font-mono text-sm whitespace-pre-wrap">
            {showCustom ? customMermaid : currentDiagram.mermaid}
          </pre>
        </div>
      </div>
    </div>
  );
}
