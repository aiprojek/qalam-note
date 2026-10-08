import React from 'react';
import {
  FolderTree,
  FileText,
  PenLine,
  Settings,
} from 'lucide-react';
import type { AppLanguage } from '../types';

interface MobileBottomNavProps {
  activeView: 'sidebar' | 'notes' | 'editor';
  onSelectView: (view: 'sidebar' | 'notes' | 'editor') => void;
  notesCount: number;
  onOpenSettings: () => void;
  language?: AppLanguage;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  onSelectView,
  notesCount,
  onOpenSettings,
  language = 'id',
}) => {
  const isId = language === 'id';

  return (
    <nav className="flex items-center justify-around h-[52px] bg-[#141b27] border-t border-slate-800 text-xs select-none shrink-0 z-30 px-2 shadow-lg">
      {/* 1. Folders */}
      <button
        type="button"
        onClick={() => onSelectView('sidebar')}
        className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] py-1 transition-colors active:scale-95 ${
          activeView === 'sidebar'
            ? 'text-blue-400 font-semibold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <FolderTree className={`w-5 h-5 ${activeView === 'sidebar' ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">
          {isId ? 'Folder' : 'Folders'}
        </span>
      </button>

      {/* 2. Notes List */}
      <button
        type="button"
        onClick={() => onSelectView('notes')}
        className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] py-1 transition-colors active:scale-95 relative ${
          activeView === 'notes'
            ? 'text-blue-400 font-semibold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <div className="relative">
          <FileText className={`w-5 h-5 ${activeView === 'notes' ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
          {notesCount > 0 && (
            <span className="absolute -top-1 -right-2.5 px-1 py-0.2 min-w-[14px] text-[9px] font-bold bg-blue-600 text-white rounded-full text-center leading-tight">
              {notesCount > 99 ? '99+' : notesCount}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">
          {isId ? 'Catatan' : 'Notes'}
        </span>
      </button>

      {/* 3. Note Editor */}
      <button
        type="button"
        onClick={() => onSelectView('editor')}
        className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] py-1 transition-colors active:scale-95 ${
          activeView === 'editor'
            ? 'text-blue-400 font-semibold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <PenLine className={`w-5 h-5 ${activeView === 'editor' ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">
          {isId ? 'Editor' : 'Editor'}
        </span>
      </button>

      {/* 4. Settings */}
      <button
        type="button"
        onClick={onOpenSettings}
        className="flex flex-col items-center justify-center flex-1 h-full min-h-[44px] py-1 text-slate-400 hover:text-slate-200 transition-colors active:scale-95"
      >
        <Settings className="w-5 h-5 stroke-[1.8]" />
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">
          {isId ? 'Setelan' : 'Settings'}
        </span>
      </button>
    </nav>
  );
};
