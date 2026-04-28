import React from 'react';

const SUGGESTIONS = [
	'Buat jadwal konten promo ayam goreng besok jam prime time',
	'Rekomendasikan 3 jadwal posting untuk minggu ini',
	'Buat konten TikTok untuk menu best seller Krench Chicken',
	'Cari waktu posting terbaik untuk audience Bogor',
];

const PromptInputForm = ({ value, onChange, onSubmit, loading = false }) => {
	return (
		<form onSubmit={onSubmit} className="space-y-3">
			<div className="space-y-2">
				<label className="block text-xs font-body font-semibold text-text-secondary uppercase tracking-widest">
					Tulis kebutuhan konten
				</label>
				<textarea
					value={value}
					onChange={onChange}
					rows={4}
					placeholder="Contoh: Buatkan jadwal posting untuk promo ayam goreng malam Jumat dengan gaya santai."
					className="w-full rounded-2xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none resize-none focus:border-brand/40 focus:bg-white/[0.06] transition-colors"
				/>
			</div>

			<div className="flex flex-wrap gap-2">
				{SUGGESTIONS.map((suggestion) => (
					<button
						key={suggestion}
						type="button"
						onClick={() => onChange({ target: { value: suggestion } })}
						className="px-3 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-text-secondary hover:border-brand/30 hover:text-text-primary transition-colors"
					>
						{suggestion}
					</button>
				))}
			</div>

			<button
				type="submit"
				disabled={loading || !value.trim()}
				className="w-full h-11 rounded-2xl bg-brand text-black text-sm font-headline font-bold hover:bg-[#d4960a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				{loading ? 'Menganalisis…' : 'Buat Rekomendasi Jadwal'}
			</button>
		</form>
	);
};

export default PromptInputForm;
