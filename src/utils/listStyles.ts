/**
 * Qalam Note - Word-like List Styles & Multilevel Utilities
 * Supports custom bullets, alphabetic (a., A., a)), roman numerals (i., I.),
 * and custom prefixes/suffixes.
 */

export interface BulletStyleOption {
  id: string;
  labelId: string;
  labelEn: string;
  symbol: string;
  cssType?: string;
  sample: string[];
}

export interface NumberedStyleOption {
  id: string;
  labelId: string;
  labelEn: string;
  typeAttr: string;
  cssType: string;
  formatFn: (index: number) => string;
  sample: string[];
}

export function toRoman(num: number, upper = true): string {
  if (num < 1 || num > 3999) return String(num);
  const map: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let res = '';
  for (const [v, r] of map) {
    while (num >= v) {
      res += r;
      num -= v;
    }
  }
  return upper ? res : res.toLowerCase();
}

export function fromRoman(str: string): number {
  const map: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };
  const s = str.toUpperCase().trim();
  let num = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = map[s[i]] || 0;
    const next = map[s[i + 1]] || 0;
    if (cur < next) {
      num += next - cur;
      i++;
    } else {
      num += cur;
    }
  }
  return num > 0 ? num : 1;
}

export function toAlpha(num: number, upper = false): string {
  let s = '';
  let n = num;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return upper ? s : s.toLowerCase();
}

export function fromAlpha(str: string): number {
  const s = str.toUpperCase().trim();
  let num = 0;
  for (let i = 0; i < s.length; i++) {
    num = num * 26 + (s.charCodeAt(i) - 64);
  }
  return num > 0 ? num : 1;
}

export const BULLET_STYLES: BulletStyleOption[] = [
  {
    id: 'disc',
    labelId: 'Lingkaran Padat (Disc •)',
    labelEn: 'Solid Disc (•)',
    symbol: '•',
    cssType: 'disc',
    sample: ['• Butir pertama', '• Butir kedua', '• Butir ketiga'],
  },
  {
    id: 'circle',
    labelId: 'Lingkaran Cincin (Circle ○)',
    labelEn: 'Hollow Circle (○)',
    symbol: '○',
    cssType: 'circle',
    sample: ['○ Poin pembuka', '○ Poin penjelasan', '○ Poin penutup'],
  },
  {
    id: 'square',
    labelId: 'Kotak Padat (Square ■)',
    labelEn: 'Solid Square (■)',
    symbol: '■',
    cssType: 'square',
    sample: ['■ Rincian teknis', '■ Parameter sistem', '■ Spesifikasi'],
  },
  {
    id: 'diamond',
    labelId: 'Wajik / Intan (Diamond ◆)',
    labelEn: 'Diamond (◆)',
    symbol: '◆',
    cssType: "'◆ '",
    sample: ['◆ Konsep kunci', '◆ Analisis data', '◆ Kesimpulan'],
  },
  {
    id: 'arrow',
    labelId: 'Panah Arah (Arrow ➔)',
    labelEn: 'Arrow (➔)',
    symbol: '➔',
    cssType: "'➔ '",
    sample: ['➔ Langkah pertama', '➔ Tindakan lanjut', '➔ Hasil akhir'],
  },
  {
    id: 'check',
    labelId: 'Tanda Centang (Checkmark ✔)',
    labelEn: 'Checkmark (✔)',
    symbol: '✔',
    cssType: "'✔ '",
    sample: ['✔ Terverifikasi', '✔ Selesai disetujui', '✔ Siap rilis'],
  },
  {
    id: 'star',
    labelId: 'Bintang Sorot (Star ★)',
    labelEn: 'Star (★)',
    symbol: '★',
    cssType: "'★ '",
    sample: ['★ Poin istimewa', '★ Fitur unggulan', '★ Rekomendasi'],
  },
  {
    id: 'dash',
    labelId: 'Garis Panjang (Em Dash —)',
    labelEn: 'Dash (—)',
    symbol: '—',
    cssType: "'— '",
    sample: ['— Catatan ringkas', '— Keterangan', '— Tambahan'],
  },
];

