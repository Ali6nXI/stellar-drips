import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

/**
 * Lightweight toast notification for transaction feedback.
 *
 * Auto-dismisses after `duration` ms (default 5000).
 * Renders success (green) or error (red) variants.
 */
export default function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor = type === 'success'
    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
    : 'bg-red-50 border-red-200 text-red-800';

  const icon = type === 'success' ? '✓' : '✕';

  return (
    <div
      role="alert"
      className={`fixed top-4 right-4 z-50 max-w-sm px-4 py-3 rounded-lg border ${bgColor} shadow-lg animate-slide-in`}
    >
      <div className="flex items-center gap-2">
        <span className="font-bold text-lg">{icon}</span>
        <p className="text-sm font-medium">{message}</p>
        <button
          onClick={onClose}
          className="ml-auto text-current opacity-60 hover:opacity-100"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}
