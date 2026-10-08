import React, { useState, useEffect } from 'react';
import {
  Settings,
  RefreshCw,
  Lock,
  Globe,
  Download,
  Upload,
  Info,
  X,
  Check,
  AlertTriangle,
  Server,
  Cloud,
  FolderSync,
  FileCode,
  ShieldCheck,
  Key,
  ExternalLink,
  Unlink,
  CheckCircle2,
  Copy,
  Smartphone,
  HelpCircle,
  Share2,
  HardDrive,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Scale,
  BookOpen,
  Coffee,
  Send,
  Github,
} from 'lucide-react';
import type { AppSettings, DateFormatOption, TimeFormatOption, AppLanguage } from '../../types';
import {
  testWebDAVConnection,
  testDropboxConnection,
  buildDropboxAuthorizeUrl,
  generateDropboxCodeVerifier,
  generateDropboxCodeChallenge,
  exchangeDropboxCodeForToken,
  generateSyncPairingCode,
  parseSyncPairingCode,
} from '../../services/sync';
import { setupMasterPassword, unlockVault, lockVault } from '../../services/crypto';
import { getT, formatDate, formatTime } from '../../utils/i18n';
import { QalamIcon } from '../icons/QalamIcon';
import { updatePresetNotesLanguage } from '../../db';
import { PWAInstallButton } from '../PWAInstallButton';
import {
  APP_VERSION,
  APP_BUILD_DATE,
  APP_LICENSE_NAME,
  APP_LICENSE_SHORT,
  APP_LICENSE_URL,
  FSF_URL,
  APP_CHANGELOG,
  DONATION_URL,
  TELEGRAM_URL,
  GITHUB_REPO_URL,
} from '../../constants/version';

interface SettingsModalProps {
  initialTab?: string;
  settings: AppSettings;
  isVaultUnlocked: boolean;
  onSaveSettings: (settings: Partial<AppSettings>) => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenGASHelp: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  initialTab = 'general',
  settings,
  isVaultUnlocked,
  onSaveSettings,
  onExportData,
  onImportData,
  onOpenGASHelp,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [formSettings, setFormSettings] = useState<AppSettings>(JSON.parse(JSON.stringify(settings)));
  const t = getT(formSettings.language);
  const isLight = formSettings.theme === 'qalam-light';

