// src/pages/dashboard/AdminDashboard.jsx
// Admin control panel — 3 tabs: Overview · All Users · Role Management

import { useState, useEffect, useCallback } from 'react';
import Sidebar  from '../../components/common/Sidebar';
import Navbar   from '../../components/common/Navbar';
import { getAllUsers, updateUserRole, toggleUserStatus } from '../../services/adminService';
import { ROLE_LABELS, ROLE_COLORS } from '../../utils/constants';
import { fShortDate } from '../../utils/formatDate';

// ── Shared helpers ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',  label: 'Overview'        },
  { id: 'users',     label: 'All Users'        },
  { id: 'roles',     label: 'Role Management'  },
];

const ROLE_OPTIONS = [
  { value: 'admin',           label: 'Admin'           },
  { value: 'business_owner',  label: 'Business Owner'  },
  { value: 'marketing_staff', label: 'Marketing Staff' },
];

function RoleBadge({ roleName }) {
  const label = ROLE_LABELS[roleName] || roleName || '—';
  const color = ROLE_COLORS[roleName] || 'text-text-muted bg-surface-overlay border-surface-border';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {label}
    </span>
  );
}

function StatusBadge({ active }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${active ? 'text-green-400' : 'text-text-muted'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-400' : 'bg-surface-border'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function Avatar({ name, email }) {
  const letter = (name || email || 'U')[0].toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-sm font-bold font-display shrink-0">
      {letter}
    </div>
  );
}

// ── Toast ───────────────────────────────────────────────────────────────────

function Toast({ msg, type, onDismiss }) {
  if (!msg) return null;
  return (
    <div
      onClick={onDismiss}
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg text-sm font-body font-semibold shadow-xl cursor-pointer
        ${type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}
    >
      {msg}
    </div>
  );
}

// ── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon }) {
  return (
    <div className="card p-6 flex flex-col gap-4 animate-slide-up">
      <div className="w-10 h-10 rounded-xl bg-surface-overlay border border-surface-border flex items-center justify-center text-text-secondary shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs font-body font-semibold text-text-secondary uppercase tracking-widest mb-1">{label}</p>
        <p className="text-gold font-display font-extrabold text-4xl tracking-tight">{value}</p>
        {sub && <p className="text-text-muted text-xs font-body mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Tab: Overview ───────────────────────────────────────────────────────────

function OverviewTab({ users, loading }) {
  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const total   = users.length;
  const active  = users.filter((u) => u.is_active).length;
  const owners  = users.filter((u) => u.role_name === 'business_owner').length;
  const staff   = users.filter((u) => u.role_name === 'marketing_staff').length;
  const admins  = users.filter((u) => u.role_name === 'admin').length;
  const verified = users.filter((u) => u.email_verified).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          label="Total Users" value={total}
          sub={`${verified} email-verified`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
            </svg>
          }
        />
        <StatCard
          label="Active Accounts" value={active}
          sub={`${total - active} inactive`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
            </svg>
          }
        />
        <StatCard
          label="Admins" value={admins}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          }
        />
        <StatCard
          label="Business Owners" value={owners}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"/>
            </svg>
          }
        />
        <StatCard
          label="Marketing Staff" value={staff}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535"/>
            </svg>
          }
        />
        <StatCard
          label="Email Verified" value={verified}
          sub={`${total - verified} pending`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
            </svg>
          }
        />
      </div>

      {/* Recent 5 registrations */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h2 className="font-display font-semibold text-text-primary">Recently Registered</h2>
        </div>
        {users.slice(0, 5).map((u) => (
          <div key={u.id} className="px-5 py-3 border-b border-surface-border last:border-0 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={u.full_name} email={u.email} />
              <div className="min-w-0">
                <p className="text-sm text-text-primary font-medium truncate">{u.full_name || '—'}</p>
                <p className="text-xs text-text-muted truncate">{u.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <RoleBadge roleName={u.role_name} />
              <StatusBadge active={u.is_active} />
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <p className="py-8 text-center text-text-muted text-sm">No users yet.</p>
        )}
      </div>
    </div>
  );
}

// ── Tab: All Users ──────────────────────────────────────────────────────────

function AllUsersTab({ users, loading }) {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email     || '').toLowerCase().includes(q) ||
      (u.phone     || '').toLowerCase().includes(q);
    const matchRole = !filterRole || u.role_name === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="animate-fade-in space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-surface-overlay rounded px-3 py-2 border border-surface-border flex-1 max-w-sm">
          <svg className="w-4 h-4 text-text-secondary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone…"
            className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full font-body"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="bg-surface-overlay border border-surface-border rounded px-3 py-2 text-sm text-text-primary font-body outline-none"
        >
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <span className="self-center text-xs text-text-muted ml-auto">
          {filtered.length} of {users.length} users
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-text-muted text-sm">No users match your filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border bg-surface-raised/30">
                  {['User', 'Email', 'Phone', 'Role', 'Status', 'Verified', 'Joined'].map((h) => (
                    <th key={h} className="py-2.5 px-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-surface-border last:border-0 hover:bg-surface-raised/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.full_name} email={u.email} />
                        <p className="text-sm text-text-primary font-medium">{u.full_name || '—'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary font-mono">{u.email}</td>
                    <td className="py-3 px-4 text-sm text-text-secondary">{u.phone || '—'}</td>
                    <td className="py-3 px-4"><RoleBadge roleName={u.role_name} /></td>
                    <td className="py-3 px-4"><StatusBadge active={u.is_active} /></td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium ${u.email_verified ? 'text-green-400' : 'text-amber-400'}`}>
                        {u.email_verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-text-muted font-mono">
                      {fShortDate(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Role Management ────────────────────────────────────────────────────

function RoleManagementTab({ users, loading, onRoleChange, onStatusChange }) {
  const [search, setSearch]       = useState('');
  const [pendingRole, setPending] = useState({}); // { userId: newRoleName }
  const [saving, setSaving]       = useState(null);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email     || '').toLowerCase().includes(q)
    );
  });

  const handleRoleSelect = (userId, currentRole, newRole) => {
    if (newRole === currentRole) {
      setPending((p) => { const n = { ...p }; delete n[userId]; return n; });
    } else {
      setPending((p) => ({ ...p, [userId]: newRole }));
    }
  };

  const handleConfirmRole = async (userId) => {
    const newRole = pendingRole[userId];
    if (!newRole) return;
    setSaving(userId);
    await onRoleChange(userId, newRole);
    setPending((p) => { const n = { ...p }; delete n[userId]; return n; });
    setSaving(null);
  };

  const handleToggle = async (userId, current) => {
    setSaving(userId + '-status');
    await onStatusChange(userId, !current);
    setSaving(null);
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Instruction banner */}
      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
        <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
        </svg>
        <p className="text-xs text-amber-300 font-body">
          Select a new role from the dropdown then click <strong>Apply</strong> to save. Toggle the switch to activate or deactivate an account.
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-surface-overlay rounded px-3 py-2 border border-surface-border max-w-sm">
        <svg className="w-4 h-4 text-text-secondary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full font-body"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-text-muted text-sm">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border bg-surface-raised/30">
                  {['User', 'Current Role', 'Change Role To', 'Account Status', 'Action'].map((h) => (
                    <th key={h} className="py-2.5 px-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const selected    = pendingRole[u.id];
                  const hasPending  = !!selected;
                  const isSaving    = saving === u.id;
                  const isStatusSaving = saving === u.id + '-status';

                  return (
                    <tr key={u.id} className={`border-b border-surface-border last:border-0 transition-colors ${hasPending ? 'bg-brand/5' : 'hover:bg-surface-raised/40'}`}>
                      {/* User */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.full_name} email={u.email} />
                          <div className="min-w-0">
                            <p className="text-sm text-text-primary font-medium">{u.full_name || '—'}</p>
                            <p className="text-xs text-text-muted font-mono truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Current role */}
                      <td className="py-3 px-4">
                        <RoleBadge roleName={u.role_name} />
                      </td>

                      {/* Role selector */}
                      <td className="py-3 px-4">
                        <select
                          value={selected || u.role_name || ''}
                          onChange={(e) => handleRoleSelect(u.id, u.role_name, e.target.value)}
                          disabled={isSaving}
                          className={`bg-surface-overlay border rounded px-3 py-1.5 text-sm font-body outline-none transition-colors
                            ${hasPending
                              ? 'border-brand text-brand'
                              : 'border-surface-border text-text-primary'
                            } disabled:opacity-50`}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </td>

                      {/* Active toggle */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggle(u.id, u.is_active)}
                          disabled={isStatusSaving}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50
                            ${u.is_active ? 'bg-green-500' : 'bg-surface-border'}`}
                          title={u.is_active ? 'Click to deactivate' : 'Click to activate'}
                        >
                          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform
                            ${u.is_active ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </button>
                        <span className="ml-2 text-xs text-text-muted">{u.is_active ? 'Active' : 'Inactive'}</span>
                      </td>

                      {/* Apply button */}
                      <td className="py-3 px-4">
                        {hasPending ? (
                          <button
                            onClick={() => handleConfirmRole(u.id)}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white text-xs font-display font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                          >
                            {isSaving ? (
                              <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                              </svg>
                            )}
                            Apply
                          </button>
                        ) : (
                          <span className="text-xs text-text-muted">No change</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Inner navigation bar (same style as WeeklyDashboard page nav) ───────────

function DashboardTabBar({ active, onChange }) {
  return (
    <div className="flex items-center gap-1 border-b border-surface-border pb-0 mb-6">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2.5 text-sm font-body font-semibold transition-all border-b-2 -mb-px
            ${active === tab.id
              ? 'border-brand text-brand'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:border-surface-border'
            }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab,   setActiveTab]   = useState('overview');
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState({ msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllUsers({ limit: 200 });
      if (res.success) setUsers(res.data.users || []);
    } catch {
      showToast('Failed to load users.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleRoleChange = async (userId, roleName) => {
    try {
      const res = await updateUserRole(userId, roleName);
      if (res.success) {
        showToast(`Role updated to ${ROLE_LABELS[roleName] || roleName}.`);
        setUsers((prev) =>
          prev.map((u) => u.id === userId ? { ...u, role_name: roleName } : u)
        );
      } else {
        showToast(res.message || 'Failed to update role.', 'error');
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to update role.', 'error');
    }
  };

  const handleStatusChange = async (userId, isActive) => {
    try {
      const res = await toggleUserStatus(userId, isActive);
      if (res.success) {
        showToast(`Account ${isActive ? 'activated' : 'deactivated'}.`);
        setUsers((prev) =>
          prev.map((u) => u.id === userId ? { ...u, is_active: isActive } : u)
        );
      } else {
        showToast(res.message || 'Failed to update status.', 'error');
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to update status.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuToggle={() => setSidebarOpen((o) => !o)} />

        <main className="flex-1 p-6">
          {/* Page header */}
          <div className="mb-6 animate-fade-in">
            <p className="text-text-secondary text-xs font-body font-semibold uppercase tracking-widest mb-2">
              System Administration
            </p>
            <h1 className="font-display font-extrabold text-4xl text-text-primary tracking-tight mb-1">
              Admin Panel
            </h1>
            <p className="text-text-secondary text-base font-body">
              Manage all registered accounts · Krench Chicken / LeadFlow
            </p>
          </div>

          {/* Tab navigation */}
          <DashboardTabBar active={activeTab} onChange={setActiveTab} />

          {/* Tab content */}
          {activeTab === 'overview' && (
            <OverviewTab users={users} loading={loading} />
          )}
          {activeTab === 'users' && (
            <AllUsersTab users={users} loading={loading} />
          )}
          {activeTab === 'roles' && (
            <RoleManagementTab
              users={users}
              loading={loading}
              onRoleChange={handleRoleChange}
              onStatusChange={handleStatusChange}
            />
          )}
        </main>
      </div>

      <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast({ msg: '' })} />
    </div>
  );
}
