// src/hooks/useAuth.js
// Custom hook — wraps AuthContext for clean imports across components

import { useAuth as _useAuth } from '../context/AuthContext';

/**
 * useAuth — access authentication state and actions
 *
 * Returns:
 *   user            — current user object or null
 *   loading         — true while session is being restored
 *   isAuthenticated — boolean
 *   roleName        — 'admin' | 'business_owner' | 'marketing_staff' | null
 *   dashboardPath   — role-appropriate dashboard URL
 *   isAdmin / isOwner / isStaff  — boolean role shortcuts
 *   login(email, password)       — returns user on success, throws on failure
 *   logout()                     — clears session and redirects
 *   completeRegistration(email, otp) — finalises OTP-based registration
 */
export function useAuth() {
  return _useAuth();
}

export default useAuth;
