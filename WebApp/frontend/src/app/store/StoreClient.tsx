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
  basePrice: number;
  discountPercent: number;
  finalPrice: number;
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
    basePrice: 1499,
    discountPercent: 0,
    finalPrice: 1499,
    image: '/assets/images/products/Lifetime.png',
    category: 'KEY',
    badge: 'Most Popular',
  },
  {
    id: '5',
    code: 'key_30d',
    name: 'Key 30Day',
    description: '30-day license access with all active profile updates.',
    basePrice: 499,
    discountPercent: 0,
    finalPrice: 499,
    image: '/assets/images/products/30day.png',
    category: 'KEY',
    badge: 'Popular',
  },
  {
    id: '1',
    code: 'key_1d',
    name: 'Key 1Day',
    description: '1-day license access for core recoil profiles.',
    basePrice: 39,
    discountPercent: 0,
    finalPrice: 39,
    image: '/assets/images/products/1day.png',
    category: 'KEY',
  },
  {
    id: '2',
    code: 'key_3d',
    name: 'Key 3Day',
    description: '3-day license access for recoil profile usage.',
    basePrice: 99,
    discountPercent: 0,
    finalPrice: 99,
    image: '/assets/images/products/3day.png',
    category: 'KEY',
  },
  {
    id: '3',
    code: 'key_7d',
    name: 'Key 7Day',
    description: '7-day license access with full recoil profile features.',
    basePrice: 199,
    discountPercent: 0,
    finalPrice: 199,
    image: '/assets/images/products/7day.png',
    category: 'KEY',
  },
  {
    id: '4',
    code: 'key_14d',
    name: 'Key 14Day',
    description: '14-day license access for extended gameplay sessions.',
    basePrice: 299,
    discountPercent: 0,
    finalPrice: 299,
    image: '/assets/images/products/14.png',
    category: 'KEY',
  },
  {
    id: '7',
    code: 'reset_hwid',
    name: 'ResetHWID',
    description: 'Reset hardware binding for your current license key.',
    basePrice: 149,
    discountPercent: 0,
    finalPrice: 149,
    image: '/assets/images/products/reset.png',
    category: 'RESETHWID',
    badge: 'Popular',
  },
];

const CATEGORIES = ['ALL', 'KEY', 'RESETHWID'];

const badgePriority: Record<string, number> = {
  'Most Popular': 0,
  Popular: 1,
};

const featuredOrderByCode: Record<string, number> = {
  key_lifetime: 0,
  reset_hwid: 1,
  key_30d: 2,
};

function sortByBadgePriority(items: Product[]) {
  return [...items].sort((a, b) => {
    const aFeatured = featuredOrderByCode[a.code];
    const bFeatured = featuredOrderByCode[b.code];
    if (aFeatured !== undefined || bFeatured !== undefined) {
      if (aFeatured === undefined) return 1;
      if (bFeatured === undefined) return -1;
      if (aFeatured !== bFeatured) return aFeatured - bFeatured;
    }

    const aRank = a.badge ? (badgePriority[a.badge] ?? 99) : 99;
    const bRank = b.badge ? (badgePriority[b.badge] ?? 99) : 99;
    if (aRank !== bRank) return aRank - bRank;
    return Number(a.id) - Number(b.id);
  });
}

function resolveImageByCode(code: string) {
  const map: Record<string, string> = {
    key_lifetime: '/assets/images/products/Lifetime.png',
    key_30d: '/assets/images/products/30day.png',
    key_1d: '/assets/images/products/1day.png',
    key_3d: '/assets/images/products/3day.png',
    key_7d: '/assets/images/products/7day.png',
    key_14d: '/assets/images/products/14.png',
    reset_hwid: '/assets/images/products/reset.png',
  };
  return map[code] ?? '/assets/store/lifetime.png';
}

