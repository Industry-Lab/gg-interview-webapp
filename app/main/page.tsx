// app/page.tsx
"use client";
import { useState, useCallback, useRef, useEffect } from 'react';
import CameraPreview from '../components/CameraPreview';
import { ScrollArea } from "../components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { LeetCodeProblem } from '../models/leetcode';
import { Code, MessageCircle, ArrowRight, Clock, Settings } from 'lucide-react';
import ToggleableProblemList from '../components/ToggleableProblemList';
import VisualizationPanel from '../components/VisualizationPanel';
import TiltButton from '../components/TiltButton';
import InterviewChecklist from '../components/InterviewChecklist';
import { ChecklistProvider, useChecklist } from '../components/ChecklistManager';
import LanguageSettingsModal from '../components/LanguageSettingsModal';
import { useProgrammingLanguage } from '../context/ProgrammingLanguageContext';

// Simple message components
const HumanMessage = ({ text }: { text: string }) => (
  <div className="flex gap-2 items-start">
    <Avatar className="h-6 w-6 bg-secondary text-primary-foreground">
      <AvatarImage src="/avatars/human.png" alt="Human" />
      <AvatarFallback className="text-xs">Y</AvatarFallback>
    </Avatar>
    <div className="flex-1">
      <div className="rounded-md bg-secondary/40 px-2 py-1.5 text-xs text-foreground">
        {text}
      </div>
    </div>
  </div>
);

const GeminiMessage = ({ text }: { text: string }) => (
  <div className="flex gap-2 items-start">
    <Avatar className="h-6 w-6 bg-primary/90 text-primary-foreground border border-primary/30">
      <AvatarImage src="/avatars/gemini.png" alt="Gemini" />
      <AvatarFallback className="text-xs">AI</AvatarFallback>
    </Avatar>
    <div className="flex-1">
      <div className="rounded-md bg-card/80 px-2 py-1.5 text-xs text-foreground border border-muted/50">
        {text}
      </div>
    </div>
  </div>
);

