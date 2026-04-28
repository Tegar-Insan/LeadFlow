import React from 'react';
import IdeaValidationPanel from '../../components/content/IdeaValidationPanel';

export default function PromptPage() {
	return (
		<IdeaValidationPanel
			title="Prompt to Schedule"
			subtitle="Tulis kebutuhan kontenmu, lalu AI akan membuat rekomendasi jadwal yang bisa langsung disetujui dan dikirim ke kalender."
			intro="Halo! Tulis prompt konten kamu di sini. Saya akan bantu ubah menjadi rekomendasi jadwal yang siap dibuat di kalender."
		/>
	);
}

