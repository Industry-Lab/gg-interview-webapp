'use client';

import { useEffect } from 'react';
import { initCodeHighlighter } from '../utils/codeHighlighter';

export default function ClientHighlighter() {
  useEffect(() => {
    // Initialize code highlighter on the client side
    initCodeHighlighter();
  }, []);
  
  // This component doesn't render anything visible
  return null;
}
