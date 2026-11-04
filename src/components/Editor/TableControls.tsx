import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sliders,
  Table as TableIcon,
} from 'lucide-react';
import type { AppLanguage } from '../../types';

interface TableControlsProps {
  activeTable: HTMLTableElement;
  activeCell: HTMLTableCellElement | null;
  editorContainer: HTMLElement | null;
  isLight: boolean;
  language: AppLanguage;
  onTableModified: () => void;
  onClose: () => void;
}

export const TableControls: React.FC<TableControlsProps> = ({
  activeTable,
  activeCell,
  editorContainer,
  isLight,
  language,
  onTableModified,
  onClose,
}) => {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [showDensityMenu, setShowDensityMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate current row & column indices
  const getTableInfo = () => {
    const allRows = Array.from(activeTable.querySelectorAll('tr'));
    const totalRows = allRows.length;
    let currentRowIdx = 0;
    let currentColIdx = 0;
    let totalCols = 0;

    if (allRows.length > 0) {
      totalCols = allRows[0].querySelectorAll('th, td').length;
    }

    if (activeCell) {
      const parentTr = activeCell.closest('tr');
      if (parentTr) {
        currentRowIdx = allRows.indexOf(parentTr);
        const cellsInRow = Array.from(parentTr.querySelectorAll('th, td'));
        currentColIdx = cellsInRow.indexOf(activeCell);
      }
    }

    return { totalRows, totalCols, currentRowIdx, currentColIdx, allRows };
  };

  const { totalRows, totalCols, currentRowIdx, currentColIdx } = getTableInfo();

  // Position the floating toolbar above the active table or active cell
  useEffect(() => {
    if (!editorContainer || !activeTable) return;

    const updatePosition = () => {
      const targetEl = activeCell || activeTable;
      const targetRect = targetEl.getBoundingClientRect();
      const containerRect = editorContainer.getBoundingClientRect();

      // Position toolbar above the table / cell
      let top = targetRect.top - containerRect.top + editorContainer.scrollTop - 44;
      if (top < editorContainer.scrollTop + 6) {
        // If clipped at the top, position slightly below top of target
        top = targetRect.bottom - containerRect.top + editorContainer.scrollTop + 6;
      }

      // Center horizontally relative to target or table, constrained to container
      let left = targetRect.left - containerRect.left + 8;
      const maxLeft = Math.max(8, containerRect.width - 420);
      left = Math.min(Math.max(8, left), maxLeft);

      setCoords({ top, left });
    };

    updatePosition();
    editorContainer.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition);

    return () => {
      editorContainer.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [activeTable, activeCell, editorContainer]);

  // Helper to focus a cell
  const focusCell = (cell: HTMLTableCellElement | null) => {
    if (!cell) return;
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    cell.focus();
  };

  // 1. Insert Row Above
  const handleInsertRowAbove = () => {
    const { allRows } = getTableInfo();
    const targetTr = activeCell?.closest('tr') || allRows[0];
    if (!targetTr) return;

    const colsCount = targetTr.querySelectorAll('th, td').length;
    const newTr = document.createElement('tr');
    for (let i = 0; i < colsCount; i++) {
      const newTd = document.createElement('td');
      newTd.className = isLight ? 'border border-slate-300 p-2 text-slate-800' : 'border border-slate-700 p-2 text-slate-200';
      newTd.innerHTML = '&nbsp;';
      newTr.appendChild(newTd);
    }

    targetTr.parentElement?.insertBefore(newTr, targetTr);
    onTableModified();
    const firstCell = newTr.querySelector('td');
    if (firstCell) focusCell(firstCell);
  };

  // 2. Insert Row Below
  const handleInsertRowBelow = () => {
    const { allRows } = getTableInfo();
    const targetTr = activeCell?.closest('tr') || allRows[allRows.length - 1];
    if (!targetTr) return;

    const colsCount = targetTr.querySelectorAll('th, td').length;
    const newTr = document.createElement('tr');
    for (let i = 0; i < colsCount; i++) {
      const newTd = document.createElement('td');
      newTd.className = isLight ? 'border border-slate-300 p-2 text-slate-800' : 'border border-slate-700 p-2 text-slate-200';
      newTd.innerHTML = '&nbsp;';
      newTr.appendChild(newTd);
    }

    targetTr.parentElement?.insertBefore(newTr, targetTr.nextElementSibling);
    onTableModified();
    const firstCell = newTr.querySelector('td');
    if (firstCell) focusCell(firstCell);
  };

  // 3. Delete Current Row
  const handleDeleteRow = () => {
    const { allRows, totalRows: count } = getTableInfo();
    if (count <= 1) {
      handleDeleteTable();
      return;
    }

    const targetTr = activeCell?.closest('tr') || allRows[allRows.length - 1];
    if (!targetTr) return;

    const nextFocusTr = targetTr.nextElementSibling || targetTr.previousElementSibling;
    targetTr.remove();
    onTableModified();

    if (nextFocusTr) {
      const cellToFocus = nextFocusTr.querySelector('th, td') as HTMLTableCellElement | null;
      if (cellToFocus) focusCell(cellToFocus);
    }
  };

  // 4. Insert Column Left
  const handleInsertColumnLeft = () => {
    const { allRows, currentColIdx: targetIdx } = getTableInfo();
    allRows.forEach((row) => {
      const isHeader = row.parentElement?.tagName.toLowerCase() === 'thead' || row.querySelector('th') !== null;
      const newCell = document.createElement(isHeader ? 'th' : 'td');
      newCell.className = isHeader
        ? isLight
          ? 'border border-slate-300 bg-slate-100 p-2 text-left font-bold text-slate-900'
          : 'border border-slate-700 bg-slate-800 p-2 text-left font-bold text-slate-200'
        : isLight
        ? 'border border-slate-300 p-2 text-slate-800'
        : 'border border-slate-700 p-2 text-slate-200';
      newCell.innerHTML = isHeader ? (language === 'id' ? 'Kolom Baru' : 'New Column') : '&nbsp;';

      const existingCell = row.children[targetIdx] || null;
      row.insertBefore(newCell, existingCell);
    });

    onTableModified();
  };

  // 5. Insert Column Right
  const handleInsertColumnRight = () => {
    const { allRows, currentColIdx: targetIdx } = getTableInfo();
    allRows.forEach((row) => {
      const isHeader = row.parentElement?.tagName.toLowerCase() === 'thead' || row.querySelector('th') !== null;
      const newCell = document.createElement(isHeader ? 'th' : 'td');
      newCell.className = isHeader
        ? isLight
          ? 'border border-slate-300 bg-slate-100 p-2 text-left font-bold text-slate-900'
          : 'border border-slate-700 bg-slate-800 p-2 text-left font-bold text-slate-200'
        : isLight
        ? 'border border-slate-300 p-2 text-slate-800'
        : 'border border-slate-700 p-2 text-slate-200';
      newCell.innerHTML = isHeader ? (language === 'id' ? 'Kolom Baru' : 'New Column') : '&nbsp;';

      const existingCell = row.children[targetIdx + 1] || null;
      row.insertBefore(newCell, existingCell);
    });

    onTableModified();
  };

  // 6. Delete Current Column
  const handleDeleteColumn = () => {
    const { allRows, totalCols: count, currentColIdx: targetIdx } = getTableInfo();
    if (count <= 1) {
      handleDeleteTable();
      return;
    }

    allRows.forEach((row) => {
      const cellToDelete = row.children[targetIdx];
      if (cellToDelete) cellToDelete.remove();
    });

    onTableModified();
  };

  // 7. Distribute Columns Evenly (100% width, equal shares)
  const handleDistributeColumns = () => {
    const { allRows, totalCols: count } = getTableInfo();
    if (count === 0) return;

    activeTable.style.width = '100%';
    activeTable.style.tableLayout = 'fixed';
    const percentWidth = `${(100 / count).toFixed(2)}%`;

    allRows.forEach((row) => {
      Array.from(row.querySelectorAll<HTMLTableCellElement>('th, td')).forEach((cell) => {
        cell.style.width = percentWidth;
      });
    });

    onTableModified();
  };

  // 8. Toggle Full Width (100%) vs Auto
  const handleToggleFullWidth = () => {
    const isCurrentlyFull = activeTable.style.width === '100%' || activeTable.classList.contains('w-full');
    if (isCurrentlyFull) {
      activeTable.style.width = 'auto';
      activeTable.style.tableLayout = 'auto';
      activeTable.classList.remove('w-full');
      // Clear column specific percent widths
      activeTable.querySelectorAll<HTMLTableCellElement>('th, td').forEach((cell) => {
        cell.style.width = '';
      });
    } else {
      activeTable.style.width = '100%';
      activeTable.classList.add('w-full');
      handleDistributeColumns();
    }
    onTableModified();
  };

  // 9. Change Row Density / Padding
  const handleSetDensity = (density: 'compact' | 'normal' | 'spacious') => {
    setShowDensityMenu(false);
    const paddingStyle =
      density === 'compact'
        ? '0.25rem 0.5rem' // 4px 8px
        : density === 'spacious'
        ? '0.85rem 1.25rem' // 14px 20px
        : '0.5rem 0.75rem'; // 8px 12px

    activeTable.querySelectorAll<HTMLTableCellElement>('th, td').forEach((cell) => {
      cell.style.padding = paddingStyle;
    });

    onTableModified();
  };

  // 10. Delete Entire Table
  const handleDeleteTable = () => {
    const p = document.createElement('p');
    p.innerHTML = '<br/>';
    activeTable.parentElement?.insertBefore(p, activeTable.nextElementSibling || activeTable);
    activeTable.remove();
    onTableModified();

    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(p);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    onClose();
  };

  const isFullWidth = activeTable.style.width === '100%' || activeTable.classList.contains('w-full');

  return (
    <div
      ref={menuRef}
      style={coords ? { top: coords.top, left: coords.left } : undefined}
      className={`table-action-toolbar absolute z-30 flex items-center flex-wrap gap-1 p-1 rounded-xl shadow-xl border text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 max-w-[95vw] ${
        isLight
          ? 'bg-white/95 border-slate-300 text-slate-800 shadow-slate-300/60'
          : 'bg-[#1a2333]/95 border-slate-700/80 text-slate-200 shadow-black/50'
      }`}
      onMouseDown={(e) => {
        // Prevent loss of selection in editor
        e.preventDefault();
      }}
    >
      {/* Position Badge & Label */}
      <div
        className={`px-2 py-1 flex items-center gap-1.5 font-medium text-[11px] border-r ${
          isLight ? 'border-slate-200 text-slate-600' : 'border-slate-700/70 text-slate-400'
        }`}
      >
        <TableIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        <span className="hidden sm:inline font-mono">
          {language === 'id' ? `B${currentRowIdx + 1} : K${currentColIdx + 1}` : `R${currentRowIdx + 1} : C${currentColIdx + 1}`}
        </span>
        <span className="text-[10px] opacity-70">
          ({totalRows}×{totalCols})
        </span>
      </div>

      {/* Row Operations */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={handleInsertRowAbove}
          title={language === 'id' ? 'Sisipkan Baris di Atas' : 'Insert Row Above'}
          className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
            isLight ? 'hover:bg-slate-100 text-slate-700 hover:text-slate-950' : 'hover:bg-slate-700/70 text-slate-300 hover:text-white'
          }`}
        >
          <ArrowUp className="w-3 h-3 text-blue-500" />
          <span className="text-[11px] hidden md:inline">{language === 'id' ? '+ Baris Atas' : '+ Row Above'}</span>
        </button>

        <button
          type="button"
          onClick={handleInsertRowBelow}
          title={language === 'id' ? 'Sisipkan Baris di Bawah' : 'Insert Row Below'}
          className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
            isLight ? 'hover:bg-slate-100 text-slate-700 hover:text-slate-950' : 'hover:bg-slate-700/70 text-slate-300 hover:text-white'
          }`}
        >
          <ArrowDown className="w-3 h-3 text-blue-500" />
          <span className="text-[11px] hidden md:inline">{language === 'id' ? '+ Baris Bawah' : '+ Row Below'}</span>
        </button>

        <button
          type="button"
          onClick={handleDeleteRow}
          title={language === 'id' ? 'Hapus Baris Ini' : 'Delete Current Row'}
          className={`p-1 rounded-md transition ${
            isLight ? 'hover:bg-rose-50 text-rose-600' : 'hover:bg-rose-950/40 text-rose-400'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className={`h-4 w-px mx-0.5 ${isLight ? 'bg-slate-200' : 'bg-slate-700'}`} />

      {/* Column Operations */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={handleInsertColumnLeft}
          title={language === 'id' ? 'Sisipkan Kolom di Kiri' : 'Insert Column Left'}
          className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
            isLight ? 'hover:bg-slate-100 text-slate-700 hover:text-slate-950' : 'hover:bg-slate-700/70 text-slate-300 hover:text-white'
          }`}
        >
          <ArrowLeft className="w-3 h-3 text-emerald-500" />
          <span className="text-[11px] hidden md:inline">{language === 'id' ? '+ Kolom Kiri' : '+ Col Left'}</span>
        </button>

        <button
          type="button"
          onClick={handleInsertColumnRight}
          title={language === 'id' ? 'Sisipkan Kolom di Kanan' : 'Insert Column Right'}
          className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
            isLight ? 'hover:bg-slate-100 text-slate-700 hover:text-slate-950' : 'hover:bg-slate-700/70 text-slate-300 hover:text-white'
          }`}
        >
          <ArrowRight className="w-3 h-3 text-emerald-500" />
          <span className="text-[11px] hidden md:inline">{language === 'id' ? '+ Kolom Kanan' : '+ Col Right'}</span>
        </button>

        <button
          type="button"
          onClick={handleDeleteColumn}
          title={language === 'id' ? 'Hapus Kolom Ini' : 'Delete Current Column'}
          className={`p-1 rounded-md transition ${
            isLight ? 'hover:bg-rose-50 text-rose-600' : 'hover:bg-rose-950/40 text-rose-400'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className={`h-4 w-px mx-0.5 ${isLight ? 'bg-slate-200' : 'bg-slate-700'}`} />

      {/* Sizing & Width Operations */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={handleDistributeColumns}
          title={language === 'id' ? 'Ratakan Lebar Seluruh Kolom' : 'Distribute Columns Evenly'}
          className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
            isLight ? 'hover:bg-slate-100 text-slate-700 hover:text-slate-950' : 'hover:bg-slate-700/70 text-slate-300 hover:text-white'
          }`}
        >
          <MoveHorizontal className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[11px] hidden sm:inline">{language === 'id' ? 'Ratakan' : 'Distribute'}</span>
        </button>

        <button
          type="button"
          onClick={handleToggleFullWidth}
          title={isFullWidth ? (language === 'id' ? 'Lebar Otomatis' : 'Auto Width') : (language === 'id' ? 'Lebar Penuh 100%' : 'Full Width 100%')}
          className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
            isFullWidth
              ? isLight
                ? 'bg-blue-100 text-blue-700 font-semibold'
                : 'bg-blue-900/60 text-blue-300 font-semibold'
              : isLight
              ? 'hover:bg-slate-100 text-slate-700'
              : 'hover:bg-slate-700/70 text-slate-300'
          }`}
        >
          {isFullWidth ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span className="text-[11px] hidden sm:inline">{isFullWidth ? '100%' : 'Auto'}</span>
        </button>

        {/* Row Density / Height dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDensityMenu(!showDensityMenu)}
            title={language === 'id' ? 'Atur Spasi / Tinggi Baris' : 'Adjust Row Spacing'}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
              isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-700/70 text-slate-300'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] hidden lg:inline">{language === 'id' ? 'Tinggi' : 'Height'}</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </button>

          {showDensityMenu && (
            <div
              className={`absolute top-full left-0 mt-1 py-1 w-32 rounded-lg shadow-xl border text-xs z-40 ${
                isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#161d2b] border-slate-700 text-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => handleSetDensity('compact')}
                className={`w-full px-3 py-1.5 text-left transition ${
                  isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-700/70'
                }`}
              >
                {language === 'id' ? 'Kompak (Rapat)' : 'Compact'}
              </button>
              <button
                type="button"
                onClick={() => handleSetDensity('normal')}
                className={`w-full px-3 py-1.5 text-left transition ${
                  isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-700/70'
                }`}
              >
                {language === 'id' ? 'Standar (Normal)' : 'Normal'}
              </button>
              <button
                type="button"
                onClick={() => handleSetDensity('spacious')}
                className={`w-full px-3 py-1.5 text-left transition ${
                  isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-700/70'
                }`}
              >
                {language === 'id' ? 'Luas (Lega)' : 'Spacious'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={`h-4 w-px mx-0.5 ${isLight ? 'bg-slate-200' : 'bg-slate-700'}`} />

      {/* Delete Table */}
      <button
        type="button"
        onClick={handleDeleteTable}
        title={language === 'id' ? 'Hapus Seluruh Tabel' : 'Delete Table'}
        className={`flex items-center gap-1 px-2 py-1 rounded-md transition font-medium ${
          isLight
            ? 'hover:bg-rose-100 text-rose-700'
            : 'hover:bg-rose-950/70 text-rose-400'
        }`}
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span className="text-[11px] hidden sm:inline">{language === 'id' ? 'Hapus Tabel' : 'Delete'}</span>
      </button>
    </div>
  );
};
