import React, { useState, useRef, useEffect } from 'react';

interface ViewModeToggleProps {
  currentMode: 'grid' | 'list';
  onModeChange: (mode: 'grid' | 'list') => void;
}

export default function ViewModeToggle({ currentMode, onModeChange }: ViewModeToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (mode: 'grid' | 'list') => {
    onModeChange(mode);
    setIsOpen(false);
  };

  const displayLabel = currentMode === 'grid' ? 'Calendar' : 'List';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 px-4 rounded-full border border-slate-300 bg-white text-slate-700 text-xs font-headline font-bold transition-colors hover:bg-slate-50 flex items-center gap-2"
        aria-label="View mode"
        title="Toggle view mode"
      >
        {displayLabel}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white border border-slate-300 rounded-lg shadow-lg z-50 min-w-[120px]">
          <button
            type="button"
            onClick={() => handleSelect('grid')}
            className={`w-full text-left px-4 py-2 text-xs font-headline font-bold transition-colors first:rounded-t-lg ${
              currentMode === 'grid'
                ? 'bg-brand text-black'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Calendar
          </button>
          <button
            type="button"
            onClick={() => handleSelect('list')}
            className={`w-full text-left px-4 py-2 text-xs font-headline font-bold transition-colors last:rounded-b-lg ${
              currentMode === 'list'
                ? 'bg-brand text-black'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            List
          </button>
        </div>
      )}
    </div>
  );
}
