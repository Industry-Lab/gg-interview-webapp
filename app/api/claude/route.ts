import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, problemData } = body;

    // Now only supporting findLeetCodeSolutions
    if (action !== 'findLeetCodeSolutions') {
      return NextResponse.json({ 
        error: 'Only findLeetCodeSolutions action is supported. Other Claude features have been migrated to the Python backend.' 
      }, { status: 400 });
    }

    let response = '';

    // Handle LeetCode solutions
    if (action === 'findLeetCodeSolutions') {
      if (!problemData) {
        return NextResponse.json({ error: 'Problem data is required for LeetCode solutions' }, { status: 400 });
      }
      
      try {
        const pythonApiUrl = 'http://localhost:8000/leetcode/solution';
        const apiResponse = await fetch(pythonApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...problemData,
            programLanguage: problemData.language || 'python'
          })
        });
        
        if (!apiResponse.ok) {
          throw new Error(`Python API returned error: ${apiResponse.status} ${apiResponse.statusText}`);
        }
        
        const pythonApiData = await apiResponse.json();
        response = pythonApiData.solutions || '';
        console.log('Successfully received solutions from Python backend');
      } catch (error) {
        console.error('Error calling Python API:', error);
        return NextResponse.json({ 
          error: 'Failed to retrieve solutions from the Python backend.' 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in Claude API route:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Claude API is running' });
}
