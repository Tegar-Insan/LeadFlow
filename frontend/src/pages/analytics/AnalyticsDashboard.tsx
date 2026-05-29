// src/pages/analytics/AnalyticsDashboard.tsx
import { useState, useEffect } from 'react';
import Sidebar from '../../components/common/Sidebar';
import DashboardNavbar from '../../components/common/DashboardNavbar';
import useAuth from '../../hooks/useAuth';
import { getOwnerAnalytics } from '../../services/analyticsService';
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

export default function AnalyticsDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOwnerAnalytics()
      .then((data) => {
        setAnalytics(data);
      })
      .catch((err) => {
        console.error('Failed to load analytics:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const now = nowWIB();
  const greeting = getGreeting();
  const stats = analytics || {};

  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1 p-8 animate-fade-in">
          {/* Header */}
          <div className="mb-8">
            <p className="text-text-secondary text-xs font-body font-semibold uppercase tracking-widest mb-2">Analytics Dashboard</p>
            <h1 className="font-headline font-bold text-4xl text-text-primary tracking-tight mb-1">
              {greeting}, <span className="text-brand">{user?.fullName?.split(' ')[0] || 'Owner'}</span>
            </h1>
            <p className="text-text-secondary text-base font-body">Content performance overview · {now.format('DD MMMM YYYY')}</p>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            {/* Total Published */}
            <div className="col-span-2">
              <KPICard
                label="Total Published Content"
                value={loading ? '—' : stats.totalPublishedContent ?? '0'}
                sub="all time"
                highlight
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
              />
            </div>

            {/* TikTok Published */}
            <KPICard
              label="TikTok Published"
              value={loading ? '—' : stats.tiktokPublishedCount ?? '0'}
              sub="on TikTok"
              icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.66 0.29 2.89 2.89 0 015.66-.29v-3.52a4.8 4.8 0 00-.88-.09H9v-3h.44a7.94 7.94 0 007.16 3.99v-3.4a5.1 5.1 0 01-.01-3.24" /></svg>}
            />

            {/* Scheduled */}
            <KPICard
              label="Scheduled Content"
              value={loading ? '—' : stats.totalScheduledContent ?? '0'}
              sub="upcoming"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0121 18.75m-18 0v-7.5"/></svg>}
            />

            {/* Draft */}
            <KPICard
              label="Draft Content"
              value={loading ? '—' : stats.totalDraftContent ?? '0'}
              sub="in draft"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>}
            />
          </div>

          {/* Summary Card */}
          <div className="card p-6">
            <h2 className="text-xs font-body font-semibold text-text-secondary uppercase tracking-widest mb-4">
              Content Status Overview
            </h2>
            <div className="grid grid-cols-4 gap-4 text-center">
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
        </main>
      </div>
    </div>
  );
}
