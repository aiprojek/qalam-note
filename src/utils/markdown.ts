/**
 * Qalam Note - Markdown Parser & HTML Renderer
 * Handles markdown formatting, checklists, tables, code blocks, and math preview with sanitization
 * Supports Dark/Light themes and RTL (Right-to-Left) rendering
 */

import DOMPurify from 'dompurify';
import { RTL_REGEX } from './rtl';

export interface MarkdownOptions {
  theme?: 'dark' | 'light';
  direction?: 'ltr' | 'rtl';
}

/**
 * Converts ASCII emoticons and Slack/GitHub style emoji shortcodes to native Unicode emojis.
 * Preserves code fences and inline code verbatim.
 */
export function convertEmoticonsAndShortcodes(text: string): string {
  if (!text) return '';

  // Extract code blocks, math blocks, and inline code to preserve them verbatim
  const preserved: string[] = [];
  let tokenized = text.replace(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$|`[^`\n]+`|\$[^\$\n]+?\$)/g, (match) => {
    preserved.push(match);
    return `%%QLM_CODE_${preserved.length - 1}%%`;
  });

  // Emoticon and shortcode replacements map
  const replacements: [RegExp, string][] = [
    // Standard smileys (must be preceded by start, space, or parenthesis, followed by end, space, or punctuation)
    [/(^|[\s(]):-?\)(?=[\s).,!?]|$)/g, '$1😊'],
    [/(^|[\s(]):-?D(?=[\s).,!?]|$)/g, '$1😃'],
    [/(^|[\s(]);-?\)(?=[\s).,!?]|$)/g, '$1😉'],
    [/(^|[\s(]):-?[pP](?=[\s).,!?]|$)/g, '$1😛'],
    [/(^|[\s(]):-?[oO](?=[\s).,!?]|$)/g, '$1😮'],
    [/(^|[\s(]):-?\((?=[\s).,!?]|$)/g, '$1🙁'],
    [/(^|[\s(]):'-\((?=[\s).,!?]|$)/g, '$1😢'],
    [/(^|[\s(]):-?\|(?=[\s).,!?]|$)/g, '$1😐'],
    [/(^|[\s(])<3(?=[\s).,!?]|$)/g, '$1❤️'],
    [/(^|[\s(])\(y\)(?=[\s).,!?]|$)/gi, '$1👍'],
    [/(^|[\s(])\(n\)(?=[\s).,!?]|$)/gi, '$1👎'],
    [/(^|[\s(])xD(?=[\s).,!?]|$)/g, '$1😆'],
    [/(^|[\s(])XD(?=[\s).,!?]|$)/g, '$1😆'],
    [/(^|[\s(])\^_\^(?=[\s).,!?]|$)/g, '$1😊'],
    [/(^|[\s(])T_T(?=[\s).,!?]|$)/g, '$1😭'],
    // Slack/GitHub style emoji shortcodes
    [/:rocket:/gi, '🚀'],
    [/:fire:/gi, '🔥'],
    [/:star:/gi, '⭐'],
    [/:star2:/gi, '🌟'],
    [/:bulb:/gi, '💡'],
    [/:memo:/gi, '📝'],
    [/:pencil2?:/gi, '✏️'],
    [/:folder:/gi, '📂'],
    [/:clock[0-9]*:/gi, '🕒'],
    [/:tag:/gi, '🏷️'],
    [/:warning:/gi, '⚠️'],
    [/:check:|:white_check_mark:/gi, '✅'],
    [/:x:|:cross_mark:/gi, '❌'],
    [/:link:/gi, '🔗'],
    [/:book:|:books:/gi, '📖'],
    [/:heart:/gi, '❤️'],
    [/:smile:/gi, '😊'],
    [/:grin:/gi, '😁'],
    [/:joy:/gi, '😂'],
    [/:rofl:/gi, '🤣'],
    [/:wink:/gi, '😉'],
    [/:thumbsup:|\:\+1\:/gi, '👍'],
    [/:thumbsdown:|\:\-1\:/gi, '👎'],
    [/:clap:/gi, '👏'],
    [/:party:|:tada:/gi, '🎉'],
    [/:sparkles:/gi, '✨'],
    [/:100:/gi, '💯'],
    [/:pin:/gi, '📌'],
    [/:key:/gi, '🔑'],
    [/:lock:/gi, '🔒'],
    [/:unlock:/gi, '🔓'],
    [/:bell:/gi, '🔔'],
    [/:gear:/gi, '⚙️'],
    [/:target:/gi, '🎯'],
    [/:trophy:/gi, '🏆'],
    [/:eyes:/gi, '👀'],
    [/:wave:/gi, '👋'],
    [/:pray:/gi, '🙏'],
  ];

  for (const [pattern, rep] of replacements) {
    tokenized = tokenized.replace(pattern, rep);
  }

  // Restore preserved code blocks verbatim
  tokenized = tokenized.replace(/%%QLM_CODE_(\d+)%%/g, (_m, idxStr) => {
    return preserved[parseInt(idxStr, 10)] || '';
  });

  return tokenized;
}

export function markdownToHtml(
  md: string,
  options?: 'dark' | 'light' | MarkdownOptions
): string {
  if (!md) return '';

  const theme: 'dark' | 'light' =
    typeof options === 'string'
      ? options
      : options?.theme || 'dark';

  const isLight = theme === 'light';

  // Process emoticons and shortcodes first
  let html = convertEmoticonsAndShortcodes(md);

  // Math Blocks: $$...$$ (always LTR)
  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_match, formula) => {
    const escaped = formula.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return isLight
      ? `<div dir="ltr" class="qalam-math-block font-mono bg-blue-50 text-blue-900 p-2.5 my-2.5 rounded-lg border border-blue-200 text-center shadow-xs">$$\\ ${escaped.trim()} \\$$</div>`
      : `<div dir="ltr" class="qalam-math-block font-mono bg-blue-950/40 text-blue-300 p-2.5 my-2.5 rounded-lg border border-blue-800/50 text-center">$$\\ ${escaped.trim()} \\$$</div>`;
  });

  // Math Inline: $...$ (always LTR)
  html = html.replace(/\$([^\$\n]+?)\$/g, (_match, formula) => {
    const escaped = formula.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return isLight
      ? `<code dir="ltr" class="qalam-math-inline bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded text-xs border border-blue-200">\\( ${escaped.trim()} \\)</code>`
      : `<code dir="ltr" class="qalam-math-inline bg-blue-950/30 text-blue-300 px-1.5 py-0.5 rounded text-xs border border-blue-900/50">\\( ${escaped.trim()} \\)</code>`;
  });

  // Fenced Code Blocks with language (always LTR, escape contents)
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return isLight
      ? `<div dir="ltr" class="qalam-code-block relative my-3 rounded-lg bg-slate-50 border border-slate-300 p-3.5 overflow-x-auto text-left"><div class="absolute right-2.5 top-1.5 text-[10px] text-slate-500 uppercase tracking-wider font-mono">${lang || 'code'}</div><pre class="font-mono text-sm text-slate-900 whitespace-pre-wrap break-all overflow-wrap-anywhere"><code>${escaped}</code></pre></div>`
      : `<div dir="ltr" class="qalam-code-block relative my-3 rounded-lg bg-slate-900 border border-slate-800 p-3.5 overflow-x-auto text-left"><div class="absolute right-2.5 top-1.5 text-[10px] text-slate-400 uppercase tracking-wider font-mono">${lang || 'code'}</div><pre class="font-mono text-sm text-emerald-400 whitespace-pre-wrap break-all overflow-wrap-anywhere"><code>${escaped}</code></pre></div>`;
  });

  // Inline Code (always LTR, escape contents)
  html = html.replace(/`([^`\n]+)`/g, (_match, code) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return isLight
      ? `<code dir="ltr" class="px-1.5 py-0.5 rounded bg-slate-100 text-rose-700 font-mono text-xs border border-slate-300 font-medium whitespace-pre-wrap break-all overflow-wrap-anywhere">${escaped}</code>`
      : `<code dir="ltr" class="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-xs border border-slate-700/50 whitespace-pre-wrap break-all overflow-wrap-anywhere">${escaped}</code>`;
  });

  // Headings with RTL alignment support
  if (isLight) {
    html = html.replace(/^###### (.*$)/gim, '<h6 class="text-xs font-bold text-slate-700 mt-4 mb-1.5 uppercase tracking-wider rtl:text-right">$1</h6>');
    html = html.replace(/^##### (.*$)/gim, '<h5 class="text-sm font-bold text-slate-800 mt-4 mb-2 rtl:text-right">$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4 class="text-base font-bold text-slate-900 mt-4 mb-2 rtl:text-right">$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-slate-950 mt-5 mb-2.5 rtl:text-right">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-extrabold text-slate-950 mt-6 mb-3 pb-1 border-b border-slate-200 rtl:text-right">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-black text-slate-950 mt-6 mb-4 pb-2 border-b border-slate-300 rtl:text-right">$1</h1>');
  } else {
    html = html.replace(/^###### (.*$)/gim, '<h6 class="text-xs font-bold text-slate-300 mt-4 mb-1.5 uppercase tracking-wider rtl:text-right">$1</h6>');
    html = html.replace(/^##### (.*$)/gim, '<h5 class="text-sm font-bold text-slate-200 mt-4 mb-2 rtl:text-right">$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4 class="text-base font-semibold text-slate-200 mt-4 mb-2 rtl:text-right">$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-slate-100 mt-5 mb-2.5 rtl:text-right">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-6 mb-3 pb-1 border-b border-slate-800 rtl:text-right">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-6 mb-4 pb-2 border-b border-slate-700 rtl:text-right">$1</h1>');
  }

  // Horizontal rules
  html = html.replace(
    /^(?:---|\*\*\*|___)\s*$/gim,
    isLight ? '<hr class="my-6 border-slate-300" />' : '<hr class="my-6 border-slate-700/80" />'
  );

  // Callouts / Admonitions: > [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT]
  html = html.replace(
    /^>\s+\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\](?:\s+(.*))?$/gim,
    (_match, type, title) => {
      const upper = type.toUpperCase();
      if (isLight) {
        let borderColor = 'border-blue-600 bg-blue-50 text-blue-950';
        let titleColor = 'text-blue-700';
        let icon = 'ℹ️';
        let label = title || 'Note';

        if (upper === 'TIP') {
          borderColor = 'border-emerald-600 bg-emerald-50 text-emerald-950';
          titleColor = 'text-emerald-700';
          icon = '💡';
          label = title || 'Tip';
        } else if (upper === 'WARNING' || upper === 'CAUTION') {
          borderColor = 'border-amber-600 bg-amber-50 text-amber-950';
          titleColor = 'text-amber-800';
          icon = '⚠️';
          label = title || 'Warning';
        } else if (upper === 'IMPORTANT') {
          borderColor = 'border-purple-600 bg-purple-50 text-purple-950';
          titleColor = 'text-purple-700';
          icon = '📌';
          label = title || 'Important';
        }

        return `<div class="qalam-callout my-3 p-3 rounded-lg border-l-4 ${borderColor}"><div class="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide mb-1 ${titleColor}"><span>${icon}</span><span>${label}</span></div>`;
      }

      let borderColor = 'border-blue-500 bg-blue-950/30 text-blue-300';
      let titleColor = 'text-blue-400';
      let icon = 'ℹ️';
      let label = title || 'Note';

      if (upper === 'TIP') {
        borderColor = 'border-emerald-500 bg-emerald-950/30 text-emerald-300';
        titleColor = 'text-emerald-400';
        icon = '💡';
        label = title || 'Tip';
      } else if (upper === 'WARNING' || upper === 'CAUTION') {
        borderColor = 'border-amber-500 bg-amber-950/30 text-amber-300';
        titleColor = 'text-amber-400';
        icon = '⚠️';
        label = title || 'Warning';
      } else if (upper === 'IMPORTANT') {
        borderColor = 'border-purple-500 bg-purple-950/30 text-purple-300';
        titleColor = 'text-purple-400';
        icon = '📌';
        label = title || 'Important';
      }

      return `<div class="qalam-callout my-3 p-3 rounded-lg border-l-4 ${borderColor}"><div class="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide mb-1 ${titleColor}"><span>${icon}</span><span>${label}</span></div>`;
    }
  );

  // Highlights: ==highlight text==
  html = html.replace(
    /==(.*?)==/g,
    isLight
      ? '<mark class="bg-amber-200 text-amber-900 px-1 py-0.5 rounded font-medium">$1</mark>'
      : '<mark class="bg-amber-500/30 text-amber-200 px-1 py-0.5 rounded font-medium">$1</mark>'
  );

  // Underlines: <u>text</u> or <ins>text</ins>
  html = html.replace(/<ins>(.*?)<\/ins>/gi, '<u class="underline underline-offset-2">$1</u>');

  // Subscript ~text~ and Superscript ^text^
  html = html.replace(/~([a-zA-Z0-9]+)~/g, '<sub>$1</sub>');
  html = html.replace(/\^([a-zA-Z0-9]+)\^/g, '<sup>$1</sup>');

  // Blockquotes with RTL detection and mirrored styling
  html = html.replace(/^>\s+(.*$)/gim, (_match, quoteContent) => {
    const isQuoteRtl = RTL_REGEX.test(quoteContent);
    if (isQuoteRtl) {
      return isLight
        ? `<blockquote dir="rtl" class="border-r-4 border-l-0 border-blue-600 bg-blue-50/70 pr-4 pl-0 py-2 my-3 text-slate-800 italic rounded-l text-right font-arabic break-words overflow-wrap-anywhere" style="direction: rtl; unicode-bidi: isolate; text-align: right;">${quoteContent}</blockquote>`
        : `<blockquote dir="rtl" class="border-r-4 border-l-0 border-blue-500 bg-blue-950/20 pr-4 pl-0 py-2 my-3 text-slate-300 italic rounded-l text-right font-arabic break-words overflow-wrap-anywhere" style="direction: rtl; unicode-bidi: isolate; text-align: right;">${quoteContent}</blockquote>`;
    }
    return isLight
      ? `<blockquote class="border-l-4 rtl:border-l-0 rtl:border-r-4 border-blue-600 bg-blue-50/70 pl-4 rtl:pl-0 rtl:pr-4 py-2 my-3 text-slate-800 italic rounded-r rtl:rounded-r-none rtl:rounded-l rtl:text-right break-words overflow-wrap-anywhere">${quoteContent}</blockquote>`
      : `<blockquote class="border-l-4 rtl:border-l-0 rtl:border-r-4 border-blue-500 bg-blue-950/20 pl-4 rtl:pl-0 rtl:pr-4 py-2 my-3 text-slate-300 italic rounded-r rtl:rounded-r-none rtl:rounded-l rtl:text-right break-words overflow-wrap-anywhere">${quoteContent}</blockquote>`;
  });

  // Details / Collapsible Spoiler: <details><summary>Title</summary>Body</details>
  html = html.replace(
    /<details>([\s\S]*?)<\/details>/gi,
    isLight
      ? '<details class="my-3 p-3 bg-slate-50 rounded-lg border border-slate-300 text-slate-900 cursor-pointer">$1</details>'
      : '<details class="my-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-slate-200 cursor-pointer">$1</details>'
  );
  html = html.replace(
    /<summary>(.*?)<\/summary>/gi,
    isLight
      ? '<summary class="font-semibold text-blue-700 hover:text-blue-800 select-none cursor-pointer outline-none mb-2">$1</summary>'
      : '<summary class="font-semibold text-blue-400 hover:text-blue-300 select-none cursor-pointer outline-none mb-2">$1</summary>'
  );

  // Keyboard tags: <kbd>Ctrl</kbd>
  html = html.replace(
    /<kbd>(.*?)<\/kbd>/gi,
    isLight
      ? '<kbd class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs border border-slate-300 shadow-xs">$1</kbd>'
      : '<kbd class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs border border-slate-600 shadow-xs">$1</kbd>'
  );

  // Checklists (interactive with RTL flex reversal, NO disabled attribute)
  if (isLight) {
    html = html.replace(
      /^-\s*\[x\]\s+(.*$)/gim,
      '<div class="qalam-todo-item flex items-start gap-2.5 my-1.5 rtl:flex-row-reverse"><input type="checkbox" checked class="qalam-todo-checkbox mt-1 accent-blue-600 rounded cursor-pointer" /><span class="line-through text-slate-500 rtl:text-right">$1</span></div>'
    );
    html = html.replace(
      /^-\s*\[ \]\s+(.*$)/gim,
      '<div class="qalam-todo-item flex items-start gap-2.5 my-1.5 rtl:flex-row-reverse"><input type="checkbox" class="qalam-todo-checkbox mt-1 accent-blue-600 rounded cursor-pointer" /><span class="text-slate-900 font-medium rtl:text-right">$1</span></div>'
    );
  } else {
    html = html.replace(
      /^-\s*\[x\]\s+(.*$)/gim,
      '<div class="qalam-todo-item flex items-start gap-2.5 my-1.5 rtl:flex-row-reverse"><input type="checkbox" checked class="qalam-todo-checkbox mt-1 accent-blue-600 rounded cursor-pointer" /><span class="line-through text-slate-400 rtl:text-right">$1</span></div>'
    );
    html = html.replace(
      /^-\s*\[ \]\s+(.*$)/gim,
      '<div class="qalam-todo-item flex items-start gap-2.5 my-1.5 rtl:flex-row-reverse"><input type="checkbox" class="qalam-todo-checkbox mt-1 accent-blue-600 rounded cursor-pointer" /><span class="text-slate-200 rtl:text-right">$1</span></div>'
    );
  }

  // Bullet Lists: Convert consecutive items and wrap into a real <ul>
  html = html.replace(
    /^[\*\-]\s+(?!\[[ x]\])(.*$)/gim,
    isLight
      ? '<!--QLM_UL--><li class="ml-5 rtl:ml-0 rtl:mr-5 list-disc my-1 text-slate-900 rtl:text-right">$1</li>'
      : '<!--QLM_UL--><li class="ml-5 rtl:ml-0 rtl:mr-5 list-disc my-1 text-slate-200 rtl:text-right">$1</li>'
  );
  html = html.replace(/((?:<!--QLM_UL--><li[\s\S]*?<\/li>\n?)+)/g, '<ul class="list-disc pl-5 my-2 space-y-1">$1</ul>');
  html = html.replace(/<!--QLM_UL-->/g, '');

  // Numbered Lists: Convert consecutive items and wrap into a real <ol>
  html = html.replace(
    /^\d+\.\s+(.*$)/gim,
    isLight
      ? '<!--QLM_OL--><li class="ml-5 rtl:ml-0 rtl:mr-5 list-decimal my-1 text-slate-900 rtl:text-right">$1</li>'
      : '<!--QLM_OL--><li class="ml-5 rtl:ml-0 rtl:mr-5 list-decimal my-1 text-slate-200 rtl:text-right">$1</li>'
  );
  html = html.replace(/((?:<!--QLM_OL--><li[\s\S]*?<\/li>\n?)+)/g, '<ol class="list-decimal pl-5 my-2 space-y-1">$1</ol>');
  html = html.replace(/<!--QLM_OL-->/g, '');

  // Footnote references: [^1]
  html = html.replace(/\[\^([a-zA-Z0-9_-]+)\](?!:)/g, '<sup class="qalam-footnote-ref font-mono text-[11px]"><a href="#fn-$1" class="text-blue-400 hover:underline">[$1]</a></sup>');

  // Footnote definitions: [^1]: Note text
  html = html.replace(
    /^\[\^([a-zA-Z0-9_-]+)\]:\s+(.*$)/gim,
    isLight
      ? '<div id="fn-$1" class="qalam-footnote-def text-xs text-slate-600 my-2 pt-2 border-t border-slate-300 font-sans"><span class="font-mono font-bold text-blue-700">[$1]</span> $2</div>'
      : '<div id="fn-$1" class="qalam-footnote-def text-xs text-slate-400 my-2 pt-2 border-t border-slate-700/60 font-sans"><span class="font-mono font-bold text-blue-400">[$1]</span> $2</div>'
  );

  // Bold & Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.*?)~~/g, isLight ? '<del class="text-slate-500">$1</del>' : '<del class="text-slate-400">$1</del>');

  // Images: ![alt](url)
  html = html.replace(
    /!\[(.*?)\]\((.*?)\)/g,
    isLight
      ? '<figure class="my-3"><img src="$2" alt="$1" class="max-w-full rounded-md border border-slate-200 shadow-sm" /><figcaption class="text-xs text-slate-600 mt-1 italic rtl:text-right">$1</figcaption></figure>'
      : '<figure class="my-3"><img src="$2" alt="$1" class="max-w-full rounded-md border border-slate-700 shadow-md" /><figcaption class="text-xs text-slate-400 mt-1 italic rtl:text-right">$1</figcaption></figure>'
  );

  // Links: [text](url)
  html = html.replace(
    /\[(.*?)\]\((.*?)\)/g,
    isLight
      ? '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2 transition break-all overflow-wrap-anywhere">$1</a>'
      : '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition break-all overflow-wrap-anywhere">$1</a>'
  );

  // WikiLinks: [[Target Note]] or [[Target Note|Display Alias]] (Obsidian/Roam style)
  html = html.replace(/\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/g, (_match, target, alias) => {
    const targetTitle = target.trim();
    const displayText = (alias || target).trim();
    const encodedTarget = encodeURIComponent(targetTitle);
    return isLight
      ? `<a href="#wikilink-${encodedTarget}" data-wikilink="${encodedTarget}" class="qalam-wikilink inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 underline decoration-blue-300 hover:decoration-blue-600 decoration-1 underline-offset-2 transition break-all overflow-wrap-anywhere"><span class="text-[11px] opacity-75">🔗</span><span>${displayText}</span></a>`
      : `<a href="#wikilink-${encodedTarget}" data-wikilink="${encodedTarget}" class="qalam-wikilink inline-flex items-center gap-1 font-semibold text-blue-400 hover:text-blue-300 underline decoration-blue-500/60 hover:decoration-blue-300 decoration-1 underline-offset-2 transition break-all overflow-wrap-anywhere"><span class="text-[11px] opacity-75">🔗</span><span>${displayText}</span></a>`;
  });

  // Tables: markdown table parsing with RTL cell alignment
  const tableRegex = /\|(.+)\|\n\|(?:\s*[-:]+[-| :]*)\|\n((?:\|.*\|\n?)*)/g;
  html = html.replace(tableRegex, (_match, headerLine, bodyLines) => {
    const headers = headerLine.split('|').map((h: string) => h.trim()).filter((h: string) => h.length > 0);
    const rows = bodyLines
      .trim()
      .split('\n')
      .map((row: string) =>
        row
          .split('|')
          .map((cell: string) => cell.trim())
          .filter((cell: string) => cell.length > 0)
      );

    if (isLight) {
      const thead = `<tr>${headers.map((h: string) => `<th class="px-3 py-2 bg-slate-100 text-left rtl:text-right font-bold text-xs text-slate-900 border border-slate-300">${h}</th>`).join('')}</tr>`;
      const tbody = rows
        .map(
          (row: string[]) =>
            `<tr>${row.map((cell: string) => `<td class="px-3 py-2 border border-slate-200 text-xs text-slate-800 rtl:text-right">${cell}</td>`).join('')}</tr>`
        )
        .join('');
      return `<div class="my-4 overflow-x-auto"><table class="w-full border-collapse border border-slate-300 text-sm"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`;
    }

    const thead = `<tr>${headers.map((h: string) => `<th class="px-3 py-2 bg-slate-800 text-left rtl:text-right font-semibold text-xs text-slate-200 border border-slate-700">${h}</th>`).join('')}</tr>`;
    const tbody = rows
      .map(
        (row: string[]) =>
          `<tr>${row.map((cell: string) => `<td class="px-3 py-2 border border-slate-700/70 text-xs text-slate-300 rtl:text-right">${cell}</td>`).join('')}</tr>`
      )
      .join('');

    return `<div class="my-4 overflow-x-auto"><table class="w-full border-collapse border border-slate-700 text-sm"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`;
  });

  // Directional blocks: <div dir="rtl"> or <div dir="ltr">
  html = html.replace(/<div\s+dir="(rtl|ltr)"[^>]*>([\s\S]*?)<\/div>/gi, (_match, dir, inner) => {
    const isRtlBlock = dir.toLowerCase() === 'rtl';
    const innerBlocks = inner.trim().split(/\n\n+/);
    const renderedInner = innerBlocks
      .map((b: string) => {
        const trimmed = b.trim();
        if (!trimmed) return '';
        if (
          trimmed.startsWith('<h') ||
          trimmed.startsWith('<div') ||
          trimmed.startsWith('<blockquote') ||
          trimmed.startsWith('<table') ||
          trimmed.startsWith('<li')
        ) {
          return trimmed;
        }
        return isLight
          ? `<p class="my-2 leading-relaxed text-slate-900 ${isRtlBlock ? 'text-right' : 'text-left'}">${trimmed.replace(/\n/g, '<br/>')}</p>`
          : `<p class="my-2 leading-relaxed text-slate-200 ${isRtlBlock ? 'text-right' : 'text-left'}">${trimmed.replace(/\n/g, '<br/>')}</p>`;
      })
      .filter(Boolean)
      .join('\n');

    return `<div dir="${dir}" class="my-3 ${isRtlBlock ? 'text-right' : 'text-left'}" style="direction: ${dir}; text-align: ${isRtlBlock ? 'right' : 'left'}; unicode-bidi: isolate;">\n${renderedInner}\n</div>`;
  });

  // Directional divs and spans: <div dir="rtl">...</div> or <span dir="rtl">...</span>
  html = html.replace(/<div\s+dir="(rtl|ltr)"[^>]*>([\s\S]*?)<\/div>/gi, (_match, dir, inner) => {
    const isRtl = dir.toLowerCase() === 'rtl';
    return `<div dir="${dir}" class="${isRtl ? 'text-right font-arabic' : 'text-left'}" style="direction: ${dir}; unicode-bidi: isolate; text-align: ${isRtl ? 'right' : 'left'};">${inner}</div>`;
  });

  html = html.replace(/<span\s+dir="(rtl|ltr)"[^>]*>([\s\S]*?)<\/span>/gi, (_match, dir, inner) => {
    const isRtlSpan = dir.toLowerCase() === 'rtl';
    return `<span dir="${dir}" class="${isRtlSpan ? 'text-right font-arabic' : 'text-left'}" style="direction: ${dir}; unicode-bidi: isolate; text-align: ${isRtlSpan ? 'right' : 'left'};">${inner}</span>`;
  });

  // Paragraphs (lines separated by double newlines)
  const blocks = html.split(/\n\n+/);
  html = blocks
    .map((block) => {
      block = block.trim();
      if (!block) return '';
      // Don't wrap tags that are already block level
      if (
        block.startsWith('<h') ||
        block.startsWith('<div') ||
        block.startsWith('</div') ||
        block.startsWith('<p') ||
        block.startsWith('</p') ||
        block.startsWith('<ul') ||
        block.startsWith('</ul') ||
        block.startsWith('<ol') ||
        block.startsWith('</ol') ||
        block.startsWith('<li') ||
        block.startsWith('</li') ||
        block.startsWith('<blockquote') ||
        block.startsWith('</blockquote') ||
        block.startsWith('<hr') ||
        block.startsWith('<table') ||
        block.startsWith('</table') ||
        block.startsWith('<figure') ||
        block.startsWith('</figure') ||
        block.startsWith('<details') ||
        block.startsWith('</details') ||
        block.startsWith('<pre') ||
        block.startsWith('</pre') ||
        block.startsWith('</')
      ) {
        return block;
      }
      const isParagraphRtl = RTL_REGEX.test(block);
      const dirAttr = isParagraphRtl ? ' dir="rtl"' : '';
      const alignClass = isParagraphRtl ? ' text-right font-arabic' : ' rtl:text-right';
      const styleAttr = isParagraphRtl ? ' style="direction: rtl; unicode-bidi: isolate; text-align: right;"' : '';
      return isLight
        ? `<p${dirAttr}${styleAttr} class="my-2 leading-relaxed text-slate-900 font-normal${alignClass}">${block.replace(/\n/g, '<br/>')}</p>`
        : `<p${dirAttr}${styleAttr} class="my-2 leading-relaxed text-slate-200${alignClass}">${block.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');

  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['div', 'span', 'details', 'summary', 'kbd', 'input', 'sup', 'sub', 'mark', 'del', 'ins', 'audio', 'source', 'figure', 'figcaption'],
    ADD_ATTR: ['target', 'disabled', 'checked', 'type', 'dir', 'style', 'class', 'id', 'href', 'src', 'alt', 'controls', 'data-wikilink', 'title', 'width', 'height'],
    ADD_DATA_URI_TAGS: ['img', 'audio', 'source', 'video'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

/**
 * Converts basic HTML back to clean Markdown
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return '';

  const div = document.createElement('div');
  div.innerHTML = html;

  function traverse(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes).map(traverse).join('');

    switch (tag) {
      case 'h1':
        return `\n# ${children.trim()}\n\n`;
      case 'h2':
        return `\n## ${children.trim()}\n\n`;
      case 'h3':
        return `\n### ${children.trim()}\n\n`;
      case 'h4':
        return `\n#### ${children.trim()}\n\n`;
      case 'h5':
        return `\n##### ${children.trim()}\n\n`;
      case 'h6':
        return `\n###### ${children.trim()}\n\n`;
      case 'strong':
      case 'b':
        return `**${children}**`;
      case 'em':
      case 'i':
        return `*${children}*`;
      case 'del':
      case 's':
      case 'strike':
        return `~~${children}~~`;
      case 'u':
      case 'ins':
        return `<u>${children}</u>`;
      case 'mark':
        return `==${children}==`;
      case 'sub':
        return `~${children}~`;
      case 'sup':
        return `^${children}^`;
      case 'code':
        return el.parentElement?.tagName.toLowerCase() === 'pre' ? children : `\`${children}\``;
      case 'pre':
        return `\n\`\`\`\n${children.trim()}\n\`\`\`\n\n`;
      case 'blockquote':
        return `\n> ${children.trim()}\n\n`;
      case 'table': {
        const rows = Array.from(el.querySelectorAll('tr'));
        if (rows.length === 0) return children;
        let tableMd = '\n';
        rows.forEach((row, idx) => {
          const cells = Array.from(row.querySelectorAll('th, td')).map((c) =>
            (c.textContent || '').trim().replace(/\|/g, '\\|')
          );
          tableMd += `| ${cells.join(' | ')} |\n`;
          if (idx === 0) {
            tableMd += `| ${cells.map(() => '---').join(' | ')} |\n`;
          }
        });
        return `${tableMd}\n`;
      }
      case 'li': {
        const isCheckbox = el.querySelector('input[type="checkbox"]');
        if (isCheckbox) {
          const checked = (isCheckbox as HTMLInputElement).checked;
          const text = children.replace(/<input[^>]*>/, '').trim();
          return `- [${checked ? 'x' : ' '}] ${text}\n`;
        }
        const parentTag = el.parentElement?.tagName.toLowerCase();
        if (parentTag === 'ol') {
          const siblings = Array.from(el.parentElement?.children || []).filter(
            (s) => s.tagName.toLowerCase() === 'li'
          );
          const index = siblings.indexOf(el) + 1;
          return `${index > 0 ? index : 1}. ${children.trim()}\n`;
        }
        return `- ${children.trim()}\n`;
      }
      case 'ul':
      case 'ol':
        return `\n${children}\n`;
      case 'details': {
        const summary = el.querySelector('summary')?.textContent || 'Details';
        const innerClone = el.cloneNode(true) as HTMLElement;
        const sumEl = innerClone.querySelector('summary');
        if (sumEl) sumEl.remove();
        return `\n\n<details><summary>${summary}</summary>\n\n${traverse(innerClone).trim()}\n\n</details>\n\n`;
      }
      case 'kbd':
        return `<kbd>${children.trim()}</kbd>`;
      case 'hr':
        return '\n---\n\n';
      case 'figure': {
        const img = el.querySelector('img');
        const alt = img?.getAttribute('alt') || 'image';
        const src = img?.getAttribute('src') || '';
        return `\n\n![${alt}](${src})\n\n`;
      }
      case 'audio': {
        const src = el.getAttribute('src') || '';
        return `\n\n<audio controls src="${src}"></audio>\n\n`;
      }
      case 'a': {
        const dataWiki = el.getAttribute('data-wikilink');
        const href = el.getAttribute('href') || '';
        if (dataWiki || href.startsWith('#wikilink-')) {
          const rawTarget = dataWiki || href.replace(/^#wikilink-/, '');
          const target = decodeURIComponent(rawTarget);
          const cleanText = children.replace(/^🔗\s*/, '').trim();
          if (cleanText && cleanText !== target) {
            return `[[${target}|${cleanText}]]`;
          }
          return `[[${target}]]`;
        }
        return `[${children}](${href})`;
      }
      case 'img':
        return `![${el.getAttribute('alt') || 'image'}](${el.getAttribute('src') || ''})`;
      case 'br':
        return '\n';
      case 'span': {
        const dir = el.getAttribute('dir');
        if (dir) {
          return `<span dir="${dir}">${children}</span>`;
        }
        return children;
      }
      case 'font':
        return children;
      case 'div':
      case 'p': {
        if (el.closest('li')) {
          return children.trim();
        }
        const isCallout = el.classList.contains('qalam-callout');
        if (isCallout) {
          return `\n> ${children.trim()}\n\n`;
        }
        const isMathBlock = el.classList.contains('qalam-math-block');
        if (isMathBlock) {
          const mathText = (el.textContent || '').replace(/\$\$/g, '').trim();
          return `\n$$\n${mathText}\n$$\n\n`;
        }
        const isCheckbox = el.querySelector('input[type="checkbox"]');
        if (isCheckbox) {
          const checked = (isCheckbox as HTMLInputElement).checked;
          const text = children.replace(/<input[^>]*>/, '').trim();
          return `\n- [${checked ? 'x' : ' '}] ${text}\n`;
        }
        const isFootnoteDef = el.classList.contains('qalam-footnote-def') || el.id?.startsWith('fn-');
        if (isFootnoteDef && el.id) {
          const fnId = el.id.replace(/^fn-/, '');
          const cleanText = (el.textContent || '').replace(new RegExp(`^\\[${fnId}\\]`), '').trim();
          return `\n[^${fnId}]: ${cleanText}\n`;
        }
        const dir = el.getAttribute('dir');
        if (dir) {
          return `\n\n<div dir="${dir}">\n\n${children.trim()}\n\n</div>\n\n`;
        }
        return `\n${children.trim()}\n\n`;
      }
      default:
        return children;
    }
  }

  const result = traverse(div);
  return result.replace(/\n{3,}/g, '\n\n').trim();
}
