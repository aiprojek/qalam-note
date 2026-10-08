import React from 'react';
import { Info, X, Copy, Check } from 'lucide-react';
import type { Note, Folder, DateFormatOption, TimeFormatOption, AppLanguage } from '../../types';
import { formatDateTime } from '../../utils/i18n';
import { BacklinksPanel } from '../BacklinksPanel';

interface NoteInfoModalProps {
  note: Note;
  folder?: Folder;
  allNotes?: Note[];
  onSelectNote?: (noteId: string) => void;
  onClose: () => void;
  dateFormat?: DateFormatOption;
  timeFormat?: TimeFormatOption;
  language?: AppLanguage;
}

export const NoteInfoModal: React.FC<NoteInfoModalProps> = ({
  note,
  folder,
  allNotes = [],
  onSelectNote,
  onClose,
  dateFormat = 'DD/MM/YYYY',
  timeFormat = '24h',
  language = 'id',
}) => {
  const [copiedId, setCopiedId] = React.useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(note.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const wordCount = note.body.trim() ? note.body.trim().split(/\s+/).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-md rounded-xl bg-[#202b3e] border border-slate-700 shadow-2xl text-slate-100 overflow-hidden text-xs">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/80 bg-[#1a2333]">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-white">
              {language === 'id' ? 'Properti Catatan' : 'Note Properties'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-800">
            <span className="text-slate-400">{language === 'id' ? 'Judul:' : 'Title:'}</span>
            <span className="col-span-2 font-medium text-slate-100 truncate">{note.title}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-800">
            <span className="text-slate-400">ID:</span>
            <div className="col-span-2 flex items-center justify-between font-mono text-[11px] text-slate-300">
              <span className="truncate">{note.id}</span>
              <button
                onClick={handleCopyId}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 ml-1"
                title="Copy ID"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-800">
            <span className="text-slate-400">{language === 'id' ? 'Buku Catatan:' : 'Notebook:'}</span>
            <span className="col-span-2 text-slate-200">{folder?.title || 'Unknown'}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-800">
            <span className="text-slate-400">{language === 'id' ? 'Dibuat:' : 'Created:'}</span>
            <span className="col-span-2 text-slate-300">
              {formatDateTime(note.created_time, dateFormat, timeFormat, language)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-800">
            <span className="text-slate-400">{language === 'id' ? 'Diperbarui:' : 'Updated:'}</span>
            <span className="col-span-2 text-slate-300">
              {formatDateTime(note.updated_time, dateFormat, timeFormat, language)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-800">
            <span className="text-slate-400">{language === 'id' ? 'Kata / Karakter:' : 'Words / Chars:'}</span>
            <span className="col-span-2 text-slate-300">
              {wordCount} {language === 'id' ? 'kata' : 'words'} / {note.body.length} {language === 'id' ? 'karakter' : 'characters'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-800">
            <span className="text-slate-400">{language === 'id' ? 'Enkripsi:' : 'Encryption:'}</span>
            <span className="col-span-2">
              {note.is_encrypted ? (
                <span className="text-emerald-400 font-semibold">{language === 'id' ? 'Dilindungi E2EE' : 'Protected with E2EE'}</span>
              ) : (
                <span className="text-slate-400">{language === 'id' ? 'Tidak dienkripsi' : 'Not encrypted'}</span>
              )}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-1">
            <span className="text-slate-400">{language === 'id' ? 'Publikasi Web:' : 'Web Published:'}</span>
            <span className="col-span-2">
              {note.published_info?.is_published ? (
                <span className="text-blue-400 font-semibold">{language === 'id' ? 'Aktif di Web (GAS)' : 'Active on Web (GAS)'}</span>
              ) : (
                <span className="text-slate-400">{language === 'id' ? 'Pribadi / Belum dipublikasikan' : 'Private / Not published'}</span>
              )}
            </span>
          </div>

          {/* Backlinks & Linked Mentions */}
          <div className="pt-2 border-t border-slate-800">
            <BacklinksPanel
              note={note}
              allNotes={allNotes}
              onSelectNote={(targetId) => {
                onSelectNote?.(targetId);
                onClose();
              }}
              language={language}
            />
          </div>
        </div>

        <div className="flex items-center justify-end px-4 py-2.5 border-t border-slate-700/80 bg-[#1a2333]">
          <button
            onClick={onClose}
            className="px-4 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
