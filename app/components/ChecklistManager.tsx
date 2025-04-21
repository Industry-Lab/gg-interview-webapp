import React, { createContext, useContext, useState, useEffect } from 'react';
import checklistToolService from '../services/ChecklistToolService';

// Represents a solution criteria item from the API
export interface CriteriaItem {
  id: string;
  description: string;
  pattern?: string;
}

// Dynamic checklist items based on solution criteria
export interface DynamicChecklistItems {
  [key: string]: {
    checked: boolean;
    description: string;
    pattern?: string;
    confidence?: number;
    notes?: string;
    timestamp?: string;
  };
}

interface ChecklistState {
  // Dynamic criteria-based checklist items
  criteriaItems: DynamicChecklistItems;
  
  // Loading state
  isLoadingCriteria: boolean;
}

interface ChecklistContextType {
  // State
  checklistState: ChecklistState;
  
  // Actions
  updateChecklistItem: (itemName: string, checked: boolean) => void;
  setCriteriaItems: (items: CriteriaItem[]) => void;
  setLoadingCriteria: (isLoading: boolean) => void;
  clearCriteriaItems: () => void;
  resetChecklist: () => void;
}

const defaultState: ChecklistState = {
  criteriaItems: {},
  isLoadingCriteria: false,
};

const ChecklistContext = createContext<ChecklistContextType>({
  checklistState: defaultState,
  updateChecklistItem: () => {},
  setCriteriaItems: () => {},
  setLoadingCriteria: () => {},
  clearCriteriaItems: () => {},
  resetChecklist: () => {},
});

// Hook to access the checklist context
const useChecklistContext = () => useContext(ChecklistContext);

interface ChecklistProviderProps {
  children: React.ReactNode;
}

// Checklist Provider Component
const ChecklistProvider: React.FC<ChecklistProviderProps> = ({ children }) => {
  // Initialize state
  const [checklistState, setChecklistState] = useState<ChecklistState>(defaultState);
  
  // Initialize the ChecklistToolService
  useEffect(() => {
    // Register state update callback
    checklistToolService.subscribeToCriteria((criteriaId: string, checked: boolean, metadata?: any) => {
      updateCriteriaItemWithMetadata(criteriaId, checked, metadata);
    });
    
    // Optional debug tool methods
    const addDebugTools = () => {
      if (typeof window !== 'undefined') {
        (window as any).addChecklist = (itemKey: string, checked: boolean) => {
          checklistToolService.updateChecklistItem(itemKey, checked);
        };
        
        (window as any).addCriteria = (criteriaId: string, checked: boolean, metadata?: { confidence?: number, notes?: string, timestamp?: string }) => {
          checklistToolService.updateCriteriaItem(criteriaId, checked, metadata);
        };
      }
    };
    addDebugTools();
    
    // For debugging only
    (window as any).checklistTool = checklistToolService;
  }, []);
  
  // Reset all checklist items for a new problem
  const resetChecklist = () => {
    setChecklistState(defaultState);
  };
  
  // Update a criteria item's status (checked/unchecked)
  const updateChecklistItem = (criteriaId: string, checked: boolean) => {
    setChecklistState(prev => ({
      ...prev,
      criteriaItems: {
        ...prev.criteriaItems,
        [criteriaId]: {
          ...prev.criteriaItems[criteriaId],
          checked,
        },
      },
    }));
  };
  
  // Update criteria item with metadata from the Gemini AI
  const updateCriteriaItemWithMetadata = (criteriaId: string, checked: boolean, metadata?: any) => {
    console.log(`[ChecklistManager] Updating criteria: '${criteriaId}' to ${checked}`, metadata || '');

    // Simply update the criteria with the exact ID from Gemini
    setChecklistState(prev => ({
      ...prev,
      criteriaItems: {
        ...prev.criteriaItems,
        [criteriaId]: {
          ...prev.criteriaItems[criteriaId],
          checked,
          confidence: metadata?.confidence,
          notes: metadata?.notes,
          timestamp: metadata?.timestamp,
        },
      },
    }));
  };
  
  // Set criteria items from the API response
  const setCriteriaItems = (items: CriteriaItem[]) => {
    const newCriteriaItems: DynamicChecklistItems = {};
    
    items.forEach((item) => {
      // Use the ID provided by the backend directly
      const id = item.id;
      newCriteriaItems[id] = {
        checked: false,
        description: item.description,
        pattern: item.pattern
      };
      
      console.log(`[ChecklistManager] Added criteria: '${id}' - '${item.description}'`);
    });
    
    setChecklistState(prev => ({
      ...prev,
      criteriaItems: newCriteriaItems,
      isLoadingCriteria: false,
    }));
  };
  
  // Set loading state for criteria items
  const setLoadingCriteria = (isLoading: boolean) => {
    setChecklistState(prev => ({
      ...prev,
      isLoadingCriteria: isLoading,
    }));
  };
  
  // Clear all criteria items
  const clearCriteriaItems = () => {
    setChecklistState(prev => ({
      ...prev,
      criteriaItems: {},
    }));
  };

  // Subscribe to checklist updates from the geminiWebSocket tool
  useEffect(() => {
    // Subscribe to standard checklist updates
    const unsubscribe = checklistToolService.subscribe((itemKey, checked) => {
      if (itemKey === 'readProblem') {
        updateChecklistItem('readProblemChecked', checked);
      } else if (itemKey === 'explainApproach') {
        updateChecklistItem('explainApproachChecked', checked);
      }
    });
    
    // Subscribe to criteria-specific updates with metadata
    const unsubscribeCriteria = checklistToolService.subscribeToCriteria((criteriaId: string, checked: boolean, metadata?: { confidence?: number, notes?: string, timestamp?: string }) => {
      console.log(`[ChecklistManager] Received criteria update: ${criteriaId}`, metadata);
      updateCriteriaItemWithMetadata(criteriaId, checked, metadata);
    });
    
    return () => {
      unsubscribe();
      unsubscribeCriteria();
    };
  }, []);

  return (
    <ChecklistContext.Provider value={{
      checklistState,
      updateChecklistItem,
      setCriteriaItems,
      setLoadingCriteria,
      clearCriteriaItems,
      resetChecklist,
    }}>
      {children}
    </ChecklistContext.Provider>
  );
};

// Export both the provider component and the hook
export { ChecklistProvider };
export const useChecklist = useChecklistContext;
