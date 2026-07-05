// src/context/AlertContext.tsx
// Promise-based replacement for window.alert() — renders a themed dialog
// instead of the native browser prompt. Mirrors the ConfirmContext pattern.

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import AlertDialog from '../components/common/AlertDialog';

export interface AlertOptions {
  title?: string;
  message: string;
  okLabel?: string;
}

type AlertInput = string | AlertOptions;

interface AlertContextValue {
  alert: (input: AlertInput) => Promise<void>;
}

const AlertContext = createContext<AlertContextValue | null>(null);

function toOptions(input: AlertInput): AlertOptions {
  return typeof input === 'string' ? { message: input } : input;
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<AlertOptions | null>(null);
  const resolveRef = useRef<(() => void) | null>(null);

  const alert = useCallback((input: AlertInput): Promise<void> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setRequest(toOptions(input));
    });
  }, []);

  const settle = useCallback(() => {
    setRequest(null);
    resolveRef.current?.();
    resolveRef.current = null;
  }, []);

  return (
    <AlertContext.Provider value={{ alert }}>
      {children}
      <AlertDialog request={request} onDismiss={settle} />
    </AlertContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAlert(): (input: AlertInput) => Promise<void> {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used inside <AlertProvider>');
  return ctx.alert;
}

export default AlertContext;
