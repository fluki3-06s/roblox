'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Header, Footer } from '@/components/layout';

const STATS = [
  { value: 'STABLE', label: 'Response' },
  { value: 'SAFE', label: 'Status' },
  { value: '24/7', label: 'Uptime' },
];
const VIDEO_SRC = '/assets/video/video.mp4?v=20260426-1';

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: 'Fast Execution',
    description: 'Recoil profiles apply instantly with low-latency response in live FPS matches.'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
    title: 'Secure & Private',
    description: 'Your data is encrypted and protected with advanced security measures.'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.726l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m6.894 5.785l-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864l-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495" />
      </svg>
    ),
    title: 'Regular Updates',
    description: 'Frequent updates keep recoil tables, attachments, and scope multipliers aligned with current patches.'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: 'Active Community',
    description: 'Join thousands of players in our Discord community for support.'
  },
];

export default function ShowcaseClient() {
  const videoRef = useRef(null);
  const isVideoInView = useInView(videoRef, { once: true, margin: '-80px' });

  return (
    <div className="min-h-screen relative">
      <Header />

      <main className="overflow-x-hidden pt-20 sm:pt-24">
        <section className="px-4 sm:px-6 pb-12 sm:pb-16">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-8"
            >
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-red-800 mb-2 sm:mb-3">
                See It In Action
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                Showcase
              </h1>
              <div className="mt-4 w-16 h-0.5 bg-gradient-to-r from-transparent via-red-800 to-transparent mx-auto" />
              <p className="mt-4 text-sm sm:text-base text-[var(--muted)] max-w-xl mx-auto">
                Watch how Kyromac improves recoil control and spray consistency across FPS gameplay.
              </p>
            </motion.div>

            <motion.div
              ref={videoRef}
              initial={{ opacity: 0, y: 40 }}
              animate={isVideoInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <div className="video-showcase relative overflow-hidden video-clip-responsive">
                <div className="relative aspect-video overflow-hidden video-clip-responsive">
                  <video
                    src={VIDEO_SRC}
                    playsInline
                    muted
                    loop
                    autoPlay
                    className="w-full h-full object-cover"
                    poster="/images/phantomforce.jpg"
                  />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `linear-gradient(
                        to top,
                        rgba(0,0,0,0.97) 0%,
                        rgba(0,0,0,0.92) 12%,
                        rgba(0,0,0,0.8) 25%,
                        rgba(0,0,0,0.55) 40%,
                        rgba(0,0,0,0.3) 55%,
                        rgba(0,0,0,0.12) 70%,
                        rgba(0,0,0,0.03) 85%,
                        transparent 100%
                      )`,
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6 pointer-events-none">
                    <h3 className="text-sm font-bold tracking-[0.2em] text-white/95 mb-3">
                      KYROMAC SHOWCASE
                    </h3>
                    <div className="flex flex-wrap gap-5 sm:gap-6">
                      {STATS.map((s) => (
                        <div key={s.label} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-800 flex-shrink-0" />
                          <span className="text-sm text-white/90">
                            <span className="font-semibold text-white">{s.value}</span>{' '}
                            <span className="text-white/70">{s.label}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div
                    className="absolute top-5 right-5 z-10 flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm text-white"
                    style={{
                      background: 'rgba(153, 27, 27, 0.9)',
                      border: '1px solid rgba(153, 27, 27, 0.5)',
                      boxShadow: '0 4px 12px -2px rgba(153, 27, 27, 0.5)',
                    }}
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse flex-shrink-0" />
                    <span className="text-[10px] font-bold tracking-[0.2em]">LIVE NOW</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="px-4 sm:px-6 pb-16 sm:pb-20">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-8 sm:mb-10"
            >
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
                Why Kyromac?
              </h2>
              <p className="mt-3 text-sm text-[var(--muted)] max-w-lg mx-auto">
                Built for players who want consistent spray control, stable tracking, and fast setup.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {FEATURES.map((feature, idx) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05, duration: 0.5 }}
                  className="p-5 sm:p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm hover:border-red-800/30 hover:bg-white/[0.04] transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-red-800/20 flex items-center justify-center text-red-800 mb-4 group-hover:bg-red-800/30 transition-colors">
                    {feature.icon}
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
