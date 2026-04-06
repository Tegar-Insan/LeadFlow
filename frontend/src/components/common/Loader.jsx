// src/components/common/Loader.jsx
// Full-page and inline loading spinner

export function FullPageLoader({ message = 'Loading LeadFlow…' }) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-surface-border" />
          <div className="absolute inset-0 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        </div>
        {message && <p className="text-text-muted text-sm font-body">{message}</p>}
      </div>
    );
  }
  
  export function InlineLoader({ size = 'md', className = '' }) {
    const sizes = { sm: 'w-4 h-4 border-[1.5px]', md: 'w-5 h-5 border-2', lg: 'w-7 h-7 border-2' };
    return (
      <span
        className={`inline-block rounded-full border-current border-t-transparent animate-spin ${sizes[size]} ${className}`}
        role="status"
        aria-label="Loading"
      />
    );
  }
  
  export default FullPageLoader;
  