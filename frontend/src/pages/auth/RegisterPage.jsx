// src/pages/auth/RegisterPage.jsx
// Design: "Digital Growth Login" (Stitch: Dynamic Red Loader — Registration_V1)
// Dynamic ambient animations — CSS keyframes + cursor-tracking RAF for background
import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RegisterForm from '../../components/auth/RegisterForm';
import { registerInitiate } from '../../services/authService';
import { useNotification } from '../../context/NotificationContext';
import { STORAGE_KEYS } from '../../utils/constants';

/* ─── Feature bento items — left panel ─── */
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
    desc: 'Centralised command center for all your community engagement.',
  },
  {
    icon: 'query_stats',
    title: 'Analytics',
    desc: 'Deep-dive metrics with real-time conversion tracking.',
  },
];

/* ─── CSS-keyframe-driven ambient glow (no mousemove) ─── */
const KEYFRAMES = `
  @keyframes orbFloat1 {
    0%,100% { transform: translate(0, 0) scale(1);   opacity: 0.10; }
    33%      { transform: translate(60px,-80px) scale(1.15); opacity: 0.18; }
    66%      { transform: translate(-40px, 60px) scale(0.9);  opacity: 0.12; }
  }
  @keyframes orbFloat2 {
    0%,100% { transform: translate(0, 0) scale(1);   opacity: 0.07; }
    40%      { transform: translate(-70px, 50px) scale(1.2);  opacity: 0.14; }
    80%      { transform: translate(50px,-60px) scale(0.85); opacity: 0.08; }
  }
  @keyframes orbFloat3 {
    0%,100% { transform: translate(0, 0) scale(1);   opacity: 0.06; }
    50%      { transform: translate(80px, 80px) scale(1.3);  opacity: 0.13; }
  }
  @keyframes particleDrift1 {
    0%       { transform: translateY(0)   opacity: 0;   }
    10%      { opacity: 0.5; }
    90%      { opacity: 0.2; }
    100%     { transform: translateY(-120px); opacity: 0; }
  }
  @keyframes particleDrift2 {
    0%       { transform: translateY(0) translateX(0);   opacity: 0; }
    15%      { opacity: 0.4; }
    85%      { opacity: 0.15; }
    100%     { transform: translateY(-100px) translateX(20px); opacity: 0; }
  }
  @keyframes particleDrift3 {
    0%       { transform: translateY(0) translateX(0);   opacity: 0; }
    20%      { opacity: 0.35; }
    80%      { opacity: 0.1; }
    100%     { transform: translateY(-90px) translateX(-15px); opacity: 0; }
  }
  @keyframes meshShift {
    0%,100% { opacity: 0.5; }
    50%     { opacity: 0.7; }
  }
  @keyframes gridLineFade {
    0%,100% { opacity: 0.03; }
    50%     { opacity: 0.07; }
  }
`;

