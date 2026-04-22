/**
 * KineticLoader.jsx — Minimalist glassmorphism loader for LeadFlow
 * Visual: transparent blur overlay · loader icon only
 */

import { useEffect, useState } from 'react';

/**
 * Full-page / overlay loader — auth checks, page transitions, cold data fetches.
 *
 * @param {string}  message  - Accessible status label
 * @param {boolean} overlay  - true = position:fixed over content (default). false = fills parent.
 */
export function KineticLoader({ message = 'Loading…', overlay = true }) {
  const wrapCls = overlay
    ? 'fixed inset-0 z-[9999] flex flex-col items-center justify-center'
    : 'relative w-full min-h-screen flex flex-col items-center justify-center';

  return (
    <div
      className={wrapCls}
      role="status"
      aria-label={message}
      style={{
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Loader only (glass card removed) */}
      <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
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

      <div
        className="StringLoading"
        style={{
          marginTop: 16,
          fontSize: 14,
          color: '#f6b70a',
          textShadow: '0 0 4px rgba(246,183,10,0.8)',
        }}
      >
        {message}
      </div>

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
