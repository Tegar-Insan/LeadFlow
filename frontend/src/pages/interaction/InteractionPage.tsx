import React, { useState } from 'react';
import InternalMessage from './InternalMessage';
import ExternalMessage from './ExternalMessage';

type MessageType = 'internal' | 'external';

const InteractionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MessageType>('internal');

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex gap-8 px-6">
          <button
            onClick={() => setActiveTab('internal')}
            className={`py-4 font-medium transition-colors border-b-2 ${
              activeTab === 'internal'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center gap-2">
              👥 Internal Messages
            </span>
          </button>
          <button
            onClick={() => setActiveTab('external')}
            className={`py-4 font-medium transition-colors border-b-2 ${
              activeTab === 'external'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center gap-2">
              🎵 TikTok Interactions
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'internal' ? (
          <InternalMessage />
        ) : (
          <ExternalMessage />
        )}
      </div>
    </div>
  );
};

export default InteractionPage;
