import React from 'react';
import ContentIdeaCard from './ContentIdeaCard';

const GeneratedIdeasList = ({ messages = [], onApprove, onReject }) => {
	if (!messages.length) {
		return (
			<div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-10 text-center">
				<p className="text-lg mb-2">✨</p>
				<p className="text-sm font-body text-text-secondary">Belum ada rekomendasi. Tulis query konten dulu.</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{messages.map((message) => {
				const isUser = message.role === 'user';

				return (
					<div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
						<div className={`max-w-[92%] ${isUser ? '' : 'w-full'}`}>
							<div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'bg-brand text-black rounded-br-md' : 'bg-white/[0.05] border border-white/[0.08] text-text-primary rounded-bl-md'}`}>
								{message.content}
							</div>

							{!isUser && message.type === 'schedule_recommendation' && message.schedule && (
								<ContentIdeaCard
									schedule={message.schedule}
									onApprove={() => onApprove?.(message.schedule, message.id)}
									onReject={() => onReject?.(message.id)}
									approved={message.approved}
									rejected={message.rejected}
									approving={message.approving}
								/>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
};

export default GeneratedIdeasList;
