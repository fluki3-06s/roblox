import { Metadata } from 'next';
import ShowcaseClient from './ShowcaseClient';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://kyromac.com');
const VIDEO_PATH = '/assets/video/video.mp4?v=20260426-1';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Showcase | Kyromac - See It In Action',
  description: 'Watch Kyromac in action. See how our premium FPS recoil profiles enhance gameplay with recoil control and aim stability.',
  keywords: [
    'Kyromac showcase',
    'Kyromac video',
    'FPS recoil demo',
    'FPS recoil showcase',
    'Kyromac gameplay video',
    'FPS recoil software demo',
    'FPS recoil demo video',
    'FPS scope tuning video',
    'FPS recoil control platform demo',
    'Kyromac features',
  ],
  authors: [{ name: 'Kyromac', url: siteUrl }],
  creator: 'Kyromac',
  publisher: 'Kyromac',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `${siteUrl}/showcase`,
    siteName: 'Kyromac',
    title: 'Showcase | Kyromac - See It In Action',
    description: 'Watch Kyromac in action. See how our premium FPS recoil profiles enhance your gameplay.',
    images: [
      {
        url: `${siteUrl}/assets/og/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Kyromac Showcase',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Showcase | Kyromac',
    description: 'Watch Kyromac in action. See how our premium FPS recoil profiles enhance your gameplay.',
    images: [`${siteUrl}/assets/og/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${siteUrl}/showcase`,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'VideoObject',
      name: 'Kyromac Showcase',
      description: 'Watch Kyromac in action. Premium FPS recoil profiles for recoil control, aim stability, and performance optimization.',
      thumbnailUrl: [`${siteUrl}/assets/og/og-image.png`],
      uploadDate: '2026-03-19T00:00:00+00:00',
      duration: 'PT3M00S',
      contentUrl: `${siteUrl}${VIDEO_PATH}`,
      embedUrl: 'https://www.youtube.com/embed/S4Chxpyq9XE',
    },
    {
      '@type': 'WebPage',
      name: 'Kyromac Showcase',
      url: `${siteUrl}/showcase`,
      description: 'See Kyromac in action with our showcase videos.',
    },
  ],
};

function JsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  );
}

export default function ShowcasePage() {
  return (
    <>
      <JsonLd />
      <ShowcaseClient />
    </>
  );
}
