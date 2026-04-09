// src/pages/dashboard/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import Sidebar from '../../components/common/Sidebar';
import Navbar  from '../../components/common/Navbar';
import useAuth from '../../hooks/useAuth';
import api     from '../../services/authService';
import { ROLE_LABELS, ROLE_COLORS } from '../../utils/constants';
import { formatJakarta, nowWIB } from '../../utils/formatDate';

function StatCard({ label, value, icon }) {
  return (
    <div className="card p-6 flex flex-col gap-4 animate-slide-up">
      <div className="w-10 h-10 rounded-xl bg-surface-overlay border border-surface-border flex items-center justify-center text-text-secondary shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs font-body font-semibold text-text-secondary uppercase tracking-widest mb-1">{label}</p>
        <p className="text-gold font-display font-extrabold text-4xl tracking-tight">{value}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats,   setStats]   = useState({ total: 0, active: 0, owners: 0, staff: 0 });

  useEffect(() => {
    api.get('/users').then(({ data }) => {
      if (data.success) {
        const list = data.data.users || [];
        setUsers(list);
        setStats({
          total:  list.length,
          active: list.filter((u) => u.is_active).length,
          owners: list.filter((u) => u.roles?.role_name === 'business_owner').length,
          staff:  list.filter((u) => u.roles?.role_name === 'marketing_staff').length,
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1 p-6 animate-fade-in">
          {/* Header */}
          <div className="mb-8">
            <p className="text-text-secondary text-xs font-body font-semibold uppercase tracking-widest mb-2">User Management</p>
            <h1 className="font-display font-extrabold text-4xl text-text-primary tracking-tight mb-1">Admin Panel</h1>
            <p className="text-text-secondary text-base font-body">System overview — LeadFlow / Krench Chicken · {nowJakarta().format('DD MMMM YYYY')}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard label="Total Users"
              value={loading ? '—' : stats.total}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>}
            />
            <StatCard label="Active Users"
              value={loading ? '—' : stats.active}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>}
            />
            <StatCard label="Business Owners"
              value={loading ? '—' : stats.owners}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>}
            />
            <StatCard label="Marketing Staff"
              value={loading ? '—' : stats.staff}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535"/></svg>}
            />
          </div>

          {/* Users table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
              <h2 className="font-display font-semibold text-text-primary">All Users</h2>
              <span className="text-xs text-text-muted">{users.length} total</span>
            </div>
            {loading ? (
              <div className="py-16 flex justify-center">
                <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-text-muted text-sm">No users found. Connect the backend API to see data.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-border bg-surface-raised/30">
                      {['User','Role','Status','Joined'].map((h) => (
                        <th key={h} className="py-2.5 px-4 text-left text-xs font-medium text-text-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const rLabel = ROLE_LABELS[u.roles?.role_name] || u.roles?.role_name;
                      const rColor = ROLE_COLORS[u.roles?.role_name] || '';
                      return (
                        <tr key={u.userid} className="border-b border-surface-border last:border-0 hover:bg-surface-raised/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold font-display">
                                {(u.user_profiles?.full_name || u.email || 'U')[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm text-text-primary font-medium">{u.user_profiles?.full_name || '—'}</p>
                                <p className="text-xs text-text-muted">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4"><span className={`role-badge border ${rColor}`}>{rLabel}</span></td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.is_active ? 'text-green-400' : 'text-text-muted'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-400' : 'bg-surface-border'}`} />
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-text-muted font-mono">{formatJakarta(u.created_at, 'DD MMM YYYY')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
