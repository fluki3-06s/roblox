'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, Key } from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import { ClickSpark } from '@/components/ui/ClickSpark';

export default function NotFound() {
  return (
    <div className="min-h-screen relative">
      <Header />

      <main className="pt-24 pb-20 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center">
          <div className="section-gradient-accent max-w-xs mx-auto mb-8" aria-hidden />

          {/* 404 Text */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-7xl sm:text-9xl font-bold text-white mb-1 tracking-tighter leading-none">
              4<span className="text-red-800 text-signal-glitch" data-text="0">0</span>4
            </h1>
            <p className="text-lg sm:text-xl font-semibold text-white mb-2 tracking-wide">
              Page Not Found
            </p>
            <p className="text-[var(--muted)] text-sm sm:text-base max-w-sm mx-auto leading-relaxed">
              The page you&apos;re looking for doesn&apos;t exist or may have been moved.
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.5 }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <ClickSpark sparkColor="#dc2626" sparkCount={12} sparkRadius={25}>
              <Link
                href="/"
                className="btn-cta btn-cta-primary inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg text-white text-sm font-semibold transition-all duration-200 w-full sm:w-auto"
              >
                <Home className="w-4 h-4" />
                Back to Home
              </Link>
            </ClickSpark>
            <Link
              href="/key-system"
              className="btn-cta btn-cta-accent inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg text-white text-sm font-medium transition-colors w-full sm:w-auto"
            >
              <span className="corner-bl" aria-hidden />
              <span className="corner-br" aria-hidden />
              <Key className="w-4 h-4" />
              Top Up License
            </Link>
          </motion.div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
