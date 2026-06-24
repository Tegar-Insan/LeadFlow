// src/components/common/Button.tsx
import { InlineLoader } from './KineticLoader';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonType = 'button' | 'submit' | 'reset';

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  type?: ButtonType;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  icon?: React.ReactNode;
}

export default function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false,
  type = 'button', onClick, className = '', icon = null,
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-headline font-bold rounded-lg transition-all duration-200 focus:outline-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary:   'bg-brand hover:bg-brand-dark text-black focus:ring-2 focus:ring-brand/40 hover:shadow-[0_0_20px_rgba(246,183,10,0.35)]',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 focus:ring-2 focus:ring-gray-300',
    ghost:     'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
    danger:    'bg-red-600 hover:bg-red-700 text-white focus:ring-2 focus:ring-red-500/40',
    outline:   'border border-brand/50 text-brand hover:bg-brand/10 hover:border-brand focus:ring-2 focus:ring-brand/30',
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
