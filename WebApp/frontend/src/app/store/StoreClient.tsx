'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header, Footer } from '@/components/layout';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  badge?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const formatTHB = (amount: number) =>
  new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const PRODUCTS: Product[] = [
  {
    id: '6',
    code: 'key_lifetime',
    name: 'Key Lifetime',
    description: 'Lifetime license access with long-term profile support.',
    price: 1499,
    image: '/assets/store/lifetime.png',
    category: 'KEY',
    badge: 'Most Popular',
  },
  {
    id: '5',
    code: 'key_30d',
    name: 'Key 30Day',
    description: '30-day license access with all active profile updates.',
    price: 499,
    image: '/assets/store/starter.png',
    category: 'KEY',
    badge: 'Popular',
  },
  {
    id: '1',
    code: 'key_1d',
    name: 'Key 1Day',
    description: '1-day license access for core recoil profiles.',
    price: 39,
    image: '/assets/store/lifetime.png',
    category: 'KEY',
  },
  {
    id: '2',
    code: 'key_3d',
    name: 'Key 3Day',
    description: '3-day license access for recoil profile usage.',
    price: 99,
    image: '/assets/store/monthly.png',
    category: 'KEY',
  },
  {
    id: '3',
    code: 'key_7d',
    name: 'Key 7Day',
    description: '7-day license access with full recoil profile features.',
    price: 199,
    image: '/assets/store/weekly.png',
    category: 'KEY',
  },
  {
    id: '4',
    code: 'key_14d',
    name: 'Key 14Day',
    description: '14-day license access for extended gameplay sessions.',
    price: 299,
    image: '/assets/store/vip.png',
    category: 'KEY',
  },
  {
    id: '7',
    code: 'reset_hwid',
    name: 'ResetHWID',
    description: 'Reset hardware binding for your current license key.',
    price: 149,
    image: '/assets/store/custom.png',
    category: 'RESETHWID',
  },
];

const CATEGORIES = ['ALL', 'KEY', 'RESETHWID'];

const badgePriority: Record<string, number> = {
  'Most Popular': 0,
  Popular: 1,
};

function sortByBadgePriority(items: Product[]) {
  return [...items].sort((a, b) => {
    const aRank = a.badge ? (badgePriority[a.badge] ?? 99) : 99;
    const bRank = b.badge ? (badgePriority[b.badge] ?? 99) : 99;
    if (aRank !== bRank) return aRank - bRank;
    return Number(a.id) - Number(b.id);
  });
}

