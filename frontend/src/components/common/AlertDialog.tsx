// src/components/common/AlertDialog.tsx
// Themed replacement for the native window.alert() dialog box.
// Single-button, danger-styled — these are all error/failure notices.

import { useEffect } from 'react';
import type { AlertOptions } from '../../context/AlertContext';

interface AlertDialogProps {
  request: AlertOptions | null;
  onDismiss: () => void;
}

export default function AlertDialog({ request, onDismiss }: AlertDialogProps) {
  const isOpen = request !== null;

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') onDismiss();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onDismiss]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onDismiss}
      />
      <div
        className="relative w-full max-w-sm bg-white border border-gray-200 rounded-3xl p-6 animate-slide-up-fade"
        style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.18)' }}
      >
        <h2 className="font-headline font-bold text-red-500 text-base mb-2">{request.title ?? 'Error'}</h2>
        <p className="text-sm text-text-secondary leading-relaxed">{request.message}</p>

        <div className="flex items-center justify-end mt-6">
          <button
            type="button"
            onClick={onDismiss}
            autoFocus
            className="h-10 px-5 rounded-full text-sm font-headline font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            {request.okLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
