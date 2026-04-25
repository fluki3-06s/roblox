'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type DiscordProfile = {
  name: string;
  avatarUrl: string | null;
};

type AuthContextValue = {
  profile: DiscordProfile | null;
  points: number;
  authReady: boolean;
  loginWithDiscord: () => Promise<void>;
  logout: () => Promise<void>;
};

const PROFILE_CACHE_KEY = 'kyromac_profile_cache';

async function fetchWalletPoints() {
  const res = await fetch('/api/wallet/summary', { cache: 'no-store' });
  if (!res.ok) return 0;
  const data = (await res.json()) as { points?: number };
  return Number.isFinite(data.points) ? Number(data.points) : 0;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toProfile(user: { user_metadata?: Record<string, unknown> } | null): DiscordProfile | null {
  if (!user) return null;
  const md = user.user_metadata || {};
  const name =
    (md.full_name as string) ||
    (md.name as string) ||
    (md.user_name as string) ||
    (md.preferred_username as string) ||
    'Discord User';
  const avatarUrl = (md.avatar_url as string) || (md.picture as string) || null;
  return { name, avatarUrl };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<DiscordProfile | null>(null);
  const [points, setPoints] = useState(0);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      try {
        if (typeof window !== 'undefined') {
          const cached = window.localStorage.getItem(PROFILE_CACHE_KEY);
          if (cached && mounted) {
            try {
              setProfile(JSON.parse(cached) as DiscordProfile);
            } catch {
              // ignore bad cache
            }
          }
        }

        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        if (mounted) {
          const nextProfile = toProfile(data.session?.user as { user_metadata?: Record<string, unknown> } | null);
          setProfile(nextProfile);
          if (nextProfile) {
            const walletPoints = await fetchWalletPoints();
            if (mounted) setPoints(walletPoints);
          } else {
            setPoints(0);
          }
          if (typeof window !== 'undefined') {
            if (nextProfile) {
              window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(nextProfile));
            } else {
              window.localStorage.removeItem(PROFILE_CACHE_KEY);
            }
          }
        }

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
          void (async () => {
            if (!mounted) return;
            const nextProfile = toProfile(session?.user as { user_metadata?: Record<string, unknown> } | null);
            setProfile(nextProfile);
            if (nextProfile) {
              const walletPoints = await fetchWalletPoints();
              if (mounted) setPoints(walletPoints);
            } else {
              setPoints(0);
            }
            if (typeof window !== 'undefined') {
              if (nextProfile) {
                window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(nextProfile));
              } else {
                window.localStorage.removeItem(PROFILE_CACHE_KEY);
              }
            }
          })();
        });
        unsubscribe = () => authListener.subscription.unsubscribe();
      } catch {
        // no-op
      } finally {
        if (mounted) setAuthReady(true);
      }
    };

    init();

    if (typeof window !== 'undefined') {
      const onWalletUpdated = async () => {
        const walletPoints = await fetchWalletPoints();
        if (mounted) setPoints(walletPoints);
      };
      window.addEventListener('wallet-updated', onWalletUpdated);
      return () => {
        mounted = false;
        if (unsubscribe) unsubscribe();
        window.removeEventListener('wallet-updated', onWalletUpdated);
      };
    }

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const loginWithDiscord = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/key-system`;
      await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo },
      });
    } catch {
      window.location.href = process.env.NEXT_PUBLIC_DISCORD_OAUTH_URL || '/api/auth/discord';
    }
  };

  const logout = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(PROFILE_CACHE_KEY);
      }
      setProfile(null);
      setPoints(0);
    } catch {
      // no-op
    }
  };

  const value = useMemo(
    () => ({
      profile,
      points,
      authReady,
      loginWithDiscord,
      logout,
    }),
    [profile, points, authReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
