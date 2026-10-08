import React, { useState, useMemo } from 'react';
import { Folder, X, AlertCircle } from 'lucide-react';
import type { Folder as FolderType, AppLanguage } from '../../types';

interface NewFolderModalProps {
  parentId?: string;
  existingFolder?: FolderType;
  folders: FolderType[];
  onSave: (title: string, parentId: string) => Promise<void> | void;
  onClose: () => void;
  language?: AppLanguage;
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({
  parentId = '',
  existingFolder,
  folders,
  onSave,
  onClose,
  language = 'id',
}) => {
  const [title, setTitle] = useState(existingFolder ? existingFolder.title : '');
  const [selectedParentId, setSelectedParentId] = useState<string>(
    existingFolder ? (existingFolder.parent_id || '') : (parentId || '')
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isId = language === 'id';

  // Compute invalid parent IDs (the existing folder and any descendant) to prevent circular nesting
  const invalidParentIds = useMemo(() => {
    if (!existingFolder) return new Set<string>();
    const invalid = new Set<string>([existingFolder.id]);

    const addDescendants = (pId: string) => {
      folders.forEach((f) => {
        if (f.parent_id === pId && !invalid.has(f.id)) {
          invalid.add(f.id);
          addDescendants(f.id);
        }
      });
    };

    addDescendants(existingFolder.id);
    return invalid;
  }, [existingFolder, folders]);

  // Build hierarchical options with indentation
  const hierarchicalFolders = useMemo(() => {
    const result: { id: string; title: string; depth: number }[] = [];
    const visited = new Set<string>();

    const traverse = (pId: string, depth: number) => {
      const children = folders.filter((f) => (f.parent_id || '') === pId);
      children.forEach((c) => {
        if (!invalidParentIds.has(c.id) && !visited.has(c.id)) {
          visited.add(c.id);
          result.push({ id: c.id, title: c.title, depth });
          traverse(c.id, depth + 1);
        }
      });
    };

    traverse('', 0);

    // Also include any folders not visited (e.g. if parent_id pointed elsewhere)
    folders.forEach((f) => {
      if (!visited.has(f.id) && !invalidParentIds.has(f.id)) {
        result.push({ id: f.id, title: f.title, depth: 0 });
      }
    });

    return result;
  }, [folders, invalidParentIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || isSaving) return;

    try {
      setIsSaving(true);
      setErrorMessage('');
      await onSave(cleanTitle, selectedParentId || '');
      onClose();
    } catch (err: any) {
      console.error('Error saving notebook:', err);
      setErrorMessage(
        err?.message || (isId ? 'Gagal menyimpan buku catatan ke database' : 'Failed to save notebook to database')
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-sm rounded-xl bg-[#202b3e] border border-slate-700 shadow-2xl text-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/80 bg-[#1a2333]">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-semibold">
              {existingFolder
                ? isId
                  ? 'Ganti Nama Buku Catatan'
                  : 'Rename Notebook'
                : isId
                ? 'Buat Buku Catatan Baru'
                : 'New Notebook'}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {errorMessage && (
            <div className="p-2.5 rounded bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              {isId ? 'Nama Buku Catatan:' : 'Notebook Title:'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isId ? 'Contoh: Pekerjaan, Proyek, Jurnal' : 'e.g. Work, Journal, Projects'}
              autoFocus
              disabled={isSaving}
              className="w-full bg-slate-900 text-xs text-slate-200 px-3 py-2 rounded border border-slate-700 focus:border-blue-500 focus:outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              {isId ? 'Buku Catatan Induk (Opsional):' : 'Parent Notebook (Optional):'}
            </label>
            <select
              value={selectedParentId}
              onChange={(e) => setSelectedParentId(e.target.value)}
              disabled={isSaving}
              className="w-full bg-slate-900 text-xs text-slate-200 px-3 py-2 rounded border border-slate-700 outline-none focus:border-blue-500 disabled:opacity-60"
            >
              <option value="">
                {isId ? '(Tidak ada - Tingkat Utama / Root)' : '(None - Root level)'}
              </option>
              {hierarchicalFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.depth > 0 ? `${'\u00A0'.repeat(f.depth * 3)}↳ ` : ''}
                  {f.title}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              {isId
                ? 'Pilih buku catatan induk untuk mengelompokkan sebagai sub-folder.'
                : 'Select a parent notebook to organize as a nested sub-notebook.'}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition disabled:opacity-50"
            >
              {isId ? 'Batal' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSaving}
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{isId ? 'Menyimpan...' : 'Saving...'}</span>
                </>
              ) : (
                <span>{isId ? 'Simpan' : 'Save'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
