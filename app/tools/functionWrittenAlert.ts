/**
 * Function Written Alert Tool Definition
 * Used to detect when the user has written a function during the interview
 */
import ChecklistToolService from '../services/ChecklistToolService';

export const functionWrittenAlertFn = {
  name: "functionWrittenAlert",
  description: "Triggered when the user writes a function that sums two integers and prints the result from main",
  parameters: {
    type: "object",
    properties: {
      functionName: {
        type: "string",
        description: "The name of the function the user wrote."
      },
      language: {
        type: "string",
        description: "Programming language the function is written in.",
        enum: ["javascript", "python", "java", "c++", "other"]
      }
    },
    required: ["functionName", "language"]
  }
};

/**
 * Handler function for the functionWrittenAlert tool
 * @param args - The arguments passed from the tool call
 * @returns A response object with the result
 */
export async function handleFunctionWrittenAlert(args: any): Promise<any> {
  const { functionName, language } = args;
  
  // Log when a function is detected
  console.log(`%c ${language} %c ${functionName}()`, 
    'background: #FF9800; color: white; font-weight: bold; padding: 2px 4px; border-radius: 3px;',
    'color: #FF5722; font-weight: bold; font-family: monospace;');

  // Mark the explain approach checklist item as completed
  // This assumes the candidate has explained their approach if they've written code
  ChecklistToolService.updateChecklistItem("explainApproach", true);
        
  // Return a success response
  return {
    success: true,
    functionName,
    language,
    timestamp: new Date().toISOString(),
    message: `Detected ${language} function: ${functionName}()`
  };
}
