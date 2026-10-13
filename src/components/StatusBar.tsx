import React from 'react';
import { Database, ShieldCheck, Lock, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { Note, AppLanguage } from '../types';
import { getT } from '../utils/i18n';

interface StatusBarProps {
  note: Note | null;
  isSyncing: boolean;
  syncMessage?: string;
  isVaultUnlocked: boolean;
  isE2EEEnabled: boolean;
  autoLockMinutes?: number;
  onToggleVaultLock?: () => void;
  language?: AppLanguage;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  note,
  isSyncing,
  syncMessage,
  isVaultUnlocked,
  isE2EEEnabled,
  autoLockMinutes = 15,
  onToggleVaultLock,
  language = 'id',
}) => {
  const t = getT(language);
  const content = note ? note.body : '';
  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lineCount = content ? content.split('\n').length : 0;

  return (
    <div className="flex items-center justify-between px-3 py-1 bg-[#121722] border-t border-slate-800 text-[11px] text-slate-400 select-none">
      {/* Note Stats */}
      <div className="flex items-center gap-3">
        {note ? (
          <>
            <span>{t.words}: <strong className="text-slate-200">{wordCount}</strong></span>
            <span className="text-slate-600">|</span>
            <span>{t.characters}: <strong className="text-slate-200">{charCount}</strong></span>
            <span className="text-slate-600">|</span>
            <span>{t.lines}: <strong className="text-slate-200">{lineCount}</strong></span>
          </>
        ) : (
          <span>{language === 'id' ? 'Tidak ada catatan dipilih' : 'No note selected'}</span>
        )}
      </div>

      {/* Sync Status */}
      <div className="flex items-center gap-2">
        {isSyncing ? (
          <span className="flex items-center gap-1.5 text-blue-400">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>{syncMessage || t.syncing}</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-slate-500">
            <CheckCircle2 className="w-3 h-3 text-slate-500" />
            <span>
              {note?.sync_status === 'synced'
                ? (language === 'id' ? 'Tersinkronisasi' : 'Up to date')
                : (language === 'id' ? 'Tersimpan lokal' : 'Local changes saved')}
            </span>
          </span>
        )}
      </div>

      {/* Database & E2EE Info */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-slate-400">
          <Database className="w-3 h-3 text-blue-400" />
          <span>{t.local_first}</span>
        </span>

        {isE2EEEnabled && (
          <button
            type="button"
            onClick={onToggleVaultLock}
            title={
              isVaultUnlocked
                ? language === 'id'
                  ? `Brankas Terbuka (Kunci otomatis dalam ${autoLockMinutes} mnt tidak aktif). Klik untuk mengunci sekarang.`
                  : `Vault Unlocked (Auto-locks after ${autoLockMinutes} min inactivity). Click to lock now.`
                : language === 'id'
                ? 'Brankas Terkunci. Klik untuk membuka brankas.'
                : 'Vault Locked. Click to unlock.'
            }
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition hover:opacity-90 active:scale-95 cursor-pointer ${
              isVaultUnlocked ? 'text-emerald-400 hover:bg-emerald-950/40' : 'text-amber-400 hover:bg-amber-950/40'
            }`}
          >
            {isVaultUnlocked ? (
              <>
                <ShieldCheck className="w-3 h-3" />
                <span>{t.e2ee_unlocked}</span>
              </>
            ) : (
              <>
                <Lock className="w-3 h-3" />
                <span>{t.e2ee_locked}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
