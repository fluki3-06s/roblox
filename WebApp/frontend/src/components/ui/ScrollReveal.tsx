'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

type Variant = 'fadeUp' | 'fadeIn' | 'fadeLeft' | 'fadeRight' | 'scale';

const variants = {
  fadeUp: {
    hidden: { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
  fadeLeft: {
    hidden: { opacity: 0, x: -24 },
    visible: { opacity: 1, x: 0 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
  fadeRight: {
    hidden: { opacity: 0, x: 24 },
    visible: { opacity: 1, x: 0 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.96 },
    visible: { opacity: 1, scale: 1 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  variant?: Variant;
  delay?: number;
  margin?: string;
  once?: boolean;
  fullHeight?: boolean;
}

export function ScrollReveal({
  children,
  className = '',
  variant = 'fadeUp',
  delay = 0,
  margin = '-60px',
  once = true,
  fullHeight = false,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: margin as `${number}px` });

  const v = variants[variant];

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: v.hidden,
        visible: {
          ...v.visible,
          transition: { ...v.transition, delay },
        },
      }}
      className={className}
      style={fullHeight ? { minHeight: '100%' } : undefined}
    >
      {children}
    </motion.div>
  );
}

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  margin?: string;
}

export function StaggerContainer({
  children,
  className = '',
  staggerDelay = 0.08,
  margin = '-40px',
}: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: margin as `${number}px` });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            staggerDirection: 1,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: React.ReactNode;
  variant?: Variant;
}

export function StaggerItem({ children, variant = 'fadeUp' }: StaggerItemProps) {
  const v = variants[variant];
  return (
    <motion.div
      variants={{
        hidden: v.hidden,
        visible: {
          ...v.visible,
          transition: v.transition,
        },
      }}
    >
      {children}
    </motion.div>
  );
}
