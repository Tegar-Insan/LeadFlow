// src/pages/auth/LoginPage.jsx
// Redesigned — "Digital Growth Login" (Stitch: Dynamic Red Loader)
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import LoginForm from '../../components/auth/LoginForm';

/* ─── Feature bento items ─── */
const FEATURES = [
  {
    icon: 'psychology',
    title: 'AI Content Ideas',
    desc: 'Neural-mapped trending topics generated instantly for your niche.',
  },
  {
    icon: 'calendar_today',
    title: 'Easy Schedule',
    desc: 'Easy management schedule, relax and set publish to TikTok.',
  },
  {
    icon: 'all_inbox',
    title: 'Unified Inbox',
    desc: 'Centralized command center for all your community engagement.',
  },
  {
    icon: 'query_stats',
    title: 'Analytics',
    desc: 'Deep-dive metrics with real-time conversion tracking.',
  },
];

/* ─── Mesh-gradient background ─── */
const meshStyle = {
  background: `
    radial-gradient(at 0% 0%, #1a1a1a 0%, transparent 50%),
    radial-gradient(at 100% 0%, #332b00 0%, transparent 50%),
    radial-gradient(at 100% 100%, #1a1a1a 0%, transparent 50%),
    radial-gradient(at 0% 100%, #000000 0%, transparent 50%)
  `,
};

/* ─── Auth shell ─── */
function AuthShell({ children }) {
  const containerRef = useRef(null);
  const cursorGlowRef = useRef(null);
  const pos = useRef({ x: 50, y: 50 }); // percent
  const raf = useRef(null);

  const lerp = (a, b, t) => a + (b - a) * t;
  const current = useRef({ x: 50, y: 50 });

  const animate = useCallback(() => {
    current.current.x = lerp(current.current.x, pos.current.x, 0.07);
    current.current.y = lerp(current.current.y, pos.current.y, 0.07);
    if (cursorGlowRef.current) {
      cursorGlowRef.current.style.background = `
        radial-gradient(700px circle at ${current.current.x}% ${current.current.y}%,
          rgba(246,183,10,0.13) 0%,
          rgba(246,183,10,0.05) 35%,
          transparent 70%),
        radial-gradient(400px circle at ${100 - current.current.x}% ${100 - current.current.y}%,
          rgba(246,183,10,0.06) 0%,
          transparent 60%)
      `;
    }
    raf.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      pos.current.x = ((e.clientX - rect.left) / rect.width)  * 100;
      pos.current.y = ((e.clientY - rect.top)  / rect.height) * 100;
    };
    el.addEventListener('mousemove', onMove);
    raf.current = requestAnimationFrame(animate);
    return () => {
      el.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf.current);
    };
  }, [animate]);

  return (
    <div ref={containerRef} className="min-h-screen flex bg-[#0e0e0e] overflow-hidden relative font-body">

      {/* Mesh gradient overlay */}
      <div className="absolute inset-0 z-0 opacity-60" style={meshStyle} />

      {/* Cursor-following glow */}
      <div ref={cursorGlowRef} className="absolute inset-0 z-[1] pointer-events-none transition-none" />

      {/* Ambient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand/[0.08] blur-[120px] rounded-full pointer-events-none z-[1]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand/[0.05] blur-[120px] rounded-full pointer-events-none z-[1]" />

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none z-20 overflow-hidden">
        <div className="absolute top-1/4 right-[40%] w-1 h-1 bg-brand rounded-full opacity-30"
          style={{ boxShadow: '0 0 15px 2px rgba(246,183,10,0.3)' }} />
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-brand rounded-full opacity-20"
          style={{ boxShadow: '0 0 15px 2px rgba(246,183,10,0.3)' }} />
        <div className="absolute top-1/2 left-[10%] w-1 h-1 bg-brand rounded-full opacity-40"
          style={{ boxShadow: '0 0 15px 2px rgba(246,183,10,0.3)' }} />
      </div>


      {/* ── Left brand panel ── */}
      <section className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 z-10 relative">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-black font-bold text-lg">bolt</span>
          </div>
          <img src="/logo.png" alt="Krench Chicken" className="h-9 w-auto object-contain" />
        </div>

        {/* Headline + feature grid */}
        <div className="space-y-8">
          <div className="space-y-4">
            {/* Headline */}
            <h2 className="font-headline text-6xl xl:text-7xl font-bold leading-[0.9] tracking-tight text-white">
              TikTok growth,<br />
              <span className="text-brand">with Krench Chicken.</span>
            </h2>
          </div>

          {/* Feature bento grid */}
          <div className="grid grid-cols-2 gap-4 pt-12">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="bg-white/[0.04] backdrop-blur-md p-6 rounded-xl border border-white/[0.07] hover:border-brand/30 transition-all duration-500 group"
              >
                <span className="material-symbols-outlined text-brand mb-4 block text-2xl">{f.icon}</span>
                <h4 className="font-headline text-base font-bold text-white mb-1">{f.title}</h4>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Social proof footer */}
        <div className="flex items-center gap-8">
          <p className="text-white/40 text-xs uppercase tracking-[0.2em] font-headline">
            For Krench Chicken Management Only
          </p>
        </div>
      </section>

      {/* ── Right form panel ── */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-8 z-10 relative">

        {/* Mobile logo */}
        <div className="absolute top-6 left-6 lg:hidden flex items-center gap-2.5">
          <img src="/logo.png" alt="Krench Chicken" className="h-8 w-auto object-contain" />
        </div>

        {/* Glassmorphism card */}
        <div className="w-full max-w-md bg-white/[0.04] backdrop-blur-2xl p-10 rounded-2xl border border-white/[0.08]"
          style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}
        >
          {children}
        </div>
      </section>
    </div>
  );
}

/* ─── Login page ─── */
export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login, dashboardPath, isAuthenticated } = useAuth();
  const [loading,   setLoading]   = useState(false);
  const [apiError,  setApiError]  = useState('');
  const [loginDone, setLoginDone] = useState(false);
  const from = location.state?.from?.pathname || null;

  useEffect(() => {
    if (isAuthenticated && loginDone) {
      navigate(from || dashboardPath || '/calendar', { replace: true });
    }
  }, [isAuthenticated, loginDone]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async ({ email, password }) => {
    setApiError(''); setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      setLoginDone(true);
    } catch (err) {
      setApiError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {/* Success banner */}
      {location.state?.registered && (
        <div className="mb-6 rounded-xl border bg-green-500/10 border-green-500/30 text-green-400 px-4 py-3 text-sm flex items-center gap-2.5 animate-slide-up">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p>Account created — sign in to continue.</p>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-10">
        <h3 className="font-headline text-3xl font-bold text-white mb-2">Login</h3>
        <p className="text-white/50 text-sm">Enter your credentials to access.</p>
      </div>

      {/* Form */}
      <LoginForm onSubmit={handleSubmit} loading={loading} apiError={apiError} />

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-transparent px-4 text-white/30 font-headline tracking-widest">or</span>
        </div>
      </div>

      {/* Register link */}
      <p className="text-center text-xs font-headline uppercase tracking-widest text-white/40">
        Not having account?{' '}
        <Link
          to="/register"
          className="text-brand hover:text-brand-light font-bold transition-colors duration-200"
        >
          Register Here
        </Link>
      </p>
    </AuthShell>
  );
}
