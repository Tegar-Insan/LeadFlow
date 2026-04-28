import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import { approveScheduleFromChat, rejectScheduleFromChat, sendChatMessage } from '../../services/chatbotService';
import GeneratedIdeasList from './GeneratedIdeasList';
import PromptInputForm from './PromptInputForm';

const defaultWelcome = {
	id: 'welcome',
	role: 'assistant',
	content: 'Ketik kebutuhan konten kamu, lalu saya akan bantu buat rekomendasi jadwal yang bisa langsung dikirim ke kalender.',
	type: 'text',
};

const IdeaValidationPanel = ({ title, subtitle, intro }) => {
	const navigate = useNavigate();
	const { toast } = useNotification();
	const [messages, setMessages] = useState([{
		...defaultWelcome,
		content: intro || defaultWelcome.content,
	}]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const bottomRef = useRef(null);
	const messageCount = useMemo(() => messages.length, [messages]);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages, loading]);

	const send = useCallback(async (text) => {
		const content = String(text || '').trim();
		if (!content || loading) return;

		const userMessage = { id: `user_${Date.now()}`, role: 'user', content, type: 'text' };
		const nextMessages = [...messages, userMessage];

		setMessages(nextMessages);
		setInput('');
		setError('');
		setLoading(true);

		try {
			const response = await sendChatMessage(nextMessages.map(({ role, content: messageContent }) => ({ role, content: messageContent })));
			const assistantMessage = {
				id: `ai_${Date.now()}`,
				role: 'assistant',
				content: response.reply,
				type: response.type || 'text',
				schedule: response.schedule || null,
				approved: false,
				rejected: false,
				approving: false,
			};
			setMessages((prev) => [...prev, assistantMessage]);
		} catch (err) {
			setError(err?.response?.data?.message || 'Gagal menghubungi AI assistant.');
		} finally {
			setLoading(false);
		}
	}, [loading, messages]);

	const handleApprove = useCallback(async (schedule, msgId) => {
		if (!schedule) return;
		setMessages((prev) => prev.map((message) => (message.id === msgId ? { ...message, approving: true } : message)));

		try {
			const result = await approveScheduleFromChat(schedule);
			const createdId = result?.schedule?.id;
			toast.success('Schedule berhasil dibuat. Membuka kalender…');

			setMessages((prev) => [
				...prev.map((message) => (message.id === msgId ? { ...message, approving: false, approved: true } : message)),
				{
					id: `confirm_${Date.now()}`,
					role: 'assistant',
					content: 'Jadwal sudah dikirim ke kalender.',
					type: 'text',
				},
			]);

			navigate('/calendar', {
				replace: true,
				state: {
					createdScheduleId: createdId,
				},
			});
		} catch (err) {
			setMessages((prev) => prev.map((message) => (message.id === msgId ? { ...message, approving: false } : message)));
			setError(err?.response?.data?.message || 'Gagal membuat schedule dari rekomendasi AI.');
		}
	}, [navigate, toast]);

	const handleReject = useCallback(async (msgId) => {
		setMessages((prev) => prev.map((message) => (message.id === msgId ? { ...message, rejected: true } : message)));

		try {
			const result = await rejectScheduleFromChat();
			if (result?.reply) {
				setMessages((prev) => [
					...prev,
					{
						id: `reject_${Date.now()}`,
						role: 'assistant',
						content: result.reply,
						type: 'text',
					},
				]);
			}
		} catch {
			setMessages((prev) => [
				...prev,
				{
					id: `reject_fallback_${Date.now()}`,
					role: 'assistant',
					content: 'Baik, saya tidak akan membuat jadwal itu.',
					type: 'text',
				},
			]);
		}
	}, []);

	const handleSubmit = (e) => {
		e.preventDefault();
		send(input);
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-white via-pink-50 to-white text-text-primary">
			<div className="max-w-5xl mx-auto px-4 py-6 lg:py-8">
				<div className="rounded-[28px] overflow-hidden border border-white/[0.08] bg-[#101010]/95 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
					<div className="px-6 py-5 border-b border-white/[0.06] bg-white/[0.02]">
						<p className="text-[11px] font-body font-semibold uppercase tracking-[0.28em] text-brand">AI Content Assistant</p>
						<h1 className="mt-2 text-2xl md:text-3xl font-headline font-bold text-text-primary">{title}</h1>
						<p className="mt-1 text-sm text-text-secondary font-body max-w-2xl">{subtitle}</p>
					</div>

					<div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-0">
						<div className="px-6 py-6 border-b lg:border-b-0 lg:border-r border-white/[0.06]">
							<div className="space-y-4">
								<GeneratedIdeasList messages={messages} onApprove={handleApprove} onReject={handleReject} />
								<div ref={bottomRef} />
							</div>
						</div>

						<div className="px-6 py-6 bg-white/[0.02]">
							<div className="sticky top-6 space-y-5">
								<div>
									<p className="text-[11px] font-body font-semibold uppercase tracking-widest text-text-muted mb-2">Mulai dari sini</p>
									<PromptInputForm value={input} onChange={(e) => setInput(e.target.value)} onSubmit={handleSubmit} loading={loading} />
								</div>

								<div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-2">
									<p className="text-xs font-headline font-bold text-text-primary uppercase tracking-widest">Cara kerja</p>
									<p className="text-sm text-text-secondary font-body leading-relaxed">
										Tulis kebutuhan konten, AI akan memberi rekomendasi jadwal, lalu tombol Setujui akan membuat schedule nyata di Calendar.
									</p>
									<p className="text-xs text-text-muted font-body">
										{messageCount} pesan di percakapan ini.
									</p>
								</div>

								{error && (
									<div className="rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand font-body">
										{error}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default IdeaValidationPanel;
