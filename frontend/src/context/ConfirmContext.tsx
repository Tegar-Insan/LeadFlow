// src/context/ConfirmContext.tsx
// Promise-based replacement for window.confirm() — renders a themed dialog
// instead of the native browser prompt. Mirrors the NotificationContext pattern.

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import ConfirmDialog from '../components/common/ConfirmDialog';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
}

type ConfirmInput = string | ConfirmOptions;

interface ConfirmContextValue {
  confirm: (input: ConfirmInput) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

function toOptions(input: ConfirmInput): ConfirmOptions {
  return typeof input === 'string' ? { message: input } : input;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((input: ConfirmInput): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setRequest(toOptions(input));
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    setRequest(null);
    resolveRef.current?.(value);
    resolveRef.current = null;
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        request={request}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm(): (input: ConfirmInput) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx.confirm;
}

export default ConfirmContext;
