'use client';

import { useEffect } from 'react';
// Using simplified styling for global error as UI components might not be accessible
// in this context

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '16px', backgroundColor: '#1a1a1a', color: '#ffffff' }}>
          <div style={{ maxWidth: '28rem', width: '100%', backgroundColor: '#2a2a2a', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', border: '1px solid #3a3a3a' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px' }}>Application Error</h2>
            <p style={{ fontSize: '0.875rem', color: '#a0a0a0', marginBottom: '24px' }}>
              {error.message || 'A critical error occurred. Please try reloading the application.'}
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                onClick={() => window.location.reload()}
                style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#ffffff', border: '1px solid #3a3a3a', borderRadius: '6px', cursor: 'pointer' }}
              >
                Refresh
              </button>
              <button 
                onClick={() => reset()}
                style={{ padding: '8px 16px', backgroundColor: '#0070f3', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
