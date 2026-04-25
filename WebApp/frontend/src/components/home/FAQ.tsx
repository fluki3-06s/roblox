'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';

import { FAQ_ITEMS } from '@/lib/faq-data';

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
  index,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  const itemRef = useRef(null);
  const isInView = useInView(itemRef, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={itemRef}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="faq-accordion-panel"
    >
      <div className="faq-accordion-item">
      <button
        type="button"
        onClick={onToggle}
        className="faq-accordion-trigger w-full flex items-center justify-between gap-4 text-left py-4 sm:py-5 px-5 sm:px-6"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-white text-sm sm:text-base pr-4">{question}</span>
        <span
          className={`flex-shrink-0 w-5 h-5 flex items-center justify-center text-red-800 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 sm:px-6 pb-4 sm:pb-5 pt-0">
              <p className="text-[var(--muted)] text-sm sm:text-base leading-relaxed">{answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="profiles" className="faq-accordion-section py-16 sm:py-20 px-4 sm:px-6 relative overflow-hidden">
      <div ref={ref} className="relative max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12 sm:mb-16"
        >
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] text-red-800 mb-2">
            Need help?
          </p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
            Frequently Asked <span className="text-red-800">Questions</span>
          </h2>
          <p className="text-[var(--muted)] text-sm sm:text-base mt-3 max-w-xl mx-auto">
            Everything you need to know about licenses, topups, updates, and support for Kyromac.
          </p>
        </motion.div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem
              key={item.question}
              question={item.question}
              answer={item.answer}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
