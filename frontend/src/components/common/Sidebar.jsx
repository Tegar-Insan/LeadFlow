// src/components/common/Sidebar.jsx
// Role-aware collapsible sidebar navigation

import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../utils/constants';

/* ── SVG icons ─────────────────────────────────────────────────────────── */
const icons = {
  overview: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zm9.75-9.75A2.25 2.25 0 0115.75 3.75H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  ai: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zm8.261-9.116L17.25 9l-.824-2.212a2.25 2.25 0 00-1.214-1.214L13 4.75l2.212-.824a2.25 2.25 0 001.214-1.214L17.25 0l.824 2.212a2.25 2.25 0 001.214 1.214L21.5 4.25l-2.212.824a2.25 2.25 0 00-1.214 1.214z" />
    </svg>
  ),
  interactions: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  ),
  publish: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  ),
  dashboard: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
    </svg>
  ),
  plus: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  signout: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  ),
};

const NAV_BY_ROLE = {
  admin: [
    { to: '/admin',                  label: 'All Accounts',    icon: icons.overview      },
    { to: '/admin/marketing-staff',  label: 'Marketing Staff', icon: icons.interactions  },
    { to: '/admin/business-owners',  label: 'Business Owners', icon: icons.dashboard     },
    { to: '/profile',                label: 'Profile',         icon: icons.publish       },
  ],
  business_owner: [
    { to: '/dashboard/owner', label: 'Dashboard',        icon: icons.dashboard },
    { to: '/calendar',        label: 'Content Calendar', icon: icons.calendar },
  ],
  marketing_staff: [
    { to: '/dashboard/staff', label: 'Overview',         icon: icons.overview },
    { to: '/calendar',        label: 'Content Calendar', icon: icons.calendar },
    { to: '/ai-generator',    label: 'AI Generator',     icon: icons.ai },
    { to: '/interactions',    label: 'Interactions',     icon: icons.interactions },
    { to: '/publish-status',  label: 'Publish Status',   icon: icons.publish },
  ],
};

function NavItem({ to, label, icon }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <Link
      to={to}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body font-medium
        transition-all duration-200
        ${isActive
          ? 'bg-surface-raised text-gold border-l-2 border-brand pl-[10px]'
          : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03] border-l-2 border-transparent'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, roleName, logout } = useAuth();
  const navigate  = useNavigate();
  const navItems  = NAV_BY_ROLE[roleName] || [];
  const roleLabel = ROLE_LABELS[roleName] || '';

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
        fixed lg:sticky top-0 left-0 z-40 h-screen w-56 flex flex-col
        bg-surface border-r border-surface-border
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-surface-border">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center glow-red shrink-0">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
              </svg>
            </div>
            <span className="font-display font-extrabold text-xl text-text-primary tracking-tight">
              Lead<span className="text-brand">Flow</span>
            </span>
          </div>

          {/* Create Post button — hidden for admin */}
          {roleName !== 'admin' && <Link
            to="/calendar"
            state={{ openCreate: true }}
            className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-display font-bold text-sm rounded-lg py-2.5 px-4 transition-all duration-200 active:scale-[0.98]"
            style={{ boxShadow: '0 10px 20px -5px rgba(227,24,55,0.3)' }}
          >
            {icons.plus}
            Create Post
          </Link>}
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-surface-border space-y-2">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-bold font-display text-sm shrink-0">
              {(user?.fullName || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary truncate font-body">
                {user?.fullName || 'User'}
              </p>
              <p className="text-xs text-text-secondary font-body truncate">{roleLabel}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-body font-medium text-text-secondary hover:text-text-primary hover:bg-white/[0.03] transition-all duration-200"
          >
            {icons.signout}
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
