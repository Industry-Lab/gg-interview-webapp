import { useState, useCallback } from 'react';

// Only supporting findLeetCodeSolutions since other functions have been migrated to Python
type ClaudeAction = 'findLeetCodeSolutions';

interface LeetCodeProblem {
  id: string;
  title: string;
  difficulty: string;
  url: string;
  category: string[];
  titleSlug: string;
  content: string;
  exampleTestcases?: string;
  [key: string]: any;
}

type ClaudeApiOptions = {
  message?: string;
  code?: string;
  language?: string;
  additionalConstraints?: string;
  problemData?: LeetCodeProblem;
  action: ClaudeAction;
};

export const useClaudeApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callClaudeApi = useCallback(async (options: ClaudeApiOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response from Claude');
      }

      const data = await response.json();
      return data.response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error calling Claude API:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Only supporting the LeetCode solutions function
  // Other functions have been migrated to the Python backend

  const findLeetCodeSolutions = useCallback(
    (problemData: LeetCodeProblem) => callClaudeApi({ action: 'findLeetCodeSolutions', problemData }),
    [callClaudeApi]
  );
  
  return {
    isLoading,
    error,
    callClaudeApi,
    findLeetCodeSolutions,
  };
};
