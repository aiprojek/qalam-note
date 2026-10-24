import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  ScanText,
  Upload,
  Copy,
  Check,
  FileText,
  RotateCw,
  Sparkles,
  Camera,
  Languages,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import type { AppLanguage } from '../../types';
import { extractTextFromImage, type OCRLanguage, type OCRProgress } from '../../services/ocr';

interface OCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertText: (text: string) => void;
  language?: AppLanguage;
  theme?: string;
}

export const OCRModal: React.FC<OCRModalProps> = ({
  isOpen,
  onClose,
  onInsertText,
  language = 'id',
  theme = 'qalam-dark',
}) => {
  const isLight = theme === 'qalam-light';
  const isId = language === 'id';

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [ocrLang, setOcrLang] = useState<OCRLanguage>('ind+eng');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OCRProgress>({ status: '', progress: 0 });
  const [extractedText, setExtractedText] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setErrorMessage('');
    }
  }, [isOpen]);

  // Support paste from clipboard
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileSelected(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelected = (file: File) => {
    setImageFile(file);
    setErrorMessage('');
    setExtractedText('');
    setConfidence(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview((e.target?.result as string) || '');
    };
    reader.readAsDataURL(file);
  };

  const handleStartOCR = async () => {
    if (!imagePreview && !imageFile) return;

    setIsProcessing(true);
    setErrorMessage('');
    setProgress({ status: isId ? 'Memuat mesin OCR peramban...' : 'Loading OCR engine...', progress: 0 });

    try {
      const source = imageFile || imagePreview;
      const res = await extractTextFromImage(source, ocrLang, (p) => {
        setProgress(p);
      });

      setExtractedText(res.text);
      setConfidence(Math.round(res.confidence));
    } catch (err: any) {
      setErrorMessage(err?.message || (isId ? 'Gagal mengekstrak teks.' : 'Failed to extract text.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    if (!extractedText) return;
    onInsertText(extractedText);
    onClose();
  };

  const handleResetImage = () => {
    setImageFile(null);
    setImagePreview('');
    setExtractedText('');
    setConfidence(null);
    setProgress({ status: '', progress: 0 });
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <ScanText className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold">
                  {isId ? 'Pindai Teks Gambar Lokal (Client-Side OCR)' : 'Local Image OCR Text Extractor'}
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>100% Private</span>
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isId
                  ? 'Ekstrak teks dari foto buku, dokumen, atau papan tulis langsung di peramban tanpa server'
                  : 'Extract text from photos, documents, and book pages locally inside your browser'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Controls Bar: Language Selector & Mode */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-medium text-slate-400">{isId ? 'Bahasa Teks:' : 'Text Language:'}</span>
              <select
                value={ocrLang}
                onChange={(e) => setOcrLang(e.target.value as OCRLanguage)}
                disabled={isProcessing}
                className={`py-1 px-2.5 rounded-lg border text-xs font-semibold outline-none cursor-pointer ${
                  isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                <option value="ind+eng">🇮🇩 & 🇬🇧 Indonesia & English</option>
                <option value="ind">🇮🇩 Bahasa Indonesia</option>
                <option value="eng">🇬🇧 English</option>
                <option value="ara">🇸🇦 العربية (Arabic)</option>
              </select>
            </div>

            <div className="text-[11px] text-slate-400">
              {isId ? 'Tips: Anda juga bisa menempel gambar langsung (Ctrl+V)' : 'Tip: You can also paste an image directly (Ctrl+V)'}
            </div>
          </div>

          {/* Upload Drop Zone / Image Preview */}
          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileSelected(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                isLight
                  ? 'border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/20'
                  : 'border-slate-700 hover:border-blue-500 bg-slate-800/20 hover:bg-blue-950/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelected(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-sm">
                {isId ? 'Pilih Gambar Dokumen atau Foto' : 'Select Document Image or Photo'}
              </h3>
              <p className={`text-xs mt-1 max-w-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isId
                  ? 'Klik untuk memilih berkas, seret gambar ke sini, atau tempel dari clipboard (Ctrl+V)'
                  : 'Click to select file, drag and drop, or paste directly from clipboard (Ctrl+V)'}
              </p>
              <div className="flex items-center gap-2 mt-4 text-[10px] text-slate-400 font-mono">
                <span>PNG</span>
                <span>•</span>
                <span>JPG</span>
                <span>•</span>
                <span>WEBP</span>
              </div>
            </div>
          ) : (
            /* Selected Image Preview */
            <div className="space-y-3">
              <div className="relative rounded-xl border border-slate-700/60 overflow-hidden bg-black/40 flex items-center justify-center max-h-56">
                <img
                  src={imagePreview}
                  alt="OCR Target Preview"
                  className="max-h-56 max-w-full object-contain"
                />
                {!isProcessing && (
                  <button
                    type="button"
                    onClick={handleResetImage}
                    title={isId ? 'Ganti Gambar' : 'Change Image'}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white text-xs transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {!isProcessing && !extractedText && (
                <button
                  type="button"
                  onClick={handleStartOCR}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition active:scale-98"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isId ? 'Mulai Ekstrak Teks Sekarang' : 'Start Text Extraction'}</span>
                </button>
              )}
            </div>
          )}

          {/* Processing Progress Bar */}
          {isProcessing && (
            <div className={`p-4 rounded-xl border space-y-2 animate-in fade-in duration-150 ${
              isLight ? 'bg-blue-50/60 border-blue-200' : 'bg-blue-950/30 border-blue-900/60'
            }`}>
              <div className="flex items-center justify-between text-xs font-semibold text-blue-400">
                <div className="flex items-center gap-2">
                  <RotateCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>
                    {isId ? 'Mengekstrak teks di peramban...' : 'Processing OCR locally...'}
                  </span>
                </div>
                <span className="font-mono text-[11px]">
                  {Math.round((progress.progress || 0) * 100)}%
                </span>
              </div>

              {/* Progress bar line */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, Math.round((progress.progress || 0) * 100))}%` }}
                />
              </div>

              <p className="text-[10px] text-slate-400 font-mono truncate">
                {progress.status}
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Extracted Text Result Box */}
          {extractedText && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
                    <Check className="w-4 h-4" />
                    <span>{isId ? 'Hasil Ekstraksi Teks:' : 'Extracted Text:'}</span>
                  </span>
                  {confidence !== null && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {isId ? `Akurasi ~${confidence}%` : `Confidence ~${confidence}%`}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition active:scale-95 ${
                      copied
                        ? 'bg-emerald-600 text-white border-transparent'
                        : isLight
                        ? 'border-slate-300 hover:bg-slate-100 text-slate-700'
                        : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? (isId ? 'Tersalin!' : 'Copied!') : (isId ? 'Salin' : 'Copy')}</span>
                  </button>
                </div>
              </div>

              <textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                rows={6}
                className={`w-full p-3 rounded-xl border text-xs leading-relaxed font-mono outline-none resize-y ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-800 focus:border-blue-500'
                    : 'bg-slate-950/60 border-slate-700 text-slate-200 focus:border-blue-500'
                }`}
                placeholder={isId ? 'Teks hasil ekstraksi...' : 'Extracted text...'}
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleResetImage}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition ${
                    isLight ? 'border-slate-300 hover:bg-slate-100 text-slate-600' : 'border-slate-700 hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  {isId ? 'Pindai Gambar Lain' : 'Scan Another Image'}
                </button>

                <button
                  type="button"
                  onClick={handleInsert}
                  className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition active:scale-95"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{isId ? 'Sisipkan ke Catatan Aktif' : 'Insert into Active Note'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
