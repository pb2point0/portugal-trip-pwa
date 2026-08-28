import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Sitter Guide — Chloe & Bengt',
  description: 'House and dog sitting guide.',
  applicationName: 'Sitter Guide',
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function SitterLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
