import React from 'react';
import { X, CalendarDays, ArrowRight, BookOpen, Clock } from 'lucide-react';
import type { Note, AppLanguage } from '../../types';
import { MiniCalendar } from '../Calendar/MiniCalendar';

interface DailyNotesCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onOpenDailyNote: (targetDateStr?: string) => void;
  language?: AppLanguage;
  theme?: string;
}

export const DailyNotesCalendarModal: React.FC<DailyNotesCalendarModalProps> = ({
  isOpen,
  onClose,
  notes,
  onOpenDailyNote,
  language = 'id',
  theme = 'qalam-dark',
}) => {
  if (!isOpen) return null;

  const isLight = theme === 'qalam-light';
  const isId = language === 'id';

  const todayStr = (() => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();

  // Filter recent daily notes
  const recentDailyNotes = notes
    .filter((n) => !n.is_deleted && /\b\d{4}-\d{2}-\d{2}\b/.test(n.title || ''))
    .sort((a, b) => (b.updated_time || 0) - (a.updated_time || 0))
    .slice(0, 6);

  const handleSelectDate = (dateStr: string) => {
    onOpenDailyNote(dateStr);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <CalendarDays className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">
                {isId ? 'Jurnal Harian & Kalender (Daily Notes)' : 'Daily Notes & Mini Calendar'}
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isId
                  ? 'Catat rencana, refleksi harian, dan kebiasaan tanpa repot'
                  : 'Track daily plans, reflections, and habits with zero friction'}
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
          {/* Quick Action Today Button */}
          <button
            type="button"
            onClick={() => handleSelectDate(todayStr)}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-between shadow-xs transition active:scale-98"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">📅</span>
              <span>
                {isId ? `Buka / Buat Catatan Hari Ini (${todayStr})` : `Open / Create Today's Note (${todayStr})`}
              </span>
            </div>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Interactive Mini Calendar */}
          <MiniCalendar
            notes={notes}
            selectedDate={todayStr}
            onSelectDate={handleSelectDate}
            language={language}
            theme={theme}
          />

          {/* Recent Daily Notes */}
          {recentDailyNotes.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{isId ? 'Jurnal Harian Terbaru:' : 'Recent Daily Notes:'}</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recentDailyNotes.map((dn) => (
                  <button
                    key={dn.id}
                    type="button"
                    onClick={() => {
                      onOpenDailyNote(dn.id);
                      onClose();
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between group ${
                      isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                        : 'bg-slate-800/40 hover:bg-slate-800 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate font-medium">{dn.title}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
