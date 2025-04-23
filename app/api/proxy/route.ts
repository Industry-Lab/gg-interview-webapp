// app/api/proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Simple proxy that forwards requests to the target API
export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const requestData = await request.json();
    
    // Log what we're proxying
    console.log('Proxying request to backend API');
    
    // Target backend URL
    const backendUrl = process.env.AI_AGENT_SERVICE_URL || 'https://gg-interview-ai-agent.up.railway.app';
    const targetUrl = `${backendUrl}/api/leetcode-solutions`;
    
    console.log(`Proxying to: ${targetUrl}`);

    // Forward the request to the target API
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    // Get the response data
    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    // Return the response with CORS headers
    return NextResponse.json(responseData, { 
      status: response.status,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Proxy error:', error);
    
    // Return error response with CORS headers
    return NextResponse.json(
      { 
        error: 'Proxy error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
}