function calculateFinalPrice(basePrice: number, discountPercent: number) {
  const normalized = Math.min(90, Math.max(0, Math.floor(discountPercent)));
  return Math.max(0, basePrice - Math.floor((basePrice * normalized) / 100));
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
  const [imageStatus, setImageStatus] = useState<Record<string, 'loading' | 'loaded' | 'error'>>({});

  const getImageState = (key: string) => imageStatus[key] ?? 'loading';
  const setImageLoaded = (key: string) =>
    setImageStatus((prev) => ({ ...prev, [key]: 'loaded' }));
  const setImageError = (key: string) =>
    setImageStatus((prev) => ({ ...prev, [key]: 'error' }));

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
            discount_percent?: number;
            image_url?: string | null;
          }>;
        };
        if (!Array.isArray(data.products) || data.products.length === 0) return;
        const badgeByCode: Record<string, string | undefined> = {
          key_lifetime: 'Most Popular',
          key_30d: 'Popular',
          reset_hwid: 'Popular',
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
            basePrice: item.price_points,
            discountPercent: Math.max(0, Math.min(90, Math.floor(item.discount_percent ?? 0))),
            finalPrice: calculateFinalPrice(item.price_points, item.discount_percent ?? 0),
            image: item.image_url || resolveImageByCode(item.code),
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

  const cartTotal = cart.reduce((sum, item) => sum + item.product.finalPrice * item.quantity, 0);
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
                (() => {
                  const imageKey = `store-${product.id}-${product.image}`;
                  const state = getImageState(imageKey);
                  return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative h-full rounded-xl border border-white/[0.08] overflow-hidden bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-sm hover:border-red-800/40 transition-all duration-300 hover:shadow-[0_8px_40px_-12px_rgba(153,27,27,0.25)] flex flex-col"
                >
                  {product.badge && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className="px-2.5 py-1 rounded-md bg-gradient-to-r from-red-800 to-red-700 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-red-800/30">
                        {product.badge}
                      </span>
                    </div>
                  )}
                  
                  <div className="aspect-[4/3] relative bg-gradient-to-br from-white/[0.02] to-transparent flex items-center justify-center overflow-hidden">
                    {state !== 'loaded' && (
                      <div className="absolute inset-0 animate-pulse bg-white/[0.06]" />
                    )}
                    <img
                      src={product.image}
                      alt={product.name}
                      className={`w-full h-full object-cover transition-opacity duration-300 ${
                        state === 'loaded' ? 'opacity-100' : 'opacity-0'
                      }`}
                      loading="lazy"
                      onLoad={() => setImageLoaded(imageKey)}
                      onError={() => setImageError(imageKey)}
                    />
                    {state === 'error' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-3 text-center">
                        <span className="text-xs text-white/70">Image unavailable</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-60" />
                  </div>

                  <div className="p-4 sm:p-5 flex flex-col flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-red-800 mb-1.5">
                      {product.category}
                    </p>
                    <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                      {product.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--muted)] line-clamp-2 min-h-[40px]">
                      {product.description}
                    </p>
                    <div className="mt-auto pt-4 flex items-end justify-between gap-3">
                      {product.discountPercent > 0 ? (
                        <div className="min-h-[58px] flex flex-col justify-end">
                          <div className="flex items-center gap-2 leading-none">
                            <span className="text-xl sm:text-2xl font-bold text-white">
                              {formatTHB(product.finalPrice)}
                            </span>
                            <span className="inline-flex h-5 min-w-[46px] items-center justify-center rounded bg-red-700/85 px-1.5 text-[10px] font-bold text-white">
                              -{product.discountPercent}%
                            </span>
                          </div>
                          <span className="mt-1 text-xs text-white/45 line-through">
                            {formatTHB(product.basePrice)}
                          </span>
                        </div>
                      ) : (
                        <div className="min-h-[58px] flex items-end">
                          <span className="text-xl sm:text-2xl font-bold text-white leading-none">
                            {formatTHB(product.finalPrice)}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => addToCart(product)}
                        className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-red-800 hover:border-red-800 transition-all duration-200"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </motion.div>
                  );
                })()
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
                    (() => {
                      const imageKey = `cart-${item.product.id}-${item.product.image}`;
                      const state = getImageState(imageKey);
                      return (
                    <div
                      key={item.product.id}
                      className="flex gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm"
                    >
                      <div className="relative w-16 h-16 rounded-lg bg-white/5 overflow-hidden flex items-center justify-center shrink-0">
                        {state !== 'loaded' && (
                          <div className="absolute w-16 h-16 animate-pulse bg-white/[0.06]" />
                        )}
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className={`w-full h-full object-cover transition-opacity duration-300 ${
                            state === 'loaded' ? 'opacity-100' : 'opacity-0'
                          }`}
                          loading="lazy"
                          onLoad={() => setImageLoaded(imageKey)}
                          onError={() => setImageError(imageKey)}
                        />
                        {state === 'error' && (
                          <span className="text-[10px] text-white/60">No Image</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">{item.product.name}</h3>
                        <p className="text-xs text-[var(--muted)] truncate">
                          {item.product.category} • Quantity x{item.quantity}
                        </p>
                        <p className="text-sm font-bold text-white mt-1">
                          {formatTHB(item.product.finalPrice * item.quantity)}
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
                      );
                    })()
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
                    <span className="text-white">{formatTHB(item.product.finalPrice * item.quantity)}</span>
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
