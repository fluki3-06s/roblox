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
                  By purchasing, accessing, or using any digital product on Kyromac, you acknowledge that you have read, understood, and agreed to all terms in this page. If you do not agree, do not purchase or use the service.
                </p>
              </section>

              <section className="p-5 sm:p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white mb-3">2. Digital Product License</h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed mb-3">
                  All products are digital and license-based. Your purchase grants a limited, revocable, non-transferable right to use the product for personal use only. No ownership of software or intellectual property is transferred.
                </p>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  You may not resell, share, leak, redistribute, or reverse engineer any part of our products. Violations may result in immediate suspension or termination without compensation.
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

              <section className="p-5 sm:p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white mb-3">9. Ban Risk Acknowledgement</h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  You acknowledge that using third-party game tools may violate game publisher rules and may result in sanctions, including temporary or permanent bans. By purchasing and using our products, you accept all related risks yourself.
                </p>
              </section>

              <section className="p-5 sm:p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white mb-3">10. No Refund and Final Sale</h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  All sales are final. Due to the digital and instantly deliverable nature of our products, we do not provide refunds, returns, exchanges, or chargeback acceptance after successful delivery.
                </p>
              </section>

              <section className="p-5 sm:p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white mb-3">11. Limitation of Responsibility</h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  We are not responsible for any account bans, account restrictions, loss of in-game progress, loss of virtual items, downtime, or any direct/indirect damages resulting from product use, misuse, or inability to use.
                </p>
              </section>

              <section className="p-5 sm:p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white mb-3">12. Exceptional Support Cases</h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  Support or replacement may be considered only when our system fails to deliver a purchased product and the failure can be verified by our records. Decisions in such cases are solely at our discretion.
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
