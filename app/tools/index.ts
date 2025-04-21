/**
 * Tools Index
 * This file exports all available Gemini AI tools and their handlers
 */

// Schedule Meeting Tool
export { scheduleMeetingFn, handleScheduleMeeting } from './scheduleMeeting';

// Function Written Alert Tool
export { functionWrittenAlertFn, handleFunctionWrittenAlert } from './functionWrittenAlert';

// Update Checklist Item Tool
export { updateChecklistItemFn, handleChecklistUpdate } from './updateChecklistItem';

// Mark Criteria Satisfied Tool
export { markCriteriaSatisfiedFn, handleMarkCriteriaSatisfied } from './markCriteriaSatisfied';

// Import all functions to create the collection
import { scheduleMeetingFn } from './scheduleMeeting';
import { functionWrittenAlertFn } from './functionWrittenAlert';
import { updateChecklistItemFn } from './updateChecklistItem';
import { markCriteriaSatisfiedFn } from './markCriteriaSatisfied';

// Export a collection of all tool declarations for easy registration
export const allToolDeclarations = [
  scheduleMeetingFn,
  functionWrittenAlertFn,
  updateChecklistItemFn,
  markCriteriaSatisfiedFn
];
