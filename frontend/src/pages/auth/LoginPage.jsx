// src/pages/auth/LoginPage.jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import LoginForm from '../../components/auth/LoginForm';

// Split-panel auth layout (inline — no separate AuthLayout file per spec)
function AuthShell({ children }) {
  return (
    <div className="min-h-screen flex bg-[#0a0a0a]">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[460px] xl:w-[520px] relative overflow-hidden flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0608] via-[#0f0a0a] to-[#0a0a0a]" />
        <div className="absolute top-[25%] left-[15%] w-72 h-72 bg-brand/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col h-full p-12">
          <div className="flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/30">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
              </svg>
            </div>
            <span className="font-display font-bold text-xl text-text-primary">Lead<span className="text-brand">Flow</span></span>
          </div>
          <div className="mb-auto">
            <h1 className="font-display font-extrabold text-4xl xl:text-5xl text-text-primary leading-tight mb-5">
              TikTok Marketing,{' '}<span className="bg-gradient-to-r from-brand to-brand-light bg-clip-text text-transparent">Managed Smarter.</span>
            </h1>
            <p className="text-text-secondary text-base leading-relaxed mb-8">
              Plan content, schedule posts, and handle customer interactions — built for <span className="text-text-primary font-medium">Krench Chicken</span>.
            </p>
            <ul className="space-y-3.5">
              {['🤖 AI-powered content idea generation','📅 Drag & drop content calendar','💬 Unified TikTok interaction inbox','📊 Weekly performance dashboard'].map((f) => (
                <li key={f} className="text-sm text-text-secondary flex items-center gap-2"><span>{f}</span></li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-text-muted">© {new Date().getFullYear()} LeadFlow · Krench Chicken · Bogor, West Java</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col">
        <div className="lg:hidden flex items-center gap-2.5 p-6 border-b border-surface-border">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048" />
            </svg>
          </div>
          <span className="font-display font-bold text-lg text-text-primary">Lead<span className="text-brand">Flow</span></span>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login, dashboardPath } = useAuth();
  const [loading,  setLoading]  = useState(false);
  const [apiError, setApiError] = useState('');
  const from = location.state?.from?.pathname || null;

  const handleSubmit = async ({ email, password }) => {
    setApiError(''); setLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), password);
      const dest  = from || dashboardPath;
      navigate(dest, { replace: true });
    } catch (err) {
      setApiError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="animate-slide-up">
        <div className="mb-8">
          <h2 className="font-display font-bold text-3xl text-text-primary mb-2">Welcome back</h2>
          <p className="text-text-secondary text-sm">Sign in to your LeadFlow account to continue.</p>
        </div>

        {location.state?.registered && (
  <div className="mb-6 rounded-xl border bg-green-500/10 border-green-500/30 text-green-400 px-4 py-3 text-sm flex items-center gap-2.5 animate-slide-up">
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
    <p>Account created successfully! Please sign in to continue.</p>
  </div>
)}

        <LoginForm onSubmit={handleSubmit} loading={loading} apiError={apiError} />

        <p className="mt-6 text-center text-sm text-text-secondary">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-brand hover:text-brand-light font-medium transition-colors">Create account</Link>
        </p>
      </div>
    </AuthShell>
  );
}
