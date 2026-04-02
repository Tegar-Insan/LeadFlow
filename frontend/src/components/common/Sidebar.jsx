// src/components/common/Sidebar.jsx
// Role-aware collapsible sidebar navigation

import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { ROLE_LABELS, ROLE_COLORS } from '../../utils/constants';

const NAV_BY_ROLE = {
  admin: [
    { to: '/dashboard/admin', label: 'Overview', icon: '🗂️' },
  ],
  business_owner: [
    { to: '/dashboard/owner', label: 'Dashboard', icon: '📊' },
  ],
  marketing_staff: [
    { to: '/dashboard/staff',  label: 'Overview',         icon: '🏠' },
    { to: '/calendar',         label: 'Content Calendar',  icon: '📅' },
    { to: '/ai-generator',     label: 'AI Generator',      icon: '🤖' },
    { to: '/interactions',     label: 'Interactions',      icon: '💬' },
    { to: '/publish-status',   label: 'Publish Status',    icon: '📤' },
  ],
};

function NavItem({ to, label, icon }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
        ${isActive
          ? 'bg-brand/10 text-brand border border-brand/20'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
        }`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, roleName, logout } = useAuth();
  const navigate  = useNavigate();
  const navItems  = NAV_BY_ROLE[roleName] || [];
  const roleLabel = ROLE_LABELS[roleName] || '';
  const roleColor = ROLE_COLORS[roleName] || '';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed lg:sticky top-0 left-0 z-40 h-screen w-64 flex flex-col
        bg-surface border-r border-surface-border
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-surface-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shadow shadow-brand/30">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
            </svg>
          </div>
          <span className="font-display font-bold text-lg text-text-primary">
            Lead<span className="text-brand">Flow</span>
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-surface-border space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold font-display text-sm shrink-0">
              {(user?.fullName || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">
                {user?.fullName || 'User'}
              </p>
              <span className={`role-badge border text-xs ${roleColor}`}>{roleLabel}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
