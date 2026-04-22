// src/components/common/DirectAccessGuard.jsx
// Blocks direct URL address-bar access to protected pages.
// Uses sessionStorage to track whether the user entered through an allowed entry point.
// Authenticated users with a valid token are always allowed through.
// Pages in EXCEPTION_ROUTES bypass this guard entirely.

import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const SESSION_KEY = 'leadflow_app_session';

// Routes that can be accessed directly via address bar regardless of session state.
// All other routes require either (a) an active app session, or (b) a valid auth token.
const EXCEPTION_ROUTES = [
  '/login',
  '/login/admin',
  '/register',
  '/tiktok/callback',
  '/unauthorized',
  '/calendar',
];

function isExceptionRoute(pathname) {
  return EXCEPTION_ROUTES.some(
    route => pathname === route || pathname.startsWith(route + '/')
  );
}

export default function DirectAccessGuard({ children }) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const didCheck   = useRef(false);

  // On first mount only — decide whether to allow or block.
  useEffect(() => {
    if (isLoading)       return; // wait until auth state is known
    if (didCheck.current) return;
    didCheck.current = true;

    const hasSession  = Boolean(sessionStorage.getItem(SESSION_KEY));
    const isException = isExceptionRoute(location.pathname);

    // Block: no active session + not authenticated + not an exception route
    if (!hasSession && !isAuthenticated && !isException) {
      navigate('/login', { replace: true, state: { directAccess: true } });
    }
  }, [isLoading, isAuthenticated, location.pathname, navigate]);

  // Mark the session as active after every route render so future navigation
  // within the same tab (including address-bar edits) works normally.
  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, '1');
  }, [location.pathname]);

  return children;
}
