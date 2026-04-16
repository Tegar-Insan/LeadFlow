// src/pages/auth/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RegisterForm from '../../components/auth/RegisterForm';
import { registerInitiate } from '../../services/authService';
import { useNotification } from '../../context/NotificationContext';
import { STORAGE_KEYS } from '../../utils/constants';

function AuthShell({ children }) {
  return (
    <div className="min-h-screen flex bg-surface">
      <div className="hidden lg:flex lg:w-[460px] relative overflow-hidden flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1200] via-[#0d0a00] to-surface" />
        <div className="absolute top-[25%] left-[15%] w-72 h-72 bg-brand/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col h-full p-12">
          <div className="flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center glow-red">
              <span className="text-black font-headline font-bold text-base">K</span>
            </div>
            <span className="font-headline font-bold text-xl text-text-primary">
              Krench <span className="text-brand">Chicken</span>
            </span>
          </div>
          <div className="mb-auto">
            <h1 className="font-headline font-bold text-4xl text-text-primary leading-tight mb-5">
              Join{' '}
              <span className="bg-gradient-to-r from-brand to-brand-light bg-clip-text text-transparent">
                Krench Chicken
              </span>
            </h1>
            <p className="text-text-secondary text-base leading-relaxed">
              Create your account to start managing Krench Chicken's TikTok marketing with AI.
            </p>
          </div>
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} Krench Chicken · Bogor, West Java
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="lg:hidden flex items-center gap-2.5 p-6 border-b border-surface-border">
          <span className="font-headline font-bold text-lg text-text-primary">
            Krench <span className="text-brand">Chicken</span>
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
          <h2 className="font-headline font-bold text-4xl text-text-primary mb-2 tracking-tight">
            Create your account
          </h2>
          <p className="text-text-secondary text-base font-body">
            Join Krench Chicken to manage your TikTok marketing with AI.
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