import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to get LeetCode solutions with code implementations in Python, JavaScript, and Java
 * This endpoint forwards requests to the new API using the updated payload format
 * POST /api/leetcode-solutions
 */
export async function POST(request: NextRequest) {
  try {
    // Log request received for debugging
    console.log('LeetCode solutions API request received - forwarding to Python backend');
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    const reqData = await request.json();
    const { programLanguage, ...problemData } = reqData;
    
    // Validate the programming language (default to Python if not specified or invalid)
    const validLanguages = ['python', 'js', 'java'];
    const language = validLanguages.includes(programLanguage) ? programLanguage : 'python';
    
    console.log('Problem data received:', problemData.id, problemData.title);
    console.log('Preferred language:', language);
    
    if (!problemData || !problemData.id || !problemData.title || !problemData.content) {
      return NextResponse.json({ 
        error: 'Invalid LeetCode problem data provided' 
      }, { status: 400 });
    }

    // Record the start time for performance tracking
    const startTime = performance.now();
    console.log(`Forwarding request to new API for ${language} solutions...`);
    
    // Pass through the original payload without reformatting
    // This ensures compatibility with the Python backend that's working with Postman
    console.log('Forwarding original payload to Python backend');
    
    // Create the request payload exactly as it's expected by the Python backend
    const requestPayload = {
      programLanguage: language,
      category: problemData.category || [],
      content: problemData.content || '',
      constraints: problemData.constraints || [],
      title: problemData.title || '',
      url: problemData.url || '',
      id: problemData.id || ''
    };
    
    console.log('Request payload:', JSON.stringify(requestPayload).substring(0, 100) + '...');
    
    // Call the Python backend API with the same payload format as Postman
    // Try the API endpoint with and without the trailing slash
    const pythonBackendUrl = `${process.env.AI_AGENT_SERVICE_URL}/api/leetcode-solutions`;
    console.log('Sending request to primary endpoint:', pythonBackendUrl);
    
    // Always use the real backend API
    console.log('Using real backend API for all problems, including Two Sum');
    console.log('Current request payload:', JSON.stringify(requestPayload, null, 2));
    
    let apiResponseData;
    try {
      console.log(`Sending request to ${pythonBackendUrl} with language: ${language}`);
      
      // Examine what endpoints are available by making a GET request first
      try {
        const checkEndpoint = await fetch(`${process.env.AI_AGENT_SERVICE_URL}/`, {
          method: 'GET',
          // No timeout - allow unlimited time
        });
        console.log('Root endpoint response:', checkEndpoint.status, checkEndpoint.statusText);
      } catch (e) {
        console.log('Root endpoint check failed:', e instanceof Error ? e.message : String(e));
      }
      
      // Try the API endpoint
      const apiResponse = await fetch(pythonBackendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestPayload),
        // No timeout - allow unlimited time for the real API to respond
      });
      
      if (!apiResponse.ok) {
        // If API returns error, throw error to be caught in catch block
        throw new Error(`API returned error: ${apiResponse.status} ${apiResponse.statusText}`);
      }
      
      apiResponseData = await apiResponse.json();
      console.log('Successfully received response from backend');
      console.log('Response data has solution_criteria:', !!apiResponseData.solution_criteria);
    } catch (error) {
      // No fallbacks - let the error propagate but with more details
      console.error('Error calling backend:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Full error details:', error);
      
      // Try an alternative endpoint as fallback
      try {
        console.log('Trying alternative endpoint without trailing slash');
        const alternativeEndpoint = `${process.env.AI_AGENT_SERVICE_URL}/api/leetcode-solutions`;
        const fallbackResponse = await fetch(alternativeEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestPayload),
          signal: AbortSignal.timeout(15000)
        });
        
        if (fallbackResponse.ok) {
          console.log('Alternative endpoint worked!');
          apiResponseData = await fallbackResponse.json();
        } else {
          throw new Error(`Alternative endpoint also failed: ${fallbackResponse.status}`);
        }
      } catch (fallbackError) {
        console.error('Both endpoints failed:', fallbackError);
        return NextResponse.json({
          status: 'error',
          message: 'Could not fetch solution from backend API',
          error: errorMessage,
          details: 'Both primary and fallback endpoints failed',
          requestPayload: requestPayload
        }, { status: 500 });
      }
    }
    // Extract solutions from the new API response format
    const solutions = apiResponseData.solutions || '';
    
    // Calculate elapsed time in seconds
    const elapsedTime = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`API request completed in ${elapsedTime} seconds`);
    
    // Process the solutions to ensure it's properly formatted as JSON but preserves markdown formatting
    const solutionsWithCode = Array.isArray(solutions) ? solutions : [solutions];
    
    // Extract the introduction from the API response if available
    const introduction = apiResponseData.introduction || '';
    
    // Extract solution criteria if available
    // Now criteria can be a complex object with id, description, and pattern
    const criteria = apiResponseData.solution_criteria?.criteria || [];
    
    // Generate approaches list and count
    const approaches = Array.isArray(solutionsWithCode) ? 
      solutionsWithCode.map((sol, index) => 
        `${sol.rank || (index + 1)}: ${sol.title || 'Approach ' + (index + 1)}`) : 
      [];
        
    // Return a clean response format with all requested fields
    return NextResponse.json({
      status: 'success',
      problem: {
        title: problemData.title,
        category: problemData.category || [],
        url: problemData.url || ''
      },
      introduction,
      solutions: solutionsWithCode,
      error: null,
      approach_count: approaches.length,
      approaches,
      language: language,
      // Pass the full criteria objects to preserve id, description, and pattern fields
      criteria,
      performance: {
        elapsedTimeSeconds: parseFloat(elapsedTime)
      }
    });
  } catch (error) {
    console.error('Error in LeetCode solutions API:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to process request', 
        details: error instanceof Error ? error.message : String(error) 
      }, 
      { status: 500 }
    );
  }
}

/**
 * Simple GET endpoint to verify the API is working
 */
// Helper function to get mock solutions for the Two Sum problem
function getMockTwoSumSolution(language: string, problemData: any) {
  const solutions = [
    {
      id: "brute-force",
      title: "Brute Force",
      time_complexity: "O(n²)",
      space_complexity: "O(1)",
      approach: "The simplest approach is to use two nested loops. The outer loop iterates through each element in the array, and the inner loop checks all other elements to find a pair that sums to the target.",
      code: language === 'python' ? 
        `def twoSum(nums: List[int], target: int) -> List[int]:\n    n = len(nums)\n    \n    # Check all possible pairs\n    for i in range(n):\n        for j in range(i + 1, n):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    \n    # No solution found (though the problem guarantees one exists)\n    return []` : 
        language === 'js' ? 
        `var twoSum = function(nums, target) {\n    const n = nums.length;\n    \n    // Check all possible pairs\n    for (let i = 0; i < n; i++) {\n        for (let j = i + 1; j < n; j++) {\n            if (nums[i] + nums[j] === target) {\n                return [i, j];\n            }\n        }\n    }\n    \n    // No solution found (though the problem guarantees one exists)\n    return [];\n};` : 
        `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        int n = nums.length;\n        \n        // Check all possible pairs\n        for (int i = 0; i < n; i++) {\n            for (int j = i + 1; j < n; j++) {\n                if (nums[i] + nums[j] == target) {\n                    return new int[] {i, j};\n                }\n            }\n        }\n        \n        // No solution found (though the problem guarantees one exists)\n        return new int[] {};\n    }\n}`
    },
    {
      id: "hash-map",
      title: "One-pass Hash Map",
      time_complexity: "O(n)",
      space_complexity: "O(n)",
      approach: "We can use a hash map to keep track of values we've seen so far. For each element, we check if the complement (target - current element) exists in the map. If it does, we've found our pair. If not, we add the current element to the map and continue.",
      code: language === 'python' ? 
        `def twoSum(nums: List[int], target: int) -> List[int]:\n    # Dictionary to store values we've seen and their indices\n    seen = {}\n    \n    for i, num in enumerate(nums):\n        # Calculate the complement\n        complement = target - num\n        \n        # Check if the complement exists in our map\n        if complement in seen:\n            return [seen[complement], i]\n        \n        # Store the current number and its index\n        seen[num] = i\n    \n    # No solution found (though the problem guarantees one exists)\n    return []` : 
        language === 'js' ? 
        `var twoSum = function(nums, target) {\n    // Map to store values we've seen and their indices\n    const seen = new Map();\n    \n    for (let i = 0; i < nums.length; i++) {\n        // Calculate the complement\n        const complement = target - nums[i];\n        \n        // Check if the complement exists in our map\n        if (seen.has(complement)) {\n            return [seen.get(complement), i];\n        }\n        \n        // Store the current number and its index\n        seen.set(nums[i], i);\n    }\n    \n    // No solution found (though the problem guarantees one exists)\n    return [];\n};` : 
        `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Map to store values we've seen and their indices\n        Map<Integer, Integer> seen = new HashMap<>();\n        \n        for (int i = 0; i < nums.length; i++) {\n            // Calculate the complement\n            int complement = target - nums[i];\n            \n            // Check if the complement exists in our map\n            if (seen.containsKey(complement)) {\n                return new int[] {seen.get(complement), i};\n            }\n            \n            // Store the current number and its index\n            seen.put(nums[i], i);\n        }\n        \n        // No solution found (though the problem guarantees one exists)\n        return new int[] {};\n    }\n}`
    }
  ];

  const criteria = [
    {
      id: "correctPairIdentification",
      description: "Correctly identifies the pair of numbers that sum to target",
      pattern: "nums\[i\] \+ nums\[j\] == target|nums\[i\] \+ nums\[j\] === target|complement.*target.*num"
    },
    {
      id: "returnIndices",
      description: "Returns the indices of the two numbers",
      pattern: "return \[.*\]|return new int\[\]|return \[seen"
    },
    {
      id: "efficientSolution",
      description: "Uses an efficient approach (hash map for O(n) solution)",
      pattern: "Map|HashMap|dict|seen|map\(\)"
    },
    {
      id: "handleAllTestCases",
      description: "Solution handles all test cases in the problem",
      pattern: "for.*i.*for.*j|enumerate|Map|HashMap|seen"
    }
  ];

  const introduction = "The Two Sum problem is a classic array manipulation challenge. The goal is to find two numbers in the array that add up to a specific target value. The key challenge is to do this efficiently, preferably in a single pass through the array. There are multiple approaches, from the straightforward brute force to more efficient hash-based solutions.";

  return {
    status: 'success',
    problem: {
      title: problemData.title,
      category: problemData.category || [],
      url: problemData.url || ''
    },
    introduction,
    solutions,
    error: null,
    approach_count: solutions.length,
    approaches: solutions.map((sol, idx) => `${idx + 1}: ${sol.title}`),
    language: language,
    criteria,
    performance: {
      elapsedTimeSeconds: 0.05 // Mock timing
    }
  };
}

export async function GET() {
  return NextResponse.json({ 
    status: 'success',
    message: 'LeetCode Solutions API is ready',
    details: {
      endpoint: '/api/leetcode-solutions',
      method: 'POST',
      contentType: 'application/json',
      parameters: {
        programLanguage: "Optional, one of ['python', 'js', 'java']. Defaults to 'python' if not specified."
      }
    },
    samplePayload: {
      programLanguage: "js",
      id: "149",
      title: "Max Points on a Line",
      difficulty: "Hard",
      url: "https://leetcode.com/problems/max-points-on-a-line",
      category: ["Array", "Hash Table", "Math", "Geometry"],
      titleSlug: "max-points-on-a-line",
      content: "<p>Given an array of <code>points</code> where <code>points[i] = [x<sub>i</sub>, y<sub>i</sub>]</code> represents a point on the <strong>X-Y</strong> plane, return <em>the maximum number of points that lie on the same straight line</em>.</p>",
      exampleTestcases: "[[1,1],[2,2],[3,3]]\n[[1,1],[3,2],[5,3],[4,1],[2,3],[1,4]]"
    },
    newApiPayload: {
      "problem": "Max Points on a Line\n\nGiven an array of points where points[i] = [xi, yi] represents a point on the X-Y plane, return the maximum number of points that lie on the same straight line.\n\nExamples:\n[[1,1],[2,2],[3,3]]\n[[1,1],[3,2],[5,3],[4,1],[2,3],[1,4]]",
      "language": "javascript"
    },
    expectedResponse: {
      status: "success",
      problem: {
        id: "149",
        title: "Max Points on a Line",
        difficulty: "Hard",
        category: ["Array", "Hash Table", "Math", "Geometry"]
      },
      solutions: "SOLUTION 1: Hash map of slopes...\n\n```javascript\nvar maxPoints = function(points) {\n    // JavaScript solution implementation\n}\n```\n\nSOLUTION 2: GCD approach...\n",
      performance: {
        elapsedTimeSeconds: 8.24
      }
    }
  });
}
