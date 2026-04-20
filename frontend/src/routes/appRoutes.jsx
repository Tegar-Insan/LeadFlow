// src/routes/AppRoutes.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import LoginPage               from '../pages/auth/LoginPage.jsx';
import RegisterPage            from '../pages/auth/RegisterPage.jsx';
import OTPPage                 from '../pages/auth/OTPPage.jsx';
import TikTokStatusPage        from '../pages/auth/TikTokStatusPage.jsx';
import CalendarPage            from '../pages/schedule/CalendarPage.jsx';
import ProfilePage             from '../pages/profile/ProfilePage.jsx';
import AdminAllUsersPage       from '../pages/dashboard/AdminAllUsersPage.jsx';
import AdminMarketingStaffPage from '../pages/dashboard/AdminMarketingStaffPage.jsx';
import AdminBusinessOwnersPage from '../pages/dashboard/AdminBusinessOwnersPage.jsx';
import ProtectedRoute, { GuestRoute } from '../components/common/ProtectedRoute.jsx';

function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center animate-slide-up">
        <p className="text-6xl font-display font-extrabold text-brand mb-4">403</p>
        <p className="text-text-secondary text-lg font-body font-medium">Access Denied</p>
        <a href="/login" className="mt-4 inline-block text-sm text-brand hover:text-brand-light font-body font-semibold transition-colors">
          ← Back to Login
        </a>
      </div>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* ── Public routes (GuestRoute bounces authenticated users to their dashboard) */}
      <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/otp"              element={<OTPPage />} />
      <Route path="/tiktok/callback"  element={<TikTokStatusPage />} />
      <Route path="/unauthorized"     element={<UnauthorizedPage />} />

      {/* ── Admin — 3 separate pages, all admin-only ─────────── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminAllUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/marketing-staff"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminMarketingStaffPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/business-owners"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminBusinessOwnersPage />
          </ProtectedRoute>
        }
      />
      {/* Legacy alias → Page 1 */}
      <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />

      {/* ── Protected routes ────────────────────────────────── */}
      <Route
        path="/calendar"
        element={
          <ProtectedRoute allowedRoles={['marketing_staff', 'business_owner', 'admin']}>
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['marketing_staff', 'business_owner', 'admin']}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* ── Fallback — MUST be last ──────────────────────────── */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
