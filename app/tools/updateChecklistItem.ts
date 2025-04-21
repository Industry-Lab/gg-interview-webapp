/**
 * Update Checklist Item Tool Definition
 * Used to programmatically update interview checklist items based on candidate progress
 */
import ChecklistToolService from '../services/ChecklistToolService';

export const updateChecklistItemFn = {
  name: "update_checklist_item",
  description: "Update an interview checklist item based on the interview progress",
  parameters: {
    type: "object",
    properties: {
      itemKey: {
        type: "string",
        description: "The unique key for the checklist item (e.g., 'readProblem', 'explainApproach')"
      },
      checked: {
        type: "boolean",
        description: "Whether the item should be checked (true) or unchecked (false)"
      }
    },
    required: ["itemKey", "checked"]
  }
};

/**
 * Handler function for the updateChecklistItem tool
 * @param args - The arguments passed from the tool call
 * @returns A response object with the result
 */
export async function handleChecklistUpdate(args: any): Promise<any> {
  const { itemKey, checked } = args;
  
  // Log the checklist update
  console.log(`%c CHECKLIST UPDATE: %c ${itemKey} → ${checked ? 'CHECKED' : 'UNCHECKED'}`, 
    'background: #4CAF50; color: white; font-weight: bold; padding: 4px;', 
    'color: #4CAF50; font-weight: bold;');
    
  // Use the ChecklistToolService to update the item
  ChecklistToolService.updateChecklistItem(itemKey, checked);
  
  // Return a success response
  return {
    success: true,
    itemKey,
    checked,
    timestamp: new Date().toISOString()
  };
}
