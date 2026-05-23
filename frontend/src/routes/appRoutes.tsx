import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import LoginPage               from '../pages/auth/LoginPage';
import RegisterPage            from '../pages/auth/RegisterPage';
import OTPPage                 from '../pages/auth/OTPPage';
import TikTokStatusPage        from '../pages/auth/TikTokStatusPage';
import CalendarPage            from '../pages/schedule/CalendarPage';
import OwnerDashboard          from '../pages/dashboard/OwnerDashboard';
import PromptPage              from '../pages/content/PromptPage';
import GeneratedIdeasPage      from '../pages/content/GeneratedIdeasPage';
import IdeaValidationPage      from '../pages/content/IdeaValidationPage';
import ListPage                from '../pages/schedule/ListPage';
import ProfilePage             from '../pages/profile/ProfilePage';
import AdminAllUsersPage       from '../pages/dashboard/AdminAllUsersPage';
import AdminMarketingStaffPage from '../pages/dashboard/AdminMarketingStaffPage';
import AdminBusinessOwnersPage from '../pages/dashboard/AdminBusinessOwnersPage';
import AdminProfilePage        from '../pages/dashboard/AdminProfilePage';
import InteractionPage         from '../pages/interaction/InteractionPage';
import ProtectedRoute, { GuestRoute } from '../components/common/ProtectedRoute';

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
      <Route path="/login"       element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/login/admin" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register"    element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/otp"              element={<OTPPage />} />
      <Route path="/tiktok/callback"  element={<TikTokStatusPage />} />
      <Route path="/unauthorized"     element={<UnauthorizedPage />} />
      <Route path="/content/prompt"   element={<ProtectedRoute allowedRoles={['marketing_staff', 'business_owner']}><PromptPage /></ProtectedRoute>} />
      <Route path="/calendar/ideas"    element={<ProtectedRoute allowedRoles={['marketing_staff', 'business_owner']}><GeneratedIdeasPage /></ProtectedRoute>} />
      <Route path="/ideas"            element={<Navigate to="/calendar/ideas" replace />} />
      <Route path="/content/ideas"    element={<Navigate to="/calendar/ideas" replace />} />
      <Route path="/content/validate" element={<ProtectedRoute allowedRoles={['marketing_staff', 'business_owner']}><IdeaValidationPage /></ProtectedRoute>} />

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
      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminProfilePage />
          </ProtectedRoute>
        }
      />
      {/* Legacy alias → Page 1 */}
      <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />

      {/* ── Protected routes ────────────────────────────────── */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['business_owner']}>
            <OwnerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={<Navigate to="/calendar/month" replace />}
      />
      <Route
        path="/calendar/day"
        element={
          <ProtectedRoute allowedRoles={['marketing_staff', 'business_owner']}>
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar/week"
        element={
          <ProtectedRoute allowedRoles={['marketing_staff', 'business_owner']}>
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar/month"
        element={
          <ProtectedRoute allowedRoles={['marketing_staff', 'business_owner']}>
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar/list"
        element={
          <ProtectedRoute allowedRoles={['marketing_staff', 'business_owner']}>
            <ListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['marketing_staff', 'business_owner']}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interaction"
        element={
          <ProtectedRoute allowedRoles={['marketing_staff', 'business_owner']}>
            <InteractionPage />
          </ProtectedRoute>
        }
      />

      {/* ── Fallback — MUST be last ──────────────────────────── */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
