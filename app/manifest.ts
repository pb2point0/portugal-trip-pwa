import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Private Portugal Trip',
    short_name: 'Portugal Trip',
    description: 'Authenticated trip companion.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f7f2',
    theme_color: '#073d57',
    orientation: 'portrait-primary',
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
