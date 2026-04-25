'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Header, Footer } from '@/components/layout';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const FALLBACK_OAUTH_LINK = process.env.NEXT_PUBLIC_DISCORD_OAUTH_URL || '/api/auth/discord';

export default function KeySystemClient() {
  const [angpaoLink, setAngpaoLink] = useState('');
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);
  const [isDiscordAuthed, setIsDiscordAuthed] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isValidVoucherLink = useMemo(() => {
    return /^https?:\/\/(gift\.truemoney\.com|tmn\.to)\//i.test(angpaoLink.trim());
  }, [angpaoLink]);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const initAuth = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();

        if (!mounted) return;
        setIsDiscordAuthed(Boolean(data.session));

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return;
          setIsDiscordAuthed(Boolean(session));
        });
        unsubscribe = () => authListener.subscription.unsubscribe();
      } catch (error) {
        if (!mounted) return;
        setAuthError(error instanceof Error ? error.message : 'Failed to initialize auth');
        setIsDiscordAuthed(false);
      } finally {
        if (mounted) setAuthReady(true);
      }
    };

    void initAuth();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleDiscordLogin = async () => {
    try {
      setRedeemMessage(null);
      setAuthError(null);
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/key-system`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo },
      });

      if (error) {
        setAuthError(error.message);
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Discord login failed');
      window.location.href = FALLBACK_OAUTH_LINK;
    }
  };

  const handleRedeem = async () => {
    if (!authReady || !isDiscordAuthed) {
      setRedeemMessage('Please sign in with Discord before redeeming top up.');
      return;
    }

    if (!isValidVoucherLink) {
      setRedeemMessage('Invalid Angpao link. Please paste a valid TrueMoney Wallet voucher URL.');
      return;
    }

    try {
      const res = await fetch('/api/wallet/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherUrl: angpaoLink.trim() }),
      });
      const data = (await res.json()) as { error?: string; addedPoints?: number; walletPoints?: number };
      if (!res.ok) {
        setRedeemMessage(data.error || 'Top up failed. Please try again.');
        return;
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('wallet-updated'));
      }
      setRedeemMessage(
        `Top up successful. +${data.addedPoints ?? 0} points added. Current balance: ${data.walletPoints ?? 0} points.`
      );
      setAngpaoLink('');
    } catch {
      setRedeemMessage('Top up failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen relative">
      <Header />

      <main className="overflow-x-hidden">
        <section className="relative pt-20 sm:pt-28 pb-12 sm:pb-16 px-4 sm:px-6" aria-label="Top up">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto"
            >
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] text-red-800 mb-2 sm:mb-3">
                Kyromac Wallet
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                Top up your <span className="text-red-800">Kyromac license</span>
              </h1>
              <div className="mt-4 w-16 h-0.5 bg-gradient-to-r from-transparent via-red-800 to-transparent mx-auto" />
              <p className="mt-4 sm:mt-5 text-sm sm:text-base text-[var(--muted)] leading-relaxed max-w-2xl mx-auto">
                Redeem a TrueMoney Wallet Angpao voucher to instantly add balance for license purchases.
                Each license key activates one device.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-5 sm:p-6"
            >
              <div className="mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white">Top Up via Angpao Voucher</h2>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  value={angpaoLink}
                  onChange={(e) => setAngpaoLink(e.target.value)}
                  placeholder="Paste your TrueMoney Angpao voucher URL"
                  disabled={!isDiscordAuthed}
                  className="flex-1 rounded-lg border border-white/[0.1] bg-black/30 px-4 py-3 text-sm text-white placeholder:text-[var(--muted-dim)] focus:border-red-800/60 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={handleRedeem}
                  disabled={!isDiscordAuthed}
                  className="btn-cta btn-cta-primary px-6 py-3 rounded-lg text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Redeem
                </button>
              </div>

              {redeemMessage && (
                <p className="mt-3 text-sm text-[var(--muted)]">{redeemMessage}</p>
              )}

              {!isDiscordAuthed && (
                <div className="mt-4 rounded-lg border border-[#5865F2]/30 bg-[#5865F2]/10 p-4">
                  <p className="text-sm text-[#c7ceff]">
                    Sign in with Discord to unlock voucher redeem.
                  </p>
                </div>
              )}
              {authError && (
                <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-sm text-red-300">{authError}</p>
                </div>
              )}

            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-5 sm:p-6"
            >
              <h3 className="text-base sm:text-lg font-bold text-white mb-4">How It Works</h3>
              <ol className="space-y-3 text-sm text-[var(--muted)]">
                <li>1. Sign in with your Discord account</li>
                <li>2. Copy your Angpao voucher URL from TrueMoney Wallet</li>
                <li>3. Paste and redeem - your wallet balance updates instantly</li>
              </ol>

              <h3 className="text-base sm:text-lg font-bold text-white mt-6 mb-3">Notes</h3>
              <ul className="space-y-2 text-sm text-[var(--muted)]">
                <li>• Vouchers must be unused and tied to the phone number configured for this service.</li>
                <li>• View your keys and redeem history in My Keys.</li>
                <li>• One key can be activated on one device only.</li>
              </ul>

              <p className="mt-4 text-xs text-[var(--muted-dim)]">
                Delivered license keys are non-refundable.
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
