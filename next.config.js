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
    // Add any environment variables you want to expose to the browser here
  },
}

module.exports = nextConfig
