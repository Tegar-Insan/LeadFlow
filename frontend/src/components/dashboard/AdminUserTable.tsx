// src/components/dashboard/AdminUserTable.jsx
// Reusable registered-user table for all 3 admin pages

import { useState } from 'react';
import { ROLE_LABELS, ROLE_COLORS } from '../../utils/constants';
import { fShortDate } from '../../utils/formatDate';
import { updateUserRole, toggleUserStatus, createUser } from '../../services/adminService';
import { InlineLoader } from '../common/KineticLoader';

const ROLE_OPTIONS = [
  { value: 'admin',           label: 'Admin'           },
  { value: 'business_owner',  label: 'Business Owner'  },
  { value: 'marketing_staff', label: 'Marketing Staff' },
];

// ── Small sub-components ──────────────────────────────────────────────────────

function Avatar({ name, email }) {
  const letter = (name || email || 'U')[0].toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-black text-sm font-bold font-headline shrink-0">
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

// ── Add Account Modal ─────────────────────────────────────────────────────────

const EMPTY_FORM = { fullName: '', email: '', phone: '', roleName: 'marketing_staff', password: '' };

function AddAccountModal({ onClose, onCreated }) {
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');
  const [showPw,  setShowPw]  = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) {
      setErr('Full name, email, and password are required.');
      return;
    }
    if (form.password.length < 8) {
      setErr('Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      const res = await createUser({
        fullName: form.fullName.trim(),
        email:    form.email.trim().toLowerCase(),
        phone:    form.phone.trim() || undefined,
        roleName: form.roleName,
        password: form.password,
      });
      if (res.success) {
        onCreated(res.data);
      } else {
        setErr(res.message || 'Failed to create account.');
      }
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to create account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#191919]/90 backdrop-blur-2xl rounded-2xl border border-white/[0.08] w-full max-w-md animate-fade-in"
        style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 pb-4">
          <h2 className="text-base font-headline font-bold text-text-primary">Add Account</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {err && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              {err}
            </p>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Full Name *</label>
            <input
              type="text"
              value={form.fullName}
              onChange={set('fullName')}
              placeholder="e.g. Budi Santoso"
              className="w-full bg-transparent border-0 border-b border-white/15 px-0 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-brand transition-colors font-body"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="e.g. budi@krench.id"
              className="w-full bg-transparent border-0 border-b border-white/15 px-0 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-brand transition-colors font-body"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              placeholder="e.g. 0812-3456-7890"
              className="w-full bg-transparent border-0 border-b border-white/15 px-0 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-brand transition-colors font-body"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Role *</label>
            <select
              value={form.roleName}
              onChange={set('roleName')}
              className="w-full bg-transparent border-0 border-b border-white/15 px-0 py-2 text-sm text-text-primary outline-none focus:border-brand transition-colors font-body"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Password *</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder="Min. 8 characters"
                className="w-full bg-transparent border-0 border-b border-white/15 px-0 py-2 pr-8 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-brand transition-colors font-body"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {showPw
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>
                    : <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></>
                  }
                </svg>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-headline font-bold text-text-secondary hover:text-text-primary border border-white/[0.15] rounded-lg transition-colors hover:bg-white/[0.04]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-brand hover:bg-brand-dark text-black text-sm font-headline font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 hover:shadow-[0_0_16px_rgba(246,183,10,0.3)]"
            >
              {saving ? <InlineLoader size="sm" className="text-white" /> : null}
              {saving ? 'Creating…' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main table ────────────────────────────────────────────────────────────────

export default function AdminUserTable({ users, loading, onUsersChange }) {
  const [search,     setSearch]     = useState('');
  const [pending,    setPending]    = useState({}); // { userId: newRole }
  const [saving,     setSaving]     = useState(null);
  const [toast,      setToast]      = useState({ msg: '', type: 'success' });
  const [showAddModal, setShowAddModal] = useState(false);

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
      {/* Search + Add */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2 border border-white/[0.08] flex-1 max-w-sm backdrop-blur-sm">
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
        <span className="text-xs text-text-muted flex-1">
          {filtered.length} of {users.length} accounts
        </span>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-black text-sm font-headline font-bold px-4 py-2 rounded-lg transition-all active:scale-95 whitespace-nowrap hover:shadow-[0_0_16px_rgba(246,183,10,0.3)]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
          Add Account
        </button>
      </div>

      {/* Table card */}
      <div className="card overflow-hidden animate-fade-in">
        {loading ? (
          <div className="py-24 flex justify-center">
            <InlineLoader size="lg" />
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
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
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
                      className={`border-b border-white/[0.05] last:border-0 transition-colors
                        ${hasPending ? 'bg-brand/[0.06]' : 'hover:bg-white/[0.03]'}`}
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
                          className={`bg-white/[0.04] border rounded px-3 py-1.5 text-sm font-body outline-none transition-colors disabled:opacity-50
                            ${hasPending ? 'border-brand text-brand' : 'border-white/[0.12] text-text-primary'}`}
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
                            className="flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-black text-xs font-headline font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap hover:shadow-[0_0_12px_rgba(246,183,10,0.3)]"
                          >
                            {isSavingRole ? (
                              <InlineLoader size="sm" className="text-white" />
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

      <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast({ msg: '', type: 'success' })} />

      {showAddModal && (
        <AddAccountModal
          onClose={() => setShowAddModal(false)}
          onCreated={(newUser) => {
            setShowAddModal(false);
            showToast(`Account created for ${newUser.email}.`);
            // Append a skeleton row so the table refreshes; parent will refetch on next load
            onUsersChange((prev) => [
              {
                id:             newUser.userId,
                email:          newUser.email,
                role_name:      newUser.roleName,
                full_name:      null,
                phone:          null,
                is_active:      true,
                email_verified: true,
                created_at:     new Date().toISOString(),
              },
              ...prev,
            ]);
          }}
        />
      )}
    </>
  );
}
