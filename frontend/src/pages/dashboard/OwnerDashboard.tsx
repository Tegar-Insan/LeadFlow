// src/pages/dashboard/OwnerDashboard.jsx
import { useState, useEffect } from 'react';
import Sidebar from '../../components/common/Sidebar';
import DashboardNavbar  from '../../components/common/DashboardNavbar';
import useAuth from '../../hooks/useAuth';
import api    from '../../services/authService';
import { nowWIB, getGreeting } from '../../utils/formatDate';

/* ── KPI Bento Card ─────────────────────────────────────────────────── */
function KPICard({ label, value, trend, sub, highlight = false, colSpan = 1, icon }) {
  const pos = trend >= 0;
  return (
    <div
      className="card p-6 flex flex-col justify-between animate-slide-up"
      style={{ gridColumn: colSpan > 1 ? `span ${colSpan}` : undefined }}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="w-10 h-10 rounded-xl bg-surface-overlay border border-surface-border flex items-center justify-center text-text-secondary">
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-body font-semibold flex items-center gap-0.5 ${pos ? 'text-success' : 'text-brand'}`}>
            <svg className={`w-3 h-3 ${!pos && 'rotate-180'}`} viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 2l4 6H2l4-6z"/>
            </svg>
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-body font-semibold text-text-secondary uppercase tracking-widest mb-2">{label}</p>
        <p className={`font-headline font-bold tracking-tight ${highlight ? 'text-gold text-5xl' : 'text-text-primary text-4xl'}`}>
          {value}
        </p>
        {sub && <p className="text-text-secondary text-xs font-body mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Intent Bar ─────────────────────────────────────────────────────── */
const INTENTS = [
  { label: 'Lead',      color: '#10b981', pct: 0 },
  { label: 'Question',  color: '#38bdf8', pct: 0 },
  { label: 'Complaint', color: '#f6b70a', pct: 0 },
  { label: 'Praise',    color: '#fecb00', pct: 0 },
  { label: 'Spam',      color: '#3f3f46', pct: 0 },
];

export default function OwnerDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [weekly,  setWeekly]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/weekly').then(({ data }) => {
      if (data.success) setWeekly(data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const now      = nowWIB();
  const greeting = getGreeting();
  const kpis     = weekly || {};

  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1 p-8 animate-fade-in">

          {/* Header */}
          <div className="mb-8">
            <p className="text-text-secondary text-xs font-body font-semibold uppercase tracking-widest mb-2">Business Intelligence</p>
            <h1 className="font-headline font-bold text-4xl text-text-primary tracking-tight mb-1">
              {greeting}, <span className="text-brand">{user?.fullName?.split(' ')[0] || 'Owner'}</span>
            </h1>
            <p className="text-text-secondary text-base font-body">Weekly performance overview for Krench Chicken · {now.format('DD MMMM YYYY')}</p>
          </div>

          {/* KPI bento grid — first card spans 2 columns */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <div className="col-span-2">
              <KPICard
                label="Total Scheduled Posts"
                value={loading ? '—' : kpis.scheduledPosts ?? '0'}
                trend={kpis.scheduledPostsTrend}
                sub="vs last week"
                highlight
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5"/></svg>}
              />
            </div>
            <KPICard
              label="Posts Published"
              value={loading ? '—' : kpis.publishedPosts ?? '0'}
              trend={kpis.publishedPostsTrend}
              sub="this week"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
            />
            <KPICard
              label="Leads Identified"
              value={loading ? '—' : kpis.leadsIdentified ?? '0'}
              trend={kpis.leadsTrend}
              sub="by AI classifier"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>}
            />
          </div>

          {/* Bottom row: interactions + intent breakdown */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Interactions chart card */}
            <div className="card p-6 glow-gold">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-body font-semibold text-text-secondary uppercase tracking-widest mb-1">Total Interactions</p>
                  <p className="font-headline font-bold text-4xl text-text-primary tracking-tight">
                    {loading ? '—' : kpis.interactions ?? '0'}
                  </p>
                </div>
                <span className={`text-xs font-body font-semibold flex items-center gap-0.5 ${(kpis.interactionsTrend ?? 0) >= 0 ? 'text-success' : 'text-brand'}`}>
                  <svg className={`w-3 h-3 ${(kpis.interactionsTrend ?? 0) < 0 && 'rotate-180'}`} viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 2l4 6H2l4-6z"/>
                  </svg>
                  {Math.abs(kpis.interactionsTrend ?? 0)}%
                </span>
              </div>
              <p className="text-xs text-text-secondary font-body">DMs + comments · TikTok</p>
            </div>

            {/* Intent breakdown */}
            <div className="card p-6">
              <h2 className="text-xs font-body font-semibold text-text-secondary uppercase tracking-widest mb-4">
                Customer Intent Breakdown
              </h2>
              <div className="space-y-3">
                {INTENTS.map(({ label, color, pct }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs font-body text-text-secondary mb-1.5">
                      <span>{label}</span>
                      <span className="font-mono">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-card overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}88` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-muted font-body mt-4">Powered by Krench Chicken AI Classifier · Real-time</p>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
