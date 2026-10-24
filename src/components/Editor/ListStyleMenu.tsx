import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  List,
  ListOrdered,
  Sparkles,
  Sliders,
  Check,
  ChevronRight,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  BULLET_STYLES,
  NUMBERED_STYLES,
  BulletStyleOption,
  NumberedStyleOption,
  toRoman,
  toAlpha,
} from '../../utils/listStyles';
import type { AppLanguage } from '../../types';

export interface SelectedListStylePayload {
  type: 'bullet' | 'ordered';
  styleId: string;
  symbol?: string;
  prefix?: string;
  suffix?: string;
  start?: number;
}

export interface ListMenuPosition {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

interface ListStyleMenuProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'bullet' | 'ordered';
  onSelectStyle: (payload: SelectedListStylePayload) => void;
  language?: AppLanguage;
  position?: ListMenuPosition | null;
  anchorEl?: HTMLElement | null;
}

const QUICK_EMOJIS = ['📌', '💡', '🚀', '👉', '🔥', '✨', '⭐', '🎯', '⚡', '🔹', '🔸', '📝', '💠', '🟢'];

export const ListStyleMenu: React.FC<ListStyleMenuProps> = ({
  isOpen,
  onClose,
  mode,
  onSelectStyle,
  language = 'id',
  position,
  anchorEl,
}) => {
  const isId = language === 'id';
  const menuRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'bullet' | 'ordered'>(mode);
  const [showCustomConfig, setShowCustomConfig] = useState(false);

  // Custom list configuration state
  const [customBulletSymbol, setCustomBulletSymbol] = useState('📌');
  const [customNumType, setCustomNumType] = useState<'decimal' | 'upper-alpha' | 'lower-alpha' | 'upper-roman' | 'lower-roman'>('decimal');
  const [customPrefix, setCustomPrefix] = useState('');
  const [customSuffix, setCustomSuffix] = useState('.');
  const [customStart, setCustomStart] = useState(1);

  useEffect(() => {
    setActiveTab(mode);
  }, [mode]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Determine fixed positioning
  const getStylePosition = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
    };

    if (position) {
      if (position.top !== undefined) style.top = `${position.top}px`;
      if (position.bottom !== undefined) style.bottom = `${position.bottom}px`;
      if (position.left !== undefined) style.left = `${position.left}px`;
      if (position.right !== undefined) style.right = `${position.right}px`;
      return style;
    }

    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      const fitsBelow = rect.bottom + 380 <= window.innerHeight;
      if (fitsBelow) {
        style.top = `${rect.bottom + 6}px`;
      } else {
        style.bottom = `${Math.max(8, window.innerHeight - rect.top + 6)}px`;
      }
      style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 336))}px`;
      return style;
    }

    // Default fallback
    style.top = '48px';
    style.left = '16px';
    return style;
  };

  if (!isOpen) return null;

  // Render live preview for custom numbering
  const renderCustomNumPreview = () => {
    const items = [customStart, customStart + 1, customStart + 2].map((idx) => {
      let val = String(idx);
      if (customNumType === 'upper-alpha') val = toAlpha(idx, true);
      else if (customNumType === 'lower-alpha') val = toAlpha(idx, false);
      else if (customNumType === 'upper-roman') val = toRoman(idx, true);
      else if (customNumType === 'lower-roman') val = toRoman(idx, false);
      return `${customPrefix}${val}${customSuffix} `;
    });
    return items;
  };

  const handleApplyCustom = () => {
    if (activeTab === 'bullet') {
      onSelectStyle({
        type: 'bullet',
        styleId: 'custom',
        symbol: customBulletSymbol || '•',
      });
    } else {
      onSelectStyle({
        type: 'ordered',
        styleId: customNumType,
        prefix: customPrefix,
        suffix: customSuffix,
        start: customStart,
      });
    }
    onClose();
  };

  const menuContent = (
    <>
      {/* Fullscreen transparent backdrop overlay for clean outside-click dismissal */}
      <div
        className="fixed inset-0 z-[9998] cursor-default bg-black/15 backdrop-blur-[0.5px] transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Floating Popover Container */}
      <div
        ref={menuRef}
        style={getStylePosition()}
        className="w-80 max-w-[calc(100vw-16px)] bg-[#1e293b] border border-slate-700/90 rounded-xl shadow-2xl text-slate-200 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-100 select-none"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
      {/* Top Header / Mode Switch Tabs */}
      <div className="flex items-center justify-between border-b border-slate-700/80 bg-slate-900/60 px-2 py-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('bullet');
              setShowCustomConfig(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition ${
              activeTab === 'bullet'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>{isId ? 'Poin (Bullet)' : 'Bullets'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('ordered');
              setShowCustomConfig(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition ${
              activeTab === 'ordered'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>{isId ? 'Penomoran / Abjad' : 'Numbering'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Content Area */}
      {!showCustomConfig ? (
        <div className="p-3 max-h-80 overflow-y-auto custom-scrollbar space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {activeTab === 'bullet'
                ? isId
                  ? 'Pustaka Simbol Poin'
                  : 'Bullet Library'
                : isId
                ? 'Pustaka Penomoran & Abjad'
                : 'Numbering Library'}
            </span>
            <span className="text-[10px] text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">
              {isId ? 'Pilihan Gaya' : 'Format Library'}
            </span>
          </div>

          {/* Grid of gallery choices */}
          {activeTab === 'bullet' ? (
            <div className="grid grid-cols-2 gap-2">
              {BULLET_STYLES.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    onSelectStyle({
                      type: 'bullet',
                      styleId: b.id,
                      symbol: b.symbol,
                    });
                    onClose();
                  }}
                  className="flex flex-col p-2 text-left rounded-lg bg-slate-800/50 hover:bg-blue-600/20 border border-slate-700/60 hover:border-blue-500/60 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-6 h-6 rounded bg-slate-900/80 border border-slate-700 flex items-center justify-center font-bold text-sm text-blue-400 group-hover:text-blue-300">
                      {b.symbol}
                    </span>
                    <span className="font-medium text-slate-200 text-[11px] truncate">
                      {isId ? b.labelId : b.labelEn}
                    </span>
                  </div>
                  <div className="space-y-0.5 pl-1 border-l-2 border-slate-700/50 group-hover:border-blue-500/50">
                    {b.sample.slice(0, 2).map((s, idx) => (
                      <div key={idx} className="text-[10px] text-slate-400 truncate">
                        {s}
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {NUMBERED_STYLES.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    onSelectStyle({
                      type: 'ordered',
                      styleId: n.id,
                    });
                    onClose();
                  }}
                  className="flex flex-col p-2 text-left rounded-lg bg-slate-800/50 hover:bg-blue-600/20 border border-slate-700/60 hover:border-blue-500/60 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-6 h-6 rounded bg-slate-900/80 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-amber-400 group-hover:text-amber-300">
                      {n.formatFn(1).trim()}
                    </span>
                    <span className="font-medium text-slate-200 text-[11px] truncate">
                      {isId ? n.labelId : n.labelEn}
                    </span>
                  </div>
                  <div className="space-y-0.5 pl-1 border-l-2 border-slate-700/50 group-hover:border-amber-500/50 font-mono">
                    {n.sample.slice(0, 2).map((s, idx) => (
                      <div key={idx} className="text-[10px] text-slate-400 truncate">
                        {s}
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Bottom Customize Trigger Button */}
          <button
            type="button"
            onClick={() => setShowCustomConfig(true)}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-blue-400 hover:text-blue-300 transition text-xs font-medium cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>{isId ? 'Atur Format Sendiri / Kustomisasi...' : 'Define Custom Format...'}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>
      ) : (
        /* Advanced Customization Config Panel */
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {activeTab === 'bullet'
                  ? isId
                    ? 'Kustomisasi Poin / Ikon'
                    : 'Custom Bullet / Icon'
                  : isId
                  ? 'Kustomisasi Format Angka / Abjad'
                  : 'Custom Numbering / Alpha'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowCustomConfig(false)}
              className="text-[11px] text-slate-400 hover:text-white"
            >
              {isId ? 'Kembali' : 'Back'}
            </button>
          </div>

          {activeTab === 'bullet' ? (
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {isId ? 'Pilih Ikon Cepat atau Ketik Simbol:' : 'Select Emoji or Type Symbol:'}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setCustomBulletSymbol(emoji)}
                      className={`w-7 h-7 rounded text-sm flex items-center justify-center transition cursor-pointer ${
                        customBulletSymbol === emoji
                          ? 'bg-blue-600 scale-110 shadow-xs ring-1 ring-blue-400'
                          : 'bg-slate-800 hover:bg-slate-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customBulletSymbol}
                    onChange={(e) => setCustomBulletSymbol(e.target.value)}
                    placeholder="Contoh: 📌, ⭐, ➔, 🔹"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <div className="w-9 h-8 bg-slate-800 rounded border border-slate-700 flex items-center justify-center text-base font-bold text-blue-400 shrink-0">
                    {customBulletSymbol || '•'}
                  </div>
                </div>
              </div>

              {/* Preview Box */}
              <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {isId ? 'Pratinjau Hasil:' : 'Live Preview:'}
                </div>
                <div className="text-xs text-slate-200">
                  {customBulletSymbol || '•'} {isId ? 'Butir rencana pertama' : 'First item'}
                </div>
                <div className="text-xs text-slate-200">
                  {customBulletSymbol || '•'} {isId ? 'Butir rencana kedua' : 'Second item'}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {isId ? 'Gaya Penomoran Dasar:' : 'Numbering Style:'}
                </label>
                <select
                  value={customNumType}
                  onChange={(e) => setCustomNumType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="decimal">{isId ? '1, 2, 3 (Angka Desimal)' : '1, 2, 3 (Decimal)'}</option>
                  <option value="upper-alpha">{isId ? 'A, B, C (Abjad Besar)' : 'A, B, C (Uppercase Alpha)'}</option>
                  <option value="lower-alpha">{isId ? 'a, b, c (Abjad Kecil)' : 'a, b, c (Lowercase Alpha)'}</option>
                  <option value="upper-roman">{isId ? 'I, II, III (Romawi Besar)' : 'I, II, III (Uppercase Roman)'}</option>
                  <option value="lower-roman">{isId ? 'i, ii, iii (Romawi Kecil)' : 'i, ii, iii (Lowercase Roman)'}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    {isId ? 'Awalan (Prefix):' : 'Prefix:'}
                  </label>
                  <input
                    type="text"
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value)}
                    placeholder="misal: Bab , Langkah "
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    {isId ? 'Akhiran (Suffix):' : 'Suffix:'}
                  </label>
                  <input
                    type="text"
                    value={customSuffix}
                    onChange={(e) => setCustomSuffix(e.target.value)}
                    placeholder="misal: . atau ) atau :"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {isId ? 'Mulai Dari (Start Number):' : 'Start Number:'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={customStart}
                  onChange={(e) => setCustomStart(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Preview Box */}
              <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 space-y-1 font-mono">
                <div className="text-[10px] text-slate-400 font-sans font-semibold uppercase tracking-wider">
                  {isId ? 'Pratinjau Format:' : 'Live Preview:'}
                </div>
                {renderCustomNumPreview().map((p, idx) => (
                  <div key={idx} className="text-xs text-amber-300">
                    <span className="font-bold text-white">{p}</span>
                    <span className="text-slate-400 font-sans">{isId ? `Poin nomor ${idx + 1}` : `Sample item ${idx + 1}`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-700/80">
            <button
              type="button"
              onClick={() => setShowCustomConfig(false)}
              className="px-2.5 py-1 rounded text-slate-400 hover:text-white transition"
            >
              {isId ? 'Batal' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleApplyCustom}
              className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isId ? 'Terapkan Format' : 'Apply Style'}</span>
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  );

  if (typeof document !== 'undefined') {
    return createPortal(menuContent, document.body);
  }

  return menuContent;
};
