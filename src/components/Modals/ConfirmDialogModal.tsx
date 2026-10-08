import React, { useEffect, useState } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import type { AppLanguage } from '../../types';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  subMessage?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  language?: AppLanguage;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export const ConfirmDialogModal: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  subMessage,
  confirmLabel,
  cancelLabel,
  isDanger = true,
  language = 'id',
  onConfirm,
  onClose,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const isId = language === 'id';

  const resolvedConfirmLabel = confirmLabel || (isDanger ? (isId ? 'Hapus' : 'Delete') : (isId ? 'Konfirmasi' : 'Confirm'));
  const resolvedCancelLabel = cancelLabel || (isId ? 'Batal' : 'Cancel');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl bg-[#202b3e] border border-slate-700 shadow-2xl text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/80 bg-[#1a2333]">
          <div className="flex items-center gap-2.5">
            {isDanger ? (
              <div className="w-6 h-6 rounded-md bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-md bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0">
                <Info className="w-3.5 h-3.5 text-blue-400" />
              </div>
            )}
            <h3 className="text-sm font-semibold text-slate-100 truncate">{title}</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 disabled:opacity-50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 space-y-2 text-xs">
          <p className="text-slate-200 leading-relaxed">{message}</p>
          {subMessage && (
            <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800 leading-snug">
              {subMessage}
            </p>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-700/60 bg-[#1b2434]">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition disabled:opacity-50"
          >
            {resolvedCancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className={`px-4 py-1.5 rounded font-medium text-xs text-white shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-500 active:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700'
            }`}
          >
            {isProcessing ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{isId ? 'Memproses...' : 'Processing...'}</span>
              </>
            ) : (
              <span>{resolvedConfirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
