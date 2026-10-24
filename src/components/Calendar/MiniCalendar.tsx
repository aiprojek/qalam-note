import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import type { Note, AppLanguage } from '../../types';

interface MiniCalendarProps {
  notes: Note[];
  selectedDate?: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  language?: AppLanguage;
  theme?: string;
  className?: string;
  compact?: boolean;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  notes,
  selectedDate,
  onSelectDate,
  language = 'id',
  theme = 'qalam-dark',
  className = '',
  compact = false,
}) => {
  const isLight = theme === 'qalam-light';
  const isId = language === 'id';

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [today]);

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  // Map existing daily notes by YYYY-MM-DD date string
  const dailyNotesDateMap = useMemo(() => {
    const map = new Map<string, Note>();
    const datePattern = /\b(\d{4}-\d{2}-\d{2})\b/;

    for (const n of notes) {
      if (n.is_deleted) continue;
      const match = (n.title || '').match(datePattern);
      if (match) {
        map.set(match[1], n);
      }
    }
    return map;
  }, [notes]);

  const monthNames = useMemo(() => {
    return isId
      ? [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ]
      : [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
  }, [isId]);

  const dayHeaders = useMemo(() => {
    return isId
      ? ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
      : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  }, [isId]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    onSelectDate(todayStr);
  };

  // Build grid days for current month view
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: {
      day: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      hasNote: boolean;
      isSelected: boolean;
    }[] = [];

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevM = currentMonth === 0 ? 12 : currentMonth;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        hasNote: dailyNotesDateMap.has(dateStr),
        isSelected: selectedDate === dateStr,
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        hasNote: dailyNotesDateMap.has(dateStr),
        isSelected: selectedDate === dateStr,
      });
    }

    // Trailing days from next month to complete 35 or 42 grid cells
    const remaining = 35 - (days.length % 35);
    const needed = remaining === 35 ? (days.length <= 28 ? 7 : 0) : remaining;
    for (let day = 1; day <= needed; day++) {
      const nextM = currentMonth === 11 ? 1 : currentMonth + 2;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        hasNote: dailyNotesDateMap.has(dateStr),
        isSelected: selectedDate === dateStr,
      });
    }

    return days;
  }, [currentYear, currentMonth, todayStr, dailyNotesDateMap, selectedDate]);

  return (
    <div
      className={`rounded-xl border p-3 select-none transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900/60 border-slate-800'
      } ${className}`}
    >
      {/* Month & Year Navigation Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 font-bold text-xs">
          <CalendarIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>
            {monthNames[currentMonth]} {currentYear}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleJumpToday}
            title={isId ? 'Lompat ke Hari Ini' : 'Jump to Today'}
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition active:scale-95 ${
              isLight
                ? 'border-slate-300 hover:bg-slate-100 text-slate-600'
                : 'border-slate-700 hover:bg-slate-800 text-slate-300'
            }`}
          >
            {isId ? 'Hari Ini' : 'Today'}
          </button>

          <button
            type="button"
            onClick={handlePrevMonth}
            title={isId ? 'Bulan Sebelumnya' : 'Previous Month'}
            className={`p-1 rounded transition active:scale-95 ${
              isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleNextMonth}
            title={isId ? 'Bulan Berikutnya' : 'Next Month'}
            className={`p-1 rounded transition active:scale-95 ${
              isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {dayHeaders.map((dh, idx) => (
          <div
            key={idx}
            className={`text-[10px] font-semibold tracking-wider ${
              idx === 0 || idx === 6
                ? 'text-rose-400/80'
                : isLight
                ? 'text-slate-400'
                : 'text-slate-500'
            }`}
          >
            {dh}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((cd) => {
          let dayClasses = 'relative flex flex-col items-center justify-center rounded-lg text-xs transition cursor-pointer ';
          dayClasses += compact ? 'h-7 w-full ' : 'h-8 w-full ';

          if (cd.isSelected) {
            dayClasses += 'bg-blue-600 text-white font-bold shadow-xs ';
          } else if (cd.isToday) {
            dayClasses += isLight
              ? 'bg-blue-50 text-blue-600 border border-blue-400 font-bold '
              : 'bg-blue-950/40 text-blue-300 border border-blue-600/60 font-bold ';
          } else if (!cd.isCurrentMonth) {
            dayClasses += isLight ? 'text-slate-300 hover:bg-slate-50 ' : 'text-slate-600 hover:bg-slate-800/40 ';
          } else {
            dayClasses += isLight
              ? 'text-slate-700 hover:bg-slate-100 font-medium '
              : 'text-slate-300 hover:bg-slate-800 font-medium ';
          }

          return (
            <button
              key={cd.dateStr}
              type="button"
              onClick={() => onSelectDate(cd.dateStr)}
              title={
                cd.hasNote
                  ? isId
                    ? `Catatan Harian ${cd.dateStr} (Ada Catatan)`
                    : `Daily Note ${cd.dateStr} (Note Exists)`
                  : isId
                  ? `Buka / Buat Catatan ${cd.dateStr}`
                  : `Open / Create Note for ${cd.dateStr}`
              }
              className={dayClasses}
            >
              <span>{cd.day}</span>
              {/* Daily Note Indicator Dot */}
              {cd.hasNote && (
                <span
                  className={`w-1 h-1 rounded-full absolute bottom-1 ${
                    cd.isSelected
                      ? 'bg-white'
                      : cd.isToday
                      ? 'bg-blue-500'
                      : 'bg-emerald-400 animate-pulse'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Helper */}
      <div className="mt-2.5 pt-2 border-t border-slate-700/20 flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1 text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          <span>{isId ? 'Ada Catatan Harian' : 'Daily Note Exists'}</span>
        </span>
        <span className="text-slate-500 font-mono">
          {dailyNotesDateMap.size} {isId ? 'jurnal' : 'notes'}
        </span>
      </div>
    </div>
  );
};
