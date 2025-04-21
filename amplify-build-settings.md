# AWS Amplify Build Configuration Guide

## Environment Variables Setup

For secure deployment, the API keys should be configured as environment variables in the Amplify Console rather than being included in the code repository:

1. Go to the AWS Amplify Console
2. Select your app
3. Go to "Environment variables"
4. Add the following environment variables:
   - `NEXT_PUBLIC_GEMINI_API_KEY`
   - `NEXT_PUBLIC_ANTHROPIC_API_KEY`

This ensures your API keys remain secure and aren't exposed in your repository.

## Build Settings

The application has been configured with the following optimizations:

1. **Package.json**: Simplified build commands for Amplify compatibility
2. **amplify.yml**: Added preBuild phase for proper dependency installation
3. **next.config.js**: Configured for standalone output mode and optimized for Amplify deployment

## Monitoring Builds

After deployment, monitor the build logs in the Amplify Console. If you encounter memory issues during build, you may need to:

1. Contact AWS Support to increase the compute capacity for your builds
2. Further optimize image handling in the app
3. Consider breaking down the build process into smaller steps

## Serverless Function Considerations

For API routes and server components, be aware of AWS Lambda's cold start times and timeout limits. Monitor performance and adjust as needed.
