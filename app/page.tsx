"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the landing page
    router.replace('/landing-page');
  }, [router]);
  
  // Return an empty div or loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <p>Loading...</p>
    </div>
  );
}