// src/components/common/Notification.tsx
// Persistent notification bell + dropdown. Distinct from the ephemeral Toast
// popups (NotificationContext.tsx) — entries here survive refresh/logout and
// are pushed live over the socket connection App.tsx opens via notificationService.
// Sources: UC009 publish status, schedule comments, TikTok disconnect, UC006 idea approve/reject.

import { useState, useRef, useEffect, useCallback } from 'react';
import useAuth from '../../hooks/useAuth';
import notificationService, { type AppNotification, type NotificationType } from '../../services/notificationService';
import { fromNowJakarta } from '../../utils/formatDate';

const ICONS: Record<'success' | 'error' | 'info', JSX.Element> = {
  success: (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
};

const ICON_STYLES: Record<'success' | 'error' | 'info', string> = {
  success: 'bg-success/10 text-success',
  error: 'bg-red-500/10 text-red-500',
  info: 'bg-brand/10 text-brand-dark',
};

const TYPE_VARIANT: Record<NotificationType, 'success' | 'error' | 'info'> = {
  publish_success: 'success',
  idea_approved: 'success',
  publish_failed: 'error',
  idea_rejected: 'error',
  tiktok_disconnected: 'error',
  comment_added: 'info',
};

export default function Notification() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const userId = user?.userId;

  const refreshUnreadCount = useCallback(async () => {
    if (!userId) return;
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Fail silently — bell just shows no badge
    }
  }, [userId]);

  // Initial unread count + live push subscription
  useEffect(() => {
    if (!userId) return;

    refreshUnreadCount();

    const handleNew = (notification: AppNotification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 30));
      setUnreadCount((prev) => prev + 1);
    };
    notificationService.onNewNotification(handleNew);

    return () => {
      notificationService.offNewNotification();
    };
  }, [userId, refreshUnreadCount]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      setLoading(true);
      try {
        const list = await notificationService.listNotifications();
        setNotifications(list);
      } catch {
        // Fail silently — dropdown just stays empty
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMarkAsRead = async (notification: AppNotification) => {
    if (notification.is_read) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await notificationService.markAsRead(notification.id);
    } catch {
      // Best-effort — local state already optimistically updated
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await notificationService.markAllAsRead();
    } catch {
      // Best-effort
    }
  };

  if (!userId) return null;

  return (
    <div className="relative flex-shrink-0" ref={panelRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        title="Notifications"
        className="relative w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 flex-shrink-0 flex items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 max-h-[420px] overflow-y-auto bg-white border border-slate-300 rounded-xl shadow-lg z-[70]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border sticky top-0 bg-white">
            <span className="text-sm font-display font-semibold text-text-primary">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs font-semibold text-brand-dark hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {loading && (
            <div className="px-4 py-6 text-center text-xs text-text-muted">Loading…</div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-text-muted">No notifications yet</div>
          )}

          {!loading &&
            notifications.map((n) => {
              const variant = TYPE_VARIANT[n.type] ?? 'info';
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleMarkAsRead(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-surface-border last:border-b-0 hover:bg-slate-50 ${
                    n.is_read ? '' : 'bg-brand/5'
                  }`}
                >
                  <span className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center ${ICON_STYLES[variant]}`}>
                    {ICONS[variant]}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-semibold text-text-primary">{n.title}</span>
                    <span className="block text-xs text-text-secondary mt-0.5 line-clamp-2">{n.message}</span>
                    <span className="block text-[10px] text-text-muted mt-1">{fromNowJakarta(n.created_at)}</span>
                  </span>
                  {!n.is_read && (
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" aria-hidden />
                  )}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
