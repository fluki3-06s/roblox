'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';

type LenisInstance = InstanceType<typeof Lenis>;
const LenisContext = createContext<LenisInstance | null>(null);

export function useLenis() {
  const ctx = useContext(LenisContext);
  return ctx;
}

interface LenisProviderProps {
  children: React.ReactNode;
}

export function LenisProvider({ children }: LenisProviderProps) {
  const [lenis, setLenis] = useState<LenisInstance | null>(null);
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    const instance = new Lenis({
      autoRaf: true,
      duration: prefersReducedMotion ? 0 : 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
      infinite: false,
      syncTouch: false,
      smoothWheel: !prefersReducedMotion,
    });

    setLenis(instance);

    return () => {
      instance.destroy();
      setLenis(null);
    };
  }, []);

  // Reset scroll to top on route change (e.g. home -> get-key)
  useEffect(() => {
    if (pathname !== prevPathRef.current && lenis) {
      prevPathRef.current = pathname;
      lenis.scrollTo(0, { immediate: true });
    }
  }, [pathname, lenis]);

  return (
    <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>
  );
}
