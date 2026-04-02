// src/components/auth/RegisterForm.jsx
import { useState } from 'react';
import Button from '../common/Button';

const ROLE_OPTIONS = [
  { value: 'business_owner',  label: 'Business Owner',  desc: 'Monitor performance & manage team' },
  { value: 'marketing_staff', label: 'Marketing Staff', desc: 'Manage content, schedule & interactions' },
];

// ✅ FIXED: Field defined OUTSIDE RegisterForm to prevent remount on every keystroke
function Field({ id, label, type = 'text', placeholder, autoComplete, value, onChange, error, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text-secondary">
        {label} <span className="text-brand">*</span>
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        className={`input-field ${error ? 'input-error' : ''}`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {!error && hint && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

function PasswordStrength({ password }) {
  if (!password) return null;
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[@$!%*?&]/.test(password),
  ].filter(Boolean).length;
  const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500', 'bg-green-500'];
  const labels = ['', 'Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < score ? colors[score] : 'bg-surface-overlay'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-text-muted">{labels[score]}</p>
    </div>
  );
}

function validate(form) {
  const e = {};
  if (!form.fullName?.trim() || form.fullName.trim().length < 2)
    e.fullName = 'Full name must be at least 2 characters.';
  if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    e.email = 'Enter a valid email address.';
  if (!form.phone || !/^[+]?[\d\s\-()]{8,20}$/.test(form.phone))
    e.phone = 'Enter a valid phone number.';
  if (!form.password || form.password.length < 8)
    e.password = 'Password must be at least 8 characters.';
  else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(form.password))
    e.password = 'Must include uppercase, lowercase, number and @$!%*?&';
  if (!form.confirmPassword)
    e.confirmPassword = 'Please confirm your password.';
  else if (form.password !== form.confirmPassword)
    e.confirmPassword = 'Passwords do not match.';
  if (!form.role)
    e.role = 'Please select your role.';
  return e;
}

export default function RegisterForm({ onSubmit, loading = false, apiError = '' }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: '',
  });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw]   = useState(false);

  // ✅ Stable onChange handler using field name
  const handle = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const selectRole = (value) => {
    setForm((prev) => ({ ...prev, role: value }));
    if (errors.role) setErrors((prev) => ({ ...prev, role: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">

      {/* API error banner */}
      {apiError && (
        <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm animate-slide-up
          ${apiError.startsWith('[DEV')
            ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          <p>{apiError}</p>
        </div>
      )}

      <Field
        id="fullName" label="Full name"
        placeholder="Dadang Hermawan" autoComplete="name"
        value={form.fullName} onChange={handle('fullName')}
        error={errors.fullName}
      />

      <Field
        id="email" label="Email address" type="email"
        placeholder="you@example.com" autoComplete="email"
        value={form.email} onChange={handle('email')}
        error={errors.email}
      />

      <Field
        id="phone" label="Phone number" type="tel"
        placeholder="+62 812 3456 7890" autoComplete="tel"
        value={form.phone} onChange={handle('phone')}
        error={errors.phone}
      />

      {/* Password with strength meter */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-text-secondary">
          Password <span className="text-brand">*</span>
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Min. 8 chars, A-Z, 0-9, @$!%"
            value={form.password}
            onChange={handle('password')}
            className={`input-field pr-11 ${errors.password ? 'input-error' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            tabIndex={-1}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {showPw
                ? <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" strokeLinecap="round" strokeLinejoin="round"/>
                : <>
                    <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3"/>
                  </>
              }
            </svg>
          </button>
        </div>
        <PasswordStrength password={form.password} />
        {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
      </div>

      <Field
        id="confirmPassword" label="Confirm password" type="password"
        placeholder="Re-enter password" autoComplete="new-password"
        value={form.confirmPassword} onChange={handle('confirmPassword')}
        error={errors.confirmPassword}
      />

      {/* Role selector */}
      <div>
        <label className="text-sm font-medium text-text-secondary block mb-2">
          Select role <span className="text-brand">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {ROLE_OPTIONS.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => selectRole(value)}
              className={`p-3 rounded-xl border text-left transition-all duration-200
                ${form.role === value
                  ? 'border-brand bg-brand/10 ring-1 ring-brand/30'
                  : 'border-surface-border bg-surface-raised hover:border-surface-overlay'}`}
            >
              <p className={`text-sm font-semibold mb-0.5 ${form.role === value ? 'text-brand' : 'text-text-primary'}`}>
                {label}
              </p>
              <p className="text-xs text-text-muted leading-tight">{desc}</p>
            </button>
          ))}
        </div>
        {errors.role && <p className="text-xs text-red-400 mt-1.5">{errors.role}</p>}
      </div>

      <Button type="submit" variant="primary" loading={loading} className="w-full">
        Continue — Verify Email
      </Button>
    </form>
  );
}