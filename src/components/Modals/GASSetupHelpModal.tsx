import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  FileCode,
  ExternalLink,
  HelpCircle,
  Zap,
  Server,
  FileSpreadsheet,
  Github,
} from 'lucide-react';
import {
  CLOUDFLARE_WORKER_SCRIPT_TEMPLATE,
  CUSTOM_SERVERLESS_SCRIPT_TEMPLATE,
  PUBLISH_PROVIDERS,
} from '../../services/publishBackends';
import { GAS_SCRIPT_CODE_TEMPLATE } from '../../services/gas';
import type { AppLanguage, PublishProviderType } from '../../types';

interface GASSetupHelpModalProps {
  onClose: () => void;
  language?: AppLanguage;
  theme?: string;
  initialProvider?: PublishProviderType;
}

export const GASSetupHelpModal: React.FC<GASSetupHelpModalProps> = ({
  onClose,
  language = 'id',
  theme = 'qalam-dark',
  initialProvider = 'gas',
}) => {
  const [activeTab, setActiveTab] = useState<PublishProviderType>(initialProvider);
  const [copied, setCopied] = useState(false);
  const isId = language === 'id';
  const isLight =
    theme === 'qalam-light' ||
    theme === 'light' ||
    theme === 'joplin-light' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('light'));

  const getActiveCode = () => {
    switch (activeTab) {
      case 'cloudflare':
        return CLOUDFLARE_WORKER_SCRIPT_TEMPLATE;
      case 'custom':
        return CUSTOM_SERVERLESS_SCRIPT_TEMPLATE;
      case 'gas':
      default:
        return GAS_SCRIPT_CODE_TEMPLATE;
    }
  };

  const handleCopyCode = () => {
    const code = getActiveCode();
    if (!code) return;
    navigator.clipboard.writeText(code);
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
                activeTab === 'cloudflare'
                  ? isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/15 text-amber-400'
                  : activeTab === 'custom'
                  ? isLight ? 'bg-purple-100 text-purple-700' : 'bg-purple-500/15 text-purple-400'
                  : activeTab === 'github_gist'
                  ? isLight ? 'bg-slate-200 text-slate-800' : 'bg-slate-700/50 text-slate-200'
                  : isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/15 text-emerald-400'
              }`}
            >
              {activeTab === 'cloudflare' ? (
                <Zap className="w-5 h-5" />
              ) : activeTab === 'custom' ? (
                <Server className="w-5 h-5" />
              ) : activeTab === 'github_gist' ? (
                <Github className="w-5 h-5" />
              ) : (
                <FileSpreadsheet className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className={`text-sm sm:text-base font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isId ? 'Panduan Setup Backend Publikasi' : 'Publishing Backend Setup Guide'}
              </h3>
              <p className={`text-[11px] sm:text-xs truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isId
                  ? 'Pilih provider backend yang sesuai dengan kebutuhan & kedaulatan data Anda'
                  : 'Choose the backend provider matching your needs & data sovereignty'}
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

        {/* Provider Tabs */}
        <div
          className={`flex items-center gap-1 px-4 sm:px-6 py-2 border-b overflow-x-auto custom-scrollbar shrink-0 ${
            isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-[#161e2e] border-slate-700/70'
          }`}
        >
          {PUBLISH_PROVIDERS.map((prov) => {
            const isActive = activeTab === prov.id;
            return (
              <button
                key={prov.id}
                type="button"
                onClick={() => {
                  setActiveTab(prov.id);
                  setCopied(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? isLight
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                      : 'bg-blue-600 text-white shadow-xs'
                    : isLight
                    ? 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                {prov.id === 'gas' && <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />}
                {prov.id === 'cloudflare' && <Zap className="w-3.5 h-3.5 text-amber-500" />}
                {prov.id === 'custom' && <Server className="w-3.5 h-3.5 text-purple-400" />}
                {prov.id === 'github_gist' && <Github className="w-3.5 h-3.5 text-slate-400" />}
                <span>{prov.name}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar text-xs sm:text-sm leading-relaxed flex-1 min-h-0">
          {/* TAB 1: GOOGLE APPS SCRIPT (GAS) */}
          {activeTab === 'gas' && (
            <>
              <div
                className={`rounded-xl border p-3.5 sm:p-4 transition-colors ${
                  isLight
                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                    : 'bg-emerald-950/20 border-emerald-800/40 text-slate-300'
                }`}
              >
                <h4 className={`font-bold mb-1 flex items-center gap-1.5 ${isLight ? 'text-emerald-950' : 'text-emerald-300'}`}>
                  <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  {isId ? 'Google Sheets & Apps Script (Bawaan)' : 'Google Sheets & Apps Script (Default)'}
                </h4>
                <p className={`text-[11px] sm:text-xs leading-relaxed ${isLight ? 'text-emerald-900/80' : 'text-slate-300'}`}>
                  {isId
                    ? 'Google Spreadsheet pribadi Anda bertindak sebagai basis data cloud gratis! Skrip ini mendukung Catatan Tunggal ("PublishedNotes") dan Wiki Folder Multi-Tab ("Wiki - [Nama Folder]"). Saat catatan atau wiki dicabut/dihapus, baris atau tab sheet-nya otomatis dihapus agar rapi dan hemat kuota.'
                    : 'Your personal Google Sheet acts as the free cloud database! Supports Single Notes and Multi-Tab Folder Wikis. Deleting or unpublishing automatically cleans up rows or dedicated sheet tabs.'}
                </p>
              </div>

              <div>
                <h4 className={`font-bold mb-2.5 text-xs uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {isId ? 'Langkah Setup Cepat (2 Menit)' : 'Quick 2-Minute Setup'}
                </h4>
                <ol className={`space-y-2 pl-4 list-decimal text-[11px] sm:text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <li>
                    Buka{' '}
                    <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-semibold">
                      sheets.new <ExternalLink className="w-2.5 h-2.5" />
                    </a>{' '}
                    untuk membuat spreadsheet baru. Beri judul <strong>"Qalam Notes Store"</strong>.
                  </li>
                  <li>Di menu atas Google Spreadsheet, klik <strong>Ekstensi &gt; Apps Script</strong>.</li>
                  <li>Hapus semua kode di editor <code>Code.gs</code>, lalu tempel kode skrip di bawah.</li>
                  <li>Klik tombol biru <strong>Terapkan (Deploy)</strong> &gt; <strong>Penerapan baru (New deployment)</strong>.</li>
                  <li>Pilih jenis <strong>Aplikasi web (Web app)</strong>.</li>
                  <li>Atur <strong>Jalankan sebagai (Execute as)</strong> ke <strong>Saya (Me)</strong>.</li>
                  <li>Atur <strong>Yang memiliki akses (Who has access)</strong> ke <strong>Siapa saja (Anyone)</strong>.</li>
                  <li>Klik <strong>Terapkan</strong>, berikan izin Google, lalu salin <strong>URL Aplikasi Web</strong>.</li>
                  <li>Tempelkan URL ke kolom URL Publikasi di Qalam Note!</li>
                </ol>
              </div>
            </>
          )}

          {/* TAB 2: CLOUDFLARE WORKER (EDGE KV) */}
          {activeTab === 'cloudflare' && (
            <>
              <div
                className={`rounded-xl border p-3.5 sm:p-4 transition-colors ${
                  isLight
                    ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                    : 'bg-amber-950/20 border-amber-800/40 text-slate-300'
                }`}
              >
                <h4 className={`font-bold mb-1 flex items-center gap-1.5 ${isLight ? 'text-amber-950' : 'text-amber-300'}`}>
                  <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                  {isId ? 'Cloudflare Worker (Edge Serverless) — Rekomendasi Modern' : 'Cloudflare Worker (Edge Serverless) — Recommended Modern'}
                </h4>
                <p className={`text-[11px] sm:text-xs leading-relaxed ${isLight ? 'text-amber-900/80' : 'text-slate-300'}`}>
                  {isId
                    ? 'Alternatif terbaik jika ingin kecepatan kilat (<15ms) dan bebas dari pembatasan Google Apps Script. 100.000 request per hari GRATIS selamanya tanpa kartu kredit. Mendukung catatan tunggal, papan Kanban, dan bundle wiki folder.'
                    : 'The best alternative for lightning speed (<15ms) and zero Google Apps Script limits. 100,000 requests/day FREE forever without credit card. Supports notes, Kanban boards, and wiki bundles.'}
                </p>
              </div>

              <div>
                <h4 className={`font-bold mb-2.5 text-xs uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {isId ? 'Langkah Setup Cloudflare Worker (2 Menit)' : 'Cloudflare Worker 2-Minute Setup'}
                </h4>
                <ol className={`space-y-2 pl-4 list-decimal text-[11px] sm:text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <li>
                    Buka{' '}
                    <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-semibold">
                      dash.cloudflare.com <ExternalLink className="w-2.5 h-2.5" />
                    </a>{' '}
                    &gt; menu <strong>Workers &amp; Pages</strong>.
                  </li>
                  <li>
                    Klik tab <strong>KV</strong> di bilah samping &gt; klik <strong>Create a namespace</strong> &gt; beri nama <code>QALAM_KV</code>.
                  </li>
                  <li>
                    Kembali ke menu <strong>Workers &amp; Pages</strong> &gt; klik <strong>Create application</strong> &gt; <strong>Create Worker</strong> &gt; klik <strong>Deploy</strong>.
                  </li>
                  <li>
                    Masuk ke Worker yang baru dibuat &gt; buka <strong>Settings &gt; Variables &gt; KV Namespace Bindings</strong> &gt; klik <strong>Add binding</strong>:
                    <div className="mt-1 p-2 rounded-lg bg-slate-900/70 border border-slate-700/60 font-mono text-[10px]">
                      Variable name: <strong>QALAM_KV</strong><br />
                      KV namespace: <strong>QALAM_KV</strong>
                    </div>
                  </li>
                  <li>
                    Buka tab <strong>Code</strong> pada Worker, hapus seluruh kode bawaan, lalu tempel kode skrip di bawah.
                  </li>
                  <li>Klik <strong>Deploy</strong>. Salin URL Worker Anda (contoh: <code>https://qalam-notes.username.workers.dev</code>).</li>
                  <li>Tempelkan URL tersebut ke kolom URL Publikasi di Qalam Note!</li>
                </ol>
              </div>
            </>
          )}

          {/* TAB 3: CUSTOM NODE.JS / DOCKER / VPS */}
          {activeTab === 'custom' && (
            <>
              <div
                className={`rounded-xl border p-3.5 sm:p-4 transition-colors ${
                  isLight
                    ? 'bg-purple-50/90 border-purple-200 text-purple-950'
                    : 'bg-purple-950/20 border-purple-800/40 text-slate-300'
                }`}
              >
                <h4 className={`font-bold mb-1 flex items-center gap-1.5 ${isLight ? 'text-purple-950' : 'text-purple-300'}`}>
                  <Server className="w-4 h-4 text-purple-400 shrink-0" />
                  {isId ? 'Server Mandiri (Node.js / VPS / Docker / Railway)' : 'Self-Hosted Server (Node.js / VPS / Docker)'}
                </h4>
                <p className={`text-[11px] sm:text-xs leading-relaxed ${isLight ? 'text-purple-900/80' : 'text-slate-300'}`}>
                  {isId
                    ? 'Solusi 100% kedaulatan data tanpa ketergantungan pihak ketiga mana pun. Skrip Node.js ringan yang menyimpan data ke sistem berkas JSON lokal. Sangat cocok di-host di VPS pribadi, Railway, Fly.io, atau Render.'
                    : '100% data sovereignty with zero third-party lock-in. Lightweight Node.js server that stores data directly into local JSON files. Runs smoothly on any VPS, Railway, Fly.io, or Render.'}
                </p>
              </div>

              <div>
                <h4 className={`font-bold mb-2.5 text-xs uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {isId ? 'Langkah Menjalankan di Server / VPS' : 'Running on Your Server / VPS'}
                </h4>
                <ol className={`space-y-2 pl-4 list-decimal text-[11px] sm:text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <li>Buat folder baru di server Anda, simpan kode di bawah sebagai <code>server.js</code>.</li>
                  <li>Jalankan perintah instalasi:
                    <div className="mt-1 p-2 rounded-lg bg-slate-900 border border-slate-700 font-mono text-[11px] text-emerald-400">
                      npm init -y &amp;&amp; npm install express cors
                    </div>
                  </li>
                  <li>Jalankan server:
                    <div className="mt-1 p-2 rounded-lg bg-slate-900 border border-slate-700 font-mono text-[11px] text-emerald-400">
                      node server.js
                    </div>
                  </li>
                  <li>Gunakan reverse-proxy HTTPS seperti Nginx, Caddy, atau Cloudflare Tunnel untuk mengekspos endpoint Anda secara aman (contoh: <code>https://api.domainanda.com/qalam-publish</code>).</li>
                  <li>Tempelkan URL tersebut ke pengaturan publikasi Qalam Note!</li>
                </ol>
              </div>
            </>
          )}

          {/* TAB 4: GITHUB GIST */}
          {activeTab === 'github_gist' && (
            <div className="space-y-3">
              <div
                className={`rounded-xl border p-3.5 sm:p-4 transition-colors ${
                  isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-800'
                    : 'bg-slate-900/80 border-slate-700 text-slate-200'
                }`}
              >
                <h4 className={`font-bold mb-1 flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <Github className="w-4 h-4 text-slate-400 shrink-0" />
                  {isId ? 'GitHub Gist / Repository — Gratis Selamanya' : 'GitHub Gist / Repository — Free Forever'}
                </h4>
                <p className={`text-[11px] sm:text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {isId
                    ? 'Manfaatkan akun GitHub pribadi Anda untuk mempublikasikan catatan dan wiki sebagai Secret Gist atau file repositori tanpa perlu membuat server apa pun.'
                    : 'Leverage your personal GitHub account to publish notes and wikis as Secret Gists or repository files with zero server setup.'}
                </p>
              </div>

              <div>
                <h4 className={`font-bold mb-2 text-xs uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {isId ? 'Cara Mendapatkan GitHub Personal Access Token (PAT):' : 'How to generate GitHub Personal Access Token:'}
                </h4>
                <ol className={`space-y-2 pl-4 list-decimal text-[11px] sm:text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <li>
                    Buka{' '}
                    <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-semibold">
                      github.com/settings/tokens <ExternalLink className="w-2.5 h-2.5" />
                    </a>.
                  </li>
                  <li>Klik <strong>Generate new token (classic)</strong>.</li>
                  <li>Beri catatan nama (contoh: <code>Qalam Note Publisher</code>).</li>
                  <li>Centang izin lingkup (scopes): <strong>gist</strong> (dan <strong>repo</strong> jika ingin publikasi repositori).</li>
                  <li>Klik <strong>Generate token</strong> di bagian bawah dan salin token yang diawali dengan <code>ghp_...</code>.</li>
                  <li>Tempelkan token tersebut di tab Pengaturan Publikasi Qalam Note!</li>
                </ol>
              </div>
            </div>
          )}

          {/* Script Code Block (Shown for gas, cloudflare, custom) */}
          {activeTab !== 'github_gist' && (
            <div>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <span className={`font-semibold text-xs sm:text-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  {activeTab === 'gas'
                    ? isId ? 'Kode Google Apps Script (Code.gs):' : 'Google Apps Script Code (Code.gs):'
                    : activeTab === 'cloudflare'
                    ? isId ? 'Kode Cloudflare Worker (worker.js):' : 'Cloudflare Worker Code (worker.js):'
                    : isId ? 'Kode Server Mandiri (server.js):' : 'Self-Hosted Server Code (server.js):'}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition shadow-xs active:scale-95 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>
                    {copied
                      ? isId
                        ? 'Kode Disalin!'
                        : 'Code Copied!'
                      : isId
                      ? 'Salin Kode Skrip'
                      : 'Copy Script Code'}
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
                  <code>{getActiveCode()}</code>
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end px-4 sm:px-6 py-3 border-t shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1a2333] border-slate-700/80'
          }`}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition active:scale-95 cursor-pointer"
          >
            {isId ? 'Selesai' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