  // Sync test states
  const [testingWebdav, setTestingWebdav] = useState(false);
  const [webdavTestResult, setWebdavTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingDropbox, setTestingDropbox] = useState(false);
  const [dropboxTestResult, setDropboxTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Dropbox OAuth states
  const [dropboxAuthCode, setDropboxAuthCode] = useState('');
  const [isExchangingDropboxCode, setIsExchangingDropboxCode] = useState(false);
  const [dropboxAuthError, setDropboxAuthError] = useState<string | null>(null);
  const [dropboxAuthMode, setDropboxAuthMode] = useState<'oauth' | 'manual'>('oauth');
  const [customAppKey, setCustomAppKey] = useState(formSettings.sync.dropbox.app_key || '');
  const [showManualGuide, setShowManualGuide] = useState(false);

  // Sync Pairing Code states
  const [pairingCodeOutput, setPairingCodeOutput] = useState('');
  const [pairingCodeCopied, setPairingCodeCopied] = useState(false);
  const [pairingInputCode, setPairingInputCode] = useState('');
  const [pairingMessage, setPairingMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // E2EE inputs
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [e2eeMessage, setE2eeMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // About Tab state
  const [sysInfoCopied, setSysInfoCopied] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState<{ used: string; quota: string; percent: number } | null>(null);
  const [showFullChangelog, setShowFullChangelog] = useState(false);

  useEffect(() => {
    if (activeTab === 'about' && typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        const usedBytes = est.usage || 0;
        const quotaBytes = est.quota || 1;
        const formatBytes = (bytes: number) => {
          if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
          if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
          return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        };
        const pct = Math.max(0, Math.min(100, Math.round((usedBytes / quotaBytes) * 100)));
        setStorageEstimate({
          used: formatBytes(usedBytes),
          quota: formatBytes(quotaBytes),
          percent: pct,
        });
      }).catch(() => {});
    }
  }, [activeTab]);

  const handleCopySysInfo = () => {
    const isPwa = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    const info = [
      `Application: Qalam Note`,
      `Version: ${APP_VERSION}`,
      `Build Date: ${APP_BUILD_DATE}`,
      `License: ${APP_LICENSE_NAME} (${APP_LICENSE_SHORT})`,
      `License URL: ${APP_LICENSE_URL}`,
      `Storage Engine: Dexie.js (IndexedDB Local-First)`,
      `Local Storage: ${storageEstimate ? `${storageEstimate.used} / ${storageEstimate.quota} (${storageEstimate.percent}%)` : 'Calculating...'}`,
      `PWA Standalone Mode: ${isPwa ? 'Yes (Installed)' : 'No (Browser Tab)'}`,
      `Encryption: ${formSettings.e2ee.enabled ? 'AES-GCM 256-bit (Configured)' : 'Disabled'}`,
      `Sync Target: ${formSettings.sync.target}`,
      `Theme: ${formSettings.theme}`,
      `Language: ${formSettings.language}`,
      `User Agent: ${navigator.userAgent}`,
      `Screen Resolution: ${window.innerWidth}x${window.innerHeight}`,
      `Timestamp: ${new Date().toISOString()}`,
    ].join('\n');
    navigator.clipboard.writeText(info);
    setSysInfoCopied(true);
    setTimeout(() => setSysInfoCopied(false), 2500);
  };

  const handleSave = () => {
    onSaveSettings(formSettings);
    onClose();
  };

  const handleTestWebdav = async () => {
    setTestingWebdav(true);
    setWebdavTestResult(null);
    const result = await testWebDAVConnection(formSettings.sync.webdav);
    setWebdavTestResult(result);
    setTestingWebdav(false);
  };

  const handleTestDropbox = async () => {
    setTestingDropbox(true);
    setDropboxTestResult(null);
    const result = await testDropboxConnection(formSettings.sync.dropbox.access_token);
    setDropboxTestResult(result);
    setTestingDropbox(false);
  };

  const handleOpenDropboxAuth = async () => {
    try {
      setDropboxAuthError(null);
      const appKeyToUse = customAppKey.trim();
      if (!appKeyToUse) {
        setDropboxAuthError(
          formSettings.language === 'id'
            ? 'Masukkan App Key Dropbox terlebih dahulu. Anda dapat membuatnya gratis di Dropbox App Console.'
            : 'Please enter a Dropbox App Key first. You can create one for free in the Dropbox App Console.'
        );
        return;
      }
      const verifier = generateDropboxCodeVerifier();
      const challenge = await generateDropboxCodeChallenge(verifier);
      sessionStorage.setItem('qalam_dropbox_verifier', verifier);
      sessionStorage.setItem('qalam_dropbox_app_key', appKeyToUse);
      const authUrl = buildDropboxAuthorizeUrl(appKeyToUse, challenge);
      window.open(authUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setDropboxAuthError(err.message || 'Gagal menyiapkan tautan otorisasi Dropbox.');
    }
  };

  const handleExchangeDropboxCode = async () => {
    const cleanCode = dropboxAuthCode.trim();
    if (!cleanCode) {
      setDropboxAuthError(
        formSettings.language === 'id'
          ? 'Masukkan kode otorisasi dari Dropbox terlebih dahulu.'
          : 'Please enter the authorization code from Dropbox.'
      );
      return;
    }
    const verifier = sessionStorage.getItem('qalam_dropbox_verifier');
    const appKeyToUse = customAppKey.trim() || sessionStorage.getItem('qalam_dropbox_app_key') || '';
    if (!verifier) {
      setDropboxAuthError(
        formSettings.language === 'id'
          ? 'Sesi verifikasi kedaluwarsa. Silakan klik "Buka Halaman Otorisasi Dropbox" sekali lagi.'
          : 'Session expired. Please click "Open Dropbox Authorization Page" again.'
      );
      return;
    }

    setIsExchangingDropboxCode(true);
    setDropboxAuthError(null);

    const result = await exchangeDropboxCodeForToken(appKeyToUse, cleanCode, verifier);
    if (result.success && result.access_token) {
      const userRes = await testDropboxConnection(result.access_token);
      setFormSettings((prev) => ({
        ...prev,
        sync: {
          ...prev.sync,
          dropbox: {
            ...prev.sync.dropbox,
            app_key: appKeyToUse,
            access_token: result.access_token!,
            refresh_token: result.refresh_token || '',
            account_name: userRes.user || '',
            account_email: userRes.email || '',
          },
        },
      }));
      setDropboxTestResult({
        success: true,
        message: userRes.message,
      });
      setDropboxAuthCode('');
      sessionStorage.removeItem('qalam_dropbox_verifier');
    } else {
      setDropboxAuthError(result.message);
    }
    setIsExchangingDropboxCode(false);
  };

  const handleDisconnectDropbox = () => {
    setFormSettings((prev) => ({
      ...prev,
      sync: {
        ...prev.sync,
        dropbox: {
          app_key: '',
          access_token: '',
          refresh_token: '',
          account_name: '',
          account_email: '',
          path: '/QalamNote',
        },
      },
    }));
    setDropboxTestResult(null);
    setDropboxAuthCode('');
    setDropboxAuthError(null);
  };

  const handleGeneratePairing = () => {
    try {
      setPairingMessage(null);
      if (formSettings.sync.target === 'disabled') {
        setPairingMessage({
          text:
            formSettings.language === 'id'
              ? 'Pilih dan atur WebDAV atau Dropbox terlebih dahulu sebelum membuat kode pairing.'
              : 'Select and configure WebDAV or Dropbox above first before generating a pairing code.',
          isError: true,
        });
        return;
      }
      if (formSettings.sync.target === 'webdav' && !formSettings.sync.webdav.url) {
        setPairingMessage({
          text:
            formSettings.language === 'id'
              ? 'Masukkan URL WebDAV terlebih dahulu.'
              : 'Please enter WebDAV URL first.',
          isError: true,
        });
        return;
      }
      if (formSettings.sync.target === 'dropbox' && !formSettings.sync.dropbox.access_token) {
        setPairingMessage({
          text:
            formSettings.language === 'id'
              ? 'Hubungkan akun Dropbox terlebih dahulu sebelum membuat kode pairing.'
              : 'Connect Dropbox account first before generating a pairing code.',
          isError: true,
        });
        return;
      }
      const code = generateSyncPairingCode(formSettings.sync);
      setPairingCodeOutput(code);
      navigator.clipboard.writeText(code);
      setPairingCodeCopied(true);
      setTimeout(() => setPairingCodeCopied(false), 2500);
      setPairingMessage({
        text:
          formSettings.language === 'id'
            ? 'Kode pairing berhasil dibuat dan disalin ke clipboard! Tempelkan pada perangkat lain Anda.'
            : 'Pairing code generated and copied to clipboard! Paste it on your other device.',
      });
    } catch (e: any) {
      setPairingMessage({ text: e.message || 'Gagal membuat kode pairing.', isError: true });
    }
  };

  const handleApplyPairing = async () => {
    if (!pairingInputCode.trim()) {
      setPairingMessage({
        text:
          formSettings.language === 'id'
            ? 'Tempelkan kode pairing terlebih dahulu.'
            : 'Please paste the pairing code first.',
        isError: true,
      });
      return;
    }
    const parsedConfig = parseSyncPairingCode(pairingInputCode.trim());
    if (!parsedConfig) {
      setPairingMessage({
        text:
          formSettings.language === 'id'
            ? 'Kode pairing tidak valid atau format salah. Pastikan menyalin kode berawalan QLMSYNC1_ secara lengkap.'
            : 'Invalid pairing code. Make sure to copy the full code starting with QLMSYNC1_.',
        isError: true,
      });
      return;
    }

    setFormSettings((prev) => ({
      ...prev,
      sync: parsedConfig,
    }));
    onSaveSettings({ sync: parsedConfig });
    setPairingInputCode('');

    // Test connection automatically for the newly imported sync target
    if (parsedConfig.target === 'webdav') {
      setTestingWebdav(true);
      const res = await testWebDAVConnection(parsedConfig.webdav);
      setWebdavTestResult(res);
      setTestingWebdav(false);
      setPairingMessage({
        text:
          formSettings.language === 'id'
            ? `Berhasil dipasangkan! Terhubung ke server WebDAV (${parsedConfig.webdav.url}).`
            : `Successfully paired! Connected to WebDAV server (${parsedConfig.webdav.url}).`,
      });
    } else if (parsedConfig.target === 'dropbox') {
      setTestingDropbox(true);
      const res = await testDropboxConnection(parsedConfig.dropbox.access_token);
      setDropboxTestResult(res);
      if (res.success && (res.user || res.email)) {
        const enrichedDropbox = {
          ...parsedConfig.dropbox,
          account_name: res.user || parsedConfig.dropbox.account_name,
          account_email: res.email || parsedConfig.dropbox.account_email,
        };
        setFormSettings((prev) => ({
          ...prev,
          sync: {
            ...prev.sync,
            dropbox: enrichedDropbox,
          },
        }));
        onSaveSettings({
          sync: {
            ...parsedConfig,
            dropbox: enrichedDropbox,
          },
        });
      }
      setTestingDropbox(false);
      setPairingMessage({
        text:
          formSettings.language === 'id'
            ? `Berhasil dipasangkan! Terhubung ke Dropbox (${res.user || res.email || 'Aktif'}).`
            : `Successfully paired! Connected to Dropbox (${res.user || res.email || 'Active'}).`,
      });
    }
  };

  const handleEnableE2EE = async () => {
    if (!masterPasswordInput || masterPasswordInput.length < 6) {
      setE2eeMessage({ text: t.pwd_min_len_err, isError: true });
      return;
    }
    if (masterPasswordInput !== confirmPasswordInput) {
      setE2eeMessage({ text: t.pwd_mismatch_err, isError: true });
      return;
    }

    try {
      const { salt, verifier_hash } = await setupMasterPassword(masterPasswordInput);
      const updatedE2EE = {
        enabled: true,
        is_unlocked: true,
        salt,
        verifier_hash,
      };
      setFormSettings((prev) => ({
        ...prev,
        e2ee: updatedE2EE,
      }));
      onSaveSettings({ e2ee: updatedE2EE });
      setE2eeMessage({ text: t.e2ee_enabled_success });
      setMasterPasswordInput('');
      setConfirmPasswordInput('');
    } catch (e: any) {
      setE2eeMessage({ text: e.message || 'Error setting master password', isError: true });
    }
  };

  const handleUnlockVault = async () => {
    if (!masterPasswordInput) return;
    try {
      const ok = await unlockVault(
        masterPasswordInput,
        formSettings.e2ee.salt,
        formSettings.e2ee.verifier_hash
      );
      if (ok) {
        setE2eeMessage({ text: t.vault_unlocked_success });
        setMasterPasswordInput('');
        onSaveSettings({ e2ee: { ...formSettings.e2ee, is_unlocked: true } });
      } else {
        setE2eeMessage({ text: t.incorrect_password_err, isError: true });
      }
    } catch (e: any) {
      setE2eeMessage({ text: e.message || 'Unlock error', isError: true });
    }
  };

  const handleLockVault = () => {
    lockVault();
    onSaveSettings({ e2ee: { ...formSettings.e2ee, is_unlocked: false } });
    setE2eeMessage({ text: t.vault_locked_msg });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 select-none">
      <div className="w-full h-full sm:h-[88vh] sm:max-w-3xl sm:rounded-2xl bg-[#202b3e] border-0 sm:border border-slate-700 shadow-2xl text-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-700/80 bg-[#1a2333] shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-semibold">{t.settings_title}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label={t.cancel}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Layout: Responsive Navigation Tabs (Horizontal on mobile, Vertical on desktop) + Full-width Content */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          {/* Navigation Tabs */}
          <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto md:w-56 shrink-0 bg-[#17202e] border-b md:border-b-0 md:border-r border-slate-800/90 p-1.5 md:p-2.5 gap-1 custom-scrollbar">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-lg text-left transition whitespace-nowrap shrink-0 text-xs font-medium active:scale-95 ${
                activeTab === 'general' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>{t.tab_general}</span>
            </button>
            <button
              onClick={() => setActiveTab('sync')}
              className={`flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-lg text-left transition whitespace-nowrap shrink-0 text-xs font-medium active:scale-95 ${
                activeTab === 'sync' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span>{t.tab_sync}</span>
            </button>
            <button
              onClick={() => setActiveTab('encryption')}
              className={`flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-lg text-left transition whitespace-nowrap shrink-0 text-xs font-medium active:scale-95 ${
                activeTab === 'encryption' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              <Lock className="w-4 h-4 shrink-0" />
              <span>{t.tab_encryption}</span>
            </button>
            <button
              onClick={() => setActiveTab('gas')}
              className={`flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-lg text-left transition whitespace-nowrap shrink-0 text-xs font-medium active:scale-95 ${
                activeTab === 'gas' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span>{t.tab_gas}</span>
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-lg text-left transition whitespace-nowrap shrink-0 text-xs font-medium active:scale-95 ${
                activeTab === 'backup' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              <FolderSync className="w-4 h-4 shrink-0" />
              <span>{t.tab_backup}</span>
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-lg text-left transition whitespace-nowrap shrink-0 text-xs font-medium active:scale-95 ${
                activeTab === 'about' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              <Info className="w-4 h-4 shrink-0" />
              <span>{t.tab_about}</span>
            </button>
          </div>

          {/* Right/Bottom Tab Content: Full Width on Mobile */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar text-xs">
            {/* GENERAL TAB */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white border-b border-slate-700/80 pb-2">
                  {t.general_preferences}
                </h4>

                {/* Bahasa (Language) */}
                <div>
                  <label className="block font-medium text-slate-300 mb-1">{t.language}</label>
                  <select
                    value={formSettings.language}
                    onChange={(e) =>
                      setFormSettings((prev) => ({ ...prev, language: e.target.value as AppLanguage }))
                    }
                    className="w-full sm:max-w-sm bg-slate-900 text-xs text-slate-200 px-3 py-2 rounded-lg border border-slate-700 outline-none font-medium focus:border-blue-500"
                  >
                    <option value="id">{t.lang_id}</option>
                    <option value="en">{t.lang_en}</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {formSettings.language === 'id'
                      ? 'Pilih bahasa tampilan untuk aplikasi Qalam Note.'
                      : 'Choose Qalam Note application display language.'}
                  </span>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await updatePresetNotesLanguage(formSettings.language);
                        onSaveSettings(formSettings);
                      }}
                      className="text-[11px] px-3 py-1.5 min-h-[36px] bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-lg border border-slate-700 transition flex items-center gap-1.5 active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>
                        {formSettings.language === 'id'
                          ? 'Perbarui Catatan Bawaan ke Bahasa Ini'
                          : 'Update Preset Notes to This Language'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Format Tanggal (Date Format) */}
                <div>
                  <label className="block font-medium text-slate-300 mb-1">{t.date_format}</label>
                  <select
                    value={formSettings.date_format}
                    onChange={(e) =>
                      setFormSettings((prev) => ({ ...prev, date_format: e.target.value as DateFormatOption }))
                    }
                    className="w-full sm:max-w-sm bg-slate-900 text-xs text-slate-200 px-3 py-2 rounded-lg border border-slate-700 outline-none focus:border-blue-500"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY ({formatDate(Date.now(), 'DD/MM/YYYY', formSettings.language)})</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD ({formatDate(Date.now(), 'YYYY-MM-DD', formSettings.language)})</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY ({formatDate(Date.now(), 'MM/DD/YYYY', formSettings.language)})</option>
                    <option value="D MMMM YYYY">D MMMM YYYY ({formatDate(Date.now(), 'D MMMM YYYY', formSettings.language)})</option>
                  </select>
                </div>

                {/* Format Waktu (Time Format) */}
                <div>
                  <label className="block font-medium text-slate-300 mb-1">{t.time_format}</label>
                  <select
                    value={formSettings.time_format}
                    onChange={(e) =>
                      setFormSettings((prev) => ({ ...prev, time_format: e.target.value as TimeFormatOption }))
                    }
                    className="w-full sm:max-w-sm bg-slate-900 text-xs text-slate-200 px-3 py-2 rounded-lg border border-slate-700 outline-none focus:border-blue-500"
                  >
                    <option value="24h">{t.time_format_24h} &bull; {formatTime(Date.now(), '24h')}</option>
                    <option value="12h">{t.time_format_12h} &bull; {formatTime(Date.now(), '12h')}</option>
                  </select>
                </div>

                {/* Pratinjau Tanggal & Waktu */}
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between w-full sm:max-w-md">
                  <span className="text-slate-400">
                    {t.date_time_preview}
                  </span>
                  <span className="font-mono text-blue-400 font-semibold">
                    {formatDate(Date.now(), formSettings.date_format, formSettings.language)} {formatTime(Date.now(), formSettings.time_format)}
                  </span>
                </div>

                {/* Tema (Theme) */}
                <div>
                  <label className="block font-medium text-slate-300 mb-1">{t.theme}</label>
                  <select
                    value={formSettings.theme}
                    onChange={(e: any) =>
                      setFormSettings((prev) => ({ ...prev, theme: e.target.value }))
                    }
                    className="w-full sm:max-w-sm bg-slate-900 text-xs text-slate-200 px-3 py-2 rounded-lg border border-slate-700 outline-none focus:border-blue-500"
                  >
                    <option value="qalam-dark">{t.theme_dark}</option>
                    <option value="qalam-nord">{t.theme_nord}</option>
                    <option value="qalam-light">{t.theme_light}</option>
                  </select>
                </div>

                {/* Mode Editor Bawaan (Hanya 2 Opsi: WYSIWYG dan Markdown) */}
                <div>
                  <label className="block font-medium text-slate-300 mb-1">{t.default_editor_mode}</label>
                  <select
                    value={formSettings.editor_mode}
                    onChange={(e: any) =>
                      setFormSettings((prev) => ({ ...prev, editor_mode: e.target.value }))
                    }
                    className="w-full sm:max-w-sm bg-slate-900 text-xs text-slate-200 px-3 py-2 rounded-lg border border-slate-700 outline-none focus:border-blue-500"
                  >
                    <option value="wysiwyg">{t.wysiwyg_editor}</option>
                    <option value="markdown">{t.markdown_view}</option>
                  </select>
                </div>

                {/* Ukuran Font */}
                <div>
                  <label className="block font-medium text-slate-300 mb-1">{t.editor_font_size}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="11"
                      max="22"
                      value={formSettings.font_size}
                      onChange={(e) =>
                        setFormSettings((prev) => ({ ...prev, font_size: Number(e.target.value) || 14 }))
                      }
                      className="w-24 bg-slate-900 text-xs text-slate-200 px-3 py-2 rounded-lg border border-slate-700 outline-none focus:border-blue-500 font-mono"
                    />
                    <span className="text-xs text-slate-400">px</span>
                  </div>
                </div>
              </div>
            )}

            {/* SYNCHRONISATION TAB */}
            {activeTab === 'sync' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white border-b border-slate-700/80 pb-2">
                  {t.sync_target_title}
                </h4>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">{t.sync_target}</label>
                  <select
                    value={formSettings.sync.target}
                    onChange={(e: any) =>
                      setFormSettings((prev) => ({
                        ...prev,
                        sync: { ...prev.sync, target: e.target.value },
                      }))
                    }
                    className="w-full max-w-xs bg-slate-900 text-xs text-slate-200 px-3 py-2 rounded border border-slate-700 outline-none font-medium"
                  >
                    <option value="disabled">{t.sync_disabled}</option>
                    <option value="webdav">{t.sync_webdav}</option>
                    <option value="dropbox">{t.sync_dropbox}</option>
                  </select>
                </div>

                {/* WebDAV Settings */}
                {formSettings.sync.target === 'webdav' && (
                  <div className={`rounded-xl border p-4 sm:p-5 space-y-3.5 transition-colors ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900/60 border-slate-800 text-slate-200'
                  }`}>
                    <div className="flex items-center gap-2 text-blue-500 font-bold text-xs sm:text-sm border-b border-slate-700/30 pb-2">
                      <Server className="w-4 h-4" />
                      <span>{t.webdav_config}</span>
                    </div>

                    <div>
                      <label className={`block font-medium text-xs mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        {t.webdav_url_label}
                      </label>
                      <input
                        type="url"
                        value={formSettings.sync.webdav.url}
                        onChange={(e) =>
                          setFormSettings((prev) => ({
                            ...prev,
                            sync: {
                              ...prev.sync,
                              webdav: { ...prev.sync.webdav, url: e.target.value },
                            },
                          }))
                        }
                        placeholder="https://example.com/remote.php/webdav/qalam/"
                        className={`w-full text-xs font-mono px-3 py-2 rounded-lg border outline-none ${
                          isLight ? 'bg-white text-slate-800 border-slate-300 focus:border-blue-500' : 'bg-slate-900 text-slate-200 border-slate-700 focus:border-blue-500'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block font-medium text-xs mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                          {t.webdav_username_label}
                        </label>
                        <input
                          type="text"
                          value={formSettings.sync.webdav.username}
                          onChange={(e) =>
                            setFormSettings((prev) => ({
                              ...prev,
                              sync: {
                                ...prev.sync,
                                webdav: { ...prev.sync.webdav, username: e.target.value },
                              },
                            }))
                          }
                          className={`w-full text-xs px-3 py-2 rounded-lg border outline-none ${
                            isLight ? 'bg-white text-slate-800 border-slate-300 focus:border-blue-500' : 'bg-slate-900 text-slate-200 border-slate-700 focus:border-blue-500'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block font-medium text-xs mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                          {t.webdav_password_label}
                        </label>
                        <input
                          type="password"
                          value={formSettings.sync.webdav.password}
                          onChange={(e) =>
                            setFormSettings((prev) => ({
                              ...prev,
                              sync: {
                                ...prev.sync,
                                webdav: { ...prev.sync.webdav, password: e.target.value },
                              },
                            }))
                          }
                          className={`w-full text-xs font-mono px-3 py-2 rounded-lg border outline-none ${
                            isLight ? 'bg-white text-slate-800 border-slate-300 focus:border-blue-500' : 'bg-slate-900 text-slate-200 border-slate-700 focus:border-blue-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between">
                      <button
                        onClick={handleTestWebdav}
                        disabled={testingWebdav}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 ${
                          isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        }`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testingWebdav ? 'animate-spin' : ''}`} />
                        <span>{testingWebdav ? t.testing : t.check_sync_config}</span>
                      </button>
                    </div>

                    {webdavTestResult && (
                      <div
                        className={`p-3 rounded-lg text-xs border flex items-center gap-2 ${
                          webdavTestResult.success
                            ? isLight
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                              : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                            : isLight
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-amber-950/40 border-amber-800 text-amber-300'
                        }`}
                      >
                        {webdavTestResult.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                        )}
                        <span>{webdavTestResult.message}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Dropbox Settings */}
                {formSettings.sync.target === 'dropbox' && (
                  <div className={`rounded-xl border p-4 sm:p-5 space-y-4 transition-colors ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900/60 border-slate-800 text-slate-200'
                  }`}>
                    <div className="flex items-center justify-between border-b border-slate-700/40 pb-2">
                      <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-blue-500">
                        <Cloud className="w-4 h-4 shrink-0" />
                        <span>{t.dropbox_config}</span>
                      </div>
                      {formSettings.sync.dropbox.access_token && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{formSettings.language === 'id' ? 'Terhubung' : 'Connected'}</span>
                        </span>
                      )}
                    </div>

                    {/* If Already Connected */}
                    {formSettings.sync.dropbox.access_token ? (
                      <div className="space-y-3">
                        <div className={`p-3.5 rounded-xl border flex items-center justify-between flex-wrap gap-2 ${
                          isLight ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                        }`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-500 shrink-0">
                              <Cloud className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs sm:text-sm truncate">
                                {formSettings.sync.dropbox.account_name || 'Dropbox User'}
                              </div>
                              {formSettings.sync.dropbox.account_email && (
                                <div className={`text-[11px] truncate ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                                  {formSettings.sync.dropbox.account_email}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleDisconnectDropbox}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
                              isLight ? 'bg-white hover:bg-red-50 text-red-600 border border-red-200 shadow-2xs' : 'bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-800/50'
                            }`}
                          >
                            <Unlink className="w-3.5 h-3.5" />
                            <span>{t.dropbox_disconnect}</span>
                          </button>
                        </div>

                        <div>
                          <label className={`block font-medium text-xs mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            {formSettings.language === 'id' ? 'Folder Penyimpanan di Dropbox:' : 'Sync Folder Path in Dropbox:'}
                          </label>
                          <input
                            type="text"
                            value={formSettings.sync.dropbox.path || '/QalamNote'}
                            onChange={(e) =>
                              setFormSettings((prev) => ({
                                ...prev,
                                sync: {
                                  ...prev.sync,
                                  dropbox: { ...prev.sync.dropbox, path: e.target.value },
                                },
                              }))
                            }
                            placeholder="/QalamNote"
                            className={`w-full text-xs font-mono px-3 py-1.5 rounded-lg border outline-none ${
                              isLight ? 'bg-white text-slate-800 border-slate-300 focus:border-blue-500' : 'bg-slate-900 text-slate-200 border-slate-700 focus:border-blue-500'
                            }`}
                          />
                          <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            {formSettings.language === 'id'
                              ? 'Catatan akan disinkronkan ke folder ini di Dropbox Anda.'
                              : 'Notes will be synced to this folder in your Dropbox.'}
                          </p>
                        </div>

                        <div className="pt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleTestDropbox}
                            disabled={testingDropbox}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 ${
                              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            }`}
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${testingDropbox ? 'animate-spin' : ''}`} />
                            <span>{testingDropbox ? t.testing : t.check_connection}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Not Connected: OAuth or Manual */
                      <div className="space-y-4">
                        {/* Method Tabs */}
                        <div className={`flex items-center p-1 rounded-lg border text-xs ${
                          isLight ? 'bg-slate-200/70 border-slate-300' : 'bg-slate-950 border-slate-800'
                        }`}>
                          <button
                            type="button"
                            onClick={() => setDropboxAuthMode('oauth')}
                            className={`flex-1 py-1.5 px-3 rounded-md font-semibold transition text-center ${
                              dropboxAuthMode === 'oauth'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {t.dropbox_auth_oauth}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDropboxAuthMode('manual')}
                            className={`flex-1 py-1.5 px-3 rounded-md font-semibold transition text-center ${
                              dropboxAuthMode === 'manual'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {t.dropbox_auth_manual}
                          </button>
                        </div>

                        {dropboxAuthMode === 'oauth' ? (
                          /* Dropbox 1-Click OAuth PKCE Flow */
                          <div className="space-y-3.5">
                            <div className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
                              isLight ? 'bg-blue-50/80 border-blue-200 text-blue-900' : 'bg-blue-950/30 border-blue-900/50 text-blue-300'
                            }`}>
                              {formSettings.language === 'id'
                                ? 'Otorisasi resmi Dropbox yang aman dengan pembaruan token otomatis. Masukkan App Key dari aplikasi Dropbox Anda (klik tautan Dropbox App Console di bawah jika belum punya), lalu klik tombol "Buka Halaman Otorisasi Dropbox" dan masukkan kode yang didapatkan.'
                                : 'Secure official Dropbox authorization with automatic token renewal. Enter your Dropbox App Key (or create one via the link below), click "Open Dropbox Authorization Page", grant access ("Allow"), and paste the authorization code below.'}
                            </div>

                            {/* App Key (Client ID) Input */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className={`font-semibold text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                                  {t.dropbox_app_key_label}
                                </label>
                                <a
                                  href="https://www.dropbox.com/developers/apps"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-blue-500 hover:underline inline-flex items-center gap-0.5 font-medium"
                                >
                                  Dropbox App Console <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                              <input
                                type="text"
                                value={customAppKey}
                                onChange={(e) => setCustomAppKey(e.target.value)}
                                placeholder="Contoh: k9a4b8cd1ef2..."
                                className={`w-full text-xs font-mono px-3 py-2 rounded-lg border outline-none ${
                                  isLight ? 'bg-white text-slate-800 border-slate-300 focus:border-blue-500' : 'bg-slate-900 text-slate-200 border-slate-700 focus:border-blue-500'
                                }`}
                              />
                              <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                {formSettings.language === 'id'
                                  ? 'App Key dari aplikasi Dropbox Anda (Scoped Access > App folder). Jika belum punya, klik tautan di kanan atas untuk membuat gratis dalam 30 detik.'
                                  : 'App Key from your Dropbox Developer App (Scoped Access > App folder). Create free in 30s via the link above.'}
                              </p>
                            </div>

                            {/* Step 1: Open Auth Page */}
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={handleOpenDropboxAuth}
                                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
                              >
                                <ExternalLink className="w-4 h-4 shrink-0" />
                                <span>{t.dropbox_btn_authorize}</span>
                              </button>
                            </div>

                            {/* Step 2: Paste Code & Exchange */}
                            <div className="pt-2 border-t border-slate-700/30 space-y-2">
                              <label className={`block font-semibold text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                                {t.dropbox_step2_title}:
                              </label>
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <input
                                  type="text"
                                  value={dropboxAuthCode}
                                  onChange={(e) => setDropboxAuthCode(e.target.value)}
                                  placeholder={t.dropbox_step2_placeholder}
                                  className={`flex-1 text-xs font-mono px-3 py-2 rounded-lg border outline-none ${
                                    isLight ? 'bg-white text-slate-800 border-slate-300 focus:border-blue-500' : 'bg-slate-900 text-slate-200 border-slate-700 focus:border-blue-500'
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={handleExchangeDropboxCode}
                                  disabled={isExchangingDropboxCode}
                                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 disabled:opacity-50 whitespace-nowrap min-h-[38px]"
                                >
                                  {isExchangingDropboxCode ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>{formSettings.language === 'id' ? 'Menghubungkan...' : 'Connecting...'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>{t.dropbox_btn_exchange}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Error notification */}
                            {dropboxAuthError && (
                              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                                <span>{dropboxAuthError}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Manual Mode (Direct Access Token) */
                          <div className="space-y-3.5">
                            {/* Panduan Lengkap Mengambil Token Dropbox */}
                            <div className={`rounded-xl border p-3.5 sm:p-4 text-xs space-y-3 transition-colors ${
                              isLight ? 'bg-amber-50/80 border-amber-200 text-amber-950' : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                            }`}>
                              <div className="flex items-center justify-between font-bold text-amber-700 dark:text-amber-400">
                                <div className="flex items-center gap-1.5">
                                  <HelpCircle className="w-4 h-4 shrink-0" />
                                  <span>
                                    {formSettings.language === 'id'
                                      ? 'Panduan Mengambil Token Akses Manual Dropbox'
                                      : 'Guide: How to Generate Dropbox Access Token'}
                                  </span>
                                </div>
                                <a
                                  href="https://www.dropbox.com/developers/apps"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] underline flex items-center gap-1 font-semibold hover:opacity-80"
                                >
                                  <span>Dropbox Developers Console</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>

                              <div className="space-y-2 text-[11px] leading-relaxed">
                                {formSettings.language === 'id' ? (
                                  <>
                                    <div className="flex items-start gap-2">
                                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0 text-[10px]">1</span>
                                      <div>
                                        <strong>Buka Portal Developer Dropbox:</strong> Buka <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-blue-600 dark:text-blue-400">dropbox.com/developers/apps</a> dan masuk dengan akun Dropbox Anda.
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0 text-[10px]">2</span>
                                      <div>
                                        <strong>Buat Aplikasi:</strong> Klik tombol biru <strong>"Create app"</strong> di sebelah kanan atas.
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0 text-[10px]">3</span>
                                      <div>
                                        <strong>Pilih Jenis Akses:</strong>
                                        <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                                          <li>Pilih <strong>"Scoped access"</strong></li>
                                          <li>Pilih <strong>"App folder"</strong> (folder terisolasi di <code>/Apps/QalamNote</code> yang aman)</li>
                                          <li>Beri nama aplikasi (misal: <code>Qalam Notes - Nama Anda</code>), lalu klik tombol <strong>"Create app"</strong></li>
                                        </ul>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0 text-[10px]">4</span>
                                      <div>
                                        <strong className="text-amber-800 dark:text-amber-300">PENTING - Atur Izin (Permissions):</strong> Buka tab <strong>"Permissions"</strong>, centang izin:
                                        <div className="font-mono text-[10px] my-1 bg-black/5 dark:bg-black/30 p-2 rounded border border-amber-500/20 space-y-0.5">
                                          <div>&bull; <code>files.content.write</code> (Menyimpan & mengunggah berkas catatan)</div>
                                          <div>&bull; <code>files.content.read</code> (Membaca berkas catatan tersinkron)</div>
                                          <div>&bull; <code>account_info.read</code> (Melihat info profil pengguna)</div>
                                        </div>
                                        Lalu klik tombol <strong>"Submit"</strong> di bagian bawah halaman untuk menyimpan permissions!
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0 text-[10px]">5</span>
                                      <div>
                                        <strong>Hasilkan Token:</strong> Buka tab <strong>"Settings"</strong>, gulir ke bagian <strong>"Generated access token"</strong>, lalu klik tombol <strong>"Generate"</strong>. Salin token panjang yang berawalan <code>sl...</code> dan tempelkan ke kolom input di bawah ini.
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-start gap-2">
                                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0 text-[10px]">1</span>
                                      <div>
                                        <strong>Open Dropbox Developers:</strong> Go to <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-blue-600 dark:text-blue-400">dropbox.com/developers/apps</a> and sign in.
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0 text-[10px]">2</span>
                                      <div>
                                        <strong>Create App:</strong> Click the blue <strong>"Create app"</strong> button in the top right.
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0 text-[10px]">3</span>
                                      <div>
                                        <strong>Choose Settings:</strong>
                                        <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                                          <li>Select <strong>"Scoped access"</strong></li>
                                          <li>Select <strong>"App folder"</strong> (creates safe <code>/Apps/QalamNote</code>)</li>
                                          <li>Name your app (e.g. <code>Qalam Notes - My App</code>) and click <strong>"Create app"</strong></li>
                                        </ul>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0 text-[10px]">4</span>
                                      <div>
                                        <strong className="text-amber-800 dark:text-amber-300">CRITICAL - Set Permissions:</strong> Go to the <strong>"Permissions"</strong> tab, check:
                                        <div className="font-mono text-[10px] my-1 bg-black/5 dark:bg-black/30 p-2 rounded border border-amber-500/20 space-y-0.5">
                                          <div>&bull; <code>files.content.write</code> (to save and upload notes)</div>
                                          <div>&bull; <code>files.content.read</code> (to download synced notes)</div>
                                          <div>&bull; <code>account_info.read</code> (to verify account display)</div>
                                        </div>
                                        Then click <strong>"Submit"</strong> at the bottom of the permissions tab!
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0 text-[10px]">5</span>
                                      <div>
                                        <strong>Generate Access Token:</strong> Return to the <strong>"Settings"</strong> tab, scroll to <strong>"Generated access token"</strong>, click <strong>"Generate"</strong>, and copy the long token starting with <code>sl...</code> into the input field below.
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            <div>
                              <label className={`block font-semibold text-xs mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                                {t.dropbox_token_label}
                              </label>
                              <input
                                type="password"
                                value={formSettings.sync.dropbox.access_token}
                                onChange={(e) =>
                                  setFormSettings((prev) => ({
                                    ...prev,
                                    sync: {
                                      ...prev.sync,
                                      dropbox: { ...prev.sync.dropbox, access_token: e.target.value },
                                    },
                                  }))
                                }
                                placeholder="sl.u.AF3j..."
                                className={`w-full text-xs px-3 py-2 rounded-lg border font-mono outline-none ${
                                  isLight ? 'bg-white text-slate-800 border-slate-300 focus:border-blue-500' : 'bg-slate-900 text-slate-200 border-slate-700 focus:border-blue-500'
                                }`}
                              />
                              <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                {t.dropbox_token_desc}
                              </p>
                            </div>

                            <div className="pt-1 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={handleTestDropbox}
                                disabled={testingDropbox}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 ${
                                  isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                                }`}
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${testingDropbox ? 'animate-spin' : ''}`} />
                                <span>{testingDropbox ? t.testing : t.check_connection}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {dropboxTestResult && (
                      <div
                        className={`p-3 rounded-lg text-xs border flex items-center gap-2 ${
                          dropboxTestResult.success
                            ? isLight
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                              : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                            : isLight
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-amber-950/40 border-amber-800 text-amber-300'
                        }`}
                      >
                        {dropboxTestResult.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                        )}
                        <span>{dropboxTestResult.message}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* CROSS-DEVICE PAIRING CODE (KODE PAIRING ANTAR-PERANGKAT) */}
                <div className={`rounded-xl border p-4 sm:p-5 space-y-4 transition-colors ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900/60 border-slate-800 text-slate-200'
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-700/30 pb-2">
                    <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-purple-500">
                      <Smartphone className="w-4 h-4 shrink-0" />
                      <span>{t.pairing_title}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-purple-500/80 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                      WebDAV &bull; Dropbox
                    </span>
                  </div>

                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    {t.pairing_desc}
                  </p>

                  {/* Pairing Actions: 2 Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* 1. Bagikan / Salin dari Perangkat Ini */}
                    <div className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 ${
                      isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-950/60 border-slate-800'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs flex items-center gap-1.5">
                            <Share2 className="w-3.5 h-3.5 text-blue-500" />
                            <span>{t.pairing_export_label}</span>
                          </span>
                          {formSettings.sync.target !== 'disabled' && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">
                              {formSettings.sync.target}
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] leading-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {formSettings.language === 'id'
                            ? 'Buat kode pairing untuk menyalin konfigurasi sinkronisasi perangkat ini ke ponsel atau komputer lain.'
                            : 'Generate a pairing code to copy this device’s sync settings to your phone or another computer.'}
                        </p>
                      </div>

                      {pairingCodeOutput ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              readOnly
                              value={pairingCodeOutput}
                              className={`flex-1 text-[11px] font-mono px-2.5 py-1.5 rounded-lg border outline-none select-all truncate ${
                                isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-900 text-slate-200 border-slate-700'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(pairingCodeOutput);
                                setPairingCodeCopied(true);
                                setTimeout(() => setPairingCodeCopied(false), 2000);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shrink-0 transition"
                            >
                              {pairingCodeCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                                  <span>{t.pairing_copied}</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>{t.pairing_copy_btn}</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            {formSettings.language === 'id'
                              ? 'Kode siap disalin! Buka Qalam Note di perangkat kedua Anda lalu tempel di kolom "Sambungkan dari Perangkat Lain".'
                              : 'Ready! Open Qalam Note on your second device and paste this code under "Connect via Pairing Code".'}
                          </p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGeneratePairing}
                          disabled={formSettings.sync.target === 'disabled'}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50 ${
                            isLight
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                              : 'bg-blue-600 hover:bg-blue-500 text-white'
                          }`}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>{t.pairing_generate_btn}</span>
                        </button>
                      )}
                    </div>

                    {/* 2. Sambungkan dari Kode Pairing Perangkat Lain */}
                    <div className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 ${
                      isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-950/60 border-slate-800'
                    }`}>
                      <div>
                        <span className="font-semibold text-xs flex items-center gap-1.5 mb-1">
                          <Smartphone className="w-3.5 h-3.5 text-purple-500" />
                          <span>{t.pairing_import_title}</span>
                        </span>
                        <p className={`text-[11px] leading-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {formSettings.language === 'id'
                            ? 'Tempel kode pairing dari perangkat pertama Anda untuk menghubungkan secara otomatis.'
                            : 'Paste the pairing code from your first device to connect automatically.'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={pairingInputCode}
                          onChange={(e) => setPairingInputCode(e.target.value)}
                          placeholder={t.pairing_import_placeholder}
                          className={`w-full text-[11px] font-mono px-2.5 py-1.5 rounded-lg border outline-none ${
                            isLight ? 'bg-white text-slate-800 border-slate-300 focus:border-purple-500' : 'bg-slate-900 text-slate-200 border-slate-700 focus:border-purple-500'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={handleApplyPairing}
                          disabled={!pairingInputCode.trim()}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50 ${
                            isLight
                              ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-2xs'
                              : 'bg-purple-600 hover:bg-purple-500 text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t.pairing_import_btn}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Pairing message notification */}
                  {pairingMessage && (
                    <div
                      className={`p-3 rounded-lg text-xs border flex items-center gap-2 animate-in fade-in duration-200 ${
                        pairingMessage.isError
                          ? isLight
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-amber-950/40 border-amber-800 text-amber-300'
                          : isLight
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                      }`}
                    >
                      {pairingMessage.isError ? (
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      )}
                      <span>{pairingMessage.text}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ENCRYPTION TAB (E2EE) */}
            {activeTab === 'encryption' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white border-b border-slate-700/80 pb-2">
                  {t.e2ee_title}
                </h4>

                <div className="rounded-lg bg-blue-950/30 border border-blue-800/40 p-3.5 text-slate-300 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-blue-300">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span>{t.e2ee_desc_title}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {t.e2ee_desc_body}
                  </p>
                </div>

                {formSettings.e2ee.enabled ? (
                  <div className="space-y-3 rounded-lg bg-slate-900/60 border border-slate-800 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{t.e2ee_status_label}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          isVaultUnlocked
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {isVaultUnlocked ? t.e2ee_vault_unlocked : t.e2ee_vault_locked}
                      </span>
                    </div>

                    {isVaultUnlocked ? (
                      <div>
                        <p className="text-slate-400 mb-3">
                          {t.vault_unlocked_desc}
                        </p>
                        <button
                          onClick={handleLockVault}
                          className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium flex items-center gap-1.5 transition"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>{t.lock_vault}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-slate-400">{t.enter_master_password_to_unlock}</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            value={masterPasswordInput}
                            onChange={(e) => setMasterPasswordInput(e.target.value)}
                            placeholder={t.master_password_placeholder}
                            className="flex-1 bg-slate-900 text-xs text-slate-200 px-3 py-1.5 rounded border border-slate-700 outline-none"
                          />
                          <button
                            onClick={handleUnlockVault}
                            className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 transition"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>{t.unlock}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Set Up Master Password */
                  <div className="space-y-3 rounded-lg bg-slate-900/60 border border-slate-800 p-4">
                    <h5 className="font-semibold text-white">{t.set_master_password_title}</h5>
                    <div>
                      <label className="block text-slate-400 mb-1">{t.master_password_min_chars}</label>
                      <input
                        type="password"
                        value={masterPasswordInput}
                        onChange={(e) => setMasterPasswordInput(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full max-w-sm bg-slate-900 text-xs text-slate-200 px-3 py-1.5 rounded border border-slate-700 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">{t.confirm_master_password_label}</label>
                      <input
                        type="password"
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full max-w-sm bg-slate-900 text-xs text-slate-200 px-3 py-1.5 rounded border border-slate-700 outline-none"
                      />
                    </div>
                    <button
                      onClick={handleEnableE2EE}
                      className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 transition"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{t.enable_e2ee_button}</span>
                    </button>
                  </div>
                )}

                {e2eeMessage && (
                  <div
                    className={`p-2.5 rounded text-xs border ${
                      e2eeMessage.isError
                        ? 'bg-red-950/40 border-red-800 text-red-300'
                        : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    }`}
                  >
                    {e2eeMessage.text}
                  </div>
                )}
              </div>
            )}

            {/* GAS PUBLISHING TAB */}
            {activeTab === 'gas' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
                  <h4 className="text-sm font-semibold text-white">
                    {t.gas_section_title}
                  </h4>
                  <button
                    onClick={onOpenGASHelp}
                    className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>{t.gas_view_guide}</span>
                  </button>
                </div>

                <p className="text-slate-400 text-xs leading-relaxed">
                  {t.gas_overview_desc}
                </p>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">{t.gas_webapp_url_label}</label>
                  <input
                    type="url"
                    value={formSettings.gas.web_app_url}
                    onChange={(e) =>
                      setFormSettings((prev) => ({
                        ...prev,
                        gas: { ...prev.gas, web_app_url: e.target.value },
                      }))
                    }
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full bg-slate-900 text-xs text-slate-200 px-3 py-2 rounded border border-slate-700 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {t.gas_webapp_url_hint}
                  </span>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">{t.gas_author_label}</label>
                  <input
                    type="text"
                    value={formSettings.gas.author_name}
                    onChange={(e) =>
                      setFormSettings((prev) => ({
                        ...prev,
                        gas: { ...prev.gas, author_name: e.target.value },
                      }))
                    }
                    placeholder={t.gas_author_placeholder}
                    className="w-full max-w-sm bg-slate-900 text-xs text-slate-200 px-3 py-1.5 rounded border border-slate-700"
                  />
                </div>
              </div>
            )}

            {/* IMPORT & EXPORT TAB */}
            {activeTab === 'backup' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white border-b border-slate-700/80 pb-2">
                  {t.backup_section_title}
                </h4>

                <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 space-y-3">
                  <h5 className="font-semibold text-white">{t.export_archive_title}</h5>
                  <p className="text-slate-400 text-xs">
                    {t.export_archive_desc}
                  </p>
                  <button
                    onClick={onExportData}
                    className="px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.export_archive_button}</span>
                  </button>
                </div>

                <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 space-y-3">
                  <h5 className="font-semibold text-white">{t.import_archive_title}</h5>
                  <p className="text-slate-400 text-xs">
                    {t.import_archive_desc}
                  </p>
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{t.import_archive_button}</span>
                    <input type="file" accept=".json" onChange={onImportData} className="hidden" />
                  </label>
                </div>
              </div>
            )}

            {/* ABOUT TAB */}
            {activeTab === 'about' && (
              <div className="space-y-4 text-xs">
                {/* Header: Brand, Version, Description & Quick Actions */}
                <div className={`p-4 sm:p-5 rounded-xl border transition-colors ${
                  isLight ? 'bg-slate-50/80 border-slate-200/80 text-slate-800' : 'bg-slate-900/50 border-slate-800/80 text-slate-200'
                }`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <QalamIcon className="w-11 h-11 shadow-sm shrink-0 rounded-xl" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-base sm:text-lg font-bold tracking-tight leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {t.about_qalam}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-400">
                            v{APP_VERSION}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          {t.about_app_subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                      <button
                        type="button"
                        onClick={handleCopySysInfo}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 ${
                          isLight
                            ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        }`}
                        title={t.about_copy_sysinfo}
                      >
                        {sysInfoCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">{t.about_sysinfo_copied}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{t.about_copy_sysinfo}</span>
                          </>
                        )}
                      </button>
                      <PWAInstallButton language={formSettings.language} />
                    </div>
                  </div>
                </div>

                {/* Community, Coffee & GitHub */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <a
                    href={DONATION_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition group ${
                      isLight
                        ? 'bg-amber-50/60 hover:bg-amber-100/70 border-amber-200/80 text-amber-950'
                        : 'bg-amber-950/20 hover:bg-amber-950/40 border-amber-900/40 text-amber-200'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-amber-500/15 text-amber-500 group-hover:scale-105 transition-transform">
                      <Coffee className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 font-semibold text-xs leading-tight">
                        <span>{t.about_coffee_label}</span>
                        <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                      </div>
                      <p className={`text-[10.5px] truncate mt-0.5 ${isLight ? 'text-amber-700/80' : 'text-amber-300/70'}`}>
                        {t.about_coffee_sub}
                      </p>
                    </div>
                  </a>

                  <a
                    href={TELEGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition group ${
                      isLight
                        ? 'bg-sky-50/60 hover:bg-sky-100/70 border-sky-200/80 text-sky-950'
                        : 'bg-sky-950/20 hover:bg-sky-950/40 border-sky-900/40 text-sky-200'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-sky-500/15 text-sky-500 group-hover:scale-105 transition-transform">
                      <Send className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 font-semibold text-xs leading-tight">
                        <span>{t.about_telegram_label}</span>
                        <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                      </div>
                      <p className={`text-[10.5px] truncate mt-0.5 ${isLight ? 'text-sky-700/80' : 'text-sky-300/70'}`}>
                        {t.about_telegram_sub}
                      </p>
                    </div>
                  </a>

                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition group ${
                      isLight
                        ? 'bg-slate-100/80 hover:bg-slate-200/70 border-slate-200/90 text-slate-900'
                        : 'bg-slate-800/40 hover:bg-slate-800/70 border-slate-700/60 text-slate-200'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-slate-500/15 text-slate-600 dark:text-slate-300 group-hover:scale-105 transition-transform">
                      <Github className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 font-semibold text-xs leading-tight">
                        <span>{t.about_github_label}</span>
                        <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                      </div>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {t.about_github_sub}
                      </p>
                    </div>
                  </a>
                </div>

                {/* Minimalist Metadata & Status Grid */}
                <div className={`p-4 rounded-xl border transition-colors ${
                  isLight ? 'bg-slate-50/50 border-slate-200/80' : 'bg-slate-900/40 border-slate-800/80'
                }`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Storage Diagnostic */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                          <HardDrive className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          {t.about_storage_title}
                        </span>
                        {storageEstimate && (
                          <span className="font-mono text-[10.5px] text-slate-400">
                            {storageEstimate.used} / {storageEstimate.quota}
                          </span>
                        )}
                      </div>
                      {storageEstimate && (
                        <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(2, storageEstimate.percent)}%` }}
                          />
                        </div>
                      )}
                      <p className="text-[11px] text-slate-400">
                        IndexedDB (Dexie.js) · Local-First
                      </p>
                    </div>

                    {/* Security & Privacy */}
                    <div className="space-y-1.5">
                      <span className="text-slate-400 flex items-center gap-1.5 font-medium text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        {t.about_privacy_title}
                      </span>
                      <p className={`text-[11px] font-medium ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                        Web Crypto AES-GCM 256-bit
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formSettings.language === 'id'
                          ? '100% tersimpan di peramban, tanpa pelacak atau telemetri'
                          : '100% stored in browser, zero telemetry or tracking'}
                      </p>
                    </div>

                    {/* Multilingual & Bidi Typography */}
                    <div className="space-y-1.5">
                      <span className="text-slate-400 flex items-center gap-1.5 font-medium text-[11px]">
                        <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        {formSettings.language === 'id' ? 'Tipografi & Arah Aksara' : 'Typography & Direction'}
                      </span>
                      <p className={`text-[11px] font-medium ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                        Bidi Native (LTR & RTL Arab / Ibrani)
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Markdown, LaTeX KaTeX & Mermaid
                      </p>
                    </div>

                    {/* Software License */}
                    <div className="space-y-1.5">
                      <span className="text-slate-400 flex items-center gap-1.5 font-medium text-[11px]">
                        <Scale className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        {t.about_license_label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={APP_LICENSE_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          <span>{APP_LICENSE_NAME}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {formSettings.language === 'id'
                          ? 'Perangkat Lunak Bebas & Sumber Terbuka'
                          : 'Free & Open Source Software'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Collapsible Release Notes (Changelog) */}
                <div className={`rounded-xl border transition-colors overflow-hidden ${
                  isLight ? 'bg-slate-50/60 border-slate-200/80' : 'bg-slate-900/30 border-slate-800/80'
                }`}>
                  <button
                    type="button"
                    onClick={() => setShowFullChangelog((prev) => !prev)}
                    className={`w-full p-3.5 flex items-center justify-between text-left text-xs font-medium transition ${
                      isLight ? 'hover:bg-slate-100/60 text-slate-800' : 'hover:bg-slate-800/40 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-semibold">{t.about_changelog_title}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        v{APP_VERSION}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-blue-400 font-medium">
                      <span>{showFullChangelog ? t.about_changelog_hide : t.about_changelog_view_all}</span>
                      {showFullChangelog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </button>

                  {showFullChangelog && (
                    <div className={`p-3.5 pt-0 border-t space-y-3 ${
                      isLight ? 'border-slate-200/80' : 'border-slate-800/80'
                    }`}>
                      {APP_CHANGELOG.map((log, idx) => (
                        <div
                          key={log.version}
                          className={`pt-3 first:pt-2 space-y-1.5 ${
                            idx > 0 ? isLight ? 'border-t border-slate-200/60' : 'border-t border-slate-800/60' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-xs text-blue-400">
                                v{log.version}
                              </span>
                              <span className={`font-medium text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                                {formSettings.language === 'id' ? log.title.id : log.title.en}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              {log.date}
                            </span>
                          </div>
                          <ul className="space-y-1 text-[11px]">
                            {(formSettings.language === 'id' ? log.highlights.id : log.highlights.en).map((hl, hlIdx) => (
                              <li key={hlIdx} className={`flex items-start gap-1.5 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                <span className="text-emerald-400 shrink-0 font-bold">•</span>
                                <span>{hl}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quiet Footer Note */}
                <div className="text-center pt-1 pb-0.5">
                  <p className="text-[11px] text-slate-500">
                    Qalam Note · {formSettings.language === 'id' ? 'Kedaulatan data & kebebasan menulis' : 'Data sovereignty & writing freedom'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-4 sm:px-5 py-3 border-t border-slate-700/80 bg-[#1a2333] shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 min-h-[44px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition active:scale-95"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 min-h-[44px] rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition active:scale-95"
          >
            {t.save_changes}
          </button>
        </div>
      </div>
    </div>
  );
};
