import React, { useState } from 'react';
import { X, Copy, Check, FileCode, ExternalLink, HelpCircle } from 'lucide-react';
import { GAS_SCRIPT_CODE_TEMPLATE } from '../../services/gas';
import type { AppLanguage } from '../../types';

interface GASSetupHelpModalProps {
  onClose: () => void;
  language?: AppLanguage;
  theme?: string;
}

export const GASSetupHelpModal: React.FC<GASSetupHelpModalProps> = ({
  onClose,
  language = 'id',
  theme = 'qalam-dark',
}) => {
  const [copied, setCopied] = useState(false);
  const isId = language === 'id';
  const isLight =
    theme === 'qalam-light' ||
    theme === 'light' ||
    theme === 'joplin-light' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('light'));

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GAS_SCRIPT_CODE_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs select-none transition-colors animate-in fade-in duration-150 ${
        isLight ? 'bg-slate-900/45' : 'bg-black/75'
      }`}
    >
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] transition-colors ${
          isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-[#202b3e] border-slate-700 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 sm:px-6 py-3.5 border-b shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#1a2333] border-slate-700/80 text-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/15 text-emerald-400'
              }`}
            >
              <FileCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className={`text-sm sm:text-base font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isId ? 'Panduan Setup Google Sheets & GAS' : 'Google Sheets & GAS Setup'}
              </h3>
              <p className={`text-[11px] sm:text-xs truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isId
                  ? 'Tanpa server berbayar • 100% gratis penerbit catatan berbasis cloud'
                  : 'Zero backend needed • 100% free serverless note publisher'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className={`p-2 rounded-lg transition min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0 ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/80'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/80'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar text-xs sm:text-sm leading-relaxed flex-1 min-h-0">
          {/* Overview */}
          <div
            className={`rounded-xl border p-3.5 sm:p-4 transition-colors ${
              isLight
                ? 'bg-blue-50/90 border-blue-200 text-blue-900'
                : 'bg-blue-950/30 border-blue-800/40 text-slate-300'
            }`}
          >
            <h4 className={`font-bold mb-1 flex items-center gap-1.5 ${isLight ? 'text-blue-950' : 'text-blue-300'}`}>
              <HelpCircle className="w-4 h-4 text-blue-500 shrink-0" />
              {isId ? 'Cara Kerjanya' : 'How it works'}
            </h4>
            <p className={`text-[11px] sm:text-xs leading-relaxed ${isLight ? 'text-blue-900/80' : 'text-slate-300'}`}>
              {isId
                ? 'Qalam Note mengutamakan data lokal (serverless), Google Spreadsheet gratis milik Anda sendiri bertindak sebagai database! Google Apps Script (GAS) menjalankan API ringan yang menyimpan revisi catatan publik dan menyajikan tampilan web yang bersih bagi pembaca Anda. Jika catatan sangat panjang (lebih dari 50.000 karakter), skrip otomatis memecah konten ke kolom sel baru (auto-chunking) sehingga tidak pernah terpotong.'
                : 'Qalam Note is a serverless, local-first app where your own free Google Sheet acts as the database! Google Apps Script (GAS) stores published note revisions and serves clean web pages to readers. For very long notes, content is auto-chunked across columns to safely bypass Google Sheets cell character limits.'}
            </p>
          </div>

          {/* Step-by-Step Instructions */}
          <div>
            <h4
              className={`font-bold mb-2.5 text-xs uppercase tracking-wider ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              {isId ? 'Langkah Setup Cepat (2 Menit)' : 'Quick 2-Minute Setup'}
            </h4>
            {isId ? (
              <ol
                className={`space-y-2.5 pl-4 list-decimal text-[11px] sm:text-xs leading-relaxed ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                <li>
                  Buka{' '}
                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-semibold"
                  >
                    sheets.new <ExternalLink className="w-2.5 h-2.5" />
                  </a>{' '}
                  untuk membuat Google Spreadsheet baru. Beri judul <strong>"Qalam Notes Store"</strong>.
                </li>
                <li>
                  Pada menu atas Google Spreadsheet, klik <strong>Ekstensi &gt; Apps Script</strong>.
                </li>
                <li>
                  Hapus semua kode pada editor <code>Code.gs</code>, lalu tempel kode skrip di bawah.
                </li>
                <li>
                  Klik tombol biru <strong>"Terapkan" (Deploy)</strong> di kanan atas &gt; <strong>"Penerapan baru" (New deployment)</strong>.
                </li>
                <li>
                  Klik ikon gerigi di sebelah "Pilih jenis" dan pilih <strong>"Aplikasi web" (Web app)</strong>.
                </li>
                <li>
                  Atur <strong>"Jalankan sebagai" (Execute as)</strong> ke <strong>Saya (Me)</strong>.
                </li>
                <li>
                  Atur <strong>"Yang memiliki akses" (Who has access)</strong> ke <strong>Siapa saja (Anyone)</strong> (agar pembaca publik dapat melihat catatan Anda).
                </li>
                <li>
                  Klik <strong>Terapkan (Deploy)</strong>, berikan izin akses akun, lalu salin <strong>URL Aplikasi Web (Web App URL)</strong>.
                </li>
                <li>
                  Tempel URL Aplikasi Web ke dialog <strong>Publikasikan Catatan</strong> atau <strong>Pengaturan</strong> Qalam Note!
                </li>
              </ol>
            ) : (
              <ol
                className={`space-y-2.5 pl-4 list-decimal text-[11px] sm:text-xs leading-relaxed ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                <li>
                  Open{' '}
                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-semibold"
                  >
                    sheets.new <ExternalLink className="w-2.5 h-2.5" />
                  </a>{' '}
                  to create a new Google Sheet. Name it <strong>"Qalam Notes Store"</strong>.
                </li>
                <li>
                  In Google Sheets top menu, click <strong>Extensions &gt; Apps Script</strong>.
                </li>
                <li>
                  Erase everything in the <code>Code.gs</code> editor, and paste the script below.
                </li>
                <li>
                  Click the blue <strong>"Deploy"</strong> button at top right &gt; <strong>"New deployment"</strong>.
                </li>
                <li>
                  Click the gear icon next to "Select type" and choose <strong>"Web app"</strong>.
                </li>
                <li>
                  Set <strong>"Execute as"</strong> to <strong>Me</strong>.
                </li>
                <li>
                  Set <strong>"Who has access"</strong> to <strong>Anyone</strong> (allows public readers to view your notes).
                </li>
                <li>
                  Click <strong>Deploy</strong>, grant permissions, and copy the <strong>Web App URL</strong>.
                </li>
                <li>
                  Paste your Web App URL into the Qalam Note <strong>Publish Note</strong> or <strong>Settings</strong> dialog!
                </li>
              </ol>
            )}
          </div>

          {/* Script Code Block */}
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <span className={`font-semibold text-xs sm:text-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                {isId ? 'Kode Google Apps Script (Code.gs):' : 'Google Apps Script Code (Code.gs):'}
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition shadow-xs active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>
                  {copied
                    ? isId
                      ? 'Kode Disalin!'
                      : 'Code Copied!'
                    : isId
                    ? 'Salin Kode Apps Script'
                    : 'Copy Apps Script Code'}
                </span>
              </button>
            </div>
            <div
              className={`relative rounded-xl border p-3.5 overflow-x-auto max-h-60 sm:max-h-72 font-mono text-[11px] select-all ${
                isLight
                  ? 'bg-slate-900 border-slate-700 text-emerald-400'
                  : 'bg-slate-950 border-slate-800 text-emerald-400'
              }`}
            >
              <pre>
                <code>{GAS_SCRIPT_CODE_TEMPLATE}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end px-4 sm:px-6 py-3 border-t shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1a2333] border-slate-700/80'
          }`}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition active:scale-95"
          >
            {isId ? 'Selesai' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
