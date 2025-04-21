import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GG Interview - AI-Powered Technical Interview Practice',
  description: 'Practice your technical interviews with our AI-powered interview simulator. Get real-time feedback from Gemini AI.',
};

export default function LandingPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {children}
    </div>
  );
}
