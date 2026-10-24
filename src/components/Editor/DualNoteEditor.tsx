import React, { useState, useMemo } from 'react';
import {
  Columns2,
  X,
  ArrowLeftRight,
  Plus,
  BookOpen,
  Search,
  Folder as FolderIcon,
  ChevronDown,
} from 'lucide-react';
import type { Note, Folder, AppLanguage } from '../../types';
import { NoteEditor } from './NoteEditor';

interface DualNoteEditorProps {
  primaryNote: Note;
  secondaryNote: Note | null;
  allNotes: Note[];
  folders: Folder[];
  availableTags: string[];
  settingsEditorMode: 'wysiwyg' | 'markdown';
  markdownViewMode: 'raw' | 'split';
  isVaultUnlocked: boolean;
  onUpdatePrimaryNote: (updated: Partial<Note>) => void;
  onUpdateSecondaryNote: (updated: Partial<Note>) => void;
  onSelectSecondaryNote: (noteId: string) => void;
  onCreateSecondaryNote: () => void;
  onSwapNotes: () => void;
  onCloseDualView: () => void;
  onMarkdownViewModeChange: (view: 'raw' | 'split') => void;
  onOpenPublish: () => void;
  onOpenInfo: () => void;
  onToggleEncrypt: () => void;
  onRequestUnlock: () => void;
  onOpenWikiLink?: (targetTitle: string) => void;
  onOpenTemplates?: () => void;
  onOpenGraphView?: () => void;
  onOpenRevisionHistory?: () => void;
  onOpenVoiceRecorder?: () => void;
  onOpenDrawingCanvas?: () => void;
  onExportPdf?: () => void;
  onExportMarkdown?: () => void;
  onOpenExportModal?: (note: Note) => void;
  onOpenOCR?: () => void;
  onOpenSRS?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'info') => void;
  language?: AppLanguage;
  theme?: string;
}

export const DualNoteEditor: React.FC<DualNoteEditorProps> = ({
  primaryNote,
  secondaryNote,
  allNotes,
  folders,
  availableTags,
  settingsEditorMode,
  markdownViewMode,
  isVaultUnlocked,
  onUpdatePrimaryNote,
  onUpdateSecondaryNote,
  onSelectSecondaryNote,
  onCreateSecondaryNote,
  onSwapNotes,
  onCloseDualView,
  onMarkdownViewModeChange,
  onOpenPublish,
  onOpenInfo,
  onToggleEncrypt,
  onRequestUnlock,
  onOpenWikiLink,
  onOpenTemplates,
  onOpenGraphView,
  onOpenRevisionHistory,
  onOpenVoiceRecorder,
  onOpenDrawingCanvas,
  onExportPdf,
  onExportMarkdown,
  onOpenExportModal,
  onOpenOCR,
  onOpenSRS,
  onShowToast,
  language = 'id',
  theme = 'qalam-dark',
}) => {
  const isLight = theme === 'qalam-light';
  const isId = language === 'id';

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  // Available notes for right pane (excluding current primary note)
  const selectableNotes = useMemo(() => {
    return allNotes
      .filter((n) => !n.is_deleted && n.id !== primaryNote.id)
      .filter((n) => {
        if (!pickerSearch.trim()) return true;
        const q = pickerSearch.toLowerCase();
        return (
          (n.title || '').toLowerCase().includes(q) ||
          (n.body || '').toLowerCase().includes(q)
        );
      });
  }, [allNotes, primaryNote.id, pickerSearch]);

  const secondaryFolder = useMemo(() => {
    if (!secondaryNote) return null;
    return folders.find((f) => f.id === secondaryNote.folder_id);
  }, [folders, secondaryNote]);

  return (
    <div className="flex h-full w-full overflow-hidden select-text">
      {/* Left Pane: Primary Note */}
      <div className="flex-1 h-full min-w-0 flex flex-col border-r border-slate-700/80">
        <div className="h-7 px-3 bg-[#171f2d] border-b border-slate-700/80 flex items-center justify-between text-[11px] font-medium text-slate-400 select-none shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <span className="text-slate-300 font-semibold">{isId ? 'Catatan Kiri (Utama)' : 'Left Note (Primary)'}</span>
            <span className="text-slate-500">·</span>
            <span className="truncate text-slate-400">{primaryNote.title || (isId ? 'Tanpa Judul' : 'Untitled')}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onSwapNotes}
              title={isId ? 'Tukar Posisi Catatan Kiri & Kanan' : 'Swap Left & Right Notes'}
              className="p-1 rounded hover:bg-slate-700/60 hover:text-white transition flex items-center gap-1 text-[10px]"
            >
              <ArrowLeftRight className="w-3 h-3 text-blue-400" />
              <span>{isId ? 'Tukar' : 'Swap'}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 h-full min-w-0 overflow-hidden">
          <NoteEditor
            note={primaryNote}
            folders={folders}
            availableTags={availableTags}
            allNotes={allNotes}
            settingsEditorMode={settingsEditorMode}
            markdownViewMode={markdownViewMode}
            isVaultUnlocked={isVaultUnlocked}
            onUpdateNote={onUpdatePrimaryNote}
            onMarkdownViewModeChange={onMarkdownViewModeChange}
            onOpenPublish={onOpenPublish}
            onOpenInfo={onOpenInfo}
            onToggleEncrypt={onToggleEncrypt}
            onRequestUnlock={onRequestUnlock}
            onOpenWikiLink={onOpenWikiLink}
            onOpenTemplates={onOpenTemplates}
            onOpenGraphView={onOpenGraphView}
            onOpenRevisionHistory={onOpenRevisionHistory}
            onOpenVoiceRecorder={onOpenVoiceRecorder}
            onOpenDrawingCanvas={onOpenDrawingCanvas}
            onExportPdf={onExportPdf}
            onExportMarkdown={onExportMarkdown}
            onOpenExportModal={() => onOpenExportModal && onOpenExportModal(primaryNote)}
            onOpenOCR={onOpenOCR}
            onOpenSRS={onOpenSRS}
            onToggleSplitScreen={onCloseDualView}
            isSplitScreen={true}
            onShowToast={onShowToast}
            language={language}
            theme={theme}
          />
        </div>
      </div>

      {/* Right Pane: Secondary Note */}
      <div className="flex-1 h-full min-w-0 flex flex-col bg-[#1b2434]">
        {/* Right Pane Header: Switcher & Actions */}
        <div className="h-7 px-3 bg-[#171f2d] border-b border-slate-700/80 flex items-center justify-between text-[11px] font-medium text-slate-400 select-none shrink-0 relative">
          {/* Note Switcher Dropdown Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPickerOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-slate-800 text-slate-200 transition text-[11px]"
              title={isId ? 'Pilih Catatan untuk Sisi Kanan' : 'Choose Note for Right Pane'}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
              <span className="text-purple-300 font-semibold">{isId ? 'Catatan Kanan:' : 'Right Note:'}</span>
              <span className="font-medium text-white max-w-[150px] truncate">
                {secondaryNote ? secondaryNote.title || (isId ? 'Tanpa Judul' : 'Untitled') : (isId ? 'Pilih Catatan...' : 'Select Note...')}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {/* Note Picker Dropdown Menu */}
            {isPickerOpen && (
              <div
                className={`absolute left-0 top-8 w-72 rounded-xl border shadow-2xl z-50 overflow-hidden flex flex-col max-h-80 animate-in fade-in duration-150 ${
                  isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}
              >
                {/* Search Bar inside Picker */}
                <div className="p-2 border-b border-slate-700/60 bg-slate-800/40">
                  <div className="relative flex items-center">
                    <Search className="w-3 h-3 absolute left-2 text-slate-400" />
                    <input
                      type="text"
                      autoFocus
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder={isId ? 'Cari catatan referensi...' : 'Search reference note...'}
                      className="w-full bg-slate-950/80 text-[11px] text-slate-200 pl-7 pr-2 py-1 rounded border border-slate-700/80 focus:border-purple-500 focus:outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Quick New Note Button */}
                <div className="p-1 border-b border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPickerOpen(false);
                      onCreateSecondaryNote();
                    }}
                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded hover:bg-purple-600/20 text-purple-400 hover:text-purple-300 transition text-left"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isId ? '+ Buat Catatan Baru di Sisi Kanan' : '+ Create New Note on Right'}</span>
                  </button>
                </div>

                {/* Notes List */}
                <div className="overflow-y-auto p-1 divide-y divide-slate-800/40">
                  {selectableNotes.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500">
                      {isId ? 'Tidak ada catatan ditemukan' : 'No notes found'}
                    </div>
                  ) : (
                    selectableNotes.map((n) => {
                      const f = folders.find((folder) => folder.id === n.folder_id);
                      const isCurrent = secondaryNote?.id === n.id;
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            onSelectSecondaryNote(n.id);
                            setIsPickerOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs transition flex flex-col gap-0.5 ${
                            isCurrent
                              ? 'bg-purple-600/30 text-white font-medium'
                              : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                          }`}
                        >
                          <span className="truncate font-medium">{n.title || (isId ? 'Catatan Tanpa Judul' : 'Untitled Note')}</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <FolderIcon className="w-2.5 h-2.5" />
                            <span>{f?.title || (isId ? 'Umum' : 'Default')}</span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Action: Close Split Screen View */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onCloseDualView}
              title={isId ? 'Tutup Mode Layar Ganda (Kembali ke 1 Catatan)' : 'Close Dual View (Back to Single Note)'}
              className="p-1 rounded hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Pane Body */}
        <div className="flex-1 h-full min-w-0 overflow-hidden">
          {secondaryNote ? (
            <NoteEditor
              note={secondaryNote}
              folders={folders}
              availableTags={availableTags}
              allNotes={allNotes}
              settingsEditorMode={settingsEditorMode}
              markdownViewMode={markdownViewMode}
              isVaultUnlocked={isVaultUnlocked}
              onUpdateNote={onUpdateSecondaryNote}
              onMarkdownViewModeChange={onMarkdownViewModeChange}
              onOpenPublish={onOpenPublish}
              onOpenInfo={onOpenInfo}
              onToggleEncrypt={onToggleEncrypt}
              onRequestUnlock={onRequestUnlock}
              onOpenWikiLink={onOpenWikiLink}
              onOpenTemplates={onOpenTemplates}
              onOpenGraphView={onOpenGraphView}
              onOpenRevisionHistory={onOpenRevisionHistory}
              onOpenVoiceRecorder={onOpenVoiceRecorder}
              onOpenDrawingCanvas={onOpenDrawingCanvas}
              onExportPdf={onExportPdf}
              onExportMarkdown={onExportMarkdown}
              onOpenExportModal={() => onOpenExportModal && onOpenExportModal(secondaryNote)}
              onOpenOCR={onOpenOCR}
              onOpenSRS={onOpenSRS}
              onToggleSplitScreen={onCloseDualView}
              isSplitScreen={true}
              onShowToast={onShowToast}
              language={language}
              theme={theme}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6 text-center">
              <Columns2 className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs font-medium text-slate-300 mb-1">
                {isId ? 'Belum Ada Catatan Referensi di Sisi Kanan' : 'No Reference Note on the Right'}
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs mb-3">
                {isId
                  ? 'Pilih catatan lain untuk dibaca atau diedit berdampingan.'
                  : 'Select another note to read or edit side-by-side.'}
              </p>
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition"
              >
                {isId ? 'Pilih Catatan Sekarang' : 'Choose Note Now'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
