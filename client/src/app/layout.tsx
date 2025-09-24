import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/design-system.css';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ternus Borrower Portal',
  description: 'Modern loan application and management portal',
  keywords: ['Ternus', 'real estate', 'lending', 'borrower portal', 'loan application', 'investment'],
  authors: [{ name: 'Ternus' }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      {
        url: '/favicons/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        url: '/favicons/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/favicons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    shortcut: '/favicon.ico',
  },
  themeColor: '#0ea5e9',
  viewport: 'width=device-width, initial-scale=1',
  openGraph: {
    title: 'Ternus Borrower Portal',
    description: 'Modern loan application and management portal',
    type: 'website',
    images: [
      {
        url: '/assets/images/ternus-logo.png',
        width: 1200,
        height: 630,
        alt: 'Ternus Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ternus Borrower Portal',
    description: 'Modern loan application and management portal',
    images: ['/assets/images/ternus-logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
} 