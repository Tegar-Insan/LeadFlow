// src/components/common/Switch.tsx
// Reusable on/off toggle, light theme (matches GeneratedIdeasPage/AgenticModePage).

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export default function Switch({
  checked, onChange, label, description, disabled = false, className = '',
}: SwitchProps): JSX.Element {
  return (
    <label
      className={`flex items-start gap-3 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative shrink-0 mt-0.5 w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand/30 ${
          checked ? 'bg-brand' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      {(label || description) && (
        <span className="flex flex-col">
          {label && <span className="text-sm font-headline font-semibold text-gray-900">{label}</span>}
          {description && <span className="text-xs text-gray-500 font-body mt-0.5">{description}</span>}
        </span>
      )}
    </label>
  );
}
