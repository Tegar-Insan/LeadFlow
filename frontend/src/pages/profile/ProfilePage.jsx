/**
 * ProfilePage.jsx
 * User profile — email, role, phone number
 * LeadFlow – Krench Chicken
 */

import React, { useContext } from 'react';
import AuthContext from '../../context/AuthContext';

const ROLE_CONFIG = {
  admin:           { label: 'Admin',           color: 'bg-red-50 text-red-600 border-red-200' },
  business_owner:  { label: 'Business Owner',  color: 'bg-purple-50 text-purple-600 border-purple-200' },
  marketing_staff: { label: 'Marketing Staff', color: 'bg-pink-50 text-pink-600 border-pink-200' },
};

const InfoRow = ({ icon, label, value, placeholder }) => (
  <div className="flex items-center gap-4 py-4 border-b border-zinc-100 last:border-b-0">
    <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0 text-zinc-400">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-zinc-800 truncate">
        {value || <span className="text-zinc-300 italic">{placeholder || '—'}</span>}
      </p>
    </div>
  </div>
);

const ProfilePage = () => {
  const authCtx  = useContext(AuthContext);
  const user     = authCtx?.user;
  const roleName = user?.roleName || user?.role_name;
  const roleCfg  = ROLE_CONFIG[roleName] || { label: roleName || 'User', color: 'bg-zinc-100 text-zinc-600 border-zinc-200' };

  const initials = (user?.fullName || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-zinc-50 font-dm-sans">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-syne font-extrabold text-2xl text-zinc-800">My Profile</h1>
          <p className="text-sm text-zinc-400 mt-1">Your LeadFlow account information</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">

          {/* Banner */}
          <div className="h-24 bg-gradient-to-r from-pink-400 via-pink-500 to-rose-500" />

          {/* Avatar + role */}
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-5">
              <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center">
                <span className="font-syne font-extrabold text-2xl text-pink-500">{initials}</span>
              </div>
              <span className={`text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full border ${roleCfg.color}`}>
                {roleCfg.label}
              </span>
            </div>
            <h2 className="font-syne font-bold text-xl text-zinc-800">{user?.fullName || 'User'}</h2>
            <p className="text-sm text-zinc-400 mt-0.5">Krench Chicken · Bogor, Indonesia</p>
          </div>

          <div className="h-px bg-zinc-100" />

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
              value={user?.isActive !== false ? '✓ Active' : '✗ Inactive'}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>}
            />
          </div>

          <div className="h-px bg-zinc-100" />

          <div className="px-6 py-4 bg-zinc-50">
            <p className="text-xs text-zinc-400 text-center">
              To update your profile information, please contact your administrator.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/calendar" className="text-sm text-pink-500 hover:text-pink-400 font-semibold transition-colors">
            ← Back to Calendar
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;