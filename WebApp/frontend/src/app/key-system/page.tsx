import { Metadata } from 'next';
import KeySystemClient from './KeySystemClient';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://kyromac.com');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Top Up License | Kyromac',
  description: 'Top up your Kyromac license for universal FPS recoil profiles via TrueWallet. Paid access only with one key per one device.',
  keywords: [
    'Kyromac top up',
    'Kyromac license key',
    'FPS no recoil license',
    'TrueWallet top up key',
    'one key one device',
    'Kyromac paid license',
  ],
  authors: [{ name: 'Kyromac', url: siteUrl }],
  creator: 'Kyromac',
  publisher: 'Kyromac',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `${siteUrl}/key-system`,
    siteName: 'Kyromac',
    title: 'Top Up License | Kyromac',
    description: 'Top up your Kyromac license via TrueWallet for universal FPS recoil access.',
    images: [
      {
        url: `${siteUrl}/assets/og/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Kyromac Top Up License',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Top Up License | Kyromac',
    description: 'Top up your Kyromac license via TrueWallet for universal FPS recoil access.',
    images: [`${siteUrl}/assets/og/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: `${siteUrl}/key-system`,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'Kyromac Top Up License',
      applicationCategory: 'UtilityApplication',
      operatingSystem: 'Web',
      url: `${siteUrl}/key-system`,
      description: 'Paid top-up page for Kyromac universal FPS recoil license keys via TrueWallet.',
      offers: {
        '@type': 'Offer',
        price: '99',
        priceCurrency: 'THB',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How do I top up and receive a key?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Complete payment via TrueWallet and send your payment slip to support. Your key will be delivered after verification.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can one key be used on multiple devices?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. One purchased key is bound to one device only.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is there a free key option?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. This is a paid license system with top-up only.',
          },
        },
      ],
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

export default function KeySystemPage() {
  return (
    <>
      <JsonLd />
      <KeySystemClient />
    </>
  );
}
