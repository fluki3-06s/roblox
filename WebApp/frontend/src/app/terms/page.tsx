import { Metadata } from 'next';
import TermsClient from './TermsClient';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://kyromac.com');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Terms of Service | Kyromac',
  description: 'Read the Terms of Service for Kyromac. Understand the usage terms, license restrictions, and user conduct guidelines for our FPS recoil control software platform.',
  keywords: [
    'Kyromac terms of service',
    'Kyromac terms',
    'FPS recoil control platform terms',
    'Kyromac user agreement',
    'Kyromac license terms',
    'recoil control terms of service',
    'FPS recoil software terms',
  ],
  authors: [{ name: 'Kyromac', url: siteUrl }],
  creator: 'Kyromac',
  publisher: 'Kyromac',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `${siteUrl}/terms`,
    siteName: 'Kyromac',
    title: 'Terms of Service | Kyromac',
    description: 'Read the Terms of Service for Kyromac. Understand the usage terms and license restrictions.',
    images: [
      {
        url: `${siteUrl}/assets/og/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Kyromac Terms of Service',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms of Service | Kyromac',
    description: 'Read the Terms of Service for Kyromac.',
    images: [`${siteUrl}/assets/og/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${siteUrl}/terms`,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'LegalService',
      name: 'Kyromac Terms of Service',
      url: `${siteUrl}/terms`,
      description: 'Terms of Service for Kyromac FPS recoil control software platform.',
      provider: {
        '@type': 'Organization',
        name: 'Kyromac',
        url: siteUrl,
      },
    },
    {
      '@type': 'WebPage',
      name: 'Terms of Service',
      url: `${siteUrl}/terms`,
      description: 'Terms of Service for using Kyromac.',
      inLanguage: 'en-US',
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

export default function TermsPage() {
  return (
    <>
      <JsonLd />
      <TermsClient />
    </>
  );
}
