import { Metadata } from 'next';
import StoreClient from './StoreClient';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://kyromac.com');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Store | Kyromac - Premium FPS Recoil Software',
  description: 'Purchase premium FPS recoil profiles. Lifetime access, monthly plans, and VIP bundles available. Built for multi-game support.',
  keywords: [
    'Kyromac store',
    'Kyromac premium profiles',
    'FPS recoil store',
    'buy FPS recoil profiles',
    'Kyromac lifetime',
    'Kyromac monthly subscription',
    'FPS recoil software purchase',
    'FPS recoil control platform buy',
    'VIP FPS recoil profiles',
    'Kyromac bundle',
    'FPS recoil plans',
    'premium FPS recoil software',
  ],
  authors: [{ name: 'Kyromac', url: siteUrl }],
  creator: 'Kyromac',
  publisher: 'Kyromac',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `${siteUrl}/store`,
    siteName: 'Kyromac',
    title: 'Store | Kyromac - Premium FPS Recoil Software',
    description: 'Purchase premium FPS recoil profiles. Lifetime access, monthly plans, and VIP bundles available.',
    images: [
      {
        url: `${siteUrl}/assets/og/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Kyromac Store',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Store | Kyromac - Premium FPS Recoil Software',
    description: 'Purchase premium FPS recoil profiles. Lifetime access and VIP bundles available.',
    images: [`${siteUrl}/assets/og/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${siteUrl}/store`,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Store',
      name: 'Kyromac Store',
      url: `${siteUrl}/store`,
      description: 'Premium FPS recoil store. Purchase lifetime access, monthly plans, and VIP bundles.',
      image: `${siteUrl}/assets/logo/logo.png`,
    },
    {
      '@type': 'Product',
      name: 'Kyromac Lifetime',
      description: 'Full lifetime access to all profiles, updates & premium features.',
      offers: {
        '@type': 'Offer',
        price: '29.99',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    },
    {
      '@type': 'Product',
      name: 'Kyromac Monthly',
      description: '30-day access to all profiles with monthly updates.',
      offers: {
        '@type': 'Offer',
        price: '9.99',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    },
    {
      '@type': 'Product',
      name: 'VIP Bundle',
      description: 'Exclusive VIP profiles + priority support + early access.',
      offers: {
        '@type': 'Offer',
        price: '19.99',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
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

export default function StorePage() {
  return (
    <>
      <JsonLd />
      <StoreClient />
    </>
  );
}
