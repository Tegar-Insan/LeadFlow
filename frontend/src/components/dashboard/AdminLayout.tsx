// src/components/dashboard/AdminLayout.jsx
// Shared shell for all 3 admin pages — Sidebar + Navbar + page sub-nav

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Sidebar from '../common/Sidebar';
import DashboardNavbar from '../common/DashboardNavbar';

const ADMIN_PAGES = [
  { to: '/admin',                  label: 'All Accounts'   },
  { to: '/admin/marketing-staff',  label: 'Marketing Staff' },
  { to: '/admin/business-owners',  label: 'Business Owners' },
];

function AdminSubNav() {
  const { pathname } = useLocation();

  return (
    <div className="flex items-center gap-1 mb-6">
      {ADMIN_PAGES.map((page) => {
        const isActive = pathname === page.to;
        return (
          <Link
            key={page.to}
            to={page.to}
            className={`px-4 py-2.5 text-sm font-headline font-bold transition-all border-b-2
              ${isActive
                ? 'border-brand text-brand'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-white/[0.15]'
              }`}
          >
            {page.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function AdminLayout({ title, subtitle, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar onMenuToggle={() => setSidebarOpen((o) => !o)} />

        <main className="flex-1 p-6">
          {/* Page header */}
          <div className="mb-6 animate-fade-in">
            <p className="text-text-secondary text-xs font-body font-semibold uppercase tracking-widest mb-2">
              System Administration
            </p>
            <h1 className="font-headline font-bold text-4xl text-text-primary tracking-tight mb-1">
              {title}
            </h1>
            {subtitle && (
              <p className="text-text-secondary text-base font-body">{subtitle}</p>
            )}
          </div>

          {/* Sub-navigation (Page 1 / 2 / 3) */}
          <AdminSubNav />

          {/* Page content */}
          {children}
        </main>
      </div>
    </div>
  );
}
