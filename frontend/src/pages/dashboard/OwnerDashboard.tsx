// src/pages/dashboard/OwnerDashboard.tsx
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import SmallSidebar from '../../components/common/smallsidebar';
import DashboardNavbar from '../../components/common/DashboardNavbar';
import useAuth from '../../hooks/useAuth';
import { getOwnerAnalytics, type OwnerAnalytics } from '../../services/analyticsService';
import { nowWIB, getGreeting } from '../../utils/formatDate';

/* ── KPI Bento Card ─────────────────────────────────────────────────── */
function KPICard({ label, value, sub, highlight = false, colSpan = 1, icon }) {
  return (
    <div
      className="card p-6 flex flex-col justify-between animate-slide-up"
      style={{ gridColumn: colSpan > 1 ? `span ${colSpan}` : undefined }}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="w-10 h-10 rounded-xl bg-surface-overlay border border-surface-border flex items-center justify-center text-text-secondary">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-xs font-body font-semibold text-text-secondary uppercase tracking-widest mb-2">{label}</p>
        <p className={`font-headline font-bold tracking-tight ${highlight ? 'text-brand text-5xl' : 'text-text-primary text-4xl'}`}>
          {value}
        </p>
        {sub && <p className="text-text-secondary text-xs font-body mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Month-over-month delta badge ──────────────────────────────────── */
function MonthDeltaBadge({ deltaPct, currentMonthContent }: { deltaPct: number | null; currentMonthContent: number }) {
  if (deltaPct === null) {
    if (currentMonthContent === 0) return null;
    return <span className="text-xs font-body font-semibold text-success">New</span>;
  }
  const positive = deltaPct >= 0;
  return (
    <span className={`text-xs font-body font-semibold flex items-center gap-0.5 ${positive ? 'text-success' : 'text-brand'}`}>
      <svg className={`w-3 h-3 ${!positive && 'rotate-180'}`} viewBox="0 0 12 12" fill="currentColor">
        <path d="M6 2l4 6H2l4-6z" />
      </svg>
      {Math.abs(deltaPct)}% vs last month
    </span>
  );
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<OwnerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOwnerAnalytics()
      .then((data) => setAnalytics(data))
      .catch((err) => console.error('Failed to load analytics:', err))
      .finally(() => setLoading(false));
  }, []);

  const now = nowWIB();
  const greeting = getGreeting();
  const stats = analytics || ({} as Partial<OwnerAnalytics>);

  const monthChartData = [
    { name: 'Last Month', value: stats.lastMonthContent ?? 0 },
    { name: 'This Month', value: stats.currentMonthContent ?? 0 },
  ];

  return (
    <div className="min-h-screen bg-surface flex">
      <SmallSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar />
        <main className="flex-1 p-8 animate-fade-in">

          {/* Header */}
          <div className="mb-8">
            <p className="text-text-secondary text-xs font-body font-semibold uppercase tracking-widest mb-2">Business Intelligence</p>
            <h1 className="font-headline font-bold text-4xl text-text-primary tracking-tight mb-1">
              {greeting}, <span className="text-brand">{user?.fullName?.split(' ')[0] || 'Owner'}</span>
            </h1>
            <p className="text-text-secondary text-base font-body">Content performance overview for Krench Chicken · {now.format('DD MMMM YYYY')}</p>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <div className="col-span-2">
              <KPICard
                label="Total Published Content"
                value={loading ? '—' : stats.totalPublishedContent ?? '0'}
                sub="all time"
                highlight
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
            </div>

            <KPICard
              label="TikTok Published"
              value={loading ? '—' : stats.tiktokPublishedCount ?? '0'}
              sub="on TikTok"
              icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.66 0.29 2.89 2.89 0 015.66-.29v-3.52a4.8 4.8 0 00-.88-.09H9v-3h.44a7.94 7.94 0 007.16 3.99v-3.4a5.1 5.1 0 01-.01-3.24" /></svg>}
            />

            <KPICard
              label="Scheduled Content"
              value={loading ? '—' : stats.totalScheduledContent ?? '0'}
              sub="upcoming"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5" /></svg>}
            />

            <KPICard
              label="Draft Content"
              value={loading ? '—' : stats.totalDraftContent ?? '0'}
              sub="in draft"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
            />
          </div>

          {/* Bottom row: month comparison + status overview */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Total Content This Month */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-body font-semibold text-text-secondary uppercase tracking-widest">
                  Total Content This Month
                </h2>
                {!loading && (
                  <MonthDeltaBadge deltaPct={stats.monthOverMonthDeltaPct ?? null} currentMonthContent={stats.currentMonthContent ?? 0} />
                )}
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthChartData} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {monthChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.name === 'This Month' ? '#e31837' : '#d1d5db'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-text-secondary font-body mt-2">Current vs previous calendar month · WIB</p>
            </div>

            {/* Content Status Overview */}
            <div className="card p-6">
              <h2 className="text-xs font-body font-semibold text-text-secondary uppercase tracking-widest mb-4">
                Content Status Overview
              </h2>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 rounded-lg bg-surface-overlay">
                  <p className="text-2xl font-bold text-brand">{loading ? '—' : stats.totalPublishedContent ?? '0'}</p>
                  <p className="text-xs text-text-secondary mt-2">Published</p>
                </div>
                <div className="p-4 rounded-lg bg-surface-overlay">
                  <p className="text-2xl font-bold text-success">{loading ? '—' : stats.totalScheduledContent ?? '0'}</p>
                  <p className="text-xs text-text-secondary mt-2">Scheduled</p>
                </div>
                <div className="p-4 rounded-lg bg-surface-overlay">
                  <p className="text-2xl font-bold text-warning">{loading ? '—' : stats.totalDraftContent ?? '0'}</p>
                  <p className="text-xs text-text-secondary mt-2">Draft</p>
                </div>
                <div className="p-4 rounded-lg bg-surface-overlay">
                  <p className="text-2xl font-bold text-accent">{loading ? '—' : stats.tiktokPublishedCount ?? '0'}</p>
                  <p className="text-xs text-text-secondary mt-2">TikTok</p>
                </div>
              </div>
            </div>
          </div>

          {/* Content Creator Leaderboard */}
          <div className="card p-6 mt-6">
            <h2 className="text-xs font-body font-semibold text-text-secondary uppercase tracking-widest mb-4">
              Content Creator Leaderboard
            </h2>
            {loading ? (
              <p className="text-text-secondary text-sm font-body">Loading…</p>
            ) : !stats.leaderboard || stats.leaderboard.length === 0 ? (
              <p className="text-text-secondary text-sm font-body">No marketing staff accounts yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.leaderboard.map((entry, idx) => {
                  const topCount = stats.leaderboard[0].contentCount || 1;
                  const pct = topCount > 0 ? (entry.contentCount / topCount) * 100 : 0;
                  return (
                    <div key={entry.userId} className="flex items-center gap-3">
                      <span className="w-6 text-center font-headline font-bold text-text-secondary text-sm">#{idx + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs font-body mb-1">
                          <span className="text-text-primary font-semibold">{entry.fullName}</span>
                          <span className="font-mono text-text-secondary">{entry.contentCount}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-overlay overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-text-muted font-body mt-4">Total content items created · all time</p>
          </div>

        </main>
      </div>
    </div>
  );
}
