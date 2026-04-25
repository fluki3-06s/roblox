'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const STATS = [
  { value: 'STABLE', label: 'Response' },
  { value: 'SAFE', label: 'Status' },
  { value: '24/7', label: 'Uptime' },
];
const VIDEO_SRC = '/assets/video/video.mp4?v=20260426-1';

export function VideoShowcase() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-full sm:max-w-md lg:max-w-[510px] mx-auto"
    >
      <div className="video-showcase relative overflow-hidden video-clip-responsive">
        {/* Video - 4 angled corners (responsive) */}
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
          {/* Dark fade overlay - smooth gradual blend */}
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
          {/* Content overlay - title & stats on top of video */}
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
          {/* LIVE NOW badge - rounded pill */}
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
  );
}
