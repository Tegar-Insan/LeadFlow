// src/components/auth/LoginForm.jsx
// Login form component — used by LoginPage

import { useState } from 'react';
import Button from '../common/button';

function validate({ email, password }) {
  const errors = {};
  if (!email)                                    errors.email    = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Password is required.';
  return errors;
}

export default function LoginForm({ onSubmit, loading = false, apiError = '' }) {
  const [form,   setForm]   = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [show,   setShow]   = useState(false);

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

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* API error */}
      {apiError && (
        <div className="flex items-start gap-2.5 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400 px-4 py-3 text-sm animate-slide-up">
          <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          <p>{apiError}</p>
        </div>
      )}

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-text-secondary">
          Email address <span className="text-brand">*</span>
        </label>
        <input
          id="email" type="email" autoComplete="email"
          placeholder="you@example.com"
          value={form.email} onChange={handle('email')}
          className={`input-field ${errors.email ? 'input-error' : ''}`}
        />
        {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-text-secondary">
          Password <span className="text-brand">*</span>
        </label>
        <div className="relative">
          <input
            id="password" type={show ? 'text' : 'password'} autoComplete="current-password"
            placeholder="Enter your password"
            value={form.password} onChange={handle('password')}
            className={`input-field pr-11 ${errors.password ? 'input-error' : ''}`}
          />
          <button type="button" onClick={() => setShow((s) => !s)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
            tabIndex={-1} aria-label={show ? 'Hide password' : 'Show password'}>
            {show
              ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3"/></svg>
            }
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
      </div>

      <Button type="submit" variant="primary" loading={loading} className="w-full">
        Sign In
      </Button>
    </form>
  );
}
