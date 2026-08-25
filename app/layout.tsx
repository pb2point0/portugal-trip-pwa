import type { Metadata, Viewport } from 'next';
import './globals.css';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
