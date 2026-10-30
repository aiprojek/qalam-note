import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  List,
  ListOrdered,
  Sliders,
  Check,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  BULLET_STYLES,
  NUMBERED_STYLES,
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

  const isLight =
    typeof document !== 'undefined' &&
    (document.documentElement.classList.contains('qalam-light') ||
     document.documentElement.classList.contains('light'));

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
        className="fixed inset-0 z-[9998] cursor-default bg-black/20 backdrop-blur-[0.5px] transition-opacity"
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
        className={`w-80 max-w-[calc(100vw-16px)] rounded-xl shadow-2xl overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-100 select-none border transition-colors ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-xl'
            : 'bg-[#1e293b] border-slate-700/90 text-slate-200 shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Top Header / Mode Switch Tabs */}
        <div className={`flex items-center justify-between border-b px-2 py-1.5 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-700/80'
        }`}>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('bullet');
                setShowCustomConfig(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition ${
                activeTab === 'bullet'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
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
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition ${
                activeTab === 'ordered'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
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
            className={`p-1 rounded transition ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Main Content Area */}
        {!showCustomConfig ? (
          <div className="p-3 max-h-80 overflow-y-auto custom-scrollbar space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${
                isLight ? 'text-slate-700' : 'text-slate-400'
              }`}>
                {activeTab === 'bullet'
                  ? isId
                    ? 'Pustaka Simbol Poin'
                    : 'Bullet Library'
                  : isId
                  ? 'Pustaka Penomoran & Abjad'
                  : 'Numbering Library'}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                isLight
                  ? 'text-blue-700 bg-blue-50 border border-blue-200'
                  : 'text-blue-400 bg-blue-950/60 border border-blue-800/40'
              }`}>
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
                    className={`flex flex-col p-2 text-left rounded-lg transition group cursor-pointer border ${
                      isLight
                        ? 'bg-slate-50 hover:bg-blue-50/80 border-slate-200 hover:border-blue-300'
                        : 'bg-slate-800/50 hover:bg-blue-600/20 border-slate-700/60 hover:border-blue-500/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-sm shrink-0 border ${
                        isLight
                          ? 'bg-white border-slate-300 text-blue-600 shadow-xs'
                          : 'bg-slate-900/80 border-slate-700 text-blue-400 group-hover:text-blue-300'
                      }`}>
                        {b.symbol}
                      </span>
                      <span className={`font-semibold text-[11px] truncate ${
                        isLight ? 'text-slate-800' : 'text-slate-200'
                      }`}>
                        {isId ? b.labelId : b.labelEn}
                      </span>
                    </div>
                    <div className={`space-y-0.5 pl-1.5 border-l-2 ${
                      isLight
                        ? 'border-slate-300 group-hover:border-blue-500'
                        : 'border-slate-700/50 group-hover:border-blue-500/50'
                    }`}>
                      {b.sample.slice(0, 2).map((s, idx) => (
                        <div key={idx} className={`text-[10px] truncate ${
                          isLight ? 'text-slate-600' : 'text-slate-400'
                        }`}>
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
                    className={`flex flex-col p-2 text-left rounded-lg transition group cursor-pointer border ${
                      isLight
                        ? 'bg-slate-50 hover:bg-amber-50/80 border-slate-200 hover:border-amber-300'
                        : 'bg-slate-800/50 hover:bg-blue-600/20 border-slate-700/60 hover:border-blue-500/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs shrink-0 border ${
                        isLight
                          ? 'bg-white border-slate-300 text-amber-700 shadow-xs'
                          : 'bg-slate-900/80 border-slate-700 text-amber-400 group-hover:text-amber-300'
                      }`}>
                        {n.formatFn(1).trim()}
                      </span>
                      <span className={`font-semibold text-[11px] truncate ${
                        isLight ? 'text-slate-800' : 'text-slate-200'
                      }`}>
                        {isId ? n.labelId : n.labelEn}
                      </span>
                    </div>
                    <div className={`space-y-0.5 pl-1.5 border-l-2 font-mono ${
                      isLight
                        ? 'border-slate-300 group-hover:border-amber-500'
                        : 'border-slate-700/50 group-hover:border-amber-500/50'
                    }`}>
                      {n.sample.slice(0, 2).map((s, idx) => (
                        <div key={idx} className={`text-[10px] truncate ${
                          isLight ? 'text-slate-600' : 'text-slate-400'
                        }`}>
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
              className={`w-full flex items-center justify-between p-2 rounded-lg transition text-xs font-semibold cursor-pointer border ${
                isLight
                  ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-blue-600'
                  : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-blue-400 hover:text-blue-300'
              }`}
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
              <div className={`flex items-center gap-1.5 font-bold text-xs ${
                isLight ? 'text-slate-800' : 'text-slate-200'
              }`}>
                <Sliders className="w-3.5 h-3.5 text-blue-500" />
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
                className={`text-[11px] font-medium transition ${
                  isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
              >
                {isId ? 'Kembali' : 'Back'}
              </button>
            </div>

            {activeTab === 'bullet' ? (
              <div className="space-y-2.5">
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${
                    isLight ? 'text-slate-700' : 'text-slate-400'
                  }`}>
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
                            ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-300'
                            : isLight
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
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
                      className={`flex-1 rounded px-2.5 py-1.5 text-xs focus:outline-none font-mono border ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                          : 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                      }`}
                    />
                    <div className={`w-9 h-8 rounded border flex items-center justify-center text-base font-bold shrink-0 ${
                      isLight
                        ? 'bg-slate-100 border-slate-300 text-blue-600'
                        : 'bg-slate-800 border-slate-700 text-blue-400'
                    }`}>
                      {customBulletSymbol || '•'}
                    </div>
                  </div>
                </div>

                {/* Preview Box */}
                <div className={`rounded-lg p-2.5 border space-y-1 ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-800'
                    : 'bg-slate-900/80 border-slate-800 text-slate-200'
                }`}>
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    {isId ? 'Pratinjau Hasil:' : 'Live Preview:'}
                  </div>
                  <div className={`text-xs ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                    {customBulletSymbol || '•'} {isId ? 'Butir rencana pertama' : 'First item'}
                  </div>
                  <div className={`text-xs ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                    {customBulletSymbol || '•'} {isId ? 'Butir rencana kedua' : 'Second item'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${
                    isLight ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {isId ? 'Gaya Penomoran Dasar:' : 'Numbering Style:'}
                  </label>
                  <select
                    value={customNumType}
                    onChange={(e) => setCustomNumType(e.target.value as any)}
                    className={`w-full rounded px-2.5 py-1.5 text-xs focus:outline-none border ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                        : 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                    }`}
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
                    <label className={`block text-[11px] font-semibold mb-1 ${
                      isLight ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      {isId ? 'Awalan (Prefix):' : 'Prefix:'}
                    </label>
                    <input
                      type="text"
                      value={customPrefix}
                      onChange={(e) => setCustomPrefix(e.target.value)}
                      placeholder="misal: Bab , Langkah "
                      className={`w-full rounded px-2 py-1 text-xs focus:outline-none border ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                          : 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${
                      isLight ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      {isId ? 'Akhiran (Suffix):' : 'Suffix:'}
                    </label>
                    <input
                      type="text"
                      value={customSuffix}
                      onChange={(e) => setCustomSuffix(e.target.value)}
                      placeholder="misal: . atau ) atau :"
                      className={`w-full rounded px-2 py-1 text-xs focus:outline-none border ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                          : 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${
                    isLight ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {isId ? 'Mulai Dari (Start Number):' : 'Start Number:'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={customStart}
                    onChange={(e) => setCustomStart(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className={`w-24 rounded px-2 py-1 text-xs focus:outline-none border ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                        : 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                    }`}
                  />
                </div>

                {/* Preview Box */}
                <div className={`rounded-lg p-2.5 border space-y-1 font-mono ${
                  isLight
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-slate-900/80 border-slate-800'
                }`}>
                  <div className={`text-[10px] font-sans font-bold uppercase tracking-wider ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    {isId ? 'Pratinjau Format:' : 'Live Preview:'}
                  </div>
                  {renderCustomNumPreview().map((p, idx) => (
                    <div key={idx} className="text-xs">
                      <span className={`font-bold ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>{p}</span>
                      <span className={`font-sans ml-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        {isId ? `Poin nomor ${idx + 1}` : `Sample item ${idx + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className={`flex items-center justify-end gap-2 pt-1 border-t ${
              isLight ? 'border-slate-200' : 'border-slate-700/80'
            }`}>
              <button
                type="button"
                onClick={() => setShowCustomConfig(false)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
              >
                {isId ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleApplyCustom}
                className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
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
