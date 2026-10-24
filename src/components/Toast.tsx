import React, { useEffect } from 'react';
import { CheckCircle2, Copy, AlertCircle, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'info' | 'warning';
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  isOpen,
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Pemberitahuan Salin Catatan"
      className="fixed bottom-14 right-4 sm:right-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#141d2c]/95 border border-cyan-500/40 text-slate-100 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-[92vw] sm:max-w-md pointer-events-auto"
    >
      <div className="shrink-0">
        {type === 'success' ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        ) : type === 'warning' ? (
          <AlertCircle className="w-4 h-4 text-amber-400" />
        ) : (
          <Copy className="w-4 h-4 text-cyan-400" />
        )}
      </div>

      <div className="flex-1 text-xs font-medium leading-relaxed select-text">
        {message}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup notifikasi"
        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/60 transition shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </aside>
  );
};
