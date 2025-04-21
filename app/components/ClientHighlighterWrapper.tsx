'use client';

import dynamic from 'next/dynamic';

// Dynamically import the client component with no SSR
const ClientHighlighter = dynamic(() => import('./ClientHighlighter'), {
  ssr: false,
});

export default function ClientHighlighterWrapper() {
  return <ClientHighlighter />;
}
