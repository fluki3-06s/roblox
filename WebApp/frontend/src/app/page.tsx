import { Metadata } from 'next';
import { HomePage } from '@/components/home';
import { FAQ_ITEMS } from '@/lib/faq-data';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://kyromac.com');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Kyromac - Premium FPS Recoil Control Software',
  description: 'Kyromac is paid recoil control software for competitive FPS games. Top up your balance, purchase a license, and use universal recoil presets.',
  keywords: [
    'Kyromac',
    'Kyromac FPS recoil control platform',
    'Kyromac controller',
    'Kyromac paid license',
    'FPS recoil control platform',
    'multi-game recoil software',
    'FPS spray control tool',
    'FPS recoil presets',
    'FPS sensitivity presets',
    'FPS scope tuning',
    'FPS weapon tuning',
    'low-latency recoil software',
    'PUBG: Battlegrounds recoil support',
  ],
  authors: [{ name: 'Kyromac', url: siteUrl }],
  creator: 'Kyromac',
  publisher: 'Kyromac',
  formatDetection: {
    telephone: false,
    email: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Kyromac',
    title: 'Kyromac - Premium FPS Recoil Control Software',
    description: 'Purchase premium recoil profiles with top-up license access. Built for FPS games with universal tuning.',
    images: [
      {
        url: `${siteUrl}/assets/og/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Kyromac - FPS Recoil Control Software',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kyromac - Premium FPS Recoil Control Software',
    description: 'Purchase premium recoil profiles with top-up license access and stable spray control for FPS games.',
    images: [`${siteUrl}/assets/og/og-image.png`],
    creator: '@kyromac',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
    languages: {
      'en-US': siteUrl,
    },
  },
  category: 'gaming',
  classification: 'Gaming/Software',
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${siteUrl}/#organization`,
  name: 'Kyromac',
  url: siteUrl,
  logo: {
    '@type': 'ImageObject',
    url: `${siteUrl}/assets/logo/logo.png`,
    width: 512,
    height: 512,
  },
  description: 'Premium recoil control software for FPS games with paid license access for recoil control, sensitivity tuning, and performance profiles.',
  sameAs: [
    'https://discord.gg/kyromac',
    'https://www.youtube.com/@kyromac',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: 'English',
    url: `${siteUrl}/terms`,
  },
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${siteUrl}/#website`,
  url: siteUrl,
  name: 'Kyromac',
  description: 'Premium recoil control software for FPS games with paid license access for recoil control, sensitivity tuning, and performance profiles.',
  publisher: {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${siteUrl}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
  inLanguage: 'en-US',
};

const softwareAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Kyromac',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '9.99',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  description: 'Premium recoil control software for FPS games with paid license access for maps, attachments, and weapon classes.',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '1250',
    bestRating: '5',
    worstRating: '1',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    organizationSchema,
    websiteSchema,
    softwareAppSchema,
    faqSchema,
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

export default function Home() {
  return (
    <>
      <JsonLd />
      <HomePage />
    </>
  );
}
