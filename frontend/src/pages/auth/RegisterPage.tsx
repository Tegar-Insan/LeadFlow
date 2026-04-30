import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DotCanvas from '../../components/common/DotCanvas';
import FeatureCard from '../../components/common/FeatureCard';
import RegisterForm from '../../components/auth/RegisterForm';
import { registerInitiate } from '../../services/authService';
import { useNotification } from '../../context/NotificationContext';
import { STORAGE_KEYS } from '../../utils/constants';

const FEATURES = [
  {
    title: 'AI Content Ideas',
    description: 'Neural-mapped trending topics generated instantly for your niche.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 28, height: 28 }}>
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    title: 'Easy Schedule',
    description: 'Easy management schedule, relax and set publish to TikTok.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 28, height: 28 }}>
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    title: 'Unified Inbox',
    description: 'Centralised command center for all your community engagement.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 28, height: 28 }}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: 'Analytics',
    description: 'Deep-dive metrics with real-time conversion tracking.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 28, height: 28 }}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

const Logo: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 52 }}>
    <div style={{
      width: 38, height: 38, background: '#f5c518',
      borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <svg viewBox="0 0 20 20" fill="none" style={{ width: 20, height: 20 }}>
        <path d="M10 2L14 8H6L10 2Z" fill="#111" />
        <rect x="7" y="10" width="6" height="7" rx="1" fill="#111" />
      </svg>
    </div>
    <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', color: '#111', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>
      Krench Chicken
    </span>
  </div>
);

export default function RegisterPage() {
  const navigate   = useNavigate();
  const { toast }  = useNotification();
  const [loading,  setLoading]  = useState(false);
  const [apiError, setApiError] = useState('');

  const handleSubmit = async (formData: {
    email: string; password: string;
    fullName: string; phone: string; role: string;
  }) => {
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
        localStorage.setItem(STORAGE_KEYS.PENDING_EMAIL, formData.email.trim().toLowerCase());
        toast.info(`📧 Verification code sent to ${formData.email}. Check your inbox!`, { duration: 4000 });
        navigate('/otp', { state: { email: formData.email.trim().toLowerCase() } });
      }
    } catch (err: unknown) {
      const e   = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const status  = e.response?.status;
      const message = e.response?.data?.message ?? e.message ?? '';

      if (status === 409) {
        if (message.toLowerCase().includes('phone')) {
          toast.warning('This phone number is already registered. Please use a different number.', { duration: 5000 });
          setApiError('This phone number is already registered to another account.');
        } else {
          toast.warning('This email is already registered. Please sign in instead.', { duration: 5000 });
          setApiError('An account with this email already exists. Please sign in.');
        }
      } else {
        setApiError(message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: '#ffffff',
      color: '#111',
      minHeight: '100vh',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <DotCanvas />

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        minHeight: '100vh', padding: '60px 6vw', gap: 100,
      }}>
        {/* Left brand panel */}
        <div style={{ flex: 1, maxWidth: 480, minWidth: 0, paddingTop: 20 }}>
          <Logo />
          <h1 style={{
            fontSize: 'clamp(32px, 4vw, 52px)',
            fontWeight: 700, lineHeight: 1.1, color: '#111', marginBottom: 12,
          }}>
            TikTok growth,<br />
            <span style={{ color: '#e6a800' }}>with LeadFlow.</span>
          </h1>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 40 }}>
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} feature={f} />
            ))}
          </div>

          <p style={{ marginTop: 48, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#aaa' }}>
            For Krench Chicken Management Only
          </p>
        </div>

        {/* Right form panel */}
        <div style={{ flexShrink: 0, width: 480, maxWidth: '100%' }}>
          <div style={{
            background: '#fff',
            border: '1.5px solid #e8e8e8',
            borderRadius: 24,
            padding: '50px 48px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
          }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111', textAlign: 'center', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
              Create Account
            </h2>
            <p style={{ fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 32, fontFamily: "'DM Sans', sans-serif" }}>
              Register your LeadFlow access and verify by OTP.
            </p>

            <RegisterForm onSubmit={handleSubmit} loading={loading} apiError={apiError} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0', color: '#ccc', fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
              <div style={{ flex: 1, height: 1, background: '#eee' }} />
              OR
              <div style={{ flex: 1, height: 1, background: '#eee' }} />
            </div>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>
              Already have account?{' '}
              <Link to="/login" style={{ color: '#e6a800', fontWeight: 700, textDecoration: 'none' }}>
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
