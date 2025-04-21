// ChecklistToolService.ts
// This service manages checklist state updates through a pub/sub pattern

type ChecklistCallback = (itemKey: string, checked: boolean) => void;
type CriteriaCallback = (criteriaId: string, checked: boolean, metadata?: CriteriaMetadata) => void;

// Interface for criteria metadata
interface CriteriaMetadata {
  confidence?: number;
  notes?: string;
  timestamp?: string;
}

class ChecklistToolService {
  private static instance: ChecklistToolService;
  private listeners: ChecklistCallback[] = [];
  private criteriaListeners: CriteriaCallback[] = [];

  private constructor() {}

  public static getInstance(): ChecklistToolService {
    if (!ChecklistToolService.instance) {
      ChecklistToolService.instance = new ChecklistToolService();
    }
    return ChecklistToolService.instance;
  }

  // Subscribe to checklist updates
  public subscribe(callback: ChecklistCallback): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }
  
  // Subscribe to criteria updates with additional metadata
  public subscribeToCriteria(callback: CriteriaCallback): () => void {
    this.criteriaListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.criteriaListeners = this.criteriaListeners.filter(cb => cb !== callback);
    };
  }

  // Update a checklist item
  public updateChecklistItem(itemKey: string, checked: boolean): void {
    console.log(`[ChecklistTool] Updating checklist item: ${itemKey} to ${checked}`);
    this.listeners.forEach(callback => callback(itemKey, checked));
  }
  
  // Update a criteria item with additional metadata
  public updateCriteriaItem(criteriaId: string, checked: boolean, metadata?: CriteriaMetadata): void {
    console.log(`[ChecklistTool] Updating criteria item: ${criteriaId} to ${checked}`, metadata || '');
    
    // First, notify standard checklist listeners to maintain backward compatibility
    this.listeners.forEach(callback => callback(criteriaId, checked));
    
    // Then notify criteria-specific listeners with metadata
    this.criteriaListeners.forEach(callback => callback(criteriaId, checked, metadata));
  }
}

export default ChecklistToolService.getInstance();
