import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware will run for all API routes
export function middleware(request: NextRequest) {
  // Only run this middleware for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Get the response from the endpoint
    const response = NextResponse.next();

    // Add the CORS headers to the response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return response;
  }
}

// Configure the middleware to match all API routes
export const config = {
  matcher: '/api/:path*',
};
