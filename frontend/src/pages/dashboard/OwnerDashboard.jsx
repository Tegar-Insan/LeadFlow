// src/pages/dashboard/OwnerDashboard.jsx
import { useState, useEffect } from 'react';
import Sidebar from '../../components/common/Sidebar';
import Navbar  from '../../components/common/Navbar';
import useAuth from '../../hooks/useAuth';
import api    from '../../services/authService';
import { nowJakarta, getGreeting } from '../../utils/formatDate';

function KPICard({ label, value, trend, sub, color = 'brand', icon }) {
  const map = {
    brand:  { wrap: 'border-brand/15  bg-brand/5',   icon: 'text-brand   bg-brand/10   border-brand/20'   },
    green:  { wrap: 'border-green-500/15 bg-green-500/5',  icon: 'text-green-400 bg-green-500/10 border-green-500/20' },
    amber:  { wrap: 'border-amber-500/15 bg-amber-500/5',  icon: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    sky:    { wrap: 'border-sky-500/15   bg-sky-500/5',    icon: 'text-sky-400   bg-sky-500/10   border-sky-500/20'   },
  }[color];
  const pos = trend >= 0;
  return (
    <div className={`rounded-2xl border p-5 animate-slide-up ${map.wrap}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${map.icon}`}>{icon}</div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${pos ? 'text-green-400' : 'text-red-400'}`}>
            <svg className={`w-3 h-3 ${!pos && 'rotate-180'}`} viewBox="0 0 12 12" fill="currentColor"><path d="M6 2l4 6H2l4-6z"/></svg>
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-text-muted text-xs mb-1">{label}</p>
      <p className="text-text-primary font-display font-bold text-3xl">{value}</p>
      {sub && <p className="text-text-muted text-xs mt-1">{sub}</p>}
    </div>
  );
}

const INTENTS = [
  { label: 'Lead',      color: 'bg-green-500',  pct: 0 },
  { label: 'Question',  color: 'bg-sky-500',    pct: 0 },
  { label: 'Complaint', color: 'bg-red-500',    pct: 0 },
  { label: 'Praise',    color: 'bg-amber-500',  pct: 0 },
  { label: 'Spam',      color: 'bg-surface-border', pct: 0 },
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

  const now      = nowJakarta();
  const greeting = getGreeting();
  const kpis     = weekly || {};

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1 p-6 animate-fade-in">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-text-muted text-sm font-mono mb-1">{now.format('dddd, DD MMMM YYYY · HH:mm [WIB]')}</p>
              <h1 className="font-display font-bold text-2xl text-text-primary">
                {greeting}, <span className="text-brand">{user?.fullName?.split(' ')[0] || 'Owner'}</span> 👋
              </h1>
              <p className="text-text-secondary text-sm mt-1">Weekly performance overview for Krench Chicken.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted bg-surface-raised border border-surface-border px-3 py-2 rounded-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              TikTok Connected
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <KPICard label="Scheduled Posts"    value={loading ? '…' : kpis.scheduledPosts  ?? '—'} trend={kpis.scheduledPostsTrend}  sub="vs last week" color="brand"
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5"/></svg>}
            />
            <KPICard label="Posts Published"    value={loading ? '…' : kpis.publishedPosts  ?? '—'} trend={kpis.publishedPostsTrend}  sub="this week"    color="green"
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
            />
            <KPICard label="Interactions"       value={loading ? '…' : kpis.interactions    ?? '—'} trend={kpis.interactionsTrend}    sub="DMs + comments" color="amber"
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3a48.527 48.527 0 01-4.02-.163 2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"/></svg>}
            />
            <KPICard label="Leads Identified"   value={loading ? '…' : kpis.leadsIdentified ?? '—'} trend={kpis.leadsTrend}           sub="by AI classifier" color="sky"
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>}
            />
          </div>

          {/* Intent breakdown */}
          <div className="card p-5">
            <h2 className="font-display font-semibold text-text-primary mb-4 text-sm flex items-center gap-2">
              <span>📊</span> Customer Intent Breakdown
            </h2>
            <div className="space-y-3">
              {INTENTS.map(({ label, color, pct }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs text-text-secondary mb-1">
                    <span>{label}</span>
                    <span className="font-mono">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-overlay overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-4">Powered by LeadFlow AI Classifier · Real-time analysis</p>
          </div>
        </main>
      </div>
    </div>
  );
}
