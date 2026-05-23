import React, { useState, useEffect } from 'react';
import DMCard from '../../components/interaction/DMCard';
import InteractionInbox from '../../components/interaction/InteractionInbox';
import ReplyBox from '../../components/interaction/ReplyBox';
import { useInteraction } from '../../hooks/useInteraction';

const InteractionPage: React.FC = () => {
  const {
    messages,
    conversations,
    currentRecipient,
    loading,
    error,
    getMessages,
    sendMessage,
    deleteMessage,
    selectConversation,
    clearError,
    unreadCount,
  } = useInteraction();

  const [sendingMessage, setSendingMessage] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleSelectConversation = (recipientId: string) => {
    selectConversation(recipientId);
    setIsMobileSidebarOpen(false);
  };

  const handleSendMessage = async (messageText: string) => {
    if (!currentRecipient) {
      alert('Please select a conversation first');
      return;
    }

    setSendingMessage(true);
    try {
      await sendMessage(currentRecipient.userId, messageText);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      await deleteMessage(messageId);
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  return (
    <div className="flex h-screen bg-surface">
      {/* Mobile overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Conversations list */}
      <div
        className={`fixed lg:static inset-y-0 left-0 w-80 bg-surface border-r border-surface-light/20
          transform transition-transform lg:translate-x-0 z-50
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="border-b border-surface-light/20 p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-text-primary">Messages</h1>
            {unreadCount > 0 && (
              <span className="inline-block px-2 py-1 bg-brand text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>

          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden text-text-secondary hover:text-text-primary"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Conversations list */}
        <div className="overflow-y-auto h-[calc(100vh-80px)] p-3">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <DMCard
                key={conversation.userId}
                conversation={conversation}
                isSelected={currentRecipient?.userId === conversation.userId}
                onClick={() => handleSelectConversation(conversation.userId)}
              />
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-surface-light/20 px-6 py-4 flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden text-text-secondary hover:text-text-primary"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {currentRecipient ? (
              <div>
                <h2 className="font-semibold text-text-primary">{currentRecipient.userName}</h2>
                <p className="text-sm text-text-secondary">{currentRecipient.userEmail}</p>
              </div>
            ) : (
              <p className="text-text-secondary">Select a conversation</p>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border-b border-red-500/30 px-6 py-3 flex items-center justify-between">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-300"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Chat content */}
        {currentRecipient ? (
          <>
            {/* Messages */}
            <InteractionInbox
              messages={messages}
              recipientName={currentRecipient.userName}
              loading={loading}
              onDeleteMessage={handleDeleteMessage}
            />

            {/* Input box */}
            <ReplyBox
              onSendMessage={handleSendMessage}
              loading={sendingMessage}
              disabled={!currentRecipient}
              placeholder={`Message ${currentRecipient.userName}...`}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <div className="w-16 h-16 mx-auto mb-4 bg-surface-light/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-text-primary font-semibold">Select a conversation</p>
              <p className="text-text-secondary text-sm">Choose a user from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractionPage;
