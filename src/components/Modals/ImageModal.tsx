import React, { useState, useEffect, useRef } from 'react';
import { X, Image as ImageIcon, Upload, Link, AlertCircle, Check, Eye } from 'lucide-react';
import type { AppLanguage } from '../../types';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertImageFile: (file: File, altText?: string) => void;
  onInsertImageUrl: (url: string, altText?: string) => void;
  language?: AppLanguage;
  theme?: string;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  onInsertImageFile,
  onInsertImageUrl,
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
  const [filePreviewUrl, setFilePreviewUrl] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [altText, setAltText] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('file');
      setSelectedFile(null);
      setFilePreviewUrl('');
      setImageUrl('');
      setAltText('');
      setError('');
      setIsDragging(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectedFile) {
      setFilePreviewUrl('');
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setFilePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(
        isId
          ? 'Berkas harus berupa gambar (PNG, JPG, GIF, WebP, SVG)'
          : 'File must be an image (PNG, JPG, GIF, WebP, SVG)'
      );
      return;
    }
    setError('');
    setSelectedFile(file);
    if (!altText) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setAltText(cleanName);
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
        setError(isId ? 'Silakan pilih berkas gambar terlebih dahulu' : 'Please select an image file first');
        return;
      }
      onInsertImageFile(selectedFile, altText.trim());
      onClose();
    } else {
      let trimmedUrl = imageUrl.trim();
      if (!trimmedUrl) {
        setError(isId ? 'URL gambar tidak boleh kosong' : 'Image URL cannot be empty');
        return;
      }
      if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmedUrl)) {
        trimmedUrl = 'https://' + trimmedUrl;
      }
      onInsertImageUrl(trimmedUrl, altText.trim());
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
            <div className={`p-1.5 rounded-lg ${isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/10 text-blue-400'}`}>
              <ImageIcon className="w-4 h-4" />
            </div>
            <span>{isId ? 'Sisipkan Gambar' : 'Insert Image'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isLight ? 'hover:bg-slate-200 text-slate-600 hover:text-slate-900' : 'hover:bg-slate-700 text-slate-400 hover:text-white'
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
                  ? 'bg-blue-600 text-white shadow-xs'
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
                  ? 'bg-blue-600 text-white shadow-xs'
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
                accept="image/*"
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
                        ? 'border-blue-600 bg-blue-50 text-blue-900 scale-[0.99]'
                        : 'border-blue-500 bg-blue-500/10 text-blue-300 scale-[0.99]'
                      : isLight
                      ? 'border-slate-400 hover:border-blue-600 bg-slate-50/90 hover:bg-blue-50/50 text-slate-800'
                      : 'border-slate-700 hover:border-slate-500 bg-slate-800/40 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isLight ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-blue-500/10 text-blue-400'
                    }`}
                  >
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`font-bold text-xs mb-0.5 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      {isId ? 'Pilih Gambar dari Folder' : 'Select Image from Folder'}
                    </p>
                    <p className={`text-[11px] ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                      {isId
                        ? 'Klik untuk membuka berkas atau seret gambar ke sini'
                        : 'Click to browse or drag & drop image here'}
                    </p>
                  </div>
                  <span
                    className={`inline-block px-2.5 py-1 rounded text-[10px] font-mono font-bold ${
                      isLight ? 'bg-slate-200 border border-slate-300 text-slate-800' : 'bg-slate-700/80 text-slate-300'
                    }`}
                  >
                    PNG, JPG, WebP, GIF, SVG
                  </span>
                </div>
              ) : (
                <div
                  className={`p-3 border rounded-xl space-y-3 ${
                    isLight ? 'bg-slate-100/80 border-slate-300' : 'bg-slate-800/60 border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {filePreviewUrl ? (
                      <div
                        className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border flex items-center justify-center ${
                          isLight ? 'bg-white border-slate-300' : 'bg-black/40 border-slate-700'
                        }`}
                      >
                        <img src={filePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div
                        className={`w-16 h-16 rounded-lg flex items-center justify-center shrink-0 ${
                          isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                        {selectedFile.name}
                      </p>
                      <p className={`text-[11px] font-mono mt-0.5 font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'image'}
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`text-[11px] font-bold mt-1 inline-flex items-center gap-1 ${
                          isLight ? 'text-blue-700 hover:text-blue-800 hover:underline' : 'text-blue-400 hover:text-blue-300'
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
            /* TAB 2: IMAGE URL / WEB LINK */
            <div className="space-y-3">
              <div>
                <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>
                  {isId ? 'Alamat URL Gambar Web' : 'Web Image URL'}
                </label>
                <div className="relative">
                  <input
                    ref={urlInputRef}
                    type="url"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setError('');
                    }}
                    placeholder="https://example.com/photo.jpg"
                    className={`w-full px-3 py-2 border rounded-lg text-xs font-mono font-medium transition outline-hidden ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-500 focus:border-blue-600 focus:ring-1 focus:ring-blue-500'
                        : 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>

              {/* URL Image Live Preview */}
              {imageUrl.trim() && (
                <div
                  className={`p-3 border rounded-xl space-y-2 ${
                    isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-800/40 border-slate-700/60'
                  }`}
                >
                  <div className={`flex items-center gap-1.5 text-[11px] font-bold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                    <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{isId ? 'Pratinjau Gambar:' : 'Image Preview:'}</span>
                  </div>
                  <div
                    className={`w-full h-32 rounded-lg border flex items-center justify-center overflow-hidden ${
                      isLight ? 'bg-white border-slate-300' : 'bg-black/30 border-slate-700/60'
                    }`}
                  >
                    <img
                      src={imageUrl.trim()}
                      alt="Pratinjau"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                      onLoad={(e) => {
                        (e.target as HTMLElement).style.display = 'block';
                      }}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Alt / Caption Text Input */}
          <div className={`pt-2 border-t ${isLight ? 'border-slate-300' : 'border-slate-700/50'}`}>
            <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>
              {isId ? 'Teks Keterangan / Alternatif (Opsional)' : 'Caption / Alt Text (Optional)'}
            </label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder={isId ? 'misal: Diagram Arsitektur Sistem' : 'e.g. System Architecture Diagram'}
              className={`w-full px-3 py-2 border rounded-lg text-xs font-medium transition outline-hidden ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-500 focus:border-blue-600 focus:ring-1 focus:ring-blue-500'
                  : 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500'
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
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{isId ? 'Sisipkan Gambar' : 'Insert Image'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
