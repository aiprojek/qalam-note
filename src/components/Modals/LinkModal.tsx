import React, { useState, useEffect, useRef } from 'react';
import { X, Link2, ExternalLink, Globe } from 'lucide-react';
import type { AppLanguage } from '../../types';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (text: string, url: string, openInNewTab: boolean) => void;
  initialText?: string;
  initialUrl?: string;
  language?: AppLanguage;
}

export const LinkModal: React.FC<LinkModalProps> = ({
  isOpen,
  onClose,
  onInsert,
  initialText = '',
  initialUrl = '',
  language = 'id',
}) => {
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState(initialUrl);
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [error, setError] = useState('');
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      setUrl(initialUrl || '');
      setError('');
      setTimeout(() => {
        if (!initialText) {
          // Focus text input if empty
          document.getElementById('link-text-input')?.focus();
        } else {
          urlInputRef.current?.focus();
        }
      }, 50);
    }
  }, [isOpen, initialText, initialUrl]);

  if (!isOpen) return null;

  const isId = language === 'id';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError(isId ? 'URL tautan tidak boleh kosong' : 'Link URL cannot be empty');
      return;
    }

    // Auto-prefix http/https if missing and not mailto/tel
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmedUrl)) {
      trimmedUrl = 'https://' + trimmedUrl;
    }

    onInsert(text.trim() || trimmedUrl, trimmedUrl, openInNewTab);
    onClose();
  };

  const handleQuickProtocol = (proto: string) => {
    if (!url || url.startsWith('http://') || url.startsWith('https://')) {
      const clean = url.replace(/^(?:https?:\/\/)/, '');
      setUrl(proto + clean);
    } else {
      setUrl(proto);
    }
    urlInputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#1e293b] border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/80 bg-[#162032]">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <Link2 className="w-4 h-4 text-blue-400" />
            <span>{isId ? 'Sisipkan Tautan Web' : 'Insert Web Link'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Link Text */}
          <div>
            <label htmlFor="link-text-input" className="block text-slate-300 font-medium mb-1.5">
              {isId ? 'Teks Tautan (Label)' : 'Link Text (Label)'}
            </label>
            <input
              id="link-text-input"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={isId ? 'Misal: Dokumentasi Resmi' : 'e.g. Official Documentation'}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          {/* URL Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="link-url-input" className="block text-slate-300 font-medium">
                {isId ? 'Alamat URL Web' : 'Web URL'} <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickProtocol('https://')}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[10px] font-mono transition"
                >
                  https://
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickProtocol('mailto:')}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[10px] font-mono transition"
                >
                  mailto:
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                id="link-url-input"
                ref={urlInputRef}
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError('');
                }}
                placeholder="https://example.com"
                className={`w-full pl-8 pr-3 py-2 rounded-lg bg-slate-900 border ${
                  error ? 'border-red-500' : 'border-slate-700'
                } text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-xs transition`}
              />
              <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
            {error && <p className="mt-1 text-red-400 text-[11px]">{error}</p>}
          </div>

          {/* Target Blank Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              id="new-tab-check"
              type="checkbox"
              checked={openInNewTab}
              onChange={(e) => setOpenInNewTab(e.target.checked)}
              className="accent-blue-600 w-4 h-4 rounded cursor-pointer"
            />
            <label htmlFor="new-tab-check" className="text-slate-300 cursor-pointer select-none flex items-center gap-1.5">
              <span>{isId ? 'Buka tautan di tab baru' : 'Open link in new tab'}</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-700/60">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium transition"
            >
              {isId ? 'Batal' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-600/20 transition flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{isId ? 'Sisipkan Tautan' : 'Insert Link'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
