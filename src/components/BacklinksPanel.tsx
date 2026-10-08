import React from 'react';
import { Link2, ArrowUpRight, FileText, CheckSquare } from 'lucide-react';
import type { Note, AppLanguage } from '../types';
import { findBacklinks } from '../utils/wikilinks';

interface BacklinksPanelProps {
  note: Note;
  allNotes: Note[];
  onSelectNote: (noteId: string) => void;
  language?: AppLanguage;
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({
  note,
  allNotes,
  onSelectNote,
  language = 'id',
}) => {
  const isId = language === 'id';
  const backlinks = findBacklinks(note, allNotes);

  if (backlinks.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs text-center space-y-1">
        <Link2 className="w-5 h-5 mx-auto text-slate-600 mb-1" />
        <p className="font-medium text-slate-300">
          {isId ? 'Belum ada tautan balik (Backlinks)' : 'No backlinks yet'}
        </p>
        <p className="text-[11px] text-slate-500">
          {isId
            ? `Tautkan catatan lain ke sini dengan mengetik [[${note.title || 'Judul Catatan'}]]`
            : `Link other notes here by typing [[${note.title || 'Note Title'}]]`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
        <Link2 className="w-4 h-4 text-blue-400" />
        <span>{isId ? 'Tautan Balik (Linked Mentions)' : 'Backlinks (Linked Mentions)'} ({backlinks.length})</span>
      </div>

      <div className="space-y-1.5">
        {backlinks.map((bl) => (
          <button
            key={bl.sourceNote.id}
            onClick={() => onSelectNote(bl.sourceNote.id)}
            className="w-full p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/90 hover:border-blue-500/50 text-left transition group"
          >
            <div className="flex items-center justify-between text-xs font-medium text-blue-400 group-hover:text-blue-300">
              <div className="flex items-center gap-1.5 truncate">
                {bl.sourceNote.is_todo ? (
                  <CheckSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                )}
                <span className="truncate">{bl.sourceNote.title || 'Untitled'}</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1 text-slate-400" />
            </div>

            {bl.contextSnippet && (
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {bl.contextSnippet}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
