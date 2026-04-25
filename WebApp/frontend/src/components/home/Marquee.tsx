'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const COMPATIBILITY = [
  'Universal Compatibility',
  'Multi-Device Ready',
  'Cross-Version Support',
  'Stable Runtime',
  'Low-Latency Response',
  'Lightweight Performance',
  'Auto-Optimized Profiles',
  'Continuous Updates',
  'Secure Session Handling',
  'Plug-and-Play Setup',
  'Cloud Sync Ready',
  '24/7 Reliability',
];

export function Marquee() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const items = [...COMPATIBILITY, ...COMPATIBILITY];
  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.5 }}
      className="py-10 sm:py-14 overflow-hidden border-t border-b border-white/[0.08]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <p className="text-center text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.25em] text-white/50 mb-6 sm:mb-10">
          Universal compatibility
        </p>
        <div className="marquee-fade-edges w-full min-w-0 overflow-hidden">
          <div className="marquee-track inline-flex gap-12 sm:gap-16 items-center">
            {items.map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="flex-shrink-0 text-base sm:text-lg md:text-xl font-medium text-white/90 whitespace-nowrap"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
