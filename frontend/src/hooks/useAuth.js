// src/hooks/useAuth.js
// Custom hook — wraps AuthContext for clean imports across components

import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

/**
 * useAuth — access authentication state and actions
 *
 * Returns:
 *   user            — current user object or null
 *   isLoading       — true while session is being restored
 *   isAuthenticated — boolean
 *   dashboardPath   — role-appropriate dashboard URL
 *   login()         — authenticate user
 *   logout()        — clears session
 *   register()      — initiate registration
 *   verifyOTP()     — complete OTP verification
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export default useAuth;