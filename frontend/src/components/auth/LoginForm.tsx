import React, { useState } from 'react';

interface LoginFormProps {
  onSubmit?: (data: { email: string; password: string }) => void;
  loading?: boolean;
  apiError?: string;
}

const EyeIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

export default function LoginForm({ onSubmit, loading = false, apiError = '' }: LoginFormProps) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [pwdFocused,   setPwdFocused]   = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.({ email, password });
  };

  const fieldStyle = (focused: boolean): React.CSSProperties => ({
    width: '100%',
    border: 'none',
    borderBottom: `2px solid ${focused ? '#f5c518' : '#ddd'}`,
    padding: '14px 0',
    fontSize: 15,
    color: '#111',
    background: 'transparent',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: "'DM Sans', sans-serif",
  });

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#aaa',
    marginBottom: 8,
  };

  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #e8e8e8',
      borderRadius: 24,
      padding: '50px 48px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
    }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111', textAlign: 'center', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
        Sign In
      </h2>
      <p style={{ fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 36, fontFamily: "'DM Sans', sans-serif" }}>
        Welcome back to LeadFlow — manage TikTok content effortlessly.
      </p>

      {apiError && (
        <div style={{
          background: '#fff5f5',
          border: '1px solid #ffc0c0',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 24,
          fontSize: 14,
          color: '#c0392b',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label style={labelStyle}>Email Address</label>
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            style={fieldStyle(emailFocused)}
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <label style={labelStyle}>Password</label>
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPwdFocused(true)}
            onBlur={() => setPwdFocused(false)}
            style={{ ...fieldStyle(pwdFocused), paddingRight: 28 }}
            disabled={loading}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', padding: 6, cursor: 'pointer', color: '#aaa' }}
            aria-label="Toggle password visibility"
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>

        <div style={{ paddingTop: 12 }}>
          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            style={{
              width: '100%',
              padding: 16,
              background: loading ? '#f5c51899' : '#f5c518',
              color: '#111',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              fontWeight: 700,
              border: 'none',
              borderRadius: 12,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s, transform 0.15s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </div>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0', color: '#ccc', fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ flex: 1, height: 1, background: '#eee' }} />
        OR
        <div style={{ flex: 1, height: 1, background: '#eee' }} />
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>
        Not having account?{' '}
        <a href="/register" style={{ color: '#e6a800', fontWeight: 700, textDecoration: 'none' }}>
          Register Here
        </a>
      </p>
    </div>
  );
}
