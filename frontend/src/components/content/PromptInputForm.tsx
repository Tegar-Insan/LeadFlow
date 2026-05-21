import React, { useRef, useEffect } from 'react';

const SUGGESTIONS = [
  'Promo ayam goreng weekend, jam prime time',
  'Konten menu best seller, gaya santai Gen-Z',
  '3 jadwal posting minggu ini untuk Bogor',
  'Tren TikTok food yang cocok untuk Krench',
];

interface PromptInputFormProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement> | { target: { value: string } }) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
}

const PromptInputForm = ({ value, onChange, onSubmit, loading = false }: PromptInputFormProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [value]);

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          rows={3}
          placeholder="Contoh: Buatkan jadwal posting promo ayam goreng malam Jumat, gaya santai untuk anak kuliah Bogor."
          disabled={loading}
          className="w-full rounded-2xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 pr-12 text-sm text-white placeholder:text-white/25 outline-none resize-none focus:border-brand/50 focus:bg-white/[0.06] transition-all duration-200 min-h-[80px] max-h-[160px] font-body leading-relaxed"
        />
      </div>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange({ target: { value: s } })}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.07] text-[10px] text-white/45 hover:border-brand/30 hover:text-brand/80 hover:bg-brand/[0.05] transition-all duration-150 font-body disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="w-full h-11 rounded-2xl bg-brand text-black text-sm font-headline font-bold hover:bg-[#d4960a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-[0_4px_20px_rgba(246,183,10,0.2)] hover:shadow-[0_4px_24px_rgba(246,183,10,0.35)] flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Menganalisis brief…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Buat Rekomendasi
          </>
        )}
      </button>
    </form>
  );
};

export default PromptInputForm;
