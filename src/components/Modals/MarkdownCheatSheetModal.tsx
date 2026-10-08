import React, { useState } from 'react';
import {
  X,
  Search,
  Copy,
  Check,
  PlusCircle,
  HelpCircle,
  BookOpen,
  Code2,
  Table as TableIcon,
  CheckSquare,
  Heading,
  Quote,
  Calculator,
  Type,
  Languages,
} from 'lucide-react';
import type { AppLanguage } from '../../types';

interface CheatSheetItem {
  id: string;
  category: 'text' | 'headings' | 'lists' | 'tables' | 'quotes' | 'code' | 'math' | 'bidi';
  title: string;
  syntax: string;
  preview: string;
  description: string;
}

interface MarkdownCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSnippet?: (snippet: string) => void;
  language?: AppLanguage;
  mathOnly?: boolean;
  initialCategory?: string;
}

export const MarkdownCheatSheetModal: React.FC<MarkdownCheatSheetModalProps> = ({
  isOpen,
  onClose,
  onInsertSnippet,
  language = 'id',
  mathOnly = false,
  initialCategory,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>(
    mathOnly ? 'math' : initialCategory || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync activeCategory when mathOnly or initialCategory changes
  React.useEffect(() => {
    if (mathOnly) {
      setActiveCategory('math');
    } else if (initialCategory) {
      setActiveCategory(initialCategory);
    }
  }, [mathOnly, initialCategory, isOpen]);

  if (!isOpen) return null;

  const isId = language === 'id';

  const CHEAT_SHEET_ITEMS: CheatSheetItem[] = [
    // Text formatting
    {
      id: 'text-bold',
      category: 'text',
      title: isId ? 'Teks Tebal (Bold)' : 'Bold Text',
      syntax: '**teks tebal**',
      preview: '<strong>teks tebal</strong>',
      description: isId ? 'Gunakan dua tanda bintang di awal dan akhir kata.' : 'Wrap text with double asterisks.',
    },
    {
      id: 'text-italic',
      category: 'text',
      title: isId ? 'Teks Miring (Italic)' : 'Italic Text',
      syntax: '*teks miring*',
      preview: '<em>teks miring</em>',
      description: isId ? 'Gunakan satu tanda bintang di awal dan akhir kata.' : 'Wrap text with single asterisks.',
    },
    {
      id: 'text-strike',
      category: 'text',
      title: isId ? 'Coretan (Strikethrough)' : 'Strikethrough',
      syntax: '~~teks dicoret~~',
      preview: '<del>teks dicoret</del>',
      description: isId ? 'Gunakan dua tanda tilde di awal dan akhir teks.' : 'Wrap text with double tildes.',
    },
    {
      id: 'text-highlight',
      category: 'text',
      title: isId ? 'Sorotan (Highlight)' : 'Highlight',
      syntax: '==teks disorot==',
      preview: '<mark class="bg-amber-500/40 text-amber-200 px-1 py-0.5 rounded">teks disorot</mark>',
      description: isId ? 'Gunakan dua tanda sama dengan untuk menyorot kata penting.' : 'Wrap text with double equals.',
    },
    {
      id: 'text-code-inline',
      category: 'text',
      title: isId ? 'Kode Segaris (Inline Code)' : 'Inline Code',
      syntax: '`console.log("hello")`',
      preview: '<code class="bg-slate-800 text-amber-300 px-1 py-0.5 rounded text-xs">console.log("hello")</code>',
      description: isId ? 'Gunakan tanda backtick untuk perintah atau kode pendek.' : 'Wrap with backticks.',
    },
    {
      id: 'text-underline',
      category: 'text',
      title: isId ? 'Garis Bawah (Underline)' : 'Underline',
      syntax: '<u>teks garis bawah</u>',
      preview: '<u>teks garis bawah</u>',
      description: isId ? 'Gunakan tag <u> untuk memberi garis bawah.' : 'Use <u> tag.',
    },

    // Headings
    {
      id: 'h1',
      category: 'headings',
      title: isId ? 'Judul Utama (H1)' : 'Heading 1 (H1)',
      syntax: '# Judul Utama',
      preview: '<h1 class="text-xl font-bold text-white">Judul Utama</h1>',
      description: isId ? 'Awali baris dengan satu tanda pagar (#).' : 'Start line with one hash.',
    },
    {
      id: 'h2',
      category: 'headings',
      title: isId ? 'Sub-Judul (H2)' : 'Heading 2 (H2)',
      syntax: '## Sub Judul Bagian',
      preview: '<h2 class="text-lg font-bold text-slate-100">Sub Judul Bagian</h2>',
      description: isId ? 'Awali baris dengan dua tanda pagar (##).' : 'Start line with two hashes.',
    },
    {
      id: 'h3',
      category: 'headings',
      title: isId ? 'Judul Sekunder (H3)' : 'Heading 3 (H3)',
      syntax: '### Judul Sekunder',
      preview: '<h3 class="text-base font-semibold text-slate-200">Judul Sekunder</h3>',
      description: isId ? 'Awali baris dengan tiga tanda pagar (###).' : 'Start line with three hashes.',
    },
    {
      id: 'hr',
      category: 'headings',
      title: isId ? 'Garis Pemisah Horisontal' : 'Horizontal Divider',
      syntax: '---',
      preview: '<hr class="border-slate-600 my-2" />',
      description: isId ? 'Tiga tanda strip berturut-turut untuk membuat garis pemisah.' : 'Three hyphens for a horizontal divider line.',
    },

    // Lists & Checklists
    {
      id: 'list-todo',
      category: 'lists',
      title: isId ? 'Daftar Tugas To-Do (Checklist)' : 'To-Do Checklist',
      syntax: '- [ ] Tugas belum selesai\n- [x] Tugas selesai dicentang',
      preview: '<div class="space-y-1"><div class="flex items-center gap-2"><input type="checkbox" disabled class="accent-blue-600" /><span>Tugas belum selesai</span></div><div class="flex items-center gap-2"><input type="checkbox" checked disabled class="accent-blue-600" /><span class="line-through text-slate-400">Tugas selesai dicentang</span></div></div>',
      description: isId ? 'Gunakan - [ ] untuk tugas belum selesai dan - [x] untuk tugas selesai.' : 'Use - [ ] for pending and - [x] for completed.',
    },
    {
      id: 'list-bullet',
      category: 'lists',
      title: isId ? 'Daftar Berpoin (Bullet List)' : 'Bullet List',
      syntax: '- Butir pertama\n- Butir kedua\n  - Sub butir',
      preview: '<ul class="list-disc ml-5 space-y-0.5 text-xs"><li>Butir pertama</li><li>Butir kedua</li></ul>',
      description: isId ? 'Gunakan tanda strip (-) atau bintang (*) diikuti spasi.' : 'Use hyphen (-) or asterisk (*) followed by space.',
    },
    {
      id: 'list-numbered',
      category: 'lists',
      title: isId ? 'Daftar Bernomor (Numbered List)' : 'Numbered List',
      syntax: '1. Langkah pertama\n2. Langkah kedua\n3. Langkah ketiga',
      preview: '<ol class="list-decimal ml-5 space-y-0.5 text-xs"><li>Langkah pertama</li><li>Langkah kedua</li></ol>',
      description: isId ? 'Ketik angka diikuti titik dan spasi.' : 'Type number followed by dot and space.',
    },

    // Tables
    {
      id: 'table-basic',
      category: 'tables',
      title: isId ? 'Tabel Data Sederhana' : 'Data Table',
      syntax: '| Fitur | Keterangan | Status |\n|---|---|:---:|\n| E2EE | Enkripsi AES-256 | Aktif |\n| GAS | Cloud Sheets | Gratis |',
      preview: '<table class="w-full text-xs border border-slate-700"><thead><tr class="bg-slate-800"><th class="p-1 border border-slate-700">Fitur</th><th class="p-1 border border-slate-700">Keterangan</th><th class="p-1 border border-slate-700 text-center">Status</th></tr></thead><tbody><tr><td class="p-1 border border-slate-700">E2EE</td><td class="p-1 border border-slate-700">Enkripsi AES-256</td><td class="p-1 border border-slate-700 text-center text-emerald-400">Aktif</td></tr></tbody></table>',
      description: isId ? 'Pisahkan kolom dengan pipa (|) dan atur alignment dengan titik dua (:).' : 'Separate columns with pipe (|) and alignment with colons (:).',
    },

    // Quotes & Callouts
    {
      id: 'quote-basic',
      category: 'quotes',
      title: isId ? 'Kutipan Standar (Blockquote)' : 'Blockquote',
      syntax: '> Ilmu adalah harta yang tidak pernah berkurang saat dibagikan.',
      preview: '<blockquote class="border-l-4 border-blue-500 bg-blue-950/20 pl-3 py-1 italic text-slate-300">Ilmu adalah harta yang tidak pernah berkurang saat dibagikan.</blockquote>',
      description: isId ? 'Awali baris dengan tanda lebih besar (>).' : 'Start line with greater than (>).',
    },
    {
      id: 'quote-callout-note',
      category: 'quotes',
      title: isId ? 'Catatan Admonisi (> [!NOTE])' : 'Note Callout (> [!NOTE])',
      syntax: '> [!NOTE] Perhatian\n> Pastikan Anda telah menyimpan kunci pemulihan E2EE.',
      preview: '<div class="p-2.5 rounded border-l-4 border-blue-500 bg-blue-950/30 text-blue-300 text-xs font-medium"><div class="font-bold mb-1">ℹ️ Perhatian</div>Pastikan Anda telah menyimpan kunci pemulihan E2EE.</div>',
      description: isId ? 'Kotak informasi beraksen biru gaya GitHub/Obsidian.' : 'Blue informational callout box.',
    },
    {
      id: 'quote-callout-tip',
      category: 'quotes',
      title: isId ? 'Tips Praktis (> [!TIP])' : 'Tip Callout (> [!TIP])',
      syntax: '> [!TIP] Kiat Cepat\n> Gunakan pintasan keyboard Ctrl+B untuk menebalkan teks dengan cepat.',
      preview: '<div class="p-2.5 rounded border-l-4 border-emerald-500 bg-emerald-950/30 text-emerald-300 text-xs font-medium"><div class="font-bold mb-1">💡 Kiat Cepat</div>Gunakan pintasan keyboard Ctrl+B untuk menebalkan teks.</div>',
      description: isId ? 'Kotak saran tips beraksen hijau.' : 'Green tip callout box.',
    },
    {
      id: 'quote-callout-warn',
      category: 'quotes',
      title: isId ? 'Peringatan (> [!WARNING])' : 'Warning Callout (> [!WARNING])',
      syntax: '> [!WARNING] Peringatan Keamanan\n> Jangan membagikan kata sandi master kepada pihak manapun.',
      preview: '<div class="p-2.5 rounded border-l-4 border-amber-500 bg-amber-950/30 text-amber-300 text-xs font-medium"><div class="font-bold mb-1">⚠️ Peringatan Keamanan</div>Jangan membagikan kata sandi master.</div>',
      description: isId ? 'Kotak waspada beraksen kuning amber.' : 'Amber warning callout box.',
    },

    // Code blocks
    {
      id: 'code-fenced',
      category: 'code',
      title: isId ? 'Blok Kode dengan Bahasa' : 'Fenced Code Block',
      syntax: '```typescript\nfunction salam(nama: string): string {\n  return `Halo, ${nama}!`;\n}\n```',
      preview: '<div class="bg-slate-900 border border-slate-800 p-2.5 rounded text-xs font-mono text-emerald-400"><div><span class="text-slate-500">// TypeScript</span></div><div>function salam(nama: string): string { ... }</div></div>',
      description: isId ? 'Gunakan tiga backtick (```) diikuti nama bahasa (ts, js, py, html, css, json).' : 'Use triple backticks with language identifier.',
    },

    // Math & Formulas
    {
      id: 'math-inline',
      category: 'math',
      title: isId ? 'Rumus Matematika Segaris (Inline Math)' : 'Inline Math',
      syntax: '$E = mc^2$',
      preview: '<span>Persamaan relativitas: <code class="bg-blue-950/30 text-blue-300 px-1 rounded font-mono text-xs">\\( E = mc^2 \\)</code></span>',
      description: isId ? 'Apit rumus matematika dengan satu tanda dollar ($...$).' : 'Wrap inline math with single dollar signs.',
    },
    {
      id: 'math-block',
      category: 'math',
      title: isId ? 'Rumus Matematika Blok Terpusat' : 'Display Math Block',
      syntax: '$$\n\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}\n$$',
      preview: '<div class="bg-blue-950/40 text-blue-300 p-2 rounded text-center font-mono text-xs">$$\\ \\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi} \\$$</div>',
      description: isId ? 'Gunakan tanda dollar ganda ($$...$$) untuk persamaan terpusat di baris baru.' : 'Use double dollar signs for centered display math.',
    },
    {
      id: 'math-fraction',
      category: 'math',
      title: isId ? 'Pecahan (Fraction)' : 'Fractions',
      syntax: '$$\\frac{a + b}{c - d}$$',
      preview: '<div class="bg-blue-950/40 text-blue-300 p-2 rounded text-center font-mono text-xs">$$\\ \\frac{a + b}{c - d} \\$$</div>',
      description: isId ? 'Gunakan \\frac{pembilang}{penyebut} untuk membuat pecahan.' : 'Use \\frac{numerator}{denominator} for fractions.',
    },
    {
      id: 'math-sqrt',
      category: 'math',
      title: isId ? 'Akar Kuadrat & Pangkat' : 'Square Roots & Powers',
      syntax: '$$x = \\sqrt{a^2 + b^2} \\quad \\text{atau} \\quad \\sqrt[n]{x}$$',
      preview: '<div class="bg-blue-950/40 text-blue-300 p-2 rounded text-center font-mono text-xs">$$\\ x = \\sqrt{a^2 + b^2} \\quad \\sqrt[n]{x} \\$$</div>',
      description: isId ? 'Gunakan \\sqrt{x} untuk akar dan ^2 untuk pangkat.' : 'Use \\sqrt{x} for roots and ^ for exponents.',
    },
    {
      id: 'math-quadratic',
      category: 'math',
      title: isId ? 'Rumus Kuadrat (ABC)' : 'Quadratic Formula',
      syntax: '$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$',
      preview: '<div class="bg-blue-950/40 text-blue-300 p-2 rounded text-center font-mono text-xs">$$\\ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\$$</div>',
      description: isId ? 'Persamaan kuadratik lengkap dengan simbol plus-minus (\\pm).' : 'Quadratic formula with plus-minus symbol (\\pm).',
    },
    {
      id: 'math-sum-int',
      category: 'math',
      title: isId ? 'Notasi Sigma & Integral' : 'Summation & Integrals',
      syntax: '$$\\sum_{k=1}^{n} k^2 = \\frac{n(n+1)(2n+1)}{6}$$',
      preview: '<div class="bg-blue-950/40 text-blue-300 p-2 rounded text-center font-mono text-xs">$$\\ \\sum_{k=1}^{n} k^2 = \\frac{n(n+1)(2n+1)}{6} \\$$</div>',
      description: isId ? 'Gunakan \\sum_{bawah}^{atas} dan \\int_{bawah}^{atas}.' : 'Use \\sum and \\int with lower/upper limits.',
    },
    {
      id: 'math-greek',
      category: 'math',
      title: isId ? 'Huruf Yunani & Simbol' : 'Greek Letters & Symbols',
      syntax: '$$\\alpha, \\beta, \\gamma, \\theta, \\lambda, \\pi, \\sigma, \\omega, \\infty$$',
      preview: '<div class="bg-blue-950/40 text-blue-300 p-2 rounded text-center font-mono text-xs">$$\\ \\alpha, \\beta, \\gamma, \\theta, \\lambda, \\pi, \\sigma, \\omega, \\infty \\$$</div>',
      description: isId ? 'Gunakan nama huruf diawali backslash seperti \\alpha atau \\pi.' : 'Prefix Greek letter names with backslash.',
    },
    {
      id: 'math-matrix',
      category: 'math',
      title: isId ? 'Matriks (Matrix)' : 'Matrices',
      syntax: '$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$',
      preview: '<div class="bg-blue-950/40 text-blue-300 p-2 rounded text-center font-mono text-xs">$$\\ \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\$$</div>',
      description: isId ? 'Gunakan \\begin{pmatrix} dengan & sebagai pemisah kolom dan \\\\ sebagai baris baru.' : 'Use \\begin{pmatrix} with & for columns and \\\\ for rows.',
    },

    // Bidi (LTR & RTL)
    {
      id: 'bidi-rtl',
      category: 'bidi',
      title: isId ? 'Blok Aksara Kanan-ke-Kiri (RTL - Arab/Ibrani)' : 'RTL Writing Block (Arabic/Hebrew)',
      syntax: '<div dir="rtl">\n\n# بسم الله الرحمن الرحيم\n\nهذا نص مكتوب من اليمين إلى اليسار في قلم نوت.\n\n</div>',
      preview: '<div dir="rtl" class="text-right p-2 rounded bg-slate-800/60 text-slate-100 text-sm font-arabic"><div class="font-bold text-base mb-1">بسم الله الرحمن الرحيم</div><div>هذا نص مكتوب من اليمين إلى اليسار في قلم نوت.</div></div>',
      description: isId ? 'Bungkus catatan aksara Arab/Ibrani dengan tag <div dir="rtl"> agar tata letak teks otomatis rata kanan.' : 'Wrap Arabic or RTL scripts in <div dir="rtl"> for native right-to-left layout.',
    },
  ];

  const categories = [
    { id: 'all', label: isId ? 'Semua' : 'All', icon: BookOpen },
    { id: 'text', label: isId ? 'Format Teks' : 'Text Formatting', icon: Type },
    { id: 'headings', label: isId ? 'Judul & Garis' : 'Headings & Divider', icon: Heading },
    { id: 'lists', label: isId ? 'Daftar & To-Do' : 'Lists & Tasks', icon: CheckSquare },
    { id: 'tables', label: isId ? 'Tabel' : 'Tables', icon: TableIcon },
    { id: 'quotes', label: isId ? 'Kutipan & Callout' : 'Quotes & Callouts', icon: Quote },
    { id: 'code', label: isId ? 'Blok Kode' : 'Code Blocks', icon: Code2 },
    { id: 'math', label: isId ? 'Matematika' : 'Math Formulas', icon: Calculator },
    { id: 'bidi', label: isId ? 'Aksara RTL (Arab)' : 'RTL Scripts', icon: Languages },
  ];

  const filteredItems = CHEAT_SHEET_ITEMS.filter((item) => {
    const matchCategory = activeCategory === 'all' || item.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchCategory;
    const matchQuery =
      item.title.toLowerCase().includes(q) ||
      item.syntax.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q);
    return matchCategory && matchQuery;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleInsert = (snippet: string) => {
    if (onInsertSnippet) {
      onInsertSnippet(snippet);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 select-none"
    >
      <div className="relative w-full h-full sm:h-auto max-w-4xl bg-[#1b2434] border-0 sm:border border-slate-700 sm:rounded-2xl rounded-none shadow-2xl overflow-hidden flex flex-col sm:max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-[#202b3f] border-b border-slate-700/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
              {mathOnly ? <Calculator className="w-5 h-5 text-blue-400" /> : <BookOpen className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 flex-wrap">
                <span className="truncate">
                  {mathOnly
                    ? (isId ? 'Panduan Rumus Matematika (LaTeX)' : 'Math Formula & LaTeX Guide')
                    : (isId ? 'Panduan & Cheatsheet Markdown' : 'Markdown Cheatsheet & Guide')}
                </span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 shrink-0">
                  {mathOnly ? 'LaTeX Syntax' : 'GFM + KaTeX + RTL'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                {mathOnly
                  ? (isId
                      ? 'Panduan penulisan rumus matematika dan persamaan ilmiah standar LaTeX.'
                      : 'Standard LaTeX math equation and scientific expression guide.')
                  : (isId
                      ? 'Kumpulan sintaks penulisan cepat untuk memformat catatan dengan rapi.'
                      : 'Quick syntax reference to format your notes beautifully.')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/60 active:scale-95 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-6 py-3 bg-[#182130] border-b border-slate-700/70 flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                mathOnly
                  ? (isId ? 'Cari rumus matematika (misal: integral, pecahan, akar, matriks)...' : 'Search math formulas (e.g. integral, fraction, sqrt, matrix)...')
                  : (isId ? 'Cari sintaks (misal: tabel, checklist, tebal, math)...' : 'Search syntax (e.g. table, checklist, bold, math)...')
              }
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Categories - hide when mathOnly is true */}
          {!mathOnly && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Items Grid Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              {isId ? 'Tidak ada sintaks yang cocok dengan pencarian.' : 'No syntax matched your search.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col bg-slate-900/70 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition"
                >
                  {/* Item Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="text-xs font-bold text-white">{item.title}</h4>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy(item.id, item.syntax)}
                        title={isId ? 'Salin Sintaks' : 'Copy Syntax'}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">{isId ? 'Tersalin' : 'Copied'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{isId ? 'Salin' : 'Copy'}</span>
                          </>
                        )}
                      </button>
                      {onInsertSnippet && (
                        <button
                          onClick={() => handleInsert(item.syntax)}
                          title={isId ? 'Sisipkan langsung ke dalam catatan' : 'Insert into note'}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 hover:text-white transition"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>{isId ? 'Sisipkan' : 'Insert'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-400 mb-2.5 leading-relaxed">{item.description}</p>

                  {/* Code Syntax Box */}
                  <div className="bg-[#121824] border border-slate-800/90 rounded p-2.5 font-mono text-xs text-amber-300 overflow-x-auto whitespace-pre-wrap select-all">
                    {item.syntax}
                  </div>

                  {/* Preview Box */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">
                      {isId ? 'Hasil Render:' : 'Rendered Output:'}
                    </span>
                    <div
                      className="text-xs text-slate-200 bg-slate-800/40 p-2 rounded border border-slate-700/40"
                      dangerouslySetInnerHTML={{ __html: item.preview }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#202b3f] border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span>
              {isId
                ? 'Tip: Anda dapat beralih ke Mode Split di bilah alat untuk melihat pratinjau langsung berdampingan.'
                : 'Tip: You can switch to Split View on the toolbar to preview changes side-by-side.'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
          >
            {isId ? 'Tutup' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