export default function StoreClient() {
  const router = useRouter();
  const { profile, points } = useAuth();
  const [products, setProducts] = useState<Product[]>(sortByBadgePriority(PRODUCTS));
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [checkoutProcessing, setCheckoutProcessing] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch('/api/store/products', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as {
          products?: Array<{
            code: string;
            name: string;
            category: 'KEY' | 'RESETHWID';
            duration_days: number | null;
            price_points: number;
          }>;
        };
        if (!Array.isArray(data.products) || data.products.length === 0) return;
        const badgeByCode: Record<string, string | undefined> = {
          key_lifetime: 'Most Popular',
          key_30d: 'Popular',
        };
        const mapped = data.products.map((item) => ({
            id: item.code,
            code: item.code,
            name: item.name,
            description:
              item.code === 'reset_hwid'
                ? 'Reset hardware binding for your current license key.'
                : item.duration_days == null
                  ? 'Lifetime license access with long-term profile support.'
                  : `${item.duration_days}-day license access for recoil profile usage.`,
            price: item.price_points,
            image:
              item.code === 'reset_hwid'
                ? '/assets/store/custom.png'
                : '/assets/store/lifetime.png',
            category: item.category,
            badge: badgeByCode[item.code],
          }));
        setProducts(sortByBadgePriority(mapped));
      } catch {
        // keep fallback list
      }
    };
    void loadProducts();
  }, []);

  const filteredProducts = selectedCategory === 'ALL'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const index = prev.findIndex((item) => item.product.id === product.id);
      if (index === -1) {
        return [...prev, { product, quantity: 1 }];
      }

      return prev.map((item, i) =>
        i === index ? { ...item, quantity: item.quantity + 1 } : item
      );
    });
    setShowToast(`${product.name} added to cart`);
    setTimeout(() => setShowToast(null), 2000);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const canPayWithPoints = profile && points >= cartTotal && cartTotal > 0;

  const handlePointCheckout = () => {
    if (!profile) {
      setShowToast('Please login with Discord before paying with points');
      setTimeout(() => setShowToast(null), 2500);
      return;
    }
    if (points < cartTotal) {
      setShowToast('Not enough points for this purchase');
      setTimeout(() => setShowToast(null), 2500);
      return;
    }

    setCheckoutProcessing(true);
    void (async () => {
      try {
        const res = await fetch('/api/store/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productCodes: cart.flatMap((item) =>
              Array.from({ length: item.quantity }, () => item.product.code)
            ),
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setShowToast(data.error || 'Checkout failed');
          setCheckoutProcessing(false);
          setTimeout(() => setShowToast(null), 2500);
          return;
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('wallet-updated'));
        }
        setCart([]);
        setShowCheckout(false);
        setCheckoutProcessing(false);
        setShowToast('Payment complete. License is being processed.');
        setTimeout(() => setShowToast(null), 2500);
        router.push('/license-history');
      } catch {
        setCheckoutProcessing(false);
        setShowToast('Checkout failed');
        setTimeout(() => setShowToast(null), 2500);
      }
    })();
  };

  return (
    <div className="min-h-screen relative">
      <Header />

      <main className="overflow-x-hidden pt-20 sm:pt-24">
        <section className="px-4 sm:px-6 pb-12 sm:pb-16">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-10"
            >
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-red-800 mb-2 sm:mb-3">
                Recoil Packages
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                Store
              </h1>
              <div className="mt-4 w-16 h-0.5 bg-gradient-to-r from-transparent via-red-800 to-transparent mx-auto" />
              <p className="mt-4 text-sm sm:text-base text-[var(--muted)] max-w-xl mx-auto">
                Choose your key duration and unlock premium FPS recoil packages.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap gap-2 sm:gap-3 justify-center mb-10"
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-red-800 text-white shadow-[0_0_20px_-4px_rgba(153,27,27,0.5)]'
                      : 'bg-white/5 text-[var(--muted)] hover:bg-white/10 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
              {filteredProducts.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative rounded-xl border border-white/[0.08] overflow-hidden bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-sm hover:border-red-800/40 transition-all duration-300 hover:shadow-[0_8px_40px_-12px_rgba(153,27,27,0.25)]"
                >
                  {product.badge && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className="px-2.5 py-1 rounded-md bg-gradient-to-r from-red-800 to-red-700 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-red-800/30">
                        {product.badge}
                      </span>
                    </div>
                  )}
                  
                  <div className="aspect-[4/3] relative bg-gradient-to-br from-white/[0.02] to-transparent flex items-center justify-center overflow-hidden">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center border border-white/[0.08] shadow-inner">
                      <svg className="w-12 h-12 sm:w-16 sm:h-16 text-red-800/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-60" />
                  </div>

                  <div className="p-4 sm:p-5">
                    <p className="text-[10px] uppercase tracking-wider text-red-800 mb-1.5">
                      {product.category}
                    </p>
                    <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                      {product.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--muted)] mb-4 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl sm:text-2xl font-bold text-white">
                        {formatTHB(product.price)}
                      </span>
                      <button
                        onClick={() => addToCart(product)}
                        className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-red-800 hover:border-red-800 transition-all duration-200"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <AnimatePresence>
        {cart.length > 0 && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setShowCart(true)}
            className="fixed bottom-6 right-6 z-40 px-3 sm:px-5 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-red-800 to-red-700 text-white shadow-[0_8px_32px_-8px_rgba(153,27,27,0.6)] flex items-center gap-2 sm:gap-3 hover:from-red-700 hover:to-red-600 transition-all"
          >
            <div className="relative">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-red-800 text-[10px] font-bold flex items-center justify-center">
                {cartItemCount}
              </span>
            </div>
            <span className="hidden sm:block font-semibold">View Cart</span>
            <span className="hidden sm:block text-white/60">•</span>
            <span className="font-bold">{formatTHB(cartTotal)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end"
            onClick={() => setShowCart(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full sm:max-w-md bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-xl border-l border-white/[0.08] h-full flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
                <h2 className="text-lg font-bold text-white">Your Cart</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <svg className="w-5 h-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.length === 0 ? (
                  <p className="text-center text-[var(--muted)] py-8">Your cart is empty</p>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm"
                    >
                      <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <svg className="w-8 h-8 text-red-800/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">{item.product.name}</h3>
                        <p className="text-xs text-[var(--muted)] truncate">
                          {item.product.category} • Quantity x{item.quantity}
                        </p>
                        <p className="text-sm font-bold text-white mt-1">
                          {formatTHB(item.product.price * item.quantity)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1.5 rounded-md hover:bg-white/5 text-[var(--muted)] hover:text-red-400 transition-colors self-start"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-5 border-t border-white/[0.08] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--muted)]">Subtotal</span>
                    <span className="text-lg font-bold text-white">{formatTHB(cartTotal)}</span>
                  </div>
                  <button
                    onClick={() => { setShowCart(false); setShowCheckout(true); }}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-red-800 to-red-700 text-white font-semibold hover:from-red-700 hover:to-red-600 transition-all shadow-lg shadow-red-800/20"
                  >
                    Checkout
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheckout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCheckout(false)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-xl rounded-xl border border-white/[0.08] p-6 sm:p-8"
            >
              <button
                onClick={() => setShowCheckout(false)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <svg className="w-5 h-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-800/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Complete Your Purchase</h2>
                <p className="text-sm text-[var(--muted)]">Pay directly with your points in Kyromac wallet.</p>
              </div>

              <div className="space-y-3 mb-6">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-[var(--muted)]">
                      {item.product.name} • Quantity x{item.quantity}
                    </span>
                    <span className="text-white">{formatTHB(item.product.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-white/[0.08] flex justify-between">
                  <span className="font-semibold text-white">Total</span>
                  <span className="font-bold text-lg text-white">{formatTHB(cartTotal)}</span>
                </div>
                <div className="pt-2 flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Your Points</span>
                  <span className={`font-semibold ${points >= cartTotal ? 'text-emerald-300' : 'text-red-300'}`}>
                    {formatTHB(points)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handlePointCheckout}
                  disabled={checkoutProcessing || !canPayWithPoints}
                  className="w-full py-3 rounded-lg bg-[#5865F2] text-white font-semibold hover:bg-[#4752C4] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {checkoutProcessing ? 'Processing...' : 'Pay with Points'}
                </button>
                <p className="text-[10px] text-center text-[var(--muted)]">
                  {!profile
                    ? 'Please login with Discord to use point payment.'
                    : points < cartTotal
                      ? 'Not enough points in wallet for this order.'
                      : 'By purchasing, you agree to our Terms of Service.'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm backdrop-blur-xl shadow-lg"
          >
            {showToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
