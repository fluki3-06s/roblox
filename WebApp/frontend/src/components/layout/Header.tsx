'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useActiveLink } from '@/hooks/useActiveLink';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  Home,
  Key,
  ShoppingBag,
  Eye,
  FileText,
  Menu,
  ChevronDown,
  User,
  Wallet,
  History,
  Shield,
  Settings,
  LoaderCircle,
  X,
} from 'lucide-react';

const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const isActive = useActiveLink();
  const { profile, points, authReady, loginWithDiscord } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-profile-menu-root="true"]')) {
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!profile) {
        setIsAdmin(false);
        return;
      }
      try {
        const res = await fetch('/api/admin/me', { cache: 'no-store' });
        if (!res.ok) {
          setIsAdmin(false);
          return;
        }
        const data = (await res.json()) as { isAdmin?: boolean };
        setIsAdmin(Boolean(data.isAdmin));
      } catch {
        setIsAdmin(false);
      }
    };
    void checkAdmin();
  }, [profile]);

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/key-system', label: 'Topup', icon: Key },
    { href: '/store', label: 'Store', icon: ShoppingBag },
    { href: '/showcase', label: 'Showcase', icon: Eye },
    { href: '/terms', label: 'Terms', icon: FileText },
  ];

  return (
    <header className="header-glass fixed top-0 left-0 right-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Image
                src="/assets/logo/logo.png"
                alt="Kyromac"
                width={32}
                height={32}
                className="object-contain transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-red-800/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <span className="brand-wordmark text-[0.8rem] text-white group-hover:text-red-800 transition-colors duration-300">
              KYROMAC
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    active
                      ? 'text-white'
                      : 'text-[var(--muted)] hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-red-800' : ''}`} strokeWidth={1.75} />
                  {link.label}
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-0.5 left-3 right-3 h-[2px] bg-red-700 rounded-full"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-4">
            {profile ? (
              <div
                data-profile-menu-root="true"
                className="group relative"
                title={profile.name}
              >
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 text-white"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/20 bg-white/10 flex items-center justify-center">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold text-white">
                        {profile.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:flex items-center gap-1">
                    <span className="text-sm font-semibold max-w-[120px] truncate">{profile.name}</span>
                    <ChevronDown className={`w-4 h-4 text-white/70 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 top-11 w-56 rounded-lg overflow-hidden border border-white/10 bg-black/90 backdrop-blur-xl shadow-[0_18px_42px_-24px_rgba(0,0,0,0.95)]">
                    <div className="px-3 py-2.5 border-b border-white/10 bg-white/[0.02]">
                      <div className="flex items-center justify-between gap-2 text-white">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="w-3.5 h-3.5 text-white/80 shrink-0" />
                          <span className="font-semibold text-sm truncate">{profile.name}</span>
                        </div>
                        <span className="text-[11px] text-red-300 whitespace-nowrap">{formatNumber(points)} Point</span>
                      </div>
                    </div>

                    <div className="px-2 py-2">
                      <a href="/my-topup" className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-white/90 hover:bg-white/5 transition-colors">
                        <Wallet className="w-3.5 h-3.5 text-white/70" />
                        <span className="text-sm">My Topup</span>
                      </a>
                      <a href="/topup-history" className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-white/90 hover:bg-white/5 transition-colors">
                        <History className="w-3.5 h-3.5 text-white/70" />
                        <span className="text-sm">Topup History</span>
                      </a>
                      <a href="/license-history" className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-white/90 hover:bg-white/5 transition-colors">
                        <Shield className="w-3.5 h-3.5 text-white/70" />
                        <span className="text-sm">License History</span>
                      </a>
                      {isAdmin && (
                        <a href="/admin/dashboard" className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-white/90 hover:bg-white/5 transition-colors">
                          <Settings className="w-3.5 h-3.5 text-white/70" />
                          <span className="text-sm">Admin Dashboard</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              authReady ? (
                <button
                  type="button"
                  onClick={loginWithDiscord}
                  className="group relative flex items-center gap-2 px-3 py-2 rounded-lg bg-[#5865F2]/10 border border-[#5865F2]/20 hover:bg-[#5865F2]/20 hover:border-[#5865F2]/40 transition-all duration-200"
                  aria-label="Login with Discord"
                  title="Login with Discord"
                >
                  <div className="relative">
                    <svg className="w-5 h-5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                    </svg>
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-[#5865F2]">Login</span>
                </button>
              ) : (
                <div className="h-[38px] px-3 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
                  <LoaderCircle className="w-4 h-4 text-white/65 animate-spin" strokeWidth={1.8} />
                </div>
              )
            )}

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? (
                <X className="w-6 h-6 text-white" strokeWidth={1.75} />
              ) : (
                <Menu className="w-6 h-6 text-white" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="lg:hidden overflow-hidden border-t border-white/[0.06] bg-black/40 backdrop-blur-xl rounded-b-xl"
            >
              <div className="py-4 flex flex-col gap-1">
                {navLinks.map((link) => {
                  const active = isActive(link.href);
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        active
                          ? 'bg-white/[0.06] text-white'
                          : 'text-[var(--muted)] hover:text-white hover:bg-white/[0.03]'
                      }`}
                    >
                      <Icon className="w-5 h-5" strokeWidth={1.75} />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
