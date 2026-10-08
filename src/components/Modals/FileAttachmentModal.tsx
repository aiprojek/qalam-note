import React, { useState, useEffect, useRef } from 'react';
import { X, Paperclip, Upload, Link, AlertCircle, Check, FileText } from 'lucide-react';
import type { AppLanguage } from '../../types';

interface FileAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertAttachmentFile: (file: File, customName?: string) => void;
  onInsertAttachmentUrl: (url: string, fileName: string) => void;
  language?: AppLanguage;
  theme?: string;
}

export const FileAttachmentModal: React.FC<FileAttachmentModalProps> = ({
  isOpen,
  onClose,
  onInsertAttachmentFile,
  onInsertAttachmentUrl,
  language = 'id',
  theme = 'qalam-dark',
}) => {
  const isId = language === 'id';
  const isLight =
    theme === 'qalam-light' ||
    theme === 'light' ||
    theme === 'joplin-light' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('light'));

  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileUrl, setFileUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('file');
      setSelectedFile(null);
      setFileName('');
      setFileUrl('');
      setError('');
      setIsDragging(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    setError('');
    setSelectedFile(file);
    if (!fileName) {
      setFileName(file.name);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (activeTab === 'file') {
      if (!selectedFile) {
        setError(isId ? 'Silakan pilih berkas dokumen terlebih dahulu' : 'Please select a document file first');
        return;
      }
      onInsertAttachmentFile(selectedFile, fileName.trim() || selectedFile.name);
      onClose();
    } else {
      let trimmedUrl = fileUrl.trim();
      if (!trimmedUrl) {
        setError(isId ? 'URL berkas tidak boleh kosong' : 'File URL cannot be empty');
        return;
      }
      if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmedUrl)) {
        trimmedUrl = 'https://' + trimmedUrl;
      }
      let finalName = fileName.trim();
      if (!finalName) {
        try {
          const parsed = new URL(trimmedUrl);
          const pathname = parsed.pathname.split('/').filter(Boolean).pop();
          finalName = pathname ? decodeURIComponent(pathname) : 'Lampiran Berkas';
        } catch {
          finalName = 'Lampiran Berkas';
        }
      }
      onInsertAttachmentUrl(trimmedUrl, finalName);
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150 ${
        isLight ? 'bg-slate-900/50' : 'bg-black/75'
      }`}
    >
      <div
        className={`border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#1e293b] border-slate-700/80 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
            isLight ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-[#162032] border-slate-700/80 text-slate-100'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            <div
              className={`p-1.5 rounded-lg ${
                isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              <Paperclip className="w-4 h-4" />
            </div>
            <span>{isId ? 'Sisipkan Berkas Lampiran' : 'Insert File Attachment'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isLight
                ? 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                : 'hover:bg-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Dari Folder vs Dari Tautan */}
        <div className={`px-5 pt-4 pb-1 shrink-0 ${isLight ? 'bg-white' : 'bg-[#1e293b]'}`}>
          <div
            className={`grid grid-cols-2 p-1 border rounded-xl gap-1 ${
              isLight ? 'bg-slate-200/90 border-slate-300' : 'bg-slate-800/80 border-slate-700/70'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab('file');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition ${
                activeTab === 'file'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : isLight
                  ? 'text-slate-800 hover:text-slate-950 hover:bg-white/90'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isId ? 'Dari Folder' : 'From Folder'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('url');
                setError('');
                setTimeout(() => urlInputRef.current?.focus(), 50);
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition ${
                activeTab === 'url'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : isLight
                  ? 'text-slate-800 hover:text-slate-950 hover:bg-white/90'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Link className="w-3.5 h-3.5" />
              <span>{isId ? 'Dari Tautan / URL' : 'From Link / URL'}</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {error && (
            <div
              className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                isLight
                  ? 'bg-red-50 border-red-300 text-red-800 font-medium'
                  : 'bg-red-950/50 border-red-800/60 text-red-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'file' ? (
            /* TAB 1: LOCAL FILE UPLOAD */
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              {!selectedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 ${
                    isDragging
                      ? isLight
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 scale-[0.99]'
                        : 'border-emerald-500 bg-emerald-500/10 text-emerald-300 scale-[0.99]'
                      : isLight
                      ? 'border-slate-400 hover:border-emerald-600 bg-slate-50/90 hover:bg-emerald-50/50 text-slate-800'
                      : 'border-slate-700 hover:border-slate-500 bg-slate-800/40 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    <Paperclip className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`font-bold text-xs mb-0.5 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      {isId ? 'Pilih Berkas dari Folder' : 'Select File from Folder'}
                    </p>
                    <p className={`text-[11px] ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                      {isId
                        ? 'Klik untuk memilih dokumen atau seret berkas ke sini'
                        : 'Click to browse or drag & drop document here'}
                    </p>
                  </div>
                  <span
                    className={`inline-block px-2.5 py-1 rounded text-[10px] font-mono font-bold ${
                      isLight ? 'bg-slate-200 border border-slate-300 text-slate-800' : 'bg-slate-700/80 text-slate-300'
                    }`}
                  >
                    PDF, DOCX, XLSX, PPTX, ZIP, TXT, CSV, dll.
                  </span>
                </div>
              ) : (
                <div
                  className={`p-3 border rounded-xl space-y-3 ${
                    isLight ? 'bg-slate-100/80 border-slate-300' : 'bg-slate-800/60 border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border ${
                        isLight
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                        {selectedFile.name}
                      </p>
                      <p className={`text-[11px] font-mono mt-0.5 font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'dokumen'}
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`text-[11px] font-bold mt-1 inline-flex items-center gap-1 ${
                          isLight ? 'text-emerald-700 hover:text-emerald-800 hover:underline' : 'text-emerald-400 hover:text-emerald-300'
                        }`}
                      >
                        <span>{isId ? 'Ganti berkas...' : 'Change file...'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: EXTERNAL FILE URL / CLOUD LINK */
            <div className="space-y-3">
              <div>
                <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>
                  {isId ? 'Alamat URL / Tautan Berkas' : 'File URL / Cloud Link'}
                </label>
                <input
                  ref={urlInputRef}
                  type="url"
                  value={fileUrl}
                  onChange={(e) => {
                    setFileUrl(e.target.value);
                    setError('');
                  }}
                  placeholder="https://drive.google.com/... atau https://example.com/file.pdf"
                  className={`w-full px-3 py-2 border rounded-lg text-xs font-mono font-medium transition outline-hidden ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-500 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                      : 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Custom Name / Label Input */}
          <div className={`pt-2 border-t ${isLight ? 'border-slate-300' : 'border-slate-700/50'}`}>
            <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>
              {isId ? 'Nama Berkas / Label Tampilan Tautan' : 'File Name / Display Label'}
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder={isId ? 'misal: Laporan_Analisis_Q3.pdf' : 'e.g. Q3_Analysis_Report.pdf'}
              className={`w-full px-3 py-2 border rounded-lg text-xs font-medium transition outline-hidden ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-500 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                  : 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-emerald-500'
              }`}
            />
          </div>

          {/* Footer Actions */}
          <div
            className={`pt-3 border-t flex items-center justify-end gap-2 shrink-0 ${
              isLight ? 'border-slate-300 bg-slate-100/90 -mx-5 -mb-5 p-4 rounded-b-2xl' : 'border-slate-700/80'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`px-3.5 py-1.5 rounded-lg border transition text-xs font-bold ${
                isLight
                  ? 'border-slate-300 bg-white hover:bg-slate-200 text-slate-800'
                  : 'border-slate-600 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {isId ? 'Batal' : 'Cancel'}
            </button>

            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{isId ? 'Sisipkan Berkas' : 'Insert Attachment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
