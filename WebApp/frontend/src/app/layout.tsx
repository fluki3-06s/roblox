import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { Michroma } from 'next/font/google';
import { LenisProvider } from '@/components/providers/LenisProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import 'lenis/dist/lenis.css';
import './globals.css';

const michroma = Michroma({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-kyromac',
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://kyromac.com');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Kyromac',
    template: '%s | Kyromac',
  },
  description:
    'Kyromac — premium recoil control software for FPS games with paid license access, stable profile updates, and low-latency performance.',
  keywords: [
    'Kyromac',
    'Kyromac FPS recoil software',
    'Kyromac Recoil Control',
    'Kyromac recoil software',
    'Kyromac paid license',
    'FPS recoil control platform',
    'multi-game recoil profiles',
    'FPS spray control software',
    'FPS sensitivity presets',
    'FPS scope tuning',
    'FPS weapon tuning',
    'low-latency recoil app',
    'PUBG: Battlegrounds recoil profile',
    'PUBG: Battlegrounds support',
  ],
  formatDetection: {
    telephone: false,
    email: false,
  },
  authors: [{ name: 'Kyromac', url: siteUrl }],
  creator: 'Kyromac',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Kyromac',
    title: 'Kyromac',
    description:
      'Premium recoil control software for FPS games with paid license plans, stable updates, and low-latency performance.',
    images: [
      {
        url: '/assets/logo/logo.png',
        width: 512,
        height: 512,
        alt: 'Kyromac - FPS Recoil Control Software',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kyromac',
    description: 'Premium recoil control software for FPS games with paid license plans and consistent profile updates.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  applicationName: 'Kyromac',
  referrer: 'origin-when-cross-origin',
  manifest: '/manifest.json',
  icons: {
    icon: '/assets/logo/logo.png',
    apple: '/assets/logo/logo.png',
  },
  alternates: {
    canonical: siteUrl,
  },
  other: {
    'theme-color': '#050505',
    'mobile-web-app-capable': 'yes',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'Kyromac',
      url: siteUrl,
      logo: { '@type': 'ImageObject', url: `${siteUrl}/assets/logo/logo.png` },
      description: 'Premium recoil control software for FPS games with paid license plans for weapon and scope profiles.',
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'Kyromac',
      description: 'FPS recoil control software with paid access, sensitivity tuning, and stable spray control.',
      publisher: { '@id': `${siteUrl}/#organization` },
      inLanguage: 'en-US',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Kyromac',
      applicationCategory: 'GameApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '9.99', priceCurrency: 'USD' },
      description: 'Premium recoil control software for FPS games with paid access and a universal profile engine.',
      author: { '@id': `${siteUrl}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${GeistSans.className} ${michroma.variable} antialiased bg-base`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
        {/* Global gradient layers - visible ambient light */}
        <div className="bg-glow-left fixed inset-0 z-0 pointer-events-none" aria-hidden />
        <div className="bg-glow-right fixed inset-0 z-0 pointer-events-none" aria-hidden />
        <div className="bg-glow-top fixed inset-0 z-0 pointer-events-none" aria-hidden />
        <AuthProvider>
          <LenisProvider>
            <div className="relative z-10">{children}</div>
          </LenisProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
