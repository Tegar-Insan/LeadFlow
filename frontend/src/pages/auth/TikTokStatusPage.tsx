// src/pages/auth/TikTokStatusPage.jsx
// Dedicated landing page after TikTok OAuth callback
// Receives ?tiktok=connected|error&reason=<slug> from backend redirect

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const REDIRECT_DELAY = 4; // seconds before auto-navigate on success

// TikTok logo glyph — extracted from Button_Black.svg
function TikTokGlyph({ className = 'w-8 h-8' }) {
  return (
    <svg className={className} viewBox="14 10 20 22" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M25.5172 25.0575C25.4647 26.4295 24.3093 27.5306 22.8929 27.5306C22.5691 27.5306 22.2591 27.4729 21.9727 27.3675C22.2591 27.4729 22.5692 27.5306 22.893 27.5306C24.3094 27.5306 25.4648 26.4295 25.5174 25.0576L25.5224 12.8063H27.8124C28.0331 13.971 28.7405 14.9704 29.7205 15.5948C30.4037 16.0305 31.2171 16.284 32.0903 16.284V19.3405C30.4684 19.3405 28.9654 18.8334 27.7386 17.9728V24.1852C27.7386 27.2878 25.1559 29.8119 21.9812 29.8119C20.7545 29.8119 19.6169 29.4338 18.6818 28.7921C17.1964 27.7717 16.224 26.0876 16.224 24.1846C16.224 21.0821 18.8067 18.5579 21.9814 18.5579C22.2448 18.5579 22.503 18.5791 22.7572 18.6128V21.7342C22.5115 21.6591 22.2519 21.6154 21.9812 21.6154C20.5314 21.6154 19.3519 22.7683 19.3519 24.1852C19.3519 25.1719 19.9247 26.0292 20.7616 26.4596C21.1265 26.6474 21.541 26.7549 21.9811 26.7549C23.3975 26.7549 24.5529 25.6538 24.6055 24.2819L24.6105 12.0305H27.7385C27.7385 12.2955 27.7646 12.5545 27.8123 12.8063H25.5223L25.5172 25.0575Z"
        fill="white"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// Animated countdown ring
function CountdownRing({ seconds, total }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const progress = (seconds / total) * circ;
  return (
    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r={r} fill="none" stroke="#e5e7eb" strokeWidth={3} />
      <circle
        cx="24" cy="24" r={r}
        fill="none"
        stroke="#10b981"
        strokeWidth={3}
        strokeDasharray={`${progress} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s linear' }}
      />
    </svg>
  );
}

export default function TikTokStatusPage() {
  const [searchParams] = useSearchParams();
  const navigate        = useNavigate();

  const status  = searchParams.get('tiktok');   // 'connected' | 'error' | null
  const reason  = searchParams.get('reason');
  const success = status === 'connected';

  const [countdown, setCountdown] = useState(REDIRECT_DELAY);
  const [visible,   setVisible]   = useState(false);

  // Fade-in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Auto-redirect countdown on success
  useEffect(() => {
    if (!success) return;
    if (countdown <= 0) {
      navigate('/calendar', { replace: true });
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [success, countdown, navigate]);

  // Unknown status — bounce to calendar
  useEffect(() => {
    if (!status) navigate('/calendar', { replace: true });
  }, [status, navigate]);

  if (!status) return null;

  const errorLabel = reason
    ? decodeURIComponent(reason).replace(/_/g, ' ')
    : 'An unknown error occurred';

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">

      {/* Ambient glow */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: success
            ? 'radial-gradient(ellipse 600px 400px at 50% 40%, rgba(16,185,129,0.08) 0%, transparent 70%)'
            : 'radial-gradient(ellipse 600px 400px at 50% 40%, rgba(239,68,68,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Card */}
      <div
        className={`relative z-10 w-full max-w-md transition-all duration-500 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-center text-center gap-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">

          {/* Brand row */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center">
              <TikTokGlyph className="w-4 h-4" />
            </div>
            <span className="text-xs font-headline font-semibold text-gray-500 tracking-widest uppercase">
              TikTok Integration
            </span>
          </div>

          {/* Status icon */}
          {success ? (
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-success/10 border border-success/20 flex items-center justify-center text-success">
                <CheckIcon />
              </div>
              {/* Pulse ring */}
              <div className="absolute inset-0 rounded-full bg-success/10 animate-ping" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <XIcon />
            </div>
          )}

          {/* Headline + description */}
          {success ? (
            <>
              <div>
                <h1 className="text-2xl font-headline font-extrabold text-gray-900 mb-2">
                  Successfully Connected!
                </h1>
                <p className="text-sm text-gray-500 font-body leading-relaxed">
                  Your TikTok account has been linked to Krench Chicken. You can now
                  publish content directly from the calendar.
                </p>
              </div>

              {/* Countdown */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <CountdownRing seconds={countdown} total={REDIRECT_DELAY} />
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900 font-body">
                    {countdown}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-body">
                  Redirecting to calendar in {countdown}s…
                </p>
              </div>

              <button
                onClick={() => navigate('/calendar', { replace: true })}
                className="w-full h-10 rounded-xl bg-brand hover:bg-brand-dark text-black text-sm font-headline font-bold transition-colors"
              >
                Go to Calendar Now
              </button>
            </>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-headline font-extrabold text-gray-900 mb-2">
                  Connection Failed
                </h1>
                <p className="text-sm text-gray-500 font-body leading-relaxed mb-3">
                  We couldn't link your TikTok account. Please check the details below
                  and try again.
                </p>
                {/* Error reason pill */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-xs text-red-600 font-body font-medium capitalize">
                    {errorLabel}
                  </span>
                </div>
              </div>

              {/* Common causes */}
              <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-2">
                <p className="text-xs text-gray-500 font-headline font-semibold uppercase tracking-wider mb-3">
                  Common causes
                </p>
                {[
                  'Redirect URI not registered in TikTok sandbox console',
                  'Client key or secret mismatch in .env',
                  'Sandbox app scopes not approved',
                  'Authorization code expired (complete flow within 2 minutes)',
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-gray-400 text-xs mt-0.5 flex-shrink-0">—</span>
                    <span className="text-xs text-gray-500 font-body">{tip}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="w-full flex flex-col gap-2">
                <button
                  onClick={() => navigate('/calendar', { replace: true })}
                  className="w-full h-10 rounded-xl bg-brand hover:bg-brand-dark text-black text-sm font-headline font-bold transition-colors"
                >
                  Try Again from Calendar
                </button>
                <button
                  onClick={() => navigate('/calendar', { replace: true })}
                  className="w-full h-10 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-600 text-sm font-body transition-colors"
                >
                  Back to Calendar
                </button>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 font-body mt-4">
          Krench Chicken · LeadFlow TikTok Integration
        </p>
      </div>
    </div>
  );
}
