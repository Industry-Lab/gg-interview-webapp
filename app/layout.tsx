// app/layout.tsx
import type { Metadata } from 'next';
import { Inter, Source_Code_Pro } from 'next/font/google';
import './globals.css';
import ClientHighlighterWrapper from './components/ClientHighlighterWrapper';
import { ProgrammingLanguageProvider } from './context/ProgrammingLanguageContext';

const inter = Inter({ subsets: ['latin'] });

// Load Source Code Pro font for code blocks
const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-source-code-pro',
});

export const metadata: Metadata = {
  title: 'GG Interview',
  description: 'AI-powered technical interview practice platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body suppressHydrationWarning className={`${inter.className} ${sourceCodePro.variable}`}>
        <ProgrammingLanguageProvider>
          <main className="min-h-screen flex flex-col">
            {children}
          </main>
          {/* ClientHighlighter will be dynamically imported on the client */}
          <div suppressHydrationWarning>
            <ClientHighlighterWrapper />
          </div>
        </ProgrammingLanguageProvider>
      </body>
    </html>
  );
}
