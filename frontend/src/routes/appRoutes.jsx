// src/routes/AppRoutes.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import LoginPage      from '../pages/auth/LoginPage.jsx';
import RegisterPage   from '../pages/auth/RegisterPage.jsx';
import OTPPage        from '../pages/auth/OTPPage.jsx';
import CalendarPage   from '../pages/schedule/CalendarPage.jsx';
import ProfilePage    from '../pages/profile/ProfilePage.jsx';
import ProtectedRoute from '../components/common/ProtectedRoute.jsx';

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
      {/* ── Public routes ───────────────────────────────────── */}
      <Route path="/login"        element={<LoginPage />} />
      <Route path="/register"     element={<RegisterPage />} />
      <Route path="/otp"          element={<OTPPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* ── Dashboard redirects (role-based landing) ────────── */}
      <Route path="/staff/dashboard"   element={<Navigate to="/calendar" replace />} />
      <Route path="/owner/dashboard"   element={<Navigate to="/calendar" replace />} />
      <Route path="/admin/dashboard"   element={<Navigate to="/calendar" replace />} />
      <Route path="/dashboard/staff"   element={<Navigate to="/calendar" replace />} />
      <Route path="/dashboard/owner"   element={<Navigate to="/calendar" replace />} />
      <Route path="/dashboard/admin"   element={<Navigate to="/calendar" replace />} />
      <Route path="/dashboard"         element={<Navigate to="/calendar" replace />} />

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