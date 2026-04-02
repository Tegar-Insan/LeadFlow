// src/components/common/Navbar.jsx
// Top navigation bar for dashboard pages

import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { ROLE_LABELS, ROLE_COLORS } from '../../utils/constants';
import { nowJakarta } from '../../utils/formatDate';

export default function Navbar({ onMenuToggle }) {
  const { user, roleName } = useAuth();
  const roleLabel = ROLE_LABELS[roleName] || roleName;
  const roleColor = ROLE_COLORS[roleName] || '';
  const timeNow   = nowJakarta().format('HH:mm [WIB]');

  return (
    <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur-sm border-b border-surface-border px-6 py-3.5 flex items-center gap-4">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden text-text-secondary hover:text-text-primary transition-colors"
        aria-label="Toggle sidebar"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      <div className="flex-1" />

      {/* Jakarta time badge */}
      <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-muted bg-surface-raised border border-surface-border px-3 py-1.5 rounded-lg font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        {timeNow} · GMT+7
      </div>

      {/* User chip */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold font-display text-sm">
          {(user?.fullName || user?.email || 'U')[0].toUpperCase()}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-text-primary leading-tight">
            {user?.fullName || 'User'}
          </p>
          <span className={`role-badge border text-xs ${roleColor}`}>{roleLabel}</span>
        </div>
      </div>
    </header>
  );
}
