/**
 * Mark Criteria Satisfied Tool Definition
 * Used to mark when the candidate has satisfied a specific criteria during the interview
 */
import ChecklistToolService from '../services/ChecklistToolService';

export const markCriteriaSatisfiedFn = {
    "name": "markCriteriaSatisfied",
    "description": `
    Marks **one** checklist criterion as satisfied.

    Call this function as soon as you are at least 70% confident 
    **Confident**
    The confidence is based on how you compare the criteria description with what the user is doing on the screen. *Remember* you just need the visual evidences on the user's screen, you don't have to ask candidate for clarify the criterion is fulfilled.  
    
    Do **not** wait for additional criteria.
    
    Required arguments:
    • criteriaId   (string)   – ID of the satisfied criterion  
    • confidence   (number)   – 0.7 to 1.00  
    • notes        (string)   – Detail Evidence  
    • timestamp    (string)   – ISO‑8601 UTC time
    `,
    "parameters": {
        "type": "object",
        "properties": {
            "criteriaId": {
                "type": "string",
                "description": "The unique ID of the satisfied checklist criteria (e.g., 'majorityElementAlgorithm')."
            },
            "confidence": {
                "type":"number",
                "description":"(0.0–1.0) how sure you are that this criteria is met, based on on‑screen evidence"
            },
            "notes": {
                "type": "string",
                "description": "The detail notes explaining why the AI considers this criteria satisfied (e.g., which evidence or test passed)."
            },
            "timestamp": {
                "type": "string",
                "format": "date-time",
                "description": "Optional ISO 8601 timestamp of when the criteria was observed as met."
            }
        },
        "required": ["criteriaId"]
    }
};

/**
 * Handler function for the markCriteriaSatisfied tool
 * @param args - The arguments passed from the tool call
 * @returns A response object with the result
 */
export async function handleMarkCriteriaSatisfied(args: any): Promise<any> {
    const {criteriaId, confidence, notes, timestamp} = args;
    const currentTimestamp = timestamp || new Date().toISOString();

    // Log when a criteria is satisfied with detailed information
    console.log(
        `%c Criteria Satisfied %c ${criteriaId} %c ${confidence ? `(${Math.round(confidence * 100)}% confidence)` : ''}`,
        'background: #4CAF50; color: white; font-weight: bold; padding: 2px 4px; border-radius: 3px;',
        'color: #2E7D32; font-weight: bold;',
        'color: #757575;'
    );

    if (notes) {
        console.log(`%c Notes: %c ${notes}`,
            'color: #616161; font-weight: bold;',
            'color: #9E9E9E;'
        );
    }

    // Update the checklist item in the UI
    ChecklistToolService.updateCriteriaItem(criteriaId, true, {
        confidence,
        notes,
        timestamp: currentTimestamp
    });

    // Return a success response
    return {
        success: true,
        criteriaId,
        confidence,
        notes,
        timestamp: currentTimestamp,
        message: `Criteria '${criteriaId}' marked as satisfied`
    };
}
