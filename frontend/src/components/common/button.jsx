// src/components/common/Button.jsx
import { InlineLoader } from './Loader';

export default function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false,
  type = 'button', onClick, className = '', icon = null,
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-body font-semibold rounded-lg transition-all duration-200 focus:outline-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary:   'bg-brand hover:bg-brand-dark text-white focus:ring-2 focus:ring-brand/40',
    secondary: 'bg-surface-raised hover:bg-surface-overlay text-text-primary border border-surface-border focus:ring-2 focus:ring-white/10',
    ghost:     'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]',
    danger:    'bg-red-600 hover:bg-red-700 text-white focus:ring-2 focus:ring-red-500/40',
    outline:   'border border-brand text-brand hover:bg-brand/10 focus:ring-2 focus:ring-brand/30',
  };

  const sizes = { sm: 'px-4 py-2 text-sm', md: 'px-6 py-3 text-sm', lg: 'px-8 py-4 text-base' };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? (
        <><InlineLoader size="sm" /><span>Processing…</span></>
      ) : (
        <>{icon && <span className="shrink-0">{icon}</span>}{children}</>
      )}
    </button>
  );
}
