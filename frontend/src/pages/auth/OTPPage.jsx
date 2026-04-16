// src/pages/auth/OTPPage.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import OTPVerification from '../../components/auth/OTPVerification';
import { STORAGE_KEYS } from '../../utils/constants';

export default function OTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOTP } = useAuth();
  const { toast } = useNotification();

  const email =
    location.state?.email ||
    localStorage.getItem(STORAGE_KEYS.PENDING_EMAIL) ||
    '';

  const [loading,  setLoading]  = useState(false);
  const [otpError, setOtpError] = useState('');

  if (!email) {
    navigate('/register', { replace: true });
    return null;
  }

  const handleOTPSubmit = async (otp) => {
    setOtpError('');
    setLoading(true);
    try {
      await verifyOTP(email, otp);
      localStorage.removeItem(STORAGE_KEYS.PENDING_EMAIL);

      // ✅ Show animated success toast from bottom
      toast.success('🎉 Account created successfully! Welcome to Krench Chicken.', {
        duration: 3000,
      });

      // ✅ Wait 1.5s so user sees the toast, then redirect to login
      setTimeout(() => {
        navigate('/login', { replace: true, state: { registered: true } });
      }, 1500);

    } catch (err) {
      const message = err.response?.data?.message || err.message || '';
      if (
        message.toLowerCase().includes('invalid') ||
        message.toLowerCase().includes('incorrect') ||
        message.toLowerCase().includes('wrong')
      ) {
        setOtpError('Wrong OTP code. Please check your email and try again.');
      } else if (message.toLowerCase().includes('expired')) {
        setOtpError('OTP has expired. Please click Resend to get a new code.');
      } else {
        setOtpError(message || 'Invalid or expired OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="relative w-full max-w-[420px]">
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center glow-red">
            <span className="text-black font-headline font-bold text-sm">K</span>
          </div>
          <span className="font-headline font-bold text-xl text-text-primary">
            Krench <span className="text-brand">Chicken</span>
          </span>
        </div>

        <div className="card p-8">
          <OTPVerification
            email={email}
            otpType="register"
            onSubmit={handleOTPSubmit}
            onBack={() => navigate('/register')}
            loading={loading}
            error={otpError}
          />
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          © {new Date().getFullYear()} Krench Chicken · Bogor, West Java
        </p>
      </div>
    </div>
  );
}