// app/api/leetcode-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * This API route acts as a proxy to the external LeetCode API
 * It fetches data from the external API and returns it to the client
 * This avoids CORS issues when accessing the external API directly from the client
 */
export async function GET(request: NextRequest) {
  try {
    // The external API URL
    const apiUrl = 'http://localhost:3000/top-interview-150';
    
    console.log(`Proxy: Fetching data from ${apiUrl}`);
    
    // Fetch data from the external API
    const response = await fetch(apiUrl, {
      // Forwarding the request method
      method: 'GET',
      // Adding a small cache time to improve performance
      cache: 'force-cache',
      next: { revalidate: 300 }, // Revalidate every 5 minutes
    });
    
    if (!response.ok) {
      console.error(`Proxy: Error fetching data from API: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Failed to fetch from external API: ${response.status}` },
        { status: response.status }
      );
    }
    
    // Get the data from the response
    const rawData = await response.json();
    
    // Check if the data is in the expected format (with a questions array)
    if (rawData && rawData.questions && Array.isArray(rawData.questions)) {
      console.log(`Proxy: Successfully fetched ${rawData.questions.length} problems from the questions array`);
      // Return just the questions array to the client
      return NextResponse.json(rawData.questions);
    } else {
      console.log(`Proxy: Data doesn't contain a questions array, returning raw data`);
      // If not in expected format, return the raw data
      return NextResponse.json(rawData);
    }
  } catch (error) {
    console.error('Proxy: Exception while fetching data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch problems through proxy' },
      { status: 500 }
    );
  }
}
