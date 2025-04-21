// app/models/leetcode.ts
export interface LeetCodeProblem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  url?: string; // Made optional for local data
  category: string[];
  titleSlug?: string; // Made optional for local data
  content: string;
  description?: string; // Added for the new dataset
  exampleTestcases?: string;
  hints?: string[];
  constraints?: string[];
  followUp?: string;
  solution?: {
    id: string;
    canSeeDetail: boolean;
    paidOnly: boolean;
    hasVideoSolution: boolean;
    paidOnlyVideo: boolean;
  };
  hasSolution?: boolean;
  isSelected?: boolean;
}
