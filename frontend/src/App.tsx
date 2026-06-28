// src/App.jsx
// App shell — mounts route tree, global Toast renderer, and page-transition loader

import { useEffect } from 'react';
import useAuth from './hooks/useAuth';
import AppRoutes          from './routes/appRoutes';
import Toast              from './components/common/Toast';
import TransitionLoader   from './components/common/TransitionLoader';
import DirectAccessGuard  from './components/common/DirectAccessGuard';
import commentService     from './services/commentService';
import notificationService from './services/notificationService';
import { triggerTodayAgent } from './services/agentService';

export default function App() {
  const { isAuthenticated, user } = useAuth();

  // Initialize WebSocket for real-time comments when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.userId) {
      if (commentService.isConnected()) {
        commentService.disconnect();
      }
      return;
    }

    const initWebSocket = async () => {
      try {
        if (!commentService.isConnected()) {
          await commentService.connect();
          console.log('[App] WebSocket connected for real-time comments');
        }
      } catch (err) {
        console.error('[App] WebSocket connection failed:', err);
        // Fail silently — app still works without WebSocket
      }
    };

    initWebSocket();

    // Cleanup on logout
    return () => {
      if (commentService.isConnected()) {
        commentService.disconnect();
      }
    };
  }, [isAuthenticated, user?.userId]);

  // Initialize WebSocket for persistent notifications (bell/dropdown) when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.userId) {
      if (notificationService.isConnected()) {
        notificationService.disconnect();
      }
      return;
    }

    const initNotificationSocket = async () => {
      try {
        if (!notificationService.isConnected()) {
          await notificationService.connect(user.userId);
          console.log('[App] WebSocket connected for notifications');
        }
      } catch (err) {
        console.error('[App] Notification WebSocket connection failed:', err);
        // Fail silently — app still works without real-time notifications
      }
    };

    initNotificationSocket();

    return () => {
      if (notificationService.isConnected()) {
        notificationService.disconnect();
      }
    };
  }, [isAuthenticated, user?.userId]);

  // Daily agent auto-trigger (Phase 1 dev) — fires once per calendar day in WIB.
  // Only for marketing_staff and admin; requires an active agent_schedules row.
  // Guard lives in the backend — second open on the same day skips silently.
  useEffect(() => {
    const roleName = (user as any)?.roleName ?? (user as any)?.role_name;
    if (!isAuthenticated || !roleName) return;
    if (roleName !== 'marketing_staff' && roleName !== 'admin') return;

    triggerTodayAgent().catch(() => {
      // Silently ignore — no active schedule configured, already ran today,
      // or AI service is offline. App still works.
    });
  }, [isAuthenticated, (user as any)?.userId]);

  return (
    <div className="pages-font-semibold">
      {/* Page-transition loader — shown on every navigate(), including state-passing navigations */}
      <TransitionLoader />
      {/* Blocks direct address-bar access to protected pages outside of exception routes */}
      <DirectAccessGuard>
        <AppRoutes />
      </DirectAccessGuard>
      <Toast />
    </div>
  );
}
