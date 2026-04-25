'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';

export function Footer() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.footer
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.5 }}
      className="footer-glass"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/assets/logo/logo.png"
              alt="Kyromac"
              width={24}
              height={24}
              className="object-contain"
            />
            <span className="brand-wordmark text-[0.72rem] text-white">KYROMAC</span>
          </Link>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-[var(--muted)]">
            <Link href="/store" className="hover:text-white transition-colors">Store</Link>
            <Link href="/key-system" className="hover:text-white transition-colors">Topup</Link>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-white/[0.06] text-center text-sm text-[var(--muted-dim)]">
          <p>Premium FPS recoil profiles, crafted for multi-game support.</p>
          <p className="mt-1">© 2026 Kyromac - Made by Destroy</p>
        </div>
      </div>
    </motion.footer>
  );
}
