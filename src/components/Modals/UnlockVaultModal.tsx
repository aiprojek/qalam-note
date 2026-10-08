import React, { useState } from 'react';
import { Lock, X, Key, AlertCircle } from 'lucide-react';
import { unlockVault } from '../../services/crypto';
import type { E2EEConfig, AppLanguage } from '../../types';

interface UnlockVaultModalProps {
  e2eeConfig: E2EEConfig;
  onSuccess: () => void;
  onClose: () => void;
  language?: AppLanguage;
}

export const UnlockVaultModal: React.FC<UnlockVaultModalProps> = ({
  e2eeConfig,
  onSuccess,
  onClose,
  language = 'id',
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const isId = language === 'id';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setIsVerifying(true);
    setError(null);

    try {
      const ok = await unlockVault(password, e2eeConfig.salt, e2eeConfig.verifier_hash);
      if (ok) {
        onSuccess();
        onClose();
      } else {
        setError(
          isId
            ? 'Kata sandi utama salah. Silakan periksa dan coba lagi.'
            : 'Incorrect master password. Please verify and try again.'
        );
      }
    } catch (err: any) {
      setError(err.message || (isId ? 'Gagal membuka brankas' : 'Error unlocking vault'));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-sm rounded-xl bg-[#202b3e] border border-slate-700 shadow-2xl text-slate-100 overflow-hidden text-xs">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/80 bg-[#1a2333]">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-white">
              {isId ? 'Buka Brankas Utama E2EE' : 'Unlock E2EE Master Vault'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-slate-300 leading-relaxed">
            {isId
              ? 'Masukkan kata sandi utama untuk mendekripsi dan membaca catatan yang dilindungi pada sesi ini.'
              : 'Enter your master password to decrypt and view protected notes in this session.'}
          </p>

          <div>
            <label className="block text-slate-400 font-medium mb-1">
              {isId ? 'Kata Sandi Utama:' : 'Master Password:'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoFocus
              className="w-full bg-slate-900 text-xs text-slate-200 px-3 py-2 rounded border border-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="p-2 rounded bg-red-950/40 text-red-300 border border-red-800 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/60">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              {isId ? 'Batal' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isVerifying || !password}
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{isVerifying ? (isId ? 'Memeriksa...' : 'Checking...') : (isId ? 'Buka Kunci' : 'Unlock')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
