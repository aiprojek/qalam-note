import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  GraduationCap,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  HelpCircle,
  BookOpen,
  Layers,
  ChevronRight,
  Flame,
} from 'lucide-react';
import type { Note, SRSCard, SRSRating, AppLanguage } from '../../types';
import {
  syncNoteCardsWithDb,
  getDueCards,
  getAllCards,
  recordCardReview,
} from '../../services/srs';

interface SRSModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeNote?: Note;
  allNotes: Note[];
  language?: AppLanguage;
  theme?: string;
}

export const SRSModal: React.FC<SRSModalProps> = ({
  isOpen,
  onClose,
  activeNote,
  allNotes,
  language = 'id',
  theme = 'qalam-dark',
}) => {
  const isLight = theme === 'qalam-light';
  const isId = language === 'id';

  const [deckScope, setDeckScope] = useState<'current' | 'all'>('current');
  const [cards, setCards] = useState<SRSCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSyntaxHelp, setShowSyntaxHelp] = useState(false);
  const [sessionCompletedCount, setSessionCompletedCount] = useState(0);

  // Sync cards from notes into database and load due cards
  const loadDeck = useCallback(async () => {
    setIsLoading(true);
    try {
      if (deckScope === 'current' && activeNote) {
        await syncNoteCardsWithDb(activeNote);
        const due = await getDueCards(activeNote.id);
        setCards(due);
      } else {
        // Sync all notes with flashcard syntax
        for (const n of allNotes) {
          if (!n.is_deleted && (n.body.includes('::') || /Q:\s*.*\nA:\s*/i.test(n.body) || /\{\{.*\}\}/.test(n.body))) {
            await syncNoteCardsWithDb(n);
          }
        }
        const due = await getDueCards();
        setCards(due);
      }
      setCurrentIndex(0);
      setIsAnswerRevealed(false);
    } catch (err) {
      console.error('Failed to load SRS cards:', err);
    } finally {
      setIsLoading(false);
    }
  }, [deckScope, activeNote, allNotes]);

  useEffect(() => {
    if (isOpen) {
      loadDeck();
    }
  }, [isOpen, loadDeck]);

  const currentCard: SRSCard | undefined = cards[currentIndex];

  const handleReveal = () => {
    setIsAnswerRevealed(true);
  };

  const handleRate = async (rating: SRSRating) => {
    if (!currentCard) return;

    await recordCardReview(currentCard, rating);
    setSessionCompletedCount((c) => c + 1);

    if (rating === 'again') {
      // Re-insert failed card at end of session queue
      setCards((prev) => [...prev, currentCard]);
    }

    setIsAnswerRevealed(false);
    setCurrentIndex((prev) => prev + 1);
  };

  // Keyboard navigation: Space to reveal, 1/2/3/4 to rate
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (!isAnswerRevealed) {
          handleReveal();
        }
      } else if (isAnswerRevealed) {
        if (e.key === '1') {
          e.preventDefault();
          handleRate('again');
        } else if (e.key === '2') {
          e.preventDefault();
          handleRate('hard');
        } else if (e.key === '3') {
          e.preventDefault();
          handleRate('good');
        } else if (e.key === '4') {
          e.preventDefault();
          handleRate('easy');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAnswerRevealed, currentCard]);

  if (!isOpen) return null;

  const isFinished = !isLoading && (cards.length === 0 || currentIndex >= cards.length);

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
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <GraduationCap className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold">
                  {isId ? 'Tinjau Flashcard & Spaced Repetition' : 'Flashcards & Spaced Repetition (SRS)'}
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  SM-2
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isId
                  ? 'Optimalkan ingatan jangka panjang dengan interval bertahap'
                  : 'Retain knowledge with optimal spaced review intervals'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowSyntaxHelp((s) => !s)}
              title={isId ? 'Petunjuk Format Flashcard' : 'Flashcard Syntax Guide'}
              className={`p-1.5 rounded-lg transition ${
                isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
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
        </div>

        {/* Deck Scope Selector */}
        <div className={`px-4 py-2 border-b flex items-center justify-between text-xs ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">{isId ? 'Pilihan Dek:' : 'Deck Scope:'}</span>
            <div className="flex items-center bg-black/10 dark:bg-white/5 p-0.5 rounded-lg">
              {activeNote && (
                <button
                  type="button"
                  onClick={() => setDeckScope('current')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    deckScope === 'current'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isId ? 'Catatan Ini' : 'Current Note'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setDeckScope('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  deckScope === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isId ? 'Semua Catatan (Vault)' : 'All Notes (Vault)'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isFinished && (
              <span className="text-[11px] font-mono text-slate-400">
                {currentIndex + 1} / {cards.length} {isId ? 'kartu' : 'cards'}
              </span>
            )}
            <button
              type="button"
              onClick={loadDeck}
              title={isId ? 'Muat Ulang Kartu' : 'Reload Cards'}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Syntax Help Drawer */}
        {showSyntaxHelp && (
          <div className={`p-4 border-b text-xs space-y-2 animate-in slide-in-from-top-2 duration-150 ${
            isLight ? 'bg-purple-50/70 border-purple-200 text-purple-950' : 'bg-purple-950/20 border-purple-900/60 text-purple-200'
          }`}>
            <div className="font-bold flex items-center gap-1.5 text-purple-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isId ? 'Cara Menulis Flashcard di Catatan Anda:' : 'How to write Flashcards in your notes:'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
              <div className="p-2 rounded bg-black/10 dark:bg-black/30">
                <span className="text-amber-400 font-bold">1. Inline (Garis Ganda):</span>
                <p className="mt-1 text-slate-300">Ibu kota Jepang :: Tokyo</p>
              </div>
              <div className="p-2 rounded bg-black/10 dark:bg-black/30">
                <span className="text-cyan-400 font-bold">2. Q&A Block:</span>
                <p className="mt-1 text-slate-300">Q: Rumus daya listrik?<br />A: P = V × I</p>
              </div>
              <div className="p-2 rounded bg-black/10 dark:bg-black/30">
                <span className="text-emerald-400 font-bold">3. Isian (Cloze):</span>
                <p className="mt-1 text-slate-300">Bumi berputar pada {'{{porosnya}}'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto flex flex-col justify-between min-h-[320px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center flex-1 py-12 text-slate-400 space-y-3">
              <RotateCw className="w-8 h-8 animate-spin text-purple-400" />
              <p className="text-xs">{isId ? 'Menyiapkan flashcard & jadwal peninjauan...' : 'Preparing flashcard deck...'}</p>
            </div>
          ) : isFinished ? (
            /* Finished celebration screen */
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold">
                  {isId ? 'Hebat! Tinjauan Hari Ini Selesai' : 'Great Job! Review Session Complete'}
                </h3>
                <p className={`text-xs mt-1 max-w-md ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {cards.length === 0
                    ? isId
                      ? 'Belum ada kartu flashcard yang jatuh tempo atau ditemukan di catatan ini. Tulis teks dengan format "Tanya :: Jawab" di catatan Anda!'
                      : 'No flashcards are due right now in this deck. Write text with "Question :: Answer" in your notes to start!'
                    : isId
                    ? `Anda telah meninjau ${sessionCompletedCount} kartu pada sesi ini. Algoritma SM-2 telah menjadwalkan waktu pengulangan terbaik untuk Anda.`
                    : `You have reviewed ${sessionCompletedCount} cards. The SM-2 algorithm scheduled your next optimal review intervals.`}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={loadDeck}
                  className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs transition"
                >
                  {isId ? 'Tinjau Ulang Semua Kartu' : 'Review Again'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={`py-2 px-4 rounded-xl border text-xs font-medium transition ${
                    isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  {isId ? 'Selesai & Tutup' : 'Done & Close'}
                </button>
              </div>
            </div>
          ) : currentCard ? (
            /* Active Flashcard */
            <div className="flex flex-col flex-1 justify-between space-y-5">
              {/* Origin Note Badge */}
              {currentCard.note_title && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{currentCard.note_title}</span>
                </div>
              )}

              {/* Flashcard Box */}
              <div
                className={`flex-1 rounded-2xl border p-6 flex flex-col justify-center items-center text-center transition-all min-h-[220px] ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-800 shadow-sm'
                    : 'bg-slate-800/40 border-slate-700/80 text-slate-100 shadow-md'
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 mb-3">
                  {isId ? 'Pertanyaan (Front)' : 'Question (Front)'}
                </span>

                <div className="text-base sm:text-lg font-semibold max-w-lg leading-relaxed whitespace-pre-wrap">
                  {currentCard.front}
                </div>

                {/* Back / Answer revealed */}
                {isAnswerRevealed && (
                  <div className="w-full mt-6 pt-5 border-t border-slate-700/40 animate-in fade-in slide-in-from-bottom-2 duration-200 flex flex-col items-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 mb-2">
                      {isId ? 'Jawaban (Back)' : 'Answer (Back)'}
                    </span>
                    <div className="text-base sm:text-lg font-medium text-emerald-400 max-w-lg leading-relaxed whitespace-pre-wrap">
                      {currentCard.back}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Controls */}
              {!isAnswerRevealed ? (
                <button
                  type="button"
                  onClick={handleReveal}
                  className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-md transition active:scale-98 flex items-center justify-center gap-2"
                >
                  <span>{isId ? 'Tampilkan Jawaban' : 'Show Answer'}</span>
                  <span className="text-xs opacity-75 font-mono">(Spasi)</span>
                </button>
              ) : (
                /* 4 Rating Buttons (SM-2) */
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2">
                    {/* 1. Again */}
                    <button
                      type="button"
                      onClick={() => handleRate('again')}
                      className="py-2.5 px-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-semibold text-xs flex flex-col items-center transition active:scale-95"
                    >
                      <span>{isId ? 'Ulangi' : 'Again'}</span>
                      <span className="text-[10px] opacity-75 font-mono mt-0.5">&lt;10m (1)</span>
                    </button>

                    {/* 2. Hard */}
                    <button
                      type="button"
                      onClick={() => handleRate('hard')}
                      className="py-2.5 px-2 rounded-xl bg-amber-600/90 hover:bg-amber-600 text-white font-semibold text-xs flex flex-col items-center transition active:scale-95"
                    >
                      <span>{isId ? 'Sulit' : 'Hard'}</span>
                      <span className="text-[10px] opacity-75 font-mono mt-0.5">1h (2)</span>
                    </button>

                    {/* 3. Good */}
                    <button
                      type="button"
                      onClick={() => handleRate('good')}
                      className="py-2.5 px-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white font-semibold text-xs flex flex-col items-center transition active:scale-95"
                    >
                      <span>{isId ? 'Bagus' : 'Good'}</span>
                      <span className="text-[10px] opacity-75 font-mono mt-0.5">3h (3)</span>
                    </button>

                    {/* 4. Easy */}
                    <button
                      type="button"
                      onClick={() => handleRate('easy')}
                      className="py-2.5 px-2 rounded-xl bg-blue-600/90 hover:bg-blue-600 text-white font-semibold text-xs flex flex-col items-center transition active:scale-95"
                    >
                      <span>{isId ? 'Mudah' : 'Easy'}</span>
                      <span className="text-[10px] opacity-75 font-mono mt-0.5">6h (4)</span>
                    </button>
                  </div>
                  <p className="text-center text-[10px] text-slate-500">
                    {isId ? 'Gunakan tombol keyboard 1, 2, 3, atau 4 untuk menilai' : 'Use keyboard keys 1, 2, 3, or 4 to rate'}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
