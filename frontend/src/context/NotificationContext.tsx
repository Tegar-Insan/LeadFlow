// src/context/NotificationContext.jsx
// Global toast/notification state

import { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext(null);

let _idCounter = 0;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback(({ message, type = 'info', duration = 4000 }) => {
    const id = ++_idCounter;
    setNotifications((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => removeNotification(id), duration);
    }
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const toast = {
    success: (msg, opts) => addNotification({ message: msg, type: 'success', ...opts }),
    error:   (msg, opts) => addNotification({ message: msg, type: 'error',   ...opts }),
    info:    (msg, opts) => addNotification({ message: msg, type: 'info',    ...opts }),
    warning: (msg, opts) => addNotification({ message: msg, type: 'warning', ...opts }),
  };

  return (
    <NotificationContext.Provider value={{ notifications, toast, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used inside <NotificationProvider>');
  return ctx;
}

export default NotificationContext;
