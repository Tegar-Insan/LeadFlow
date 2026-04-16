// src/components/common/Navbar.jsx
// Top navigation bar for dashboard pages

import useAuth from '../../hooks/useAuth';
import { nowWIB } from '../../utils/formatDate';

export default function Navbar({ onMenuToggle }) {
  const { user } = useAuth();
  const timeNow = nowWIB().format('HH:mm');

  return (
    <header className="sticky top-0 z-20 bg-[#0e0e0e]/90 backdrop-blur-md border-b border-white/[0.06] h-16 px-6 flex items-center gap-4">
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

      {/* Brand logo */}
      <img src="/logo.png" alt="Krench Chicken" className="h-8 w-auto object-contain shrink-0" />

      {/* Search bar */}
      <div className="hidden md:flex flex-1 max-w-sm items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2 border border-white/[0.08] backdrop-blur-sm">
        <svg className="w-4 h-4 text-text-secondary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full font-body"
          readOnly
        />
      </div>

      <div className="flex-1 md:flex-none" />

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* TikTok API status */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
          <span className="text-xs font-body text-text-secondary">TikTok API: Connected</span>
        </div>

        {/* Jakarta time badge */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-muted bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded font-mono">
          {timeNow} WIB
        </div>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-black font-bold font-headline text-sm shrink-0">
          {(user?.fullName || user?.email || 'U')[0].toUpperCase()}
        </div>
      </div>
    </header>
  );
}
