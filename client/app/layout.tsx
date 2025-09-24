'use client';

import React from 'react';
import { Inter } from 'next/font/google';
import { Auth0Provider } from '@auth0/auth0-react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { getAuth0Config } from '../src/lib/auth0';
import { SalesforceProvider } from '../src/contexts/SalesforceContext';
import ErrorBoundary from '../src/components/ErrorBoundary';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth0Config = getAuth0Config();

  return (
    <html lang="en" className="h-full bg-gray-50">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicons/favicon-16x16.png" sizes="16x16" type="image/png" />
        <link rel="icon" href="/favicons/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/favicons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
      </head>
      <body className={`${inter.className} h-full`}>
        <Auth0Provider {...auth0Config}>
          <QueryClientProvider client={queryClient}>
            <SalesforceProvider>
              <ErrorBoundary>
                <div className="min-h-full">
                  {children}
                </div>
              </ErrorBoundary>
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                }}
              />
            </SalesforceProvider>
          </QueryClientProvider>
        </Auth0Provider>
      </body>
    </html>
  );
} 