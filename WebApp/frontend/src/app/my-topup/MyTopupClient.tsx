'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Header, Footer } from '@/components/layout';
import { ProtectedPageGate } from '@/components/auth/ProtectedPageGate';

const formatTHB = (amount: number) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount);

export default function MyTopupClient() {
  const [points, setPoints] = useState(0);
  const [totalTopups, setTotalTopups] = useState(0);
  const [lastTopupAt, setLastTopupAt] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{
    id: string;
    amount_points: number;
    source: string;
    status: string;
    created_at: string;
  }>>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [summaryRes, historyRes] = await Promise.all([
          fetch('/api/wallet/summary', { cache: 'no-store' }),
          fetch('/api/topup/history', { cache: 'no-store' }),
        ]);
        if (summaryRes.ok) {
          const summary = (await summaryRes.json()) as {
            points: number;
            totalTopups: number;
            lastTopupAt: string | null;
          };
          setPoints(summary.points ?? 0);
          setTotalTopups(summary.totalTopups ?? 0);
          setLastTopupAt(summary.lastTopupAt ?? null);
        }
        if (historyRes.ok) {
          const body = (await historyRes.json()) as { history?: typeof history };
          setHistory(Array.isArray(body.history) ? body.history : []);
        }
      } catch {
        // ignore and keep defaults
      }
    };
    void load();
  }, []);

  const topupSummary = useMemo(
    () => [
      { label: 'Wallet Balance', value: formatTHB(points) },
      { label: 'Total Topups', value: String(totalTopups) },
      {
        label: 'Last Topup',
        value: lastTopupAt ? new Date(lastTopupAt).toLocaleString() : '-',
      },
    ],
    [lastTopupAt, points, totalTopups]
  );

  const chartData = useMemo(() => {
    const days: Array<{ key: string; label: string; value: number }> = [];
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { weekday: 'short' });
      days.push({ key, label, value: 0 });
    }

    const map = new Map(days.map((item) => [item.key, item]));
    history.forEach((row) => {
      const key = new Date(row.created_at).toISOString().slice(0, 10);
      const target = map.get(key);
      if (target && row.status === 'success') {
        target.value += row.amount_points;
      }
    });

    return days;
  }, [history]);

  const chartMax = useMemo(
    () => Math.max(...chartData.map((item) => item.value), 0),
    [chartData]
  );
  const hasChartData = chartMax > 0;

  return (
    <ProtectedPageGate>
      <div className="min-h-screen relative">
        <Header />
        <main className="overflow-x-hidden pt-20 sm:pt-24 pb-16 sm:pb-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-red-800 mb-2">Dashboard</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">My Topup</h1>
            <p className="mt-3 text-sm text-[var(--muted)]">Track balance, latest topups, and wallet activity.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {topupSummary.map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="feature-card !p-5"
              >
                <p className="text-xs text-[var(--muted)]">{item.label}</p>
                <p className="text-xl font-bold text-white mt-2">{item.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="lg:col-span-2 rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-white/[0.08]">
                <h2 className="text-white font-semibold">Recent Topup Transactions</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[var(--muted)] bg-white/[0.02]">
                    <tr>
                      <th className="px-5 py-3 font-medium">ID</th>
                      <th className="px-5 py-3 font-medium">Amount</th>
                      <th className="px-5 py-3 font-medium">Method</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 10).map((row) => (
                      <tr key={row.id} className="border-t border-white/[0.06] text-white/90">
                        <td className="px-5 py-3 font-mono text-xs">{row.id}</td>
                        <td className="px-5 py-3">{formatTHB(row.amount_points)}</td>
                        <td className="px-5 py-3 text-[var(--muted)]">{row.source}</td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-300 text-xs uppercase">
                            {row.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[var(--muted)]">{new Date(row.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-5"
            >
              <h2 className="text-white font-semibold mb-4">Topup Trend</h2>
              {hasChartData ? (
                <>
                  <div className="h-44 flex items-end gap-2">
                    {chartData.map((item) => (
                      <div key={item.key} className="flex-1 flex flex-col items-center justify-end gap-2">
                        <span className="text-[10px] text-white/70 tabular-nums">
                          {item.value > 0 ? formatTHB(item.value) : '-'}
                        </span>
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-red-800/80 to-red-500/80"
                          style={{
                            height: `${Math.max(10, (item.value / chartMax) * 100)}%`,
                          }}
                        />
                        <span className="text-[10px] text-[var(--muted)]">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-3">Real topup volume for the last 7 days.</p>
                </>
              ) : (
                <div className="h-44 rounded-lg border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-sm text-[var(--muted)]">
                  No real topup data yet.
                </div>
              )}
            </motion.div>
          </div>
          </div>
        </main>
        <Footer />
      </div>
    </ProtectedPageGate>
  );
}
