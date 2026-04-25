'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ClickSpark } from '@/components/ui/ClickSpark';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Header, Footer } from '@/components/layout';
import { Marquee } from './Marquee';
import { MapSupport } from './MapSupport';
import { PerformanceSection } from './PerformanceSection';
import { FeatureCards } from './FeatureCards';
import { VideoShowcase } from './VideoShowcase';
import { FAQ } from './FAQ';

export function HomePage() {
  return (
    <div className="min-h-screen relative">
      <Header />

      <main className="overflow-x-hidden">
        {/* Hero - Landing head */}
        <section className="relative pt-24 sm:pt-28 pb-6 sm:pb-8 px-4 sm:px-6 overflow-hidden flex items-center" aria-label="Hero">
          <div className="relative w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-10 sm:gap-12 lg:gap-16">
            <div className="flex-1 text-center lg:text-left order-1">
              <motion.h1
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight"
              >
                Advanced
                <br />
                recoil control for
                <br />
                <span className="text-red-800 text-signal-glitch" data-text="KYROMAC">KYROMAC</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.6, ease: 'easeOut' }}
                className="mt-4 sm:mt-6 text-sm sm:text-base lg:text-lg text-[var(--muted)] max-w-xl mx-auto lg:mx-0 leading-relaxed"
              >
                Professional recoil control software for competitive FPS games, built with universal tuning and paid license access.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start"
              >
                <ClickSpark sparkColor="#dc2626" sparkCount={12} sparkRadius={25}>
                  <Link
                    href="/key-system"
                    className="btn-cta btn-cta-primary inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg text-white text-sm font-semibold transition-all duration-200 w-full sm:w-auto"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                    </svg>
                    <span>Top Up License</span>
                  </Link>
                </ClickSpark>
                <a
                  href={process.env.NEXT_PUBLIC_DISCORD_URL || 'https://discord.gg/kyromac'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-cta btn-cta-accent inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg text-white text-sm font-medium transition-colors w-full sm:w-auto"
                >
                  <span className="corner-bl" aria-hidden />
                  <span className="corner-br" aria-hidden />
                  Join Our Discord
                </a>
              </motion.div>
            </div>
            <div className="flex-shrink-0 order-2">
              <VideoShowcase />
            </div>
          </div>
        </section>

        <FeatureCards />
        <PerformanceSection />

        <section id="maps" className="py-14 sm:py-20 px-4 sm:px-6" aria-label="Supported FPS games">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal variant="fadeUp" delay={0.1}>
              <MapSupport />
            </ScrollReveal>
          </div>
        </section>

        <Marquee />

        <FAQ />

        <section className="py-16 sm:py-20 px-4 sm:px-6 relative overflow-hidden" aria-label="Top up your license">
          <div className="max-w-2xl mx-auto text-center">
            <ScrollReveal variant="scale" delay={0.1}>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Ready to play?</h2>
              <p className="text-[var(--muted)] mb-6 sm:mb-8 text-sm sm:text-base">
                Top up your balance and activate your Kyromac license to start.
              </p>
              <ClickSpark sparkColor="#dc2626" sparkCount={12} sparkRadius={25}>
                <Link
                  href="/key-system"
                  className="btn-cta btn-cta-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-all duration-200"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                  <span>Top Up License</span>
                </Link>
              </ClickSpark>
            </ScrollReveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
