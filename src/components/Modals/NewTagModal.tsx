import React, { useState } from 'react';
import { Tag as TagIcon, X } from 'lucide-react';
import type { AppLanguage } from '../../types';

interface NewTagModalProps {
  isOpen: boolean;
  onSave: (title: string) => void;
  onClose: () => void;
  language?: AppLanguage;
  existingTags: string[];
}

export const NewTagModal: React.FC<NewTagModalProps> = ({
  isOpen,
  onSave,
  onClose,
  language = 'id',
  existingTags,
}) => {
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isId = language === 'id';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tagInput.trim().toLowerCase().replace(/[^\w-]/g, '');
    if (!clean) {
      setError(isId ? 'Nama tag tidak boleh kosong' : 'Tag name cannot be empty');
      return;
    }
    if (existingTags.includes(clean)) {
      setError(isId ? 'Tag ini sudah ada' : 'Tag already exists');
      return;
    }
    onSave(clean);
    setTagInput('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-sm rounded-xl bg-[#202b3e] border border-slate-700 shadow-2xl text-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/80 bg-[#1a2333]">
          <div className="flex items-center gap-2">
            <TagIcon className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-semibold">
              {isId ? 'Buat Tag Baru' : 'New Tag'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {error && (
            <div className="p-2 rounded bg-red-950/60 border border-red-500/50 text-red-300 text-[11px]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              {isId ? 'Nama Tag:' : 'Tag Name:'}
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                if (error) setError('');
              }}
              placeholder={isId ? 'Contoh: penting, proyek, referensi' : 'e.g. important, project, reference'}
              autoFocus
              className="w-full bg-slate-900 text-xs text-slate-200 px-3 py-2 rounded border border-slate-700 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              {isId
                ? 'Hanya huruf, angka, dan tanda hubung (-).'
                : 'Letters, numbers, and hyphens (-) only.'}
            </p>
          </div>

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
              disabled={!tagInput.trim()}
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition disabled:opacity-50"
            >
              {isId ? 'Simpan' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