/* ─── Auth shell — Register variant ─── */
function AuthShell({ children }) {
  const containerRef  = useRef(null);
  const cursorGlowRef = useRef(null);
  const target  = useRef({ x: 50, y: 50 });
  const current = useRef({ x: 50, y: 50 });
  const raf     = useRef(null);

  const lerp = (a, b, t) => a + (b - a) * t;

  const animate = useCallback(() => {
    current.current.x = lerp(current.current.x, target.current.x, 0.07);
    current.current.y = lerp(current.current.y, target.current.y, 0.07);
    if (cursorGlowRef.current) {
      const { x, y } = current.current;
      cursorGlowRef.current.style.background = `
        radial-gradient(700px circle at ${x}% ${y}%,
          rgba(246,183,10,0.12) 0%,
          rgba(246,183,10,0.04) 40%,
          transparent 70%),
        radial-gradient(350px circle at ${100 - x}% ${100 - y}%,
          rgba(246,183,10,0.05) 0%,
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
      target.current.x = ((e.clientX - rect.left) / rect.width)  * 100;
      target.current.y = ((e.clientY - rect.top)  / rect.height) * 100;
    };
    el.addEventListener('mousemove', onMove);
    raf.current = requestAnimationFrame(animate);
    return () => {
      el.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf.current);
    };
  }, [animate]);

  return (
    <>
      <style>{KEYFRAMES}</style>

      <div ref={containerRef} className="min-h-screen flex bg-[#0e0e0e] overflow-hidden relative font-body">

        {/* ── Mesh gradient base — autonomously animated ── */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `
              radial-gradient(at 0% 0%,   #1a1a1a 0%, transparent 50%),
              radial-gradient(at 100% 0%,  #332b00 0%, transparent 50%),
              radial-gradient(at 100% 100%,#1a1a1a 0%, transparent 50%),
              radial-gradient(at 0% 100%,  #000000 0%, transparent 50%)
            `,
            animation: 'meshShift 8s ease-in-out infinite',
          }}
        />

        {/* ── Cursor-following glow — background only ── */}
        <div ref={cursorGlowRef} className="absolute inset-0 z-[1] pointer-events-none" />

        {/* ── Ambient orbs — CSS-keyframe driven, no mousemove ── */}
        <div
          className="absolute top-1/4 left-1/4 w-[460px] h-[460px] bg-brand/[0.09] blur-[130px] rounded-full pointer-events-none z-[1]"
          style={{ animation: 'orbFloat1 14s ease-in-out infinite' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-brand/[0.06] blur-[120px] rounded-full pointer-events-none z-[1]"
          style={{ animation: 'orbFloat2 18s ease-in-out infinite' }}
        />
        <div
          className="absolute top-3/4 left-2/3 w-[300px] h-[300px] bg-brand/[0.05] blur-[100px] rounded-full pointer-events-none z-[1]"
          style={{ animation: 'orbFloat3 22s ease-in-out infinite' }}
        />

        {/* ── Floating particles ── */}
        <div className="fixed inset-0 pointer-events-none z-20 overflow-hidden">
          <div
            className="absolute bottom-1/3 left-[20%] w-1.5 h-1.5 bg-brand rounded-full"
            style={{
              boxShadow: '0 0 12px 3px rgba(246,183,10,0.4)',
              animation: 'particleDrift1 7s ease-in-out infinite',
            }}
          />
          <div
            className="absolute bottom-1/4 left-[50%] w-1 h-1 bg-brand rounded-full"
            style={{
              boxShadow: '0 0 10px 2px rgba(246,183,10,0.35)',
              animation: 'particleDrift2 9s ease-in-out infinite 2s',
            }}
          />
          <div
            className="absolute bottom-2/3 right-[30%] w-1 h-1 bg-brand rounded-full"
            style={{
              boxShadow: '0 0 10px 2px rgba(246,183,10,0.3)',
              animation: 'particleDrift3 11s ease-in-out infinite 4s',
            }}
          />
          <div
            className="absolute bottom-1/2 left-[10%] w-0.5 h-0.5 bg-brand/70 rounded-full"
            style={{
              boxShadow: '0 0 8px 2px rgba(246,183,10,0.25)',
              animation: 'particleDrift1 13s ease-in-out infinite 1s',
            }}
          />
          <div
            className="absolute bottom-1/3 right-[15%] w-1 h-1 bg-brand/80 rounded-full"
            style={{
              boxShadow: '0 0 10px 2px rgba(246,183,10,0.3)',
              animation: 'particleDrift2 10s ease-in-out infinite 3s',
            }}
          />
        </div>

        {/* ── Subtle grid overlay ── */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            animation: 'gridLineFade 10s ease-in-out infinite',
          }}
        />


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

              {/* Stitch headline: "TikTok growth, on autopilot." */}
              <h2 className="font-headline text-6xl xl:text-7xl font-bold leading-[0.9] tracking-tight text-white">
                TikTok growth,<br />
                <span className="text-brand">with LeadFlow.</span>
              </h2>
            </div>

            {/* Feature bento grid */}
            <div className="grid grid-cols-2 gap-4 pt-12">
              {FEATURES.map((f) => (
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

          {/* Footer */}
          <div className="flex items-center gap-8">
            <p className="text-white/40 text-xs uppercase tracking-[0.2em] font-headline">
              For Krench Chicken Management only
            </p>
          </div>
        </section>

        {/* ── Right form panel ── */}
        <section className="w-full lg:w-1/2 flex items-start justify-center p-8 z-10 relative overflow-y-auto">

          {/* Mobile logo */}
          <div className="absolute top-6 left-6 lg:hidden flex items-center gap-2.5">
            <img src="/logo.png" alt="Krench Chicken" className="h-8 w-auto object-contain" />
          </div>

          {/* Glassmorphism card */}
          <div
            className="w-full max-w-md bg-white/[0.04] backdrop-blur-2xl p-10 rounded-2xl border border-white/[0.08] my-auto lg:mt-12"
            style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}
          >
            {children}
          </div>
        </section>

      </div>
    </>
  );
}

/* ─── Register page ─── */
export default function RegisterPage() {
  const navigate  = useNavigate();
  const { toast } = useNotification();
  const [loading,  setLoading]  = useState(false);
  const [apiError, setApiError] = useState('');

  const handleSubmit = async (formData) => {
    setApiError('');
    setLoading(true);
    try {
      const res = await registerInitiate({
        email:    formData.email.trim().toLowerCase(),
        password: formData.password,
        fullName: formData.fullName.trim(),
        phone:    formData.phone.trim(),
        role:     formData.role,
      });

      if (res.success) {
        localStorage.setItem(
          STORAGE_KEYS.PENDING_EMAIL,
          formData.email.trim().toLowerCase()
        );

        toast.info(`📧 Verification code sent to ${formData.email}. Check your inbox!`, {
          duration: 4000,
        });

        navigate('/otp', {
          state: { email: formData.email.trim().toLowerCase() },
        });
      }
    } catch (err) {
      const status  = err.response?.status;
      const message = err.response?.data?.message || err.message || '';

      if (status === 409) {
        if (message.toLowerCase().includes('phone')) {
          toast.warning(' This phone number is already registered. Please use a different number.', {
            duration: 5000,
          });
          setApiError('This phone number is already registered to another account.');
        } else {
          toast.warning(' This email is already registered. Please sign in instead.', {
            duration: 5000,
          });
          setApiError('An account with this email already exists. Please sign in.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="font-headline text-3xl font-bold text-white mb-2">
          Register Core
        </h3>
        <p className="text-white/50 text-sm">
          Create your account here.
        </p>
      </div>

      {/* Form — unchanged from original */}
      <RegisterForm
        onSubmit={handleSubmit}
        loading={loading}
        apiError={apiError}
      />

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-transparent px-4 text-white/30 font-headline tracking-widest">or</span>
        </div>
      </div>

      {/* Sign in link */}
      <p className="text-center text-xs font-headline uppercase tracking-widest text-white/40">
        Already have account?{' '}
        <Link
          to="/login"
          className="text-brand hover:text-brand-light font-bold transition-colors duration-200"
        >
          Sign In
        </Link>
      </p>
    </AuthShell>
  );
}
