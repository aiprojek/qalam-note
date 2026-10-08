import React, { useState } from 'react';
import { Download, Check, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import type { AppLanguage } from '../types';

export const PWAInstallButton: React.FC<{ compact?: boolean; language?: AppLanguage }> = ({
  compact = false,
  language = 'id',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  const isId = language === 'id';

  if (isInstalled) {
    return compact ? null : (
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 bg-slate-800/40 rounded border border-slate-700/50">
        <Check className="w-3.5 h-3.5 text-emerald-400" />
        <span>{isId ? 'Terpasang (PWA)' : 'Installed (PWA)'}</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 3000);
    }
  };

  if (isInstallable) {
    return (
      <button
        onClick={handleInstallClick}
        title={
          isId
            ? 'Pasang Qalam Note ke perangkat Anda untuk penggunaan offline'
            : 'Install Qalam Note to your device for offline use'
        }
        className={`flex items-center justify-center gap-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition shadow-sm ${
          compact ? 'px-2 py-1 text-xs' : 'w-full px-3 py-2 text-xs'
        }`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>
          {installSuccess
            ? isId
              ? 'Terpasang!'
              : 'Installed!'
            : isId
            ? 'Pasang Aplikasi'
            : 'Install App'}
        </span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center justify-center gap-1.5 rounded border border-slate-600 hover:bg-slate-700 text-slate-200 text-xs font-medium transition ${
            compact ? 'px-2 py-1' : 'w-full px-3 py-1.5'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-400" />
          <span>{isId ? 'Pasang di iOS' : 'Install on iOS'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-lg bg-[#243048] border border-slate-700 p-5 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-700/70 pb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  {isId ? 'Pasang Qalam Note di iPhone / iPad' : 'Install Qalam Note on iPhone / iPad'}
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 space-y-2.5 text-xs text-slate-300">
                {isId ? (
                  <>
                    <p>1. Ketuk tombol <strong>Bagikan (Share)</strong> di bilah alat Safari.</p>
                    <p>2. Gulir ke bawah dan ketuk <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</p>
                    <p>3. Ketuk <strong>Tambah (Add)</strong> di sudut kanan atas.</p>
                    <div className="rounded bg-slate-900/60 p-2.5 text-slate-400 border border-slate-800">
                      ⚡ Nikmati akses offline, performa cepat, dan tampilan layar penuh!
                    </div>
                  </>
                ) : (
                  <>
                    <p>1. Tap the <strong>Share</strong> button in your Safari toolbar.</p>
                    <p>2. Scroll down and tap <strong>Add to Home Screen</strong>.</p>
                    <p>3. Tap <strong>Add</strong> in the top-right corner.</p>
                    <div className="rounded bg-slate-900/60 p-2.5 text-slate-400 border border-slate-800">
                      ⚡ Enjoy offline access, fast launch, and full screen experience!
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded bg-blue-600 hover:bg-blue-500 py-1.5 text-xs font-medium text-white transition"
              >
                {isId ? 'Mengerti' : 'Got it'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