export const NUMBERED_STYLES: NumberedStyleOption[] = [
  {
    id: 'decimal',
    labelId: 'Angka Biasa (1. 2. 3.)',
    labelEn: 'Decimal (1. 2. 3.)',
    typeAttr: '1',
    cssType: 'decimal',
    formatFn: (i) => `${i}. `,
    sample: ['1. Pendahuluan', '2. Pembahasan', '3. Penutup'],
  },
  {
    id: 'decimal-paren',
    labelId: 'Angka Kurung (1) 2) 3))',
    labelEn: 'Decimal Paren (1) 2) 3))',
    typeAttr: '1',
    cssType: 'decimal',
    formatFn: (i) => `${i}) `,
    sample: ['1) Syarat umum', '2) Ketentuan khusus', '3) Lampiran'],
  },
  {
    id: 'upper-alpha',
    labelId: 'Abjad Kapital (A. B. C.)',
    labelEn: 'Uppercase Alpha (A. B. C.)',
    typeAttr: 'A',
    cssType: 'upper-alpha',
    formatFn: (i) => `${toAlpha(i, true)}. `,
    sample: ['A. Opsi pertama', 'B. Opsi kedua', 'C. Opsi ketiga'],
  },
  {
    id: 'lower-alpha',
    labelId: 'Abjad Kecil (a. b. c.)',
    labelEn: 'Lowercase Alpha (a. b. c.)',
    typeAttr: 'a',
    cssType: 'lower-alpha',
    formatFn: (i) => `${toAlpha(i, false)}. `,
    sample: ['a. Definisi awal', 'b. Metodologi', 'c. Hasil uji'],
  },
  {
    id: 'lower-alpha-paren',
    labelId: 'Abjad Kurung (a) b) c))',
    labelEn: 'Lowercase Alpha Paren (a) b) c))',
    typeAttr: 'a',
    cssType: 'lower-alpha',
    formatFn: (i) => `${toAlpha(i, false)}) `,
    sample: ['a) Tahap desain', 'b) Tahap koding', 'c) Tahap audit'],
  },
  {
    id: 'upper-roman',
    labelId: 'Romawi Besar (I. II. III.)',
    labelEn: 'Uppercase Roman (I. II. III.)',
    typeAttr: 'I',
    cssType: 'upper-roman',
    formatFn: (i) => `${toRoman(i, true)}. `,
    sample: ['I. Bab Utama', 'II. Tinjauan Pustaka', 'III. Metodologi'],
  },
  {
    id: 'lower-roman',
    labelId: 'Romawi Kecil (i. ii. iii.)',
    labelEn: 'Lowercase Roman (i. ii. iii.)',
    typeAttr: 'i',
    cssType: 'lower-roman',
    formatFn: (i) => `${toRoman(i, false)}. `,
    sample: ['i. Kata Pengantar', 'ii. Daftar Isi', 'iii. Ringkasan'],
  },
];

/**
 * Checks if a line starts with any supported list marker
 */
