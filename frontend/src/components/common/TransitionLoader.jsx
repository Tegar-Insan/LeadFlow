/**
 * TransitionLoader.jsx
 * Shows the KineticLoader whenever React Router navigates to a new page.
 * Covers every navigate() call — including those that pass state data
 * (Register → OTP, OTP → Login, Login → Dashboard, etc.).
 *
 * Uses a transparent blur overlay (backdrop-blur) so the current page
 * bleeds through while the glassmorphism card sits on top.
 *
 * Sits inside <BrowserRouter> so useLocation() is available.
 * Added to App.jsx so it covers the entire route tree automatically.
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { KineticLoader } from './KineticLoader';

// How long the loader stays visible after a navigation fires (ms).
const TRANSITION_DURATION = 380;

// Label shown per destination route.
const ROUTE_LABELS = {
  '/login':     'Authenticating…',
  '/register':  'Preparing Registration…',
  '/otp':       'Sending Verification…',
  '/calendar':  'Loading Calendar…',
  '/profile':   'Loading Profile…',
  '/schedule':  'Loading Schedule…',
  '/admin':     'Loading Admin Panel…',
  '/dashboard': 'Loading Dashboard…',
};

function getLabel(pathname) {
  // exact match first
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  // prefix match for nested routes (/admin/marketing-staff, etc.)
  const prefix = Object.keys(ROUTE_LABELS).find(k => pathname.startsWith(k));
  return prefix ? ROUTE_LABELS[prefix] : 'Loading…';
}

export default function TransitionLoader() {
  const location  = useLocation();
  const isFirst   = useRef(true);   // skip the very first render (initial page load)
  const timerRef  = useRef(null);
  const [active, setActive]     = useState(false);
  const [message, setMessage]   = useState('Loading…');

  useEffect(() => {
    // Don't flash loader on the initial page load — only on subsequent navigations
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    // Clear any previous timer so rapid navigations don't stack
    if (timerRef.current) clearTimeout(timerRef.current);

    setMessage(getLabel(location.pathname));
    setActive(true);

    timerRef.current = setTimeout(() => {
      setActive(false);
    }, TRANSITION_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [location.key]); // location.key is unique per navigation event

  if (!active) return null;

  return <KineticLoader message={message} overlay />;
}
