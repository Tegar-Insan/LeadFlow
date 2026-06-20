// src/components/common/ConfirmDialog.tsx
// Themed replacement for the native window.confirm() dialog box.

import { useEffect } from 'react';
import type { ConfirmOptions } from '../../context/ConfirmContext';

interface ConfirmDialogProps {
  request: ConfirmOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ request, onConfirm, onCancel }: ConfirmDialogProps) {
  const isOpen = request !== null;

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onConfirm, onCancel]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!request) return null;

  const isDanger = request.variant === 'danger';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      <div
        className="relative w-full max-w-sm bg-white border border-gray-200 rounded-3xl p-6 animate-slide-up-fade"
        style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.18)' }}
      >
        {request.title && (
          <h2 className="font-headline font-bold text-text-primary text-base mb-2">{request.title}</h2>
        )}
        <p className="text-sm text-text-secondary leading-relaxed">{request.message}</p>

        <div className="flex items-center justify-end gap-2.5 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-5 rounded-full border border-gray-300 text-sm font-headline font-semibold text-text-secondary hover:bg-surface-raised transition-colors"
          >
            {request.cancelLabel ?? 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className={`h-10 px-5 rounded-full text-sm font-headline font-bold transition-colors ${
              isDanger
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-brand text-black hover:bg-brand-dark'
            }`}
          >
            {request.confirmLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