export function parseListLineMarker(line: string): {
  indent: string;
  marker: string;
  type: 'todo' | 'bullet' | 'ordered';
  styleId?: string;
  nextMarker?: string;
  text: string;
} | null {
  // Checkbox / Todo
  const todoMatch = line.match(/^([ \t]*)(-\s*\[[ xX]\])\s+(.*)$/);
  if (todoMatch) {
    return {
      indent: todoMatch[1],
      marker: todoMatch[2],
      type: 'todo',
      nextMarker: '- [ ]',
      text: todoMatch[3],
    };
  }

  // Numbered: Decimal (1. or 1))
  const decMatch = line.match(/^([ \t]*)(\d+)([\.\)])\s+(.*)$/);
  if (decMatch) {
    const num = parseInt(decMatch[2], 10);
    const delim = decMatch[3];
    return {
      indent: decMatch[1],
      marker: `${num}${delim}`,
      type: 'ordered',
      styleId: delim === ')' ? 'decimal-paren' : 'decimal',
      nextMarker: `${num + 1}${delim}`,
      text: decMatch[4],
    };
  }

  // Numbered: Roman Uppercase (I. or I))
  const romanUpperMatch = line.match(/^([ \t]*)([IVXLCDM]+)([\.\)])\s+(.*)$/);
  if (romanUpperMatch) {
    const val = fromRoman(romanUpperMatch[2]);
    const delim = romanUpperMatch[3];
    return {
      indent: romanUpperMatch[1],
      marker: `${romanUpperMatch[2]}${delim}`,
      type: 'ordered',
      styleId: 'upper-roman',
      nextMarker: `${toRoman(val + 1, true)}${delim}`,
      text: romanUpperMatch[4],
    };
  }

  // Numbered: Roman Lowercase (i. or i))
  const romanLowerMatch = line.match(/^([ \t]*)(i{1,3}|iv|v|vi{0,3}|ix|x)([\.\)])\s+(.*)$/i);
  if (romanLowerMatch && /^[ivx]+$/.test(romanLowerMatch[2].toLowerCase())) {
    const val = fromRoman(romanLowerMatch[2]);
    const delim = romanLowerMatch[3];
    return {
      indent: romanLowerMatch[1],
      marker: `${romanLowerMatch[2]}${delim}`,
      type: 'ordered',
      styleId: 'lower-roman',
      nextMarker: `${toRoman(val + 1, false)}${delim}`,
      text: romanLowerMatch[4],
    };
  }

  // Numbered: Alpha Uppercase (A. or A))
  const alphaUpperMatch = line.match(/^([ \t]*)([A-Z])([\.\)])\s+(.*)$/);
  if (alphaUpperMatch) {
    const val = fromAlpha(alphaUpperMatch[2]);
    const delim = alphaUpperMatch[3];
    return {
      indent: alphaUpperMatch[1],
      marker: `${alphaUpperMatch[2]}${delim}`,
      type: 'ordered',
      styleId: 'upper-alpha',
      nextMarker: `${toAlpha(val + 1, true)}${delim}`,
      text: alphaUpperMatch[4],
    };
  }

  // Numbered: Alpha Lowercase (a. or a))
  const alphaLowerMatch = line.match(/^([ \t]*)([a-z])([\.\)])\s+(.*)$/);
  if (alphaLowerMatch) {
    const val = fromAlpha(alphaLowerMatch[2]);
    const delim = alphaLowerMatch[3];
    return {
      indent: alphaLowerMatch[1],
      marker: `${alphaLowerMatch[2]}${delim}`,
      type: 'ordered',
      styleId: delim === ')' ? 'lower-alpha-paren' : 'lower-alpha',
      nextMarker: `${toAlpha(val + 1, false)}${delim}`,
      text: alphaLowerMatch[4],
    };
  }

  // Custom icon or symbol bullet
  const bulletSymbolMatch = line.match(/^([ \t]*)([-*+•○■◆➔✔★—])\s+(.*)$/);
  if (bulletSymbolMatch) {
    const sym = bulletSymbolMatch[2];
    let styleId = 'disc';
    if (sym === '○') styleId = 'circle';
    else if (sym === '■') styleId = 'square';
    else if (sym === '◆') styleId = 'diamond';
    else if (sym === '➔') styleId = 'arrow';
    else if (sym === '✔') styleId = 'check';
    else if (sym === '★') styleId = 'star';
    else if (sym === '—') styleId = 'dash';

    return {
      indent: bulletSymbolMatch[1],
      marker: sym,
      type: 'bullet',
      styleId,
      nextMarker: sym,
      text: bulletSymbolMatch[3],
    };
  }

  return null;
}
