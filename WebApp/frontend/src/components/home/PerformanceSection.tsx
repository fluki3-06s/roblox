'use client';

import { useRef, useMemo } from 'react';
import { motion, useInView } from 'framer-motion';

const CHART_DATA = [42, 58, 51, 72, 68, 88, 95];

// ---------- Line/Area Chart ----------
function PerfLineChart({ isInView }: { isInView: boolean }) {
  const padding = { top: 12, right: 8, bottom: 12, left: 8 };
  const w = 320;
  const h = 120;
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const min = Math.min(...CHART_DATA);
  const max = Math.max(...CHART_DATA);
  const range = max - min || 1;
  const stepX = chartW / (CHART_DATA.length - 1);

  const { smoothPath, areaPath } = useMemo(() => {
    const pts = CHART_DATA.map((val, i) => {
      const x = padding.left + i * stepX;
      const y = padding.top + chartH - ((val - min) / range) * chartH;
      return [x, y] as [number, number];
    });
    if (pts.length < 2) return { smoothPath: '', areaPath: '' };
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const cx = (x0 + x1) / 2;
      d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }
    const area = `${d} L ${pts[pts.length - 1][0]} ${h - padding.bottom} L ${pts[0][0]} ${h - padding.bottom} Z`;
    return { smoothPath: d, areaPath: area };
  }, []);

  return (
    <div className="perf-chart-card relative max-w-md mx-auto lg:mx-0 overflow-hidden">
      <div className="p-5 sm:p-6 pb-0">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-sm font-bold text-white tracking-tight">KYROMAC</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-bold text-red-800 tabular-nums">240</span>
              <span className="text-sm text-[var(--muted)]">FPS</span>
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-[var(--muted-dim)]">FPS PROFILE ENGINE</span>
        </div>
      </div>
      <div className="p-5 sm:p-6 pt-6">
        <p className="text-[10px] uppercase tracking-widest text-[var(--muted-dim)] mb-4">
          Performance over time
        </p>
        <div className="relative h-32 sm:h-36">
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="perf-area-fill" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="rgb(153 27 27)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="rgb(153 27 27)" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="perf-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgb(185 28 28)" />
                <stop offset="100%" stopColor="rgb(239 68 68)" />
              </linearGradient>
              <filter id="perf-glow">
                <feGaussianBlur stdDeviation="1" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <motion.path
              d={areaPath}
              fill="url(#perf-area-fill)"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.path
              d={smoothPath}
              fill="none"
              stroke="url(#perf-line)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#perf-glow)"
              initial={{ pathLength: 0 }}
              animate={isInView ? { pathLength: 1 } : {}}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ---------- Main Section ----------
export function PerformanceSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="performance" className="py-20 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
      <div
        ref={ref}
        className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-14 sm:gap-16 lg:gap-20"
      >
        {/* Left - Line Chart */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full lg:flex-[0.45] order-2 lg:order-1"
        >
          <PerfLineChart isInView={isInView} />
        </motion.div>

        {/* Right - Text */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="w-full lg:flex-[0.55] order-1 lg:order-2 text-center lg:text-left"
        >
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-red-800 mb-4">
            Performance
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1]">
            Insane
            <br />
            <span className="text-red-800">Performance</span>
          </h2>
          <p className="text-[var(--muted)] text-base sm:text-lg leading-relaxed mt-6 max-w-xl mx-auto lg:mx-0">
            Kyromac is designed as a universal recoil engine for FPS games with low CPU usage and stable input timing.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
