// src/pages/interaction/ExternalMessage.tsx
import React, { useEffect, useState } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

interface ExternalInteraction {
  id: string;
  tiktokAccountId: string;
  tiktokUserId: string;
  tiktokUsername: string;
  tiktokUserAvatar: string;
  messageText: string;
  channelType: 'comment' | 'dm';
  sentimentType?: string;
  priorityLevel?: 'high' | 'medium' | 'low';
  classificationStatus: 'unclassified' | 'classified';
  amountMessageSent: number;
  sendMessageStatus: 'pending' | 'sent' | 'failed';
  createdAt: string;
}

export default function ExternalMessage() {
  const { user } = useAuth();
  const { toast } = useNotification();

  const [interactions, setInteractions] = useState<ExternalInteraction[]>([]);
  const [filteredInteractions, setFilteredInteractions] = useState<ExternalInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'comment' | 'dm'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [replyText, setReplyText] = useState('');
  const [selectedInteractionId, setSelectedInteractionId] = useState<string | null>(null);

  // Load TikTok interactions from backend
  const loadInteractions = async () => {
    setLoading(true);
    try {
      // TODO: Implement backend API call to fetch TikTok interactions
      // const response = await axios.get(`${API}/interaction/tiktok`, { headers: authHeader() });
      // setInteractions(response.data.data.interactions || []);
      toast.success('Interactions loaded (placeholder)');
    } catch (err) {
      console.error('Failed to load interactions:', err);
      toast.error('Failed to load TikTok interactions');
    } finally {
      setLoading(false);
    }
  };

  // Filter interactions based on channel type and priority
  useEffect(() => {
    let filtered = interactions;

    if (selectedFilter !== 'all') {
      filtered = filtered.filter((i) => i.channelType === selectedFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter((i) => i.priorityLevel === priorityFilter);
    }

    setFilteredInteractions(filtered);
  }, [interactions, selectedFilter, priorityFilter]);

  // Load on mount
  useEffect(() => {
    loadInteractions();
  }, []);

  const handleReply = async (interactionId: string) => {
    if (!replyText.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    try {
      // TODO: Implement backend API call to send reply to TikTok
      // await axios.post(`${API}/interaction/${interactionId}/reply`, {
      //   messageText: replyText,
      // });
      toast.success('Reply sent to TikTok');
      setReplyText('');
      setSelectedInteractionId(null);
      loadInteractions();
    } catch (err) {
      console.error('Failed to send reply:', err);
      toast.error('Failed to send reply');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    const colors: { [key: string]: string } = {
      purchase_intent: 'bg-blue-100 text-blue-700',
      complaint: 'bg-red-100 text-red-700',
      compliment: 'bg-green-100 text-green-700',
      general_inquiry: 'bg-purple-100 text-purple-700',
      spam: 'bg-gray-100 text-gray-700',
    };
    return colors[sentiment] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar - Filter & Stats */}
      <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">TikTok Interactions</h2>
          <p className="text-sm text-gray-500 mt-2">Comments & Direct Messages</p>
        </div>

        {/* Filters */}
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {/* Channel Type Filter */}
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase mb-2 block">
              Channel Type
            </label>
            <div className="space-y-2">
              {(['all', 'comment', 'dm'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedFilter(type)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedFilter === type
                      ? 'bg-brand text-white'
                      : 'text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {type === 'all'
                    ? 'All Messages'
                    : type === 'comment'
                      ? '💬 Comments'
                      : '📨 Direct Messages'}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase mb-2 block">
              Priority
            </label>
            <div className="space-y-2">
              {(['all', 'high', 'medium', 'low'] as const).map((priority) => (
                <button
                  key={priority}
                  onClick={() => setPriorityFilter(priority)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    priorityFilter === priority
                      ? 'bg-brand text-white'
                      : 'text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {priority === 'all' ? 'All Priorities' : priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-3">Stats</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="font-bold text-gray-900">{interactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Unclassified</span>
                <span className="font-bold text-gray-900">
                  {interactions.filter((i) => i.classificationStatus === 'unclassified').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">High Priority</span>
                <span className="font-bold text-red-700">
                  {interactions.filter((i) => i.priorityLevel === 'high').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-4 bg-white">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedFilter === 'all'
                ? 'All Interactions'
                : selectedFilter === 'comment'
                  ? 'Comments'
                  : 'Direct Messages'}
            </h3>
            <button
              onClick={loadInteractions}
              disabled={loading}
              className="px-4 py-2 bg-brand text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Interactions List */}
        <div className="flex-1 overflow-y-auto">
          {filteredInteractions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <p className="text-gray-500 text-lg font-semibold mb-2">No interactions found</p>
                <p className="text-gray-400 text-sm">
                  {loading ? 'Loading interactions...' : 'Try adjusting your filters'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {filteredInteractions.map((interaction) => (
                <div
                  key={interaction.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      {interaction.tiktokUserAvatar && (
                        <img
                          src={interaction.tiktokUserAvatar}
                          alt={interaction.tiktokUsername}
                          className="w-10 h-10 rounded-full"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{interaction.tiktokUsername}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {interaction.channelType === 'comment' ? '💬 Comment' : '📨 Direct Message'} •{' '}
                          {new Date(interaction.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {interaction.priorityLevel && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(interaction.priorityLevel)}`}>
                          {interaction.priorityLevel.toUpperCase()}
                        </span>
                      )}
                      {interaction.sentimentType && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getSentimentBadge(interaction.sentimentType)}`}>
                          {interaction.sentimentType.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message Text */}
                  <p className="text-gray-900 text-sm mb-3 leading-relaxed">{interaction.messageText}</p>

                  {/* Reply Box */}
                  {selectedInteractionId === interaction.id ? (
                    <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your reply..."
                        maxLength={500}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-brand text-sm"
                        rows={2}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setSelectedInteractionId(null)}
                          className="px-3 py-1 text-gray-600 hover:bg-gray-200 rounded transition-colors text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReply(interaction.id)}
                          className="px-3 py-1 bg-brand text-white rounded hover:opacity-90 transition-opacity text-sm"
                        >
                          Send Reply
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedInteractionId(interaction.id)}
                      className="text-sm text-brand hover:underline"
                    >
                      Reply
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
