// app/services/leetcodeService.ts
import { LeetCodeProblem } from '../models/leetcode';
import { mockProblems } from '../data/mockLeetcodeProblems';
import { leetcodeTop150 } from '../data/leetcodeTop150';

export class LeetcodeService {
  // Use our internal proxy API to avoid CORS issues
  private static readonly API_URL = '/api/leetcode-proxy';
  // Endpoint for top 150 interview problems from the interview-problem-service
  private static readonly TOP_150_URL = 'http://localhost:3000/top-interview-150';

  static async getProblems(): Promise<LeetCodeProblem[]> {
    try {
      // First attempt to fetch problems from the dedicated interview-problem-service
      console.log('Fetching from interview-problem-service API:', this.TOP_150_URL);
      
      try {
        const response = await fetch(this.TOP_150_URL, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        console.log('API Response status:', response.status, response.statusText);
        
        if (response.ok) {
          let data;
          const contentType = response.headers.get('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
            console.log('API returned valid JSON data');
          } else {
            // Try to parse as JSON anyway as a fallback
            const text = await response.text();
            try {
              data = JSON.parse(text);
              console.log('API returned text that was parsed as JSON');
            } catch (e) {
              console.error('API returned non-JSON content:', text.substring(0, 100));
              throw new Error('Invalid response format');
            }
          }
          
          console.log('Data type:', typeof data);
          console.log('Is array?', Array.isArray(data));
          console.log('Data length:', Array.isArray(data) ? data.length : 'not an array');
          
          // Process the problems data ensuring it fits our model
          if (Array.isArray(data) && data.length > 0) {
            console.log('Sample problem:', data[0].id, data[0].title);
            
            // Use a direct mapping approach with minimal transformations
            const processedData = data.map((p: any): LeetCodeProblem => {
              // Extract categories, ensuring they're in array format
              const categoryField = p.category || p.categories || p.topics || p.tags || [];
              const categoryArray = Array.isArray(categoryField) 
                ? categoryField 
                : typeof categoryField === 'string' 
                  ? [categoryField] 
                  : ['Algorithm'];
              
              // Map each problem to our LeetCodeProblem interface
              return {
                id: String(p.id || p.frontendQuestionId || p.questionId || Math.random().toString().slice(2)),
                title: p.title || p.name || '',
                difficulty: p.difficulty || 'Medium',  
                content: p.content || p.description || '<p>No description available</p>',
                category: categoryArray,
                url: p.url || '',
                titleSlug: p.titleSlug || '',
                hasSolution: true,
                description: p.description || '',
                exampleTestcases: p.exampleTestcases || '',
                constraints: p.constraints || [],
              };
            });
            
            if (processedData.length > 0) {
              console.log(`Success! Fetched ${processedData.length} problems from API. First problem: ${processedData[0].title}`);
              return processedData;
            }
          } else if (typeof data === 'object' && data !== null) {
            // Handle potential nested structure
            const possibleArrays = Object.values(data).filter(val => Array.isArray(val));
            if (possibleArrays.length > 0 && possibleArrays[0].length > 0) {
              const problemsArray = possibleArrays[0] as any[];
              console.log(`Found nested array with ${problemsArray.length} problems`);
              
              const processedData = problemsArray.map((p: any): LeetCodeProblem => ({
                id: String(p.id || p.frontendQuestionId || p.questionId || Math.random().toString().slice(2)),
                title: p.title || p.name || '',
                difficulty: p.difficulty || 'Medium',
                content: p.content || p.description || '<p>No description available</p>',
                category: Array.isArray(p.category) ? p.category : [p.category || 'Algorithm'],
                url: p.url || '',
                titleSlug: p.titleSlug || '',
                hasSolution: true,
                description: p.description || '',
                exampleTestcases: p.exampleTestcases || '',
                constraints: p.constraints || [],
              }));
              
              console.log(`Processed ${processedData.length} problems from nested data`);
              return processedData;
            }
          }
          
          console.warn('Could not process API data into valid problems');
        } else {
          console.warn('API response not OK:', response.status, response.statusText);
        }
      } catch (err) {
        console.error('Error fetching from interview-problem-service:', err);
      }
      
      // Fallback to combined local datasets if API fails
      if (leetcodeTop150 && leetcodeTop150.length) {
        // Create a map of problem IDs to avoid duplicates when combining datasets
        const problemMap = new Map<string, LeetCodeProblem>();
        
        // Add our high-quality comprehensive dataset first
        leetcodeTop150.forEach(problem => {
          problemMap.set(problem.id, problem);
        });
        
        // Add mock problems that aren't already in the dataset
        mockProblems.forEach(problem => {
          const problemId = String(problem.id);
          if (!problemMap.has(problemId)) {
            // Convert string categories to arrays to match our interface
            const categoryArray = typeof problem.category === 'string' 
              ? [problem.category] 
              : Array.isArray(problem.category) ? problem.category : ['Array'];
              
            const convertedProblem: LeetCodeProblem = {
              ...problem,
              id: problemId,
              category: categoryArray,
              content: problem.content || 'No description available',
              difficulty: problem.difficulty || 'Medium',
            };
            problemMap.set(problemId, convertedProblem);
          }
        });
        
        const combinedProblems = Array.from(problemMap.values());
        console.log(`Falling back to combined local datasets: ${combinedProblems.length} total problems`);
        return combinedProblems;
      }
      
      // If neither API nor local data works, try the original API
      console.log('Local data unavailable, fetching problems from API:', this.API_URL);
      const response = await fetch(this.API_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Raw data from API: ${data.length} problems found`);
      
      // Process the data into the correct format
      let problems: LeetCodeProblem[] = [];
      
      try {
        if (Array.isArray(data)) {
          console.log(`Processing ${data.length} problems from API`);
          problems = data.map((p: any) => ({
            ...p,
            id: p.id || p.questionId || p.frontendQuestionId || String(Math.random()),
            title: p.title || p.name || p.titleSlug || '',
            difficulty: typeof p.difficulty === 'string' 
              ? p.difficulty 
              : p.difficulty === 1 ? 'Easy' : p.difficulty === 3 ? 'Hard' : 'Medium',
            content: p.content || p.description || '<p>No description available</p>',
            exampleTestcases: p.exampleTestcases || '',
            constraints: p.constraints || [],
            category: p.category || p.categories || p.topics || ['Array'],
            url: p.url || `https://leetcode.com/problems/${p.titleSlug || p.title?.toLowerCase().replace(/\s+/g, '-')}/`,
            titleSlug: p.titleSlug || p.title?.toLowerCase().replace(/\s+/g, '-') || '',
            hasSolution: true
          }));
          
          console.log(`Successfully processed ${problems.length} problems from API`);
        }
      } catch (err) {
        console.error('Error processing API data:', err);
      }
      
      // If we get problems from the API, return them
      if (problems.length > 0) {
        return problems;
      }
      
      // Fallback to mock data as a last resort
      console.warn('Could not retrieve problems, using mock data');
      return mockProblems;
    } catch (error) {
      console.error('Error fetching LeetCode problems:', error);
      console.info('Falling back to mock data');
      return mockProblems;
    }
  }
}
