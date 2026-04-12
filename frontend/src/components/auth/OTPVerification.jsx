// src/components/auth/OTPVerification.jsx
// 6-digit OTP input with paste, keyboard nav, countdown resend

import { useState, useRef, useEffect, useCallback } from 'react';
import Button from '../common/button';
import { resendOTP } from '../../services/authService';
import { OTP_RESEND_COOLDOWN } from '../../utils/constants';

const LEN = 6;

export default function OTPVerification({ email, otpType = 'register', onSubmit, onBack, loading = false, error = '' }) {
  const [digits,    setDigits]    = useState(Array(LEN).fill(''));
  const [cooldown,  setCooldown]  = useState(OTP_RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resendErr, setResendErr] = useState('');
  const refs = useRef([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const focus = (i) => refs.current[i]?.focus();

  const handleChange = useCallback((i, val) => {
    const d = val.replace(/\D/g, '').slice(-1);
    setDigits((prev) => { const n = [...prev]; n[i] = d; return n; });
    if (d && i < LEN - 1) focus(i + 1);
  }, []);

  const handleKeyDown = useCallback((i, e) => {
    if (e.key === 'Backspace') {
      if (digits[i]) { setDigits((p) => { const n = [...p]; n[i] = ''; return n; }); }
      else focus(i - 1);
    } else if (e.key === 'ArrowLeft')  focus(i - 1);
    else if (e.key === 'ArrowRight') focus(i + 1);
  }, [digits]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LEN);
    const next = Array(LEN).fill('');
    pasted.split('').forEach((c, i) => { next[i] = c; });
    setDigits(next);
    focus(Math.min(pasted.length, LEN - 1));
  }, []);

  const otp        = digits.join('');
  const isComplete = otp.length === LEN && /^\d{6}$/.test(otp);
  const masked     = email?.replace(/^(.).+(@.+)$/, (_, f, d) => `${f}****${d}`);

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResendMsg(''); setResendErr(''); setResending(true);
    try {
      const res = await resendOTP({ email, type: otpType });
      if (res.success) {
        setResendMsg(res.data?.devOtp ? `[DEV] New OTP: ${res.data.devOtp}` : 'New code sent to your email.');
        setCooldown(OTP_RESEND_COOLDOWN);
        setDigits(Array(LEN).fill(''));
        refs.current[0]?.focus();
      }
    } catch (err) {
      setResendErr(err.response?.data?.message || 'Failed to resend. Try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h2 className="text-2xl font-display font-bold text-text-primary">Check your email</h2>
        <p className="mt-2 text-sm text-text-secondary">
          We sent a 6-digit code to <span className="text-text-primary font-medium">{masked}</span>
        </p>
      </div>

      {/* Alerts */}
      {error    && <div className="mb-4 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400 px-4 py-3 text-sm">{error}</div>}
      {resendMsg && <div className="mb-4 rounded-xl border bg-green-500/10 border-green-500/30 text-green-400 px-4 py-3 text-sm">{resendMsg}</div>}
      {resendErr && <div className="mb-4 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400 px-4 py-3 text-sm">{resendErr}</div>}

      <form onSubmit={(e) => { e.preventDefault(); if (isComplete) onSubmit(otp); }}>
        {/* Digit boxes */}
        <div className="flex gap-3 justify-center mb-8" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              type="text" inputMode="numeric" maxLength={1} value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
              aria-label={`Digit ${i + 1}`}
              className={`w-12 h-14 text-center text-xl font-mono font-bold bg-surface-raised rounded-xl
                outline-none transition-all duration-200 focus:scale-105
                focus:border-brand focus:ring-2 focus:ring-brand/20
                ${d ? 'border border-brand/50 bg-brand/5' : 'border border-surface-border'}
                ${error ? 'animate-shake' : ''}`}
            />
          ))}
        </div>
        <Button type="submit" variant="primary" loading={loading} disabled={!isComplete} className="w-full">
          Verify Code
        </Button>
      </form>

      {/* Resend + back */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <p className="text-sm text-text-secondary">
          Didn&apos;t receive it?{' '}
          {cooldown > 0
            ? <span className="text-text-muted">Resend in <span className="font-mono text-brand">0:{String(cooldown).padStart(2,'0')}</span></span>
            : <button type="button" onClick={handleResend} disabled={resending}
                className="text-brand hover:text-brand-light font-medium transition-colors">
                {resending ? 'Sending…' : 'Resend code'}
              </button>
          }
        </p>
        {onBack && (
          <button type="button" onClick={onBack}
            className="text-sm text-text-muted hover:text-text-secondary flex items-center gap-1 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
      </div>
    </div>
  );
}
