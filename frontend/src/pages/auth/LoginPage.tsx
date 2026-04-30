import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { CSSProperties } from 'react';
import useAuth from '../../hooks/useAuth';
import DotCanvas from '../../components/common/DotCanvas';
import FeatureCard from '../../components/common/FeatureCard';
import LoginForm from '../../components/auth/LoginForm';

const FEATURES = [
  {
    title: 'AI Content Ideas',
    description: 'Neural-mapped trending topics generated instantly for your niche.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 28, height: 28 }}>
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    title: 'Easy Schedule',
    description: 'Easy management schedule, relax and set publish to TikTok.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 28, height: 28 }}>
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    title: 'Unified Inbox',
    description: 'Centralized command center for all your community engagement.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 28, height: 28 }}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: 'Analytics',
    description: 'Deep-dive metrics with real-time conversion tracking.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 28, height: 28 }}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

const KEYFRAMES = `
  @keyframes lp-bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
    40%           { transform: translateY(-10px); opacity: 1; }
  }
  @keyframes lp-progress {
    0%   { width: 0%; }
    60%  { width: 85%; }
    80%  { width: 92%; }
    100% { width: 100%; }
  }
  .lp-dot               { animation: lp-bounce 1.2s ease-in-out infinite; }
  .lp-dot-0             { animation-delay: 0s; }
  .lp-dot-1             { animation-delay: 0.2s; }
  .lp-dot-2             { animation-delay: 0.4s; }
  .lp-dot-3             { animation-delay: 0.6s; }
  .lp-dot-4             { animation-delay: 0.8s; }
  .lp-progress-fill     { animation: lp-progress 2.4s ease-in-out forwards; }
`;

function RedirectOverlay() {
  const overlayStyle: CSSProperties = {
    position: 'fixed', inset: 0,
    background: '#ffffff',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 28, zIndex: 9999,
  };

  return (
    <div style={overlayStyle}>
      <style>{KEYFRAMES}</style>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`lp-dot lp-dot-${i}`}
            style={{ width: 13, height: 13, borderRadius: '50%', background: '#f5c518' }}
          />
        ))}
      </div>
      <div style={{ width: 200, height: 3, background: '#fdeea0', borderRadius: 99, overflow: 'hidden' }}>
        <div className="lp-progress-fill" style={{ height: '100%', background: '#f5c518', borderRadius: 99 }} />
      </div>
    </div>
  );
}

const Logo: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 52 }}>
    <div style={{
      width: 38, height: 38, background: '#f5c518',
      borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <svg viewBox="0 0 20 20" fill="none" style={{ width: 20, height: 20 }}>
        <path d="M10 2L14 8H6L10 2Z" fill="#111" />
        <rect x="7" y="10" width="6" height="7" rx="1" fill="#111" />
      </svg>
    </div>
    <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', color: '#111', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>
      Krench Chicken
    </span>
  </div>
);

export default function LoginPage() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { login, dashboardPath, isAuthenticated } = useAuth();
  const [loading,     setLoading]     = useState(false);
  const [apiError,    setApiError]    = useState('');
  const [loginDone,   setLoginDone]   = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? null;

  useEffect(() => {
    if (isAuthenticated && loginDone) {
      const dest = from ?? dashboardPath ?? '/calendar';
      const timer = setTimeout(() => navigate(dest, { replace: true }), 2600);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, loginDone]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async ({ email, password }: { email: string; password: string }) => {
    setApiError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      setRedirecting(true);
      setLoginDone(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setApiError(e.response?.data?.message ?? e.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (redirecting) return <RedirectOverlay />;

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: '#ffffff',
      color: '#111',
      minHeight: '100vh',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <DotCanvas />

      {/* Success banner */}
      {(location.state as { registered?: boolean } | null)?.registered && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#f0fdf4', border: '1px solid #86efac',
          borderRadius: 12, padding: '10px 20px',
          fontSize: 13, color: '#166534', fontWeight: 600,
          zIndex: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Account created — sign in to continue.
        </div>
      )}

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: '40px 6vw', gap: 100,
      }}>
        {/* Left brand panel */}
        <div style={{ flex: 1, maxWidth: 480, minWidth: 0 }}>
          <Logo />
          <h1 style={{
            fontSize: 'clamp(36px, 4.5vw, 58px)',
            fontWeight: 700, lineHeight: 1.1, color: '#111', marginBottom: 12,
          }}>
            TikTok growth,<br />
            <span style={{ color: '#e6a800' }}>with Krench Chicken.</span>
          </h1>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 40 }}>
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} feature={f} />
            ))}
          </div>

          <p style={{ marginTop: 48, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#aaa' }}>
            For Krench Chicken Management Only
          </p>
        </div>

        {/* Right form panel */}
        <div style={{ flexShrink: 0, width: 440, maxWidth: '100%' }}>
          <LoginForm onSubmit={handleSubmit} loading={loading} apiError={apiError} />
        </div>
      </div>
    </div>
  );
}
