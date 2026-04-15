/**
 * KineticLoader.jsx — Minimalist kinetic loading screen for LeadFlow
 * Adapted from "Dynamic Red Loader" Stitch project (Minimalist Loading Desktop)
 * Design: single pulsing ring · shimmer bar · grain overlay · no heavy chrome
 */

import { useEffect, useState } from 'react';

/**
 * Full-page blocking loader — auth checks, page transitions, cold data fetches.
 *
 * @param {string}  message  - Status label (default: "Loading LeadFlow…")
 * @param {boolean} overlay  - true = position:fixed over content (default). false = fills parent.
 */
export function KineticLoader({ message = 'Loading Krench Chicken…', overlay = true }) {
  // Dot blink phase for the three status dots
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 1) % 3), 500);
    return () => clearInterval(id);
  }, []);

  const wrapCls = overlay
    ? 'fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden'
    : 'relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden';

  return (
    <div
      className={wrapCls}
      style={{ background: '#000000' }}
      role="status"
      aria-label={message}
    >
      {/* ── Ambient radial glow ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(246,183,10,0.05) 0%, transparent 70%)',
        }}
      />

      {/* ── Centre element ── */}
      <div className="relative flex items-center justify-center" style={{ animation: 'lf-drift 3s ease-in-out infinite' }}>
        {/* Ambient glow disc — same pulse as the ring */}
        <div
          className="absolute rounded-full"
          style={{
            width: '8rem',
            height: '8rem',
            background: 'rgba(246,183,10,0.12)',
            filter: 'blur(36px)',
            animation: 'lf-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
          }}
        />

        {/* Outer slow hint ring */}
        <div
          className="absolute rounded-full"
          style={{
            width: '7rem',
            height: '7rem',
            border: '1px solid rgba(246,183,10,0.1)',
            animation: 'lf-pulse 3.2s cubic-bezier(0.4,0,0.6,1) infinite reverse',
          }}
        />

        {/* Main pulsing thin ring */}
        <div
          className="rounded-full"
          style={{
            width: '5rem',
            height: '5rem',
            border: '1.5px solid #f6b70a',
            animation: 'lf-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
          }}
        />

        {/* Core static dot with glow */}
        <div
          className="absolute rounded-full"
          style={{
            width: '4px',
            height: '4px',
            background: '#f6b70a',
            boxShadow: '0 0 15px rgba(246,183,10,0.8)',
          }}
        />
      </div>

      {/* ── Label + shimmer bar ── */}
      <div
        className="flex flex-col items-center gap-2 mt-14"
        style={{ animation: 'lf-drift 3s ease-in-out infinite' }}
      >
        {/* Brand micro-label */}
        <span
          style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: '8px',
            fontWeight: 600,
            letterSpacing: '0.35em',
            color: 'rgba(246,183,10,0.4)',
            textTransform: 'uppercase',
            userSelect: 'none',
          }}
        >
          KRENCH CHICKEN
        </span>

        {/* State label */}
        <span
          style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.5em',
            color: '#f6b70a',
            opacity: 0.8,
            textTransform: 'uppercase',
            userSelect: 'none',
          }}
        >
          LOADING
        </span>

        {/* Shimmer progress bar */}
        <div
          className="mt-2 overflow-hidden"
          style={{
            width: '12rem',
            height: '1px',
            background: 'rgba(246,183,10,0.15)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: '33%',
              background:
                'linear-gradient(to right, transparent, #f6b70a, transparent)',
              animation: 'lf-slide 1.5s linear infinite',
            }}
          />
        </div>

        {/* Status dots */}
        <div className="flex items-center gap-1.5 mt-1">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="rounded-full"
              style={{
                width: '3px',
                height: '3px',
                background: '#f6b70a',
                opacity: phase === i ? 0.9 : 0.2,
                transition: 'opacity 0.3s',
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Grain overlay ── */}
      <div
        className="fixed inset-0 pointer-events-none mix-blend-overlay"
        style={{
          opacity: 0.03,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
        }}
      />

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes lf-pulse {
          0%   { transform: scale(0.95); opacity: 0.2; }
          50%  { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(0.95); opacity: 0.2; }
        }
        @keyframes lf-drift {
          0%   { transform: translateY(0);   }
          50%  { transform: translateY(-5px); }
          100% { transform: translateY(0);   }
        }
        @keyframes lf-slide {
          from { transform: translateX(-100%); }
          to   { transform: translateX(300%);  }
        }
      `}</style>
    </div>
  );
}

/**
 * Compact inline spinner — use inside buttons, table rows, cards, and
 * any place needing a small non-blocking indicator.
 *
 * @param {'sm'|'md'|'lg'} size
 * @param {string}          className - extra Tailwind / style classes
 */
export function InlineLoader({ size = 'md', className = '' }) {
  const dim = { sm: 14, md: 18, lg: 26 }[size] ?? 18;
  const stroke = size === 'sm' ? 1.5 : 2;

  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: dim,
        height: dim,
        borderRadius: '50%',
        border: `${stroke}px solid rgba(246,183,10,0.25)`,
        borderTopColor: '#f6b70a',
        color: '#f6b70a',
        animation: 'lf-spin 0.85s linear infinite',
      }}
    >
      <style>{`@keyframes lf-spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

// Named alias used by ProtectedRoute and other callers of FullPageLoader
export { KineticLoader as FullPageLoader };

export default KineticLoader;
