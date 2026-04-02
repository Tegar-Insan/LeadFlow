// src/pages/auth/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RegisterForm from '../../components/auth/RegisterForm';
import { registerInitiate } from '../../services/authService';
import { useNotification } from '../../context/NotificationContext';
import { STORAGE_KEYS } from '../../utils/constants';

function AuthShell({ children }) {
  return (
    <div className="min-h-screen flex bg-[#0a0a0a]">
      <div className="hidden lg:flex lg:w-[460px] relative overflow-hidden flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0608] via-[#0f0a0a] to-[#0a0a0a]" />
        <div className="absolute top-[25%] left-[15%] w-72 h-72 bg-brand/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col h-full p-12">
          <div className="flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
              </svg>
            </div>
            <span className="font-display font-bold text-xl text-text-primary">
              Lead<span className="text-brand">Flow</span>
            </span>
          </div>
          <div className="mb-auto">
            <h1 className="font-display font-extrabold text-4xl text-text-primary leading-tight mb-5">
              Join{' '}
              <span className="bg-gradient-to-r from-brand to-brand-light bg-clip-text text-transparent">
                LeadFlow
              </span>
            </h1>
            <p className="text-text-secondary text-base leading-relaxed">
              Create your account to start managing Krench Chicken's TikTok marketing with AI.
            </p>
          </div>
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} LeadFlow · Krench Chicken
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="lg:hidden flex items-center gap-2.5 p-6 border-b border-surface-border">
          <span className="font-display font-bold text-lg text-text-primary">
            Lead<span className="text-brand">Flow</span>
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-[440px]">{children}</div>
        </div>
      </div>
    </div>
  );
}

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

        // ✅ Show info toast — OTP sent
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
          // ✅ Phone already registered
          toast.warning(' This phone number is already registered. Please use a different number.', {
            duration: 5000,
          });
          setApiError('This phone number is already registered to another account.');
        } else {
          // ✅ Email already registered
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
      <div className="animate-slide-up">
        <div className="mb-7">
          <h2 className="font-display font-bold text-3xl text-text-primary mb-2">
            Create your account
          </h2>
          <p className="text-text-secondary text-sm">
            Join LeadFlow to manage Krench Chicken's TikTok marketing.
          </p>
        </div>

        <RegisterForm
          onSubmit={handleSubmit}
          loading={loading}
          apiError={apiError}
        />

        <p className="mt-6 text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-brand hover:text-brand-light font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}