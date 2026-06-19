import ContentIdeaCard from './ContentIdeaCard';

export interface ScheduleIdea {
  schedule: Record<string, unknown>;
  approved?: boolean;
  rejected?: boolean;
  approving?: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: string;
  schedules?: ScheduleIdea[];
}

interface GeneratedIdeasListProps {
  messages?: Message[];
  onApprove?: (schedule: Record<string, unknown>, msgId: string, index: number) => void;
  onReject?: (msgId: string, index: number) => void;
}

const GeneratedIdeasList = ({ messages = [], onApprove, onReject }: GeneratedIdeasListProps) => {
  if (!messages.length) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand/[0.08] border border-brand/[0.15] flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-brand/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <p className="text-sm font-headline font-semibold text-white/40">Belum ada rekomendasi</p>
        <p className="text-xs text-white/25 font-body mt-1">Tulis kebutuhan konten di form sebelah kiri</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 py-1">
      {messages.map((message) => {
        const isUser = message.role === 'user';
        return (
          <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`${isUser ? 'max-w-[85%]' : 'w-full'}`}>
              {/* Bubble */}
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap font-body ${
                  isUser
                    ? 'bg-brand text-black rounded-br-sm font-medium'
                    : 'bg-white/[0.04] border border-white/[0.07] text-white/75 rounded-bl-sm'
                }`}
              >
                {message.content}
              </div>

              {/* Schedule recommendation cards — up to 3 ideas per turn, each with its own image and approve/reject state */}
              {!isUser && message.type === 'schedule_recommendation' && message.schedules && message.schedules.length > 0 && (
                <div className="space-y-2">
                  {message.schedules.map((idea, index) => (
                    <ContentIdeaCard
                      key={index}
                      schedule={idea.schedule}
                      onApprove={() => onApprove?.(idea.schedule, message.id, index)}
                      onReject={() => onReject?.(message.id, index)}
                      approved={idea.approved}
                      rejected={idea.rejected}
                      approving={idea.approving}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GeneratedIdeasList;