function MainContent() {
  // Access checklist context for updating criteria items
  const { setCriteriaItems, setLoadingCriteria, clearCriteriaItems } = useChecklist();
  // Use global programming language context
  const { language } = useProgrammingLanguage();
  
  const [messages, setMessages] = useState<{ type: 'human' | 'gemini', text: string }[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<LeetCodeProblem | null>(null);
  const [initialTime, setInitialTime] = useState(120);
  const [isDiagramVisible, setIsDiagramVisible] = useState(true);
  const [showStartButton, setShowStartButton] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [problemSolutions, setProblemSolutions] = useState<Record<string, any[]>>({});
  const [solutionApiResponses, setSolutionApiResponses] = useState<Record<string, any>>({});
  const [showSettings, setShowSettings] = useState(false);
  const cameraPreviewRef = useRef<any>(null);

  // Handle messages from Gemini
  const handleGeminiMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, { type: 'gemini', text }]);
  }, []);

  // Handle transcriptions
  const handleTranscription = useCallback((text: string) => {
    setMessages(prev => [...prev, { type: 'human', text }]);
  }, []);
  
  // Disconnect handler
  const handleDisconnect = useCallback(() => {
    setMessages([]);
    setShowStartButton(true);
    if (cameraPreviewRef.current) {
      if (cameraPreviewRef.current.geminiWsRef?.current) {
        cameraPreviewRef.current.geminiWsRef.current.disconnect();
      }
      if (typeof cameraPreviewRef.current.stopStreaming === 'function') {
        cameraPreviewRef.current.stopStreaming();
      }
    }
    setAudioLevel(0);
  }, []);

  // Create a separate function to fetch solutions that can be called both when selecting a problem and when language changes
  const fetchSolutionsForProblem = useCallback(async (problem: LeetCodeProblem) => {
    try {
      // Get the current language directly from localStorage to ensure freshness
      const currentLanguage = localStorage.getItem('programmingLanguage') || 'python';
      console.log(`Fetching solutions for problem: ${problem.id} in language: ${currentLanguage}`);
      
      // Check if the backend API is likely running, add a status message
      const statusMessage = document.getElementById('api-status-message');
      if (statusMessage) {
        statusMessage.textContent = 'Connecting to API directly...';
        statusMessage.classList.remove('text-red-500');
        statusMessage.classList.add('text-blue-400');
      }
      
      // Use Next.js API route instead of direct API call to avoid CORS issues
      // This will proxy the request through Next.js server which doesn't have CORS limitations
      const response = await fetch('/api/leetcode-solutions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          programLanguage: currentLanguage,
          ...problem
        }),
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        console.log('Solutions fetched successfully');
        
        // Update API status message
        const statusMessage = document.getElementById('api-status-message');
        if (statusMessage) {
          statusMessage.textContent = 'API connection successful';
          statusMessage.classList.remove('text-red-500', 'text-blue-400');
          statusMessage.classList.add('text-green-500');
        }
        
        // Store solutions in their original format (object or string)
        const processedSolutions = Array.isArray(data.solutions) 
          ? data.solutions 
          : [data.solutions];
        
        // Store the solutions array
        setProblemSolutions(prev => ({
          ...prev,
          [problem.id]: processedSolutions
        }));
        
        // Store the full API response
        setSolutionApiResponses(prev => ({
          ...prev,
          [problem.id]: data
        }));

        // Process and set criteria items from the API response
        if (data.criteria && Array.isArray(data.criteria) && data.criteria.length > 0) {
          console.log('Setting criteria items from API:', data.criteria);
          
          // First set loading state to true
          setLoadingCriteria(true);
          
          // Clear any existing criteria
          clearCriteriaItems();
          
          // Format criteria items to match expected structure, using original IDs from the API
          const formattedCriteria = data.criteria.map((criterion: any) => {
            // Make sure we have a valid string description
            const description = typeof criterion === 'string' 
              ? criterion 
              : (criterion?.description || criterion?.text || JSON.stringify(criterion));
              
            return {
              id: criterion.id, // Use the original ID directly from the API
              description: description,
              pattern: criterion.pattern || null
            };
          });
          
          // Set the criteria items
          setCriteriaItems(formattedCriteria);
        } else if (data.solution_criteria && Array.isArray(data.solution_criteria) && data.solution_criteria.length > 0) {
          // Alternative field name that might be used
          console.log('Setting solution_criteria items from API:', data.solution_criteria);
          
          // First set loading state to true
          setLoadingCriteria(true);
          
          // Clear any existing criteria
          clearCriteriaItems();
          
          // Format criteria items to match expected structure, using original IDs from the API
          const formattedCriteria = data.solution_criteria.map((criterion: any) => {
            // Make sure we have a valid string description
            const description = typeof criterion === 'string' 
              ? criterion 
              : (criterion?.description || criterion?.text || JSON.stringify(criterion));
              
            return {
              id: criterion.id, // Use the original ID directly from the API
              description: description,
              pattern: criterion.pattern || null
            };
          });
          
          // Set the criteria items
          setCriteriaItems(formattedCriteria);
        } else {
          console.warn('No criteria items found in API response');
          // Clear any existing criteria
          clearCriteriaItems();
        }

        // Send the solutions to the Interview Expert
        if (cameraPreviewRef.current?.geminiWsRef?.current) {
          cameraPreviewRef.current.geminiWsRef.current.sendSolutionContext(
            problem, 
            processedSolutions,
            data.criteria || data.solution_criteria || []
          );
        }
      }
    } catch (error) {
      console.error('Error fetching solutions via Next.js API route:', error);
      
      // Update API status message
      const statusMessage = document.getElementById('api-status-message');
      if (statusMessage) {
        statusMessage.textContent = 'API connection failed - please check server logs';
        statusMessage.classList.remove('text-blue-400', 'text-green-500');
        statusMessage.classList.add('text-red-500');
      }
      
      // Show error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`API Error: ${errorMessage}`);
    }
  }, [cameraPreviewRef]);
  
  // Track when a language change occurs to refetch solutions
  const previousLanguage = useRef(language);
  
  useEffect(() => {
    // Only refetch if this is a genuine language change (not initial load)
    if (selectedProblem && previousLanguage.current !== language && previousLanguage.current) {
      console.log(`Language changed from ${previousLanguage.current} to ${language} - refetching solutions`);
      fetchSolutionsForProblem(selectedProblem);
    }
    
    // Update the previous language for future comparisons
    previousLanguage.current = language;
  }, [language, fetchSolutionsForProblem, selectedProblem]);

  const handleSelectProblem = useCallback(async (problem: LeetCodeProblem) => {
    console.log('Problem selected:', problem);
    const safeProblem = {
      ...problem,
      id: problem.id || 'unknown',
      title: problem.title || 'Untitled Problem',
      difficulty: problem.difficulty || 'Medium',
      category: Array.isArray(problem.category) ? problem.category : ['Algorithm'],
      content: problem.content || '<p>No description available</p>',
    };
    
    // Update API status message
    const statusMessage = document.getElementById('api-status-message');
    if (statusMessage) {
      statusMessage.textContent = 'Loading problem...';
      statusMessage.classList.remove('text-red-500', 'text-green-500');
      statusMessage.classList.add('text-blue-400');
    }
    
    setSelectedProblem(safeProblem);
    
    // Send the selected problem to the Interview Expert via WebSocket
    if (cameraPreviewRef.current?.geminiWsRef?.current) {
      cameraPreviewRef.current.geminiWsRef.current.sendNewProblemContext(safeProblem);
    }
    
    // Fetch solutions for the problem - only when a problem is explicitly selected
    // The language change effect won't run here since we're handling a problem selection
    await fetchSolutionsForProblem(safeProblem);
  }, [fetchSolutionsForProblem]);

  return (
    <div className="flex flex-col h-screen text-foreground">
      <header className="bg-[#111827]/90 border-b border-blue-900/30 py-3 px-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img src="/logo/logo.png" alt="GG Interview Logo" className="h-10 w-auto" />
          </div>
          <div>
            <button 
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 rounded text-sm transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </header>
      
      {/* Settings Modal */}
      <LanguageSettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column - Problem List */}
        <ToggleableProblemList onSelectProblem={handleSelectProblem} />
        
        {/* Center Column with 2/3 Problem + 1/3 Visualization */}
        <div className="flex-1 flex flex-col overflow-hidden border border-[#3a3a3a] text-gray-100 relative">
          <div className="absolute inset-0 bg-[#131825] bg-[linear-gradient(rgba(59,130,246,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.09)_1px,transparent_1px)] bg-[size:24px_24px] z-[-1]"></div>
          
          {/* Header */}
          <div className="sticky top-0 bg-[#1a1a1a]/95 backdrop-blur-sm p-2 border-b border-[#3a3a3a] z-10">
            <h2 className="text-sm font-medium flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Code className="w-4 h-4 text-primary" /> 
                Problem Detail
              </div>
              {selectedProblem && (
                <span className={`
                  ml-2 px-2 py-0.5 text-xs font-medium rounded-full
                  ${selectedProblem.difficulty === 'Easy' ? 'bg-[#2cbb5d]/10 text-[#2cbb5d]' : ''}
                  ${selectedProblem.difficulty === 'Medium' ? 'bg-[#ffc01e]/10 text-[#ffc01e]' : ''}
                  ${selectedProblem.difficulty === 'Hard' ? 'bg-[#ef4743]/10 text-[#ef4743]' : ''}
                `}>
                  {selectedProblem.difficulty}
                </span>
              )}
            </h2>
          </div>
          
          {/* Problem detail takes 2/3 of the height */}
          <div className="h-[calc(66.67vh-82px)] overflow-y-auto overflow-x-hidden">
            {selectedProblem ? (
              <div className="p-4">
                <h2 className="text-2xl font-medium text-white">
                  <span className="mr-1 text-blue-400">{selectedProblem.id}.</span>
                  {selectedProblem.title}
                </h2>
                
                {/* Problem categories */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {Array.isArray(selectedProblem.category) && selectedProblem.category.length > 0 ? (
                    selectedProblem.category.map((tag, idx) => (
                      <span key={idx} className="bg-[#2a2a2a] text-[#8c8c8c] px-2 py-0.5 rounded-full text-xs">
                        {tag}
                      </span>
                    ))
                  ) : typeof selectedProblem.category === 'string' ? (
                    <span className="bg-[#2a2a2a] text-[#8c8c8c] px-2 py-0.5 rounded-full text-xs">
                      {selectedProblem.category}
                    </span>
                  ) : (
                    <span className="bg-[#2a2a2a] text-[#8c8c8c] px-2 py-0.5 rounded-full text-xs">
                      Algorithm
                    </span>
                  )}
                </div>
                
                <div className="mt-4" dangerouslySetInnerHTML={{ __html: selectedProblem.content }} />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 p-4">
                <div className="text-center">
                  <h3 className="text-xl font-medium mb-2">No Problem Selected</h3>
                  <p>Select a problem from the list to view details</p>
                </div>
              </div>
            )}
          </div>

          {/* Algorithm Visualization panel - fixed at 1/3 of the height */}
          {selectedProblem && (
            <div className="h-[33.33vh] border-t border-[#3a3a3a]">
              <VisualizationPanel 
                problem={selectedProblem}
                solution={Array.isArray(problemSolutions[selectedProblem.id]) && problemSolutions[selectedProblem.id].length > 0 
                  ? problemSolutions[selectedProblem.id][0] 
                  : null}
                solutions={Array.isArray(problemSolutions[selectedProblem.id]) && problemSolutions[selectedProblem.id].length > 0 
                  ? problemSolutions[selectedProblem.id] 
                  : []}
                apiResponse={solutionApiResponses[selectedProblem.id] || null}
              />
            </div>
          )}
        </div>
        
        {/* Right Column - Interview Expert */}
        <div className="w-1/3 min-w-[300px] flex flex-col border-l border-[#3a3a3a] bg-[#131825] overflow-hidden">
          <div className="sticky top-0 bg-[#1a1a1a]/95 backdrop-blur-sm p-2 border-b border-[#3a3a3a] z-10">
            <h2 className="text-sm font-medium flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-[10px]">AI</span>
                Interview Expert
              </div>
              <span className="text-xs text-green-500">● Online</span>
            </h2>
          </div>

          {showStartButton ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
              <p className="text-gray-300 text-center text-lg mb-2">Ready to begin your interview?</p>
              <TiltButton 
                onClick={() => setShowStartButton(false)} 
                className="mt-2"
                alt="Let's Start Button"
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="relative w-full aspect-video bg-[#111827] flex items-center justify-center overflow-hidden">
                <CameraPreview
                  ref={cameraPreviewRef}
                  onMessage={handleGeminiMessage}
                  onTranscription={handleTranscription}
                  startWithoutStreaming={false}
                  onAudioLevelChange={setAudioLevel}
                />
                {/* API Status message */}
                <div id="api-status-message" className="absolute bottom-2 right-2 text-xs text-gray-400 px-2 py-1 bg-black/60 rounded"></div>
              </div>
              
              <div className="p-3 border-b border-[#3a3a3a]">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-300">Status:</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-300">Volume:</span>
                    <div className="h-4 w-24 flex items-end gap-0.5">
                      {[...Array(8)].map((_, i) => {
                        const barThreshold = (i + 1) * 12.5;
                        const isActive = audioLevel >= barThreshold;
                        return (
                          <div 
                            key={i} 
                            style={{ height: `${Math.min((i+1) * 4, 16)}px` }}
                            className={`w-1.5 rounded-sm ${isActive ? 'bg-green-500' : 'bg-gray-700'}`}
                          ></div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                    <line x1="12" y1="2" x2="12" y2="12"></line>
                  </svg>
                  Disconnect Interview
                </button>
              </div>
              
              {/* Add the checklist component */}
              <InterviewChecklist />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ChecklistProvider>
      <MainContent />
    </ChecklistProvider>
  );
}
