import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';

// One type system for both the honeymoon app and the sitter guide.
const display = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://portugal.patrikbandak.com'),
  title: 'Our Portugal Honeymoon',
  description: 'Our shared Portugal honeymoon companion.',
  applicationName: 'Portugal Honeymoon',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url:'/favicon.svg', type:'image/svg+xml' }, { url:'/icon-192.png', sizes:'192x192', type:'image/png' }],
    apple: [{ url:'/apple-touch-icon.png', sizes:'180x180', type:'image/png' }],
  },
  appleWebApp: { capable: true, title: 'Honeymoon', statusBarStyle: 'black-translucent' },
  robots: { index: false, follow: false, nocache: true },
  openGraph: { title: 'Our Portugal Honeymoon', description: 'A shared trip companion for invited travelers.', type: 'website' },
  twitter: { card: 'summary', title: 'Our Portugal Honeymoon', description: 'A shared trip companion for invited travelers.' },
};

export const viewport: Viewport = {
  width:'device-width',
  initialScale:1,
  maximumScale:1,
  userScalable:false,
  viewportFit:'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
