'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const MAPS = [
  { id: 'pubg-battlegrounds', name: 'PUBG: Battlegrounds', image: '/assets/images/games/8253dec.webp' },
] as const;

export function MapSupport() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % MAPS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const game = MAPS[index];

  return (
    <div className="w-full">
      <div className="text-center mb-6 sm:mb-8">
        <span className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] text-white/90">SUPPORTED FPS GAMES</span>
      </div>
      <div className="relative w-full max-w-6xl mx-auto aspect-[5/2] sm:aspect-[3/1] rounded-xl sm:rounded-2xl overflow-hidden glass-dark min-h-[140px] sm:min-h-[180px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={game.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <Image
              src={game.image}
              alt={game.name}
              fill
              className="object-cover blur-sm"
              sizes="(max-width: 1024px) 100vw, 1152px"
              priority
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/50"
              aria-hidden
            />
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <h3 className="text-lg sm:text-xl font-bold text-white drop-shadow-lg">{game.name}</h3>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/15 text-[10px] font-medium text-white/90 tracking-wide">
                  <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Secure
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        {/* Dots indicator */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {MAPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === index ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to ${MAPS[i].name}`}
            />
          ))}
        </div>
      </div>
      {/* Thumbnail strip */}
      <div className="flex justify-center gap-3 sm:gap-4 mt-5 sm:mt-6 overflow-x-auto pb-2 px-2 map-scroll">
        {MAPS.map((map, i) => (
          <button
            key={map.id}
            onClick={() => setIndex(i)}
            className={`flex-shrink-0 w-16 h-12 sm:w-20 sm:h-14 rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all duration-300 ${
              i === index ? 'border-white scale-105' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Image
              src={map.image}
              alt={map.name}
              width={80}
              height={56}
              className="object-cover w-full h-full"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
