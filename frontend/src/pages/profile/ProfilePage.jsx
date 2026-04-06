/**
 * ProfilePage.jsx
 * User profile — email, role, phone number
 * LeadFlow – Krench Chicken
 */

import React, { useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import Sidebar from '../../components/common/Sidebar';
import Navbar  from '../../components/common/Navbar';
import { useState } from 'react';

const ROLE_CONFIG = {
  admin:           { label: 'Admin',           cls: 'status-scheduled' },
  business_owner:  { label: 'Business Owner',  cls: 'status-draft' },
  marketing_staff: { label: 'Marketing Staff', cls: 'status-live' },
};

const InfoRow = ({ icon, label, value, placeholder }) => (
  <div className="flex items-center gap-4 py-4 border-b border-surface-border last:border-b-0">
    <div className="w-10 h-10 rounded-xl bg-surface-overlay border border-surface-border flex items-center justify-center flex-shrink-0 text-text-secondary">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-body font-semibold text-text-secondary uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-body font-medium text-text-primary truncate">
        {value || <span className="text-text-muted italic">{placeholder || '—'}</span>}
      </p>
    </div>
  </div>
);

const ProfilePage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const authCtx  = useContext(AuthContext);
  const user     = authCtx?.user;
  const roleName = user?.roleName || user?.role_name;
  const roleCfg  = ROLE_CONFIG[roleName] || { label: roleName || 'User', cls: 'status-draft' };

  const initials = (user?.fullName || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1 p-8 animate-fade-in">
          <div className="max-w-2xl mx-auto">

            {/* Page header */}
            <div className="mb-8">
              <p className="text-text-secondary text-xs font-body font-semibold uppercase tracking-widest mb-2">Account</p>
              <h1 className="font-display font-extrabold text-4xl text-text-primary tracking-tight">My Profile</h1>
              <p className="text-text-secondary font-body text-base mt-1">Your LeadFlow account information</p>
            </div>

            {/* Card */}
            <div className="card overflow-hidden">

              {/* Banner */}
              <div className="h-24 bg-gradient-to-r from-brand via-brand-dark to-[#7b0000]" />

              {/* Avatar + role */}
              <div className="px-6 pb-6">
                <div className="flex items-end justify-between -mt-10 mb-5">
                  <div className="w-20 h-20 rounded-full bg-brand border-4 border-surface-raised flex items-center justify-center glow-red">
                    <span className="font-display font-extrabold text-2xl text-white">{initials}</span>
                  </div>
                  <span className={roleCfg.cls}>{roleCfg.label}</span>
                </div>
                <h2 className="font-display font-bold text-xl text-text-primary tracking-tight">{user?.fullName || 'User'}</h2>
                <p className="text-sm text-text-secondary font-body mt-0.5">Krench Chicken · Bogor, Indonesia</p>
              </div>

              <div className="h-px bg-surface-border" />

              {/* Info rows */}
              <div className="px-6">
                <InfoRow
                  label="Email Address"
                  value={user?.email}
                  placeholder="No email set"
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>}
                />
                <InfoRow
                  label="Role"
                  value={roleCfg.label}
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
                />
                <InfoRow
                  label="Phone Number"
                  value={user?.phone}
                  placeholder="No phone number set"
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>}
                />
                <InfoRow
                  label="Account Status"
                  value={user?.isActive !== false ? 'Active' : 'Inactive'}
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>}
                />
              </div>

              <div className="h-px bg-surface-border" />

              <div className="px-6 py-4">
                <p className="text-xs text-text-muted font-body text-center">
                  To update your profile information, please contact your administrator.
                </p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <a href="/calendar" className="text-sm text-brand hover:text-brand-light font-body font-semibold transition-colors">
                ← Back to Calendar
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;
