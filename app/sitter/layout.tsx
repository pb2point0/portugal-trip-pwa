import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Sitter Guide',
  description: 'House and dog sitting guide for Chloe and Bengt.',
  applicationName: 'Sitter Guide',
  manifest: '/sitter.webmanifest',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, title: 'Sitter Guide', statusBarStyle: 'black-translucent' },
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#f8faf6',
};

export default function SitterLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
