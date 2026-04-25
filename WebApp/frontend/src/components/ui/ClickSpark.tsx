'use client';

import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Spark {
  id: number;
  x: number;
  y: number;
  angle: number;
}

interface ClickSparkProps {
  sparkColor?: string;
  sparkCount?: number;
  sparkRadius?: number;
  duration?: number;
  children: React.ReactNode;
}

export function ClickSpark({
  sparkColor = '#dc2626',
  sparkCount = 12,
  sparkRadius = 25,
  duration = 0.4,
  children,
}: ClickSparkProps) {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const sparkIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newSparks: Spark[] = Array.from({ length: sparkCount }, (_, i) => ({
        id: sparkIdRef.current++,
        x,
        y,
        angle: (i / sparkCount) * Math.PI * 2,
      }));

      setSparks((prev) => [...prev, ...newSparks]);

      setTimeout(() => {
        setSparks((prev) => prev.filter((s) => !newSparks.find((n) => n.id === s.id)));
      }, duration * 1000);
    },
    [sparkCount, duration]
  );

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className="relative inline-block cursor-pointer [&>a]:pointer-events-auto"
      style={{ touchAction: 'manipulation' }}
    >
      {children}
      <AnimatePresence>
        {sparks.map((spark) => {
          const endX = Math.cos(spark.angle) * sparkRadius;
          const endY = Math.sin(spark.angle) * sparkRadius;
          return (
            <motion.div
              key={spark.id}
              className="pointer-events-none absolute"
              initial={{
                opacity: 1,
                x: spark.x,
                y: spark.y,
                scaleY: 1,
              }}
              animate={{
                opacity: 0,
                x: spark.x + endX,
                y: spark.y + endY,
                scaleY: 0.1,
              }}
              transition={{ duration, ease: 'easeOut' }}
              style={{
                left: 0,
                top: 0,
                width: 2,
                height: 8,
                transformOrigin: 'center bottom',
                translateX: '-50%',
                translateY: '-100%',
              }}
            >
              <div
                className="h-full w-full rounded-full"
                style={{
                  background: sparkColor,
                  boxShadow: `0 0 6px ${sparkColor}`,
                }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
