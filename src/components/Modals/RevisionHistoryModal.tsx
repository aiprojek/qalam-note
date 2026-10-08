import React, { useState, useEffect } from 'react';
import { X, History, RotateCcw, Clock, Trash2, BookmarkPlus, Check, AlertCircle } from 'lucide-react';
import type { Note, NoteRevision, AppLanguage } from '../../types';
import { getNoteRevisions, saveNoteRevision, deleteNoteRevision } from '../../db';

interface RevisionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note;
  onRestoreRevision: (body: string, title?: string) => void;
  language?: AppLanguage;
}

export const RevisionHistoryModal: React.FC<RevisionHistoryModalProps> = ({
  isOpen,
  onClose,
  note,
  onRestoreRevision,
  language = 'id',
}) => {
  const isId = language === 'id';
  const [revisions, setRevisions] = useState<NoteRevision[]>([]);
  const [selectedRevId, setSelectedRevId] = useState<string | null>(null);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadRevisions = async () => {
    if (!note?.id) return;
    const list = await getNoteRevisions(note.id);
    setRevisions(list);
    if (list.length > 0 && !selectedRevId) {
      setSelectedRevId(list[0].id);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRevisions();
    }
  }, [isOpen, note?.id]);

  const handleManualSnapshot = async () => {
    setIsSavingManual(true);
    const rev = await saveNoteRevision(note.id, note.title, note.body);
    if (rev) {
      setStatusMsg(isId ? 'Snapshot riwayat tersimpan!' : 'Snapshot saved!');
    } else {
      setStatusMsg(isId ? 'Tidak ada perubahan baru untuk disimpan.' : 'No new changes to save.');
    }
    await loadRevisions();
    setIsSavingManual(false);
    setTimeout(() => setStatusMsg(null), 2500);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNoteRevision(id);
    await loadRevisions();
    if (selectedRevId === id) {
      setSelectedRevId(null);
    }
  };

  const selectedRev = revisions.find((r) => r.id === selectedRevId);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs select-none animate-in fade-in duration-150"
    >
      <div className="w-full h-full sm:h-[88vh] sm:max-w-4xl sm:rounded-2xl rounded-none bg-[#1e2739] border-0 sm:border border-slate-700 shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-700/80 bg-[#161d2b] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <History className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {isId ? 'Riwayat Versi (Time Machine)' : 'Note Revision History'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                {note.title || (isId ? 'Catatan Tanpa Judul' : 'Untitled Note')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSnapshot}
              disabled={isSavingManual}
              className="px-3 py-1.5 min-h-[38px] rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-xs font-medium transition active:scale-95 flex items-center gap-1.5"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isId ? 'Simpan Snapshot' : 'Save Snapshot'}</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="bg-blue-950/60 border-b border-blue-800/50 px-4 py-2 text-xs text-blue-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Body Layout: Left Revision List + Right Revision Preview */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          {/* Revisions List */}
          <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto md:w-72 shrink-0 bg-[#17202e] border-b md:border-b-0 md:border-r border-slate-800 p-2 gap-1.5 custom-scrollbar">
            {revisions.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                {isId
                  ? 'Belum ada riwayat tersimpan. Riwayat dibuat secara otomatis saat Anda menulis atau saat menekan "Simpan Snapshot".'
                  : 'No revision history yet. Revisions are created automatically as you write or when you tap "Save Snapshot".'}
              </div>
            ) : (
              revisions.map((rev, index) => {
                const isSelected = rev.id === selectedRevId;
                const date = new Date(rev.created_time);
                return (
                  <div
                    key={rev.id}
                    onClick={() => setSelectedRevId(rev.id)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition shrink-0 whitespace-nowrap md:whitespace-normal ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-300 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} {date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                        {rev.word_count || 0} {isId ? 'kata' : 'words'} {index === 0 ? `• (${isId ? 'Terbaru' : 'Latest'})` : ''}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(rev.id, e)}
                      title="Hapus snapshot ini"
                      className={`p-1.5 rounded hover:bg-red-600/30 transition ${
                        isSelected ? 'text-blue-100 hover:text-white' : 'text-slate-500 hover:text-red-400'
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Revision Preview Area */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col justify-between bg-[#1b2434] custom-scrollbar">
            {selectedRev ? (
              <>
                <div className="min-h-0 flex-1">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {selectedRev.title || (isId ? 'Catatan Tanpa Judul' : 'Untitled')}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isId ? 'Disimpan pada:' : 'Saved on:'} {new Date(selectedRev.created_time).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto custom-scrollbar select-text">
                    {selectedRev.body}
                  </div>
                </div>

                {/* Restore Button */}
                <div className="pt-4 border-t border-slate-700/80 flex items-center justify-end gap-2.5 mt-4">
                  <button
                    onClick={() => {
                      onRestoreRevision(selectedRev.body, selectedRev.title);
                      onClose();
                    }}
                    className="px-4 py-2 min-h-[42px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition active:scale-95 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{isId ? 'Pulihkan Catatan ke Versi Ini' : 'Restore Note to This Version'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs p-8 text-center">
                <Clock className="w-8 h-8 text-slate-600 mb-2" />
                <span>{isId ? 'Pilih versi riwayat di sebelah kiri untuk melihat pratinjau' : 'Select a revision on the left to preview'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
