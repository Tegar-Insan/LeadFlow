// src/components/dashboard/AdminUserTable.jsx
// Reusable registered-user table for all 3 admin pages

import { useState } from 'react';
import { ROLE_LABELS, ROLE_COLORS } from '../../utils/constants';
import { fShortDate } from '../../utils/formatDate';
import { updateUserRole, toggleUserStatus } from '../../services/adminService';

const ROLE_OPTIONS = [
  { value: 'admin',           label: 'Admin'           },
  { value: 'business_owner',  label: 'Business Owner'  },
  { value: 'marketing_staff', label: 'Marketing Staff' },
];

// ── Small sub-components ──────────────────────────────────────────────────────

function Avatar({ name, email }) {
  const letter = (name || email || 'U')[0].toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-white text-sm font-bold font-display shrink-0">
      {letter}
    </div>
  );
}

function RoleBadge({ roleName }) {
  const label = ROLE_LABELS[roleName] || roleName || '—';
  const color = ROLE_COLORS[roleName] || 'text-text-muted bg-surface-overlay border-surface-border';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {label}
    </span>
  );
}

function StatusPill({ active }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${active ? 'text-green-400' : 'text-text-muted'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-400' : 'bg-surface-border'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

// ── Toast notification ────────────────────────────────────────────────────────

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

// ── Main table ────────────────────────────────────────────────────────────────

export default function AdminUserTable({ users, loading, onUsersChange }) {
  const [search,   setSearch]   = useState('');
  const [pending,  setPending]  = useState({}); // { userId: newRole }
  const [saving,   setSaving]   = useState(null);
  const [toast,    setToast]    = useState({ msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email     || '').toLowerCase().includes(q) ||
      (u.phone     || '').toLowerCase().includes(q)
    );
  });

  const handleRoleSelect = (userId, currentRole, newRole) => {
    if (newRole === currentRole) {
      setPending((p) => { const n = { ...p }; delete n[userId]; return n; });
    } else {
      setPending((p) => ({ ...p, [userId]: newRole }));
    }
  };

  const handleApplyRole = async (userId) => {
    const newRole = pending[userId];
    if (!newRole) return;
    setSaving(userId);
    try {
      const res = await updateUserRole(userId, newRole);
      if (res.success) {
        showToast(`Role updated to ${ROLE_LABELS[newRole] || newRole}.`);
        setPending((p) => { const n = { ...p }; delete n[userId]; return n; });
        onUsersChange((prev) =>
          prev.map((u) => u.id === userId ? { ...u, role_name: newRole } : u)
        );
      } else {
        showToast(res.message || 'Failed to update role.', 'error');
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to update role.', 'error');
    } finally {
      setSaving(null);
    }
  };

  const handleToggleStatus = async (userId, currentActive) => {
    setSaving(userId + '-s');
    try {
      const res = await toggleUserStatus(userId, !currentActive);
      if (res.success) {
        showToast(`Account ${!currentActive ? 'activated' : 'deactivated'}.`);
        onUsersChange((prev) =>
          prev.map((u) => u.id === userId ? { ...u, is_active: !currentActive } : u)
        );
      } else {
        showToast(res.message || 'Failed to update status.', 'error');
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to update status.', 'error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-surface-overlay rounded px-3 py-2 border border-surface-border flex-1 max-w-sm">
          <svg className="w-4 h-4 text-text-secondary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or phone…"
            className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full font-body"
          />
        </div>
        <span className="text-xs text-text-muted">
          {filtered.length} of {users.length} accounts
        </span>
      </div>

      {/* Table card */}
      <div className="card overflow-hidden animate-fade-in">
        {loading ? (
          <div className="py-24 flex justify-center">
            <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-text-muted text-sm">
              {users.length === 0 ? 'No accounts registered yet.' : 'No accounts match your search.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border bg-surface-raised/30">
                  {['Account', 'Email', 'Phone', 'Current Role', 'Status', 'Verified', 'Registered', 'Change Role', ''].map((h) => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const hasPending     = !!pending[u.id];
                  const isSavingRole   = saving === u.id;
                  const isSavingStatus = saving === u.id + '-s';

                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-surface-border last:border-0 transition-colors
                        ${hasPending ? 'bg-brand/5' : 'hover:bg-surface-raised/40'}`}
                    >
                      {/* Account name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.full_name} email={u.email} />
                          <p className="text-sm text-text-primary font-medium whitespace-nowrap">
                            {u.full_name || '—'}
                          </p>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 text-sm text-text-secondary font-mono whitespace-nowrap">
                        {u.email}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 text-sm text-text-secondary whitespace-nowrap">
                        {u.phone || '—'}
                      </td>

                      {/* Current role badge */}
                      <td className="py-3 px-4">
                        <RoleBadge roleName={u.role_name} />
                      </td>

                      {/* Active status */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleStatus(u.id, u.is_active)}
                          disabled={!!isSavingStatus}
                          title={u.is_active ? 'Click to deactivate' : 'Click to activate'}
                          className="flex items-center gap-2 disabled:opacity-50"
                        >
                          <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                            ${u.is_active ? 'bg-green-500' : 'bg-surface-border'}`}>
                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform
                              ${u.is_active ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                          </span>
                          <StatusPill active={u.is_active} />
                        </button>
                      </td>

                      {/* Email verified */}
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium ${u.email_verified ? 'text-green-400' : 'text-amber-400'}`}>
                          {u.email_verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>

                      {/* Registration date */}
                      <td className="py-3 px-4 text-xs text-text-muted font-mono whitespace-nowrap">
                        {fShortDate(u.created_at)}
                      </td>

                      {/* Role selector */}
                      <td className="py-3 px-4">
                        <select
                          value={pending[u.id] || u.role_name || ''}
                          onChange={(e) => handleRoleSelect(u.id, u.role_name, e.target.value)}
                          disabled={isSavingRole}
                          className={`bg-surface-overlay border rounded px-3 py-1.5 text-sm font-body outline-none transition-colors disabled:opacity-50
                            ${hasPending ? 'border-brand text-brand' : 'border-surface-border text-text-primary'}`}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </td>

                      {/* Apply button */}
                      <td className="py-3 px-4">
                        {hasPending ? (
                          <button
                            onClick={() => handleApplyRole(u.id)}
                            disabled={isSavingRole}
                            className="flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white text-xs font-display font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                          >
                            {isSavingRole ? (
                              <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                              </svg>
                            )}
                            Apply
                          </button>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
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

      <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast({ msg: '' })} />
    </>
  );
}
