import React from 'react';
import IdeaValidationPanel from '../../components/content/IdeaValidationPanel';

export default function IdeaValidationPage() {
	return (
		<IdeaValidationPanel
			title="Validate AI Ideas"
			subtitle="Periksa rekomendasi AI, lalu setujui jika jadwalnya sudah cocok untuk dipasang di kalender."
			intro="Masukkan kebutuhan konten dan lihat hasil rekomendasi jadwal dari AI."
		/>
	);
}
