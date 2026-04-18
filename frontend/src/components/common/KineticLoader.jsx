/**
 * KineticLoader.jsx — Minimalist glassmorphism loader for LeadFlow
 * Design reference: "Dynamic Red Loader / Minimalist Loading Desktop" (Stitch)
 * Visual: transparent blur overlay · floating glass card · neon square pulse · spaced type
 */

import { useEffect, useState } from 'react';

/**
 * Full-page / overlay loader — auth checks, page transitions, cold data fetches.
 *
 * @param {string}  message  - Status label shown below the icon
 * @param {boolean} overlay  - true = position:fixed over content (default). false = fills parent.
 */
export function KineticLoader({ message = 'Loading…', overlay = true }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 1) % 3), 500);
    return () => clearInterval(id);
  }, []);

  const wrapCls = overlay
    ? 'fixed inset-0 z-[9999] flex items-center justify-center'
    : 'relative w-full min-h-screen flex items-center justify-center';

  return (
    <div
      className={wrapCls}
      role="status"
      aria-label={message}
      style={{
        background: 'rgba(14, 14, 14, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* ── Subtle star particles ── */}
      {STARS.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: s.size,
            height: s.size,
            left: s.x,
            top: s.y,
            background: '#f6b70a',
            opacity: s.opacity,
            animation: `lf-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}

      {/* ── Glass card ── */}
      <div
        className="flex flex-col items-center justify-center gap-5"
        style={{
          width: 200,
          height: 200,
          borderRadius: 28,
          background: 'rgba(255, 255, 255, 0.07)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.6), 0 0 80px rgba(246,183,10,0.06)',
        }}
      >
        {/* Neon glowing square icon */}
        <div className="relative flex items-center justify-center">
          {/* Outer glow disc */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 72,
              height: 72,
              background: 'rgba(246,183,10,0.15)',
              filter: 'blur(18px)',
              animation: 'lf-glow 2s ease-in-out infinite',
            }}
          />

          {/* Neon square outline */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              border: '2px solid #f6b70a',
              boxShadow:
                '0 0 8px rgba(246,183,10,0.8), 0 0 20px rgba(246,183,10,0.4), inset 0 0 8px rgba(246,183,10,0.1)',
              animation: 'lf-square-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
            }}
          />

          {/* Centre dot */}
          <div
            className="absolute rounded-full"
            style={{
              width: 5,
              height: 5,
              background: '#f6b70a',
              boxShadow: '0 0 8px rgba(246,183,10,0.9)',
            }}
          />
        </div>

        {/* Label */}
        <div className="flex flex-col items-center gap-1.5">
          <span
            style={{
              fontFamily: 'Space Grotesk, Manrope, sans-serif',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.42em',
              color: 'rgba(255,255,255,0.55)',
              textTransform: 'uppercase',
              userSelect: 'none',
            }}
          >
            LOADING
          </span>

          {/* Three blink dots */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="rounded-full"
                style={{
                  width: 3,
                  height: 3,
                  background: '#f6b70a',
                  opacity: phase === i ? 0.9 : 0.2,
                  transition: 'opacity 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes lf-square-pulse {
          0%   { transform: scale(0.94); opacity: 0.7; }
          50%  { transform: scale(1.06); opacity: 1;   }
          100% { transform: scale(0.94); opacity: 0.7; }
        }
        @keyframes lf-glow {
          0%   { opacity: 0.4; transform: scale(0.9); }
          50%  { opacity: 1;   transform: scale(1.1); }
          100% { opacity: 0.4; transform: scale(0.9); }
        }
        @keyframes lf-twinkle {
          0%   { opacity: var(--op-start, 0.1); }
          50%  { opacity: var(--op-peak,  0.5); }
          100% { opacity: var(--op-start, 0.1); }
        }
        @keyframes lf-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/** Pre-computed star positions so the component stays pure/deterministic */
const STARS = [
  { x: '12%',  y: '18%', size: 2,   opacity: 0.35, dur: 2.8, delay: 0 },
  { x: '85%',  y: '12%', size: 1.5, opacity: 0.25, dur: 3.4, delay: 0.6 },
  { x: '22%',  y: '72%', size: 2.5, opacity: 0.3,  dur: 2.2, delay: 1.1 },
  { x: '75%',  y: '65%', size: 1.5, opacity: 0.2,  dur: 3.8, delay: 0.3 },
  { x: '55%',  y: '88%', size: 2,   opacity: 0.25, dur: 2.6, delay: 1.5 },
  { x: '8%',   y: '50%', size: 1.5, opacity: 0.2,  dur: 4.0, delay: 0.8 },
  { x: '92%',  y: '42%', size: 2,   opacity: 0.3,  dur: 3.1, delay: 1.8 },
  { x: '38%',  y: '8%',  size: 1.5, opacity: 0.2,  dur: 2.9, delay: 0.4 },
  { x: '68%',  y: '25%', size: 2.5, opacity: 0.15, dur: 3.5, delay: 2.0 },
  { x: '45%',  y: '78%', size: 1.5, opacity: 0.25, dur: 2.4, delay: 0.9 },
  { x: '30%',  y: '35%', size: 1,   opacity: 0.15, dur: 3.7, delay: 1.3 },
  { x: '80%',  y: '80%', size: 1.5, opacity: 0.2,  dur: 3.0, delay: 0.7 },
];

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
