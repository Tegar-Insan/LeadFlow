import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

interface SmallSidebarProps {
  currentPath?: string;
  className?: string;
}

interface NavItem {
  key: 'calendar' | 'interaction';
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    key: 'calendar',
    label: 'Calendar',
    path: '/calendar/month',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    key: 'interaction',
    label: 'Interaction',
    path: '/interaction',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
  },
];

export default function SmallSidebar({ currentPath, className = '' }: SmallSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const activePath = currentPath ?? location.pathname;

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
