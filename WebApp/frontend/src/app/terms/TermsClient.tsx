'use client';

import { motion } from 'framer-motion';
import { Header, Footer } from '@/components/layout';

export default function TermsClient() {
  return (
    <div className="min-h-screen relative">
      <Header />

      <main className="overflow-x-hidden pt-20 sm:pt-24">
        <section className="px-4 sm:px-6 pb-12 sm:pb-16">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-10"
            >
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-red-800 mb-2 sm:mb-3">
                Legal
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                Terms of Service
              </h1>
              <div className="mt-4 w-16 h-0.5 bg-gradient-to-r from-transparent via-red-800 to-transparent mx-auto" />
              <p className="mt-4 text-sm sm:text-base text-[var(--muted)] max-w-xl mx-auto">
                Please read our terms of service carefully before using Kyromac.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="space-y-6"
            >
              <section className="p-5 sm:p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white mb-3">1. Acceptance of Terms</h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  By accessing and using Kyromac, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.
                </p>
              </section>

              <section className="p-5 sm:p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white mb-3">2. Use License</h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed mb-3">
                  Permission is granted to temporarily use Kyromac for personal, non-commercial use only. This is the grant of a license, not a transfer of title.
                </p>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  You may not: modify or copy the materials, use the materials for any commercial purpose, transfer the materials to another person, or attempt to reverse engineer any software contained in the service.
                </p>
              </section>

              <section className="p-5 sm:p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white mb-3">3. Disclaimer</h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  The materials on Kyromac are provided on an &apos;as is&apos; basis. Kyromac makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                </p>
              </section>

              <section className="p-5 sm:p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white mb-3">4. Limitation of Liability</h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  In no event shall Kyromac or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the service.
                </p>
              </section>

              <section className="p-5 sm:p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white mb-3">5. User Conduct</h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  You agree not to use the service to: violate any applicable laws or regulations, infringe upon the rights of others, submit false or misleading information, distribute malware or other malicious code, or engage in any activity that could harm the service or its users.
                </p>
              </section>

              <section className="p-5 sm:p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white mb-3">6. Account Responsibilities</h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.
                </p>
              </section>

              <section className="p-5 sm:p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white mb-3">7. Changes to Terms</h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  We reserve the right to modify these terms at any time. Your continued use of the service after any changes indicates your acceptance of the new terms.
                </p>
              </section>

              <section className="p-5 sm:p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white mb-3">8. Contact Information</h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  If you have any questions about these Terms of Service, please contact us through our Discord server.
                </p>
              </section>
            </motion.div>

            <p className="mt-8 text-xs text-center text-[var(--muted)]">
              Last updated: March 2026
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
