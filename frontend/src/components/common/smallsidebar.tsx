import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

interface SmallSidebarProps {
  currentPath?: string;
  className?: string;
}

interface NavItem {
  key: 'calendar' | 'dashboard';
  label: string;
  path: string;
  icon: React.ReactNode;
}

const getCalendarIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

const getDashboardIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5h3.75V21H3v-7.5zM10.125 8.25h3.75V21h-3.75V8.25zM17.25 3h3.75v18h-3.75V3z" />
  </svg>
);

function getNavItems(role?: string): NavItem[] {
  const isBusinessOwner = role === 'business_owner';
  const calendarPath = isBusinessOwner ? '/dashboard/calendar/read-only' : '/calendar/month';

  const items: NavItem[] = [];

  // Dashboard is scoped to business_owner only — marketing staff/admin have their own landing pages.
  if (isBusinessOwner) {
    items.push({
      key: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: getDashboardIcon(),
    });
  }

  items.push({
    key: 'calendar',
    label: 'Calendar',
    path: calendarPath,
    icon: getCalendarIcon(),
  });

  return items;
}

export default function SmallSidebar({ currentPath, className = '' }: SmallSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const activePath = currentPath ?? location.pathname;

  // Generate nav items based on user role
  const navItems = getNavItems(user?.role || user?.roleName);

  return (
    <aside
      className={`hidden md:flex h-screen shrink-0 flex-col items-center border-r border-gray-300 bg-white py-4 text-gray-900 ${className}`}
      style={{ width: 72 }}
    >
      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
        <img src="/logo.png" alt="Krench Chicken" className="h-7 w-auto object-contain" />
      </div>

      {/* Profile button below logo */}
      <button
        type="button"
        aria-label="Profile"
        title="Profile"
        onClick={() => navigate('/profile')}
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-300 bg-gray-100 text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
      >
        <span className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-black font-bold font-headline text-sm">
          {(user?.fullName || user?.email || 'U')[0].toUpperCase()}
        </span>
      </button>

      <nav className="flex flex-1 flex-col items-center gap-3">
        {navItems.map((item) => {
          const isActive = activePath === item.path || activePath.startsWith(`${item.path}/`);
          return (
            <button
              key={item.key}
              type="button"
              aria-label={item.label}
              title={item.label}
              onClick={() => navigate(item.path)}
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-200 ${
                isActive
                  ? 'border-amber-400 bg-amber-300 text-gray-900 shadow-[0_0_24px_rgba(251,191,36,0.35)]'
                  : 'border-gray-300 bg-gray-100 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              {item.icon}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
