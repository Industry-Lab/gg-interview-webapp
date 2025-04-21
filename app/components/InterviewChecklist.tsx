import React, { useState, useEffect, memo } from 'react';
import ChecklistItem from './ChecklistItem';
import { useChecklist } from './ChecklistManager';
import { DynamicChecklistItems, CriteriaItem } from './ChecklistManager';

// Simple tooltip component
interface SimpleTooltipProps {
  show: boolean;
  children: React.ReactNode;
}

const SimpleTooltip: React.FC<SimpleTooltipProps> = ({ show, children }) => {
  if (!show) return null;
  
  return (
    <div className="absolute left-full ml-2 bg-gray-800 border border-gray-700 rounded shadow-lg p-2 text-sm max-w-xs z-10">
      {children}
    </div>
  );
};

// Component to display criteria metadata
interface CriteriaMetadataProps {
  confidence?: number;
  notes?: string;
  timestamp?: string;
}

const CriteriaMetadata: React.FC<CriteriaMetadataProps> = ({ confidence, notes, timestamp }) => {
  if (!confidence && !notes && !timestamp) return null;

  return (
    <div className="text-gray-300">
      {confidence !== undefined && (
        <div className="mb-1">
          <span className="font-semibold">Confidence:</span> {Math.round(confidence * 100)}%
        </div>
      )}
      {notes && (
        <div className="mb-1">
          <span className="font-semibold">Notes:</span> {notes}
        </div>
      )}
      {timestamp && (
        <div className="text-xs text-gray-400">
          {new Date(timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
};

// Memoized version of the checklist section
const CriteriaSection = memo(({ criteriaItems, updateItem }: { 
  criteriaItems: DynamicChecklistItems; 
  updateItem: (id: string, checked: boolean) => void 
}) => {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  return (
    <div className="space-y-2">
      {/* Filter out any empty placeholders and only map over valid criteria items */}
      {Object.entries(criteriaItems)
        .filter(([id, item]) => id && item && item.description) // Only include valid criteria
        .map(([id, item]) => (
          <ChecklistItem
            key={id}
            itemKey={id}
            label={item.description}
            checked={item.checked}
            onClick={() => toggleExpand(id)}
          >
            {expandedItems[id] && (
              <div className="py-3 px-4 text-gray-300 text-sm">
                <div className="flex items-center gap-2 cursor-pointer mb-3 hover:bg-white/5 p-2 rounded-md transition-all" onClick={() => updateItem(id, !item.checked)}>
                  <span 
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-md ${item.checked ? 'bg-gradient-to-r from-green-400 to-emerald-500 border-none' : 'border border-gray-300/50 bg-gray-700/30'}`}
                  >
                    {item.checked && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className="text-sm text-gray-100">Mark as completed</span>
                </div>
                
                {item.confidence && (
                  <div className="mb-1 bg-gray-700/30 p-2 rounded-md">
                    <span className="font-semibold text-purple-300">Confidence:</span> 
                    <span className="ml-1 text-gray-200">{Math.round(item.confidence * 100)}%</span>
                  </div>
                )}
                
                {item.notes && (
                  <div className="mb-1 bg-gray-700/30 p-2 rounded-md">
                    <span className="font-semibold text-purple-300">Notes:</span> 
                    <span className="ml-1 text-gray-200">{item.notes}</span>
                  </div>
                )}
                
                {item.timestamp && (
                  <div className="text-xs text-gray-400 mt-3 italic">
                    Last updated: {new Date(item.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </ChecklistItem>
        ))}
    </div>
  );
});

const InterviewChecklist: React.FC = () => {
  const { checklistState, updateChecklistItem, setCriteriaItems } = useChecklist();
  // Use type assertion to access the state properties
  const { criteriaItems, isLoadingCriteria } = checklistState;
  // These properties might not be in the type but they exist at runtime
  const readProblemChecked = (checklistState as any).readProblemChecked || false;
  const explainApproachChecked = (checklistState as any).explainApproachChecked || false;
  
  // Initialize with an empty object and dynamically add sections for each criteria
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // Toggle any section expand/collapse (now works with criteria IDs)
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  
  // We won't generate sample criteria anymore - we'll use only what comes from the API
  useEffect(() => {
    console.log('Criteria items updated:', Object.keys(criteriaItems).length, 'items');
    console.log('Criteria details:', criteriaItems);
  }, [criteriaItems]);
  
  // Render loading state for criteria items
  const renderLoadingState = () => {
    return (
      <div className="flex flex-col items-center py-4 px-3 space-y-4">
        {/* Multiple gradient skeleton loaders */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-full rounded-md overflow-hidden bg-gray-800 shadow-md animate-pulse">
            <div className="h-14 bg-gradient-to-r from-[#D3C2FF]/30 via-[#CEF3FF]/30 via-[#FFFFFF]/30 via-[#FFE0BA]/30 to-[#E1FFA3]/30"
                 style={{
                   background: 'linear-gradient(90deg, rgba(211,194,255,0.3) 0%, rgba(206,243,255,0.3) 36%, rgba(255,255,255,0.3) 63%, rgba(255,224,186,0.3) 76%, rgba(225,255,163,0.3) 100%)',
                 }}>
            </div>
          </div>
        ))}
        <p className="text-xs text-purple-200 font-medium mt-2">Loading solution criteria...</p>
      </div>
    );
  };
  
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      {/* Only show the actual criteria items directly */}
      {isLoadingCriteria ? (
        renderLoadingState()
      ) : (
        <div className="space-y-2">
          {/* Only display the criteria items directly without nested headers */}
          {Object.entries(criteriaItems)
            .filter(([id, item]) => id && item && item.description)
            .map(([id, item], index, filteredArray) => (
              // Pass isFirst and isLast props for iPhone-style grouped appearance
              <div className="relative" key={id}>
                {/* Connect items with a subtle line except for the last item */}
                {index < filteredArray.length - 1 && (
                  <div className="absolute left-[22px] top-[55px] bottom-0 w-[1px] bg-gray-300/10 z-0"></div>
                )}
              <ChecklistItem
                itemKey={id}
                label={item.description}
                checked={item.checked}
                onClick={() => toggleSection(id)}
              >
                {expandedSections[id as keyof typeof expandedSections] && (
                  <div className="py-3 px-4 text-gray-300 text-sm">
                    <div className="flex items-center gap-2 cursor-pointer mb-3 hover:bg-white/5 p-2 rounded-md transition-all" onClick={() => updateChecklistItem(id, !item.checked)}>
                      <span 
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-md ${item.checked ? 'bg-gradient-to-r from-green-400 to-emerald-500 border-none' : 'border border-gray-300/50 bg-gray-700/30'}`}
                      >
                        {item.checked && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span className="text-sm text-gray-100">Mark as completed</span>
                    </div>
                    
                    {item.confidence && (
                      <div className="mb-1 bg-gray-700/30 p-2 rounded-md">
                        <span className="font-semibold text-purple-300">Confidence:</span> 
                        <span className="ml-1 text-gray-200">{Math.round(item.confidence * 100)}%</span>
                      </div>
                    )}
                    
                    {item.notes && (
                      <div className="mb-1 bg-gray-700/30 p-2 rounded-md">
                        <span className="font-semibold text-purple-300">Notes:</span> 
                        <span className="ml-1 text-gray-200">{item.notes}</span>
                      </div>
                    )}
                    
                    {item.timestamp && (
                      <div className="text-xs text-gray-400 mt-3 italic">
                        Last updated: {new Date(item.timestamp).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </ChecklistItem>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default InterviewChecklist;
