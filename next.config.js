/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output in standalone mode for better Amplify compatibility
  output: 'standalone',
  
  // Disable image optimization during build to prevent memory issues
  images: {
    unoptimized: process.env.NODE_ENV === 'production',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Increase memory limit for builds
  experimental: {
    serverMemoryLimit: 4096, // 4GB memory limit
  },
  
  // Handle environment variables
  env: {
    // Make the backend API URL available to the browser
    NEXT_PUBLIC_AI_AGENT_SERVICE_URL: process.env.AI_AGENT_SERVICE_URL || 'https://gg-interview-ai-agent.up.railway.app',
  },
  
  // Add async headers for CORS in production environments
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
}

module.exports = nextConfig
