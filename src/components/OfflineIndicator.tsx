import React, { useState } from 'react';
import { WifiOff, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import type { AppLanguage } from '../types';

interface OfflineIndicatorProps {
  language?: AppLanguage;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ language = 'id' }) => {
  const isOnline = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state whenever status changes back to online
  React.useEffect(() => {
    if (isOnline) {
      setDismissed(false);
    }
  }, [isOnline]);

  if (isOnline || dismissed) {
    return null;
  }

  const isId = language === 'id';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-slate-900/95 text-slate-100 px-3.5 py-2 text-xs font-medium border border-amber-500/40 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-[90vw] sm:max-w-md"
    >
      <div className="relative flex items-center justify-center shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
      </div>

      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />

      <div className="flex-1 min-w-0 leading-tight">
        <span className="font-semibold text-amber-300">
          {isId ? 'Mode Offline' : 'Offline Mode'}
        </span>
        <span className="text-slate-300 ml-1.5 text-[11px] hidden sm:inline">
          {isId
            ? '— Catatan tersimpan aman di perangkat (IndexedDB local-first).'
            : '— Notes are stored safely on your device (local-first IndexedDB).'}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0 ml-1"
        aria-label={isId ? 'Tutup pemberitahuan offline' : 'Dismiss offline notification'}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
