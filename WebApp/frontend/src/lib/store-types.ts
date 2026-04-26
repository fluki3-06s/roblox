export type StoreProduct = {
  code: string;
  name: string;
  category: 'KEY' | 'RESETHWID';
  duration_days: number | null;
  price_points: number;
  discount_percent: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

export type WalletSummary = {
  points: number;
  totalTopups: number;
  lastTopupAt: string | null;
};

export type TopupHistoryRow = {
  id: string;
  amount_points: number;
  source: string;
  status: 'pending' | 'success' | 'failed';
  created_at: string;
};

export type LicenseHistoryRow = {
  id: string;
  product_code: string;
  key_code: string;
  status: 'active' | 'expired' | 'revoked';
  issued_at: string;
  expires_at: string | null;
  bound_device_hash: string | null;
  reset_hwid_count: number;
};
