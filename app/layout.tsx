import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://portugal.patrikbandak.com'),
  title: 'Private Portugal Trip',
  description: 'Authenticated trip companion.',
  applicationName: 'Portugal Trip',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url:'/favicon.svg', type:'image/svg+xml' }, { url:'/icon-192.png', sizes:'192x192', type:'image/png' }],
    apple: [{ url:'/apple-touch-icon.png', sizes:'180x180', type:'image/png' }],
  },
  appleWebApp: { capable: true, title: 'Portugal Trip', statusBarStyle: 'black-translucent' },
  robots: { index: false, follow: false, nocache: true },
  openGraph: { title: 'Private Portugal Trip', description: 'Authenticated access only.', type: 'website' },
  twitter: { card: 'summary', title: 'Private Portugal Trip', description: 'Authenticated access only.' },
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
