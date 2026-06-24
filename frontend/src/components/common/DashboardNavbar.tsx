import Notification from './Notification';

interface DashboardNavbarProps {
  onMenuToggle?: () => void;
}

export default function DashboardNavbar({ onMenuToggle }: DashboardNavbarProps) {
  return (
    <header className="calendar-topbar relative z-40 flex items-center gap-3 px-5 py-3 flex-shrink-0 border-b border-surface-border bg-surface">

      {/* Mobile menu toggle */}
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      )}

      <div className="ml-auto flex items-center">
        <Notification />
      </div>
    </header>
  );
}
