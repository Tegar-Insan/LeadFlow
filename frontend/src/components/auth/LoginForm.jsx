// src/components/auth/LoginForm.jsx
import { useState } from 'react';
import Button from '../common/button';

function validate({ email, password }) {
  const errors = {};
  if (!email)                                           errors.email    = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email    = 'Enter a valid email.';
  if (!password) errors.password = 'Password is required.';
  return errors;
}

/* ─── Eye icons ─── */
const EyeOff = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const EyeOn = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/* ─── Field wrapper ─── */
function Field({ id, label, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[10px] font-headline font-bold text-text-secondary uppercase tracking-widest">
        {label}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-400 animate-slide-up font-body">
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

/* ─── Main component ─── */
export default function LoginForm({ onSubmit, loading = false, apiError = '' }) {
  const [form,   setForm]   = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [show,   setShow]   = useState(false);
  const [focused, setFocused] = useState('');

  const handle = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(form);
  };

  /* dynamic ring color based on error / focus state */
  const inputCls = (field) => [
    'w-full bg-transparent border-0 border-b-2 rounded-none px-0 py-3',
    'text-text-primary placeholder:text-text-muted text-sm font-body outline-none',
    'transition-all duration-200',
    errors[field]
      ? 'border-red-500/70'
      : focused === field
        ? 'border-brand'
        : 'border-white/15 hover:border-white/30',
  ].join(' ');

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">

      {/* API error */}
      {apiError && (
        <div className="flex items-start gap-2.5 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400 px-4 py-3 text-sm animate-slide-up font-body">
          <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p>{apiError}</p>
        </div>
      )}

      {/* Email */}
      <Field id="email" label="Email address" error={errors.email}>
        <input
          id="email" type="email" autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handle('email')}
          onFocus={() => setFocused('email')}
          onBlur={() => setFocused('')}
          className={inputCls('email')}
        />
      </Field>

      {/* Password */}
      <Field id="password" label="Password" error={errors.password}>
        <div className="relative">
          <input
            id="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={form.password}
            onChange={handle('password')}
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused('')}
            className={`${inputCls('password')} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            tabIndex={-1}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors duration-200"
          >
            {show ? <EyeOff /> : <EyeOn />}
          </button>
        </div>
      </Field>

      {/* Submit */}
      <div className="pt-1">
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          className="w-full btn-shimmer"
        >
          Sign In
        </Button>
      </div>
    </form>
  );
}
