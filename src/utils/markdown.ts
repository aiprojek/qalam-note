/**
 * Qalam Note - Markdown Parser & HTML Renderer
 * Handles markdown formatting, checklists, tables, code blocks, and math preview with sanitization
 * Supports Dark/Light themes and RTL (Right-to-Left) rendering
 */

import DOMPurify from 'dompurify';
import { isBlockRTL } from './rtl';
import { getSyncAttachmentUrl } from './attachments';
import { toRoman, toAlpha } from './listStyles';

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

/**
 * Parses single and multilevel ordered and unordered lists and checklists into proper nested HTML
 */
export function renderMultilevelLists(content: string, isLight: boolean): string {
  const lines = content.split('\n');
  const out: string[] = [];
  const stack: { type: 'ul' | 'ol'; level: number }[] = [];

  const closeDownTo = (targetLevel: number) => {
    while (stack.length > 0 && stack[stack.length - 1].level > targetLevel) {
      const top = stack.pop()!;
      out.push(`</li></${top.type}>`);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Checkbox / Todo item
    const todoMatch = line.match(/^([ \t]*)(-\s*\[[ xX]\])\s+(.*)$/);
    if (todoMatch) {
      closeDownTo(-1);
      const isDone = todoMatch[2].toLowerCase().includes('x');
      const spaces = todoMatch[1].replace(/\t/g, '  ').length;
      const level = Math.floor(spaces / 2);
      const itemText = todoMatch[3];
      const isItemRtl = isBlockRTL(itemText);
      const dirAttr = isItemRtl ? ' dir="rtl"' : ' dir="ltr"';
      const flexDir = isItemRtl ? 'flex-row-reverse text-right font-arabic' : 'flex-row text-left';
      const textStyle = isDone
        ? (isLight ? 'line-through text-slate-500' : 'line-through text-slate-400')
        : (isLight ? 'text-slate-900 font-medium' : 'text-slate-200');
      const indentRem = level * 1.5;
      const indentStyle = indentRem > 0 ? ` style="margin-left: ${indentRem}rem;"` : '';
      out.push(
        `<div${dirAttr} data-indent="${level}" class="qalam-todo-item flex items-start gap-2.5 my-1.5 ${flexDir}"${indentStyle}><input type="checkbox" ${isDone ? 'checked ' : ''}class="qalam-todo-checkbox mt-1 accent-blue-600 rounded cursor-pointer" /><span class="${textStyle}">${itemText}</span></div>`
      );
      continue;
    }

    let isOrdered = false;
    let listTypeAttr = '1';
    let bulletSymbol: string | null = null;
    let itemText = '';
    let spaces = 0;

    // 1. Numbered: Decimals e.g. 1. or 1)
    const decMatch = line.match(/^([ \t]*)(\d+)([\.\)])\s+(.*)$/);
    if (decMatch) {
      isOrdered = true;
      spaces = decMatch[1].replace(/\t/g, '  ').length;
      listTypeAttr = '1';
      itemText = decMatch[4];
    } else {
      // 2. Numbered: Roman Uppercase e.g. I. or II.
      const romanUpper = line.match(/^([ \t]*)([IVXLCDM]+)([\.\)])\s+(.*)$/);
      if (romanUpper && /^[IVXLCDM]+$/.test(romanUpper[2])) {
        isOrdered = true;
        spaces = romanUpper[1].replace(/\t/g, '  ').length;
        listTypeAttr = 'I';
        itemText = romanUpper[4];
      } else {
        // 3. Numbered: Roman Lowercase e.g. i. or ii.
        const romanLower = line.match(/^([ \t]*)(i{1,3}|iv|v|vi{0,3}|ix|x)([\.\)])\s+(.*)$/i);
        if (romanLower && /^[ivx]+$/.test(romanLower[2].toLowerCase())) {
          isOrdered = true;
          spaces = romanLower[1].replace(/\t/g, '  ').length;
          listTypeAttr = 'i';
          itemText = romanLower[4];
        } else {
          // 4. Numbered: Alpha Uppercase e.g. A. or B.
          const alphaUpper = line.match(/^([ \t]*)([A-Z])([\.\)])\s+(.*)$/);
          if (alphaUpper) {
            isOrdered = true;
            spaces = alphaUpper[1].replace(/\t/g, '  ').length;
            listTypeAttr = 'A';
            itemText = alphaUpper[4];
          } else {
            // 5. Numbered: Alpha Lowercase e.g. a. or b.
            const alphaLower = line.match(/^([ \t]*)([a-z])([\.\)])\s+(.*)$/);
            if (alphaLower) {
              isOrdered = true;
              spaces = alphaLower[1].replace(/\t/g, '  ').length;
              listTypeAttr = 'a';
              itemText = alphaLower[4];
            } else {
              // 6. Bullet: symbols, icons, emojis e.g. -, *, +, •, ○, ■, ◆, ➔, ✔, ★, —, 📌
              const bulletMatch = line.match(/^([ \t]*)([-*+•○■◆➔✔★—]|\p{Extended_Pictographic})\s+(.*)$/u);
              if (bulletMatch) {
                isOrdered = false;
                spaces = bulletMatch[1].replace(/\t/g, '  ').length;
                bulletSymbol = bulletMatch[2];
                itemText = bulletMatch[3];
              } else {
                closeDownTo(-1);
                out.push(line);
                continue;
              }
            }
          }
        }
      }
    }

    const level = Math.floor(spaces / 2);
    const listTag: 'ul' | 'ol' = isOrdered ? 'ol' : 'ul';
    const isItemRtl = isBlockRTL(itemText);
    const dirAttr = isItemRtl ? ' dir="rtl"' : ' dir="ltr"';
    const alignClass = isItemRtl ? ' text-right font-arabic' : ' text-left';
    const textColor = isLight ? 'text-slate-900' : 'text-slate-200';

    let tagBase = '';
    if (isOrdered) {
      const typeClass =
        listTypeAttr === 'A'
          ? 'list-[upper-alpha]'
          : listTypeAttr === 'a'
          ? 'list-[lower-alpha]'
          : listTypeAttr === 'I'
          ? 'list-[upper-roman]'
          : listTypeAttr === 'i'
          ? 'list-[lower-roman]'
          : 'list-decimal';
      tagBase = `ol type="${listTypeAttr}" class="${typeClass} pl-5 my-1.5 space-y-1"`;
    } else {
      if (bulletSymbol === '○') {
        tagBase = `ul class="pl-5 my-1.5 space-y-1" style="list-style-type: circle;"`;
      } else if (bulletSymbol === '■') {
        tagBase = `ul class="pl-5 my-1.5 space-y-1" style="list-style-type: square;"`;
      } else if (bulletSymbol && !['-', '*', '+', '•'].includes(bulletSymbol)) {
        tagBase = `ul class="pl-5 my-1.5 space-y-1" style="list-style-type: '${bulletSymbol} ';"`;
      } else {
        tagBase = `ul class="list-disc pl-5 my-1.5 space-y-1"`;
      }
    }

    if (stack.length === 0) {
      stack.push({ type: listTag, level });
      out.push(`<${tagBase}><li${dirAttr} class="my-0.5 ${textColor}${alignClass}">${itemText}`);
    } else {
      const current = stack[stack.length - 1];
      if (level > current.level) {
        stack.push({ type: listTag, level });
        out.push(`<${tagBase}><li${dirAttr} class="my-0.5 ${textColor}${alignClass}">${itemText}`);
      } else if (level < current.level) {
        closeDownTo(level);
        if (stack.length > 0 && stack[stack.length - 1].type !== listTag) {
          const top = stack.pop()!;
          out.push(`</li></${top.type}><${tagBase}>`);
          stack.push({ type: listTag, level });
        } else if (stack.length > 0) {
          out.push('</li>');
        } else {
          stack.push({ type: listTag, level });
          out.push(`<${tagBase}>`);
        }
        out.push(`<li${dirAttr} class="my-0.5 ${textColor}${alignClass}">${itemText}`);
      } else {
        if (current.type !== listTag) {
          stack.pop();
          out.push(`</li></${current.type}><${tagBase}>`);
          stack.push({ type: listTag, level });
        } else {
          out.push('</li>');
        }
        out.push(`<li${dirAttr} class="my-0.5 ${textColor}${alignClass}">${itemText}`);
      }
    }
  }

  closeDownTo(-1);
  return out.join('\n');
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

  // Headings with dynamic RTL alignment support
  const formatHeading = (level: number, text: string) => {
    const isHeadRtl = isBlockRTL(text);
    const dirAttr = isHeadRtl ? ' dir="rtl"' : ' dir="ltr"';
    const alignClass = isHeadRtl ? ' text-right font-arabic' : ' text-left';
    const styleAttr = isHeadRtl
      ? ' style="direction: rtl; text-align: right; unicode-bidi: isolate;"'
      : ' style="direction: ltr; text-align: left; unicode-bidi: isolate;"';

    if (isLight) {
      switch (level) {
        case 6:
          return `<h6${dirAttr}${styleAttr} class="text-xs font-bold text-slate-700 mt-4 mb-1.5 uppercase tracking-wider${alignClass}">${text}</h6>`;
        case 5:
          return `<h5${dirAttr}${styleAttr} class="text-sm font-bold text-slate-800 mt-4 mb-2${alignClass}">${text}</h5>`;
        case 4:
          return `<h4${dirAttr}${styleAttr} class="text-base font-bold text-slate-900 mt-4 mb-2${alignClass}">${text}</h4>`;
        case 3:
          return `<h3${dirAttr}${styleAttr} class="text-lg font-bold text-slate-950 mt-5 mb-2.5${alignClass}">${text}</h3>`;
        case 2:
          return `<h2${dirAttr}${styleAttr} class="text-xl font-extrabold text-slate-950 mt-6 mb-3 pb-1 border-b border-slate-200${alignClass}">${text}</h2>`;
        case 1:
        default:
          return `<h1${dirAttr}${styleAttr} class="text-2xl font-black text-slate-950 mt-6 mb-4 pb-2 border-b border-slate-300${alignClass}">${text}</h1>`;
      }
    } else {
      switch (level) {
        case 6:
          return `<h6${dirAttr}${styleAttr} class="text-xs font-bold text-slate-300 mt-4 mb-1.5 uppercase tracking-wider${alignClass}">${text}</h6>`;
        case 5:
          return `<h5${dirAttr}${styleAttr} class="text-sm font-bold text-slate-200 mt-4 mb-2${alignClass}">${text}</h5>`;
        case 4:
          return `<h4${dirAttr}${styleAttr} class="text-base font-semibold text-slate-200 mt-4 mb-2${alignClass}">${text}</h4>`;
        case 3:
          return `<h3${dirAttr}${styleAttr} class="text-lg font-semibold text-slate-100 mt-5 mb-2.5${alignClass}">${text}</h3>`;
        case 2:
          return `<h2${dirAttr}${styleAttr} class="text-xl font-bold text-white mt-6 mb-3 pb-1 border-b border-slate-800${alignClass}">${text}</h2>`;
        case 1:
        default:
          return `<h1${dirAttr}${styleAttr} class="text-2xl font-bold text-white mt-6 mb-4 pb-2 border-b border-slate-700${alignClass}">${text}</h1>`;
      }
    }
  };

  html = html.replace(/^###### (.*$)/gim, (_m, t) => formatHeading(6, t));
  html = html.replace(/^##### (.*$)/gim, (_m, t) => formatHeading(5, t));
  html = html.replace(/^#### (.*$)/gim, (_m, t) => formatHeading(4, t));
  html = html.replace(/^### (.*$)/gim, (_m, t) => formatHeading(3, t));
  html = html.replace(/^## (.*$)/gim, (_m, t) => formatHeading(2, t));
  html = html.replace(/^# (.*$)/gim, (_m, t) => formatHeading(1, t));

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
    const isQuoteRtl = isBlockRTL(quoteContent);
    if (isQuoteRtl) {
      return isLight
        ? `<blockquote dir="rtl" class="border-r-4 border-l-0 border-blue-600 bg-blue-50/70 pr-4 pl-0 py-2 my-3 text-slate-800 italic rounded-l text-right font-arabic break-words overflow-wrap-anywhere" style="direction: rtl; unicode-bidi: isolate; text-align: right;">${quoteContent}</blockquote>`
        : `<blockquote dir="rtl" class="border-r-4 border-l-0 border-blue-500 bg-blue-950/20 pr-4 pl-0 py-2 my-3 text-slate-300 italic rounded-l text-right font-arabic break-words overflow-wrap-anywhere" style="direction: rtl; unicode-bidi: isolate; text-align: right;">${quoteContent}</blockquote>`;
    }
    return isLight
      ? `<blockquote dir="ltr" class="border-l-4 border-blue-600 bg-blue-50/70 pl-4 py-2 my-3 text-slate-800 italic rounded-r text-left break-words overflow-wrap-anywhere" style="direction: ltr; unicode-bidi: isolate; text-align: left;">${quoteContent}</blockquote>`
      : `<blockquote dir="ltr" class="border-l-4 border-blue-500 bg-blue-950/20 pl-4 py-2 my-3 text-slate-300 italic rounded-r text-left break-words overflow-wrap-anywhere" style="direction: ltr; unicode-bidi: isolate; text-align: left;">${quoteContent}</blockquote>`;
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

  // Multilevel Lists & Checklists (supports unlimited indent levels, ordered and unordered lists)
  html = renderMultilevelLists(html, isLight);

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
    (_match, altText, imgUrl) => {
      const isAltRtl = isBlockRTL(altText);
      const alignClass = isAltRtl ? ' text-right font-arabic' : ' text-left';
      let resolvedUrl = imgUrl;
      if (imgUrl.startsWith('attachment:')) {
        const id = imgUrl.replace('attachment:', '').trim();
        resolvedUrl = getSyncAttachmentUrl(id) || imgUrl;
      }
      return isLight
        ? `<figure class="my-3"><img src="${resolvedUrl}" alt="${altText}" class="max-w-full rounded-md border border-slate-200 shadow-sm" /><figcaption class="text-xs text-slate-600 mt-1 italic${alignClass}">${altText}</figcaption></figure>`
        : `<figure class="my-3"><img src="${resolvedUrl}" alt="${altText}" class="max-w-full rounded-md border border-slate-700 shadow-md" /><figcaption class="text-xs text-slate-400 mt-1 italic${alignClass}">${altText}</figcaption></figure>`;
    }
  );

  // HTML Audio and Image tags with attachment: URLs
  html = html.replace(/(src|href)=["'](attachment:[a-zA-Z0-9_-]+)["']/g, (_m, attr, ref) => {
    const id = ref.replace('attachment:', '').trim();
    const resolved = getSyncAttachmentUrl(id);
    return resolved ? `${attr}="${resolved}"` : `${attr}="${ref}"`;
  });

  // Links: [text](url) - Supports web URLs and native attachment:id references
  html = html.replace(
    /\[(.*?)\]\((.*?)\)/g,
    (_match, linkText, linkUrl) => {
      if (linkUrl.startsWith('attachment:')) {
        const id = linkUrl.replace('attachment:', '').trim();
        const resolved = getSyncAttachmentUrl(id);
        const cleanName = linkText.replace(/[^\w\s.-]/g, '').trim() || 'attachment';
        const hrefVal = resolved || linkUrl;
        return isLight
          ? `<a href="${hrefVal}" download="${cleanName}" data-attachment-id="${id}" class="inline-flex items-center gap-1.5 px-2.5 py-1 my-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs border border-blue-200 shadow-2xs transition"><span class="opacity-75">📎</span><span>${linkText}</span></a>`
          : `<a href="${hrefVal}" download="${cleanName}" data-attachment-id="${id}" class="inline-flex items-center gap-1.5 px-2.5 py-1 my-1 rounded-md bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 font-medium text-xs border border-blue-800/60 shadow-2xs transition"><span class="opacity-75">📎</span><span>${linkText}</span></a>`;
      }
      return isLight
        ? `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2 transition break-all overflow-wrap-anywhere">${linkText}</a>`
        : `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition break-all overflow-wrap-anywhere">${linkText}</a>`;
    }
  );

  // WikiLinks: [[Target Note]] or [[Target Note|Display Alias]]
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

    const thead = `<tr>${headers.map((h: string) => {
      const isCellRtl = isBlockRTL(h);
      const align = isCellRtl ? 'text-right font-arabic' : 'text-left';
      return `<th class="px-3 py-2 ${isLight ? 'bg-slate-100 text-slate-900 border-slate-300' : 'bg-slate-800 text-slate-200 border-slate-700'} ${align} font-bold text-xs border" ${isCellRtl ? 'dir="rtl"' : 'dir="ltr"'}>${h}</th>`;
    }).join('')}</tr>`;

    const tbody = rows
      .map(
        (row: string[]) =>
          `<tr>${row.map((cell: string) => {
            const isCellRtl = isBlockRTL(cell);
            const align = isCellRtl ? 'text-right font-arabic' : 'text-left';
            return `<td class="px-3 py-2 border ${isLight ? 'border-slate-200 text-slate-800' : 'border-slate-700/70 text-slate-300'} text-xs ${align}" ${isCellRtl ? 'dir="rtl"' : 'dir="ltr"'}>${cell}</td>`;
          }).join('')}</tr>`
      )
      .join('');

    return `<div class="my-4 overflow-x-auto"><table class="w-full border-collapse border ${isLight ? 'border-slate-300' : 'border-slate-700'} text-sm"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`;
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
          ? `<p class="my-2 leading-relaxed text-slate-900 ${isRtlBlock ? 'text-right font-arabic' : 'text-left'}">${trimmed.replace(/\n/g, '<br/>')}</p>`
          : `<p class="my-2 leading-relaxed text-slate-200 ${isRtlBlock ? 'text-right font-arabic' : 'text-left'}">${trimmed.replace(/\n/g, '<br/>')}</p>`;
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
      const isParagraphRtl = isBlockRTL(block);
      const dirAttr = isParagraphRtl ? ' dir="rtl"' : ' dir="ltr"';
      const alignClass = isParagraphRtl ? ' text-right font-arabic' : ' text-left';
      const styleAttr = isParagraphRtl
        ? ' style="direction: rtl; unicode-bidi: isolate; text-align: right;"'
        : ' style="direction: ltr; unicode-bidi: isolate; text-align: left;"';
      return isLight
        ? `<p${dirAttr}${styleAttr} class="my-2 leading-relaxed text-slate-900 font-normal${alignClass}">${block.replace(/\n/g, '<br/>')}</p>`
        : `<p${dirAttr}${styleAttr} class="my-2 leading-relaxed text-slate-200 font-normal${alignClass}">${block.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');

  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['div', 'span', 'details', 'summary', 'kbd', 'input', 'sup', 'sub', 'mark', 'del', 'ins', 'audio', 'source', 'figure', 'figcaption'],
    ADD_ATTR: ['target', 'disabled', 'checked', 'type', 'dir', 'style', 'class', 'id', 'href', 'src', 'alt', 'controls', 'data-wikilink', 'title', 'width', 'height'],
    ADD_DATA_URI_TAGS: ['img', 'audio', 'source', 'video'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data|blob|attachment):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
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
        let depth = 0;
        let ancestor = el.parentElement;
        while (ancestor && ancestor !== div) {
          if (ancestor.tagName.toLowerCase() === 'ul' || ancestor.tagName.toLowerCase() === 'ol') {
            depth++;
          }
          ancestor = ancestor.parentElement;
        }
        const indent = '  '.repeat(Math.max(0, depth - 1));

        const subListNodes: HTMLElement[] = [];
        const inlineNodes: Node[] = [];
        Array.from(el.childNodes).forEach((child) => {
          if (
            child.nodeType === Node.ELEMENT_NODE &&
            ['ul', 'ol'].includes((child as HTMLElement).tagName.toLowerCase())
          ) {
            subListNodes.push(child as HTMLElement);
          } else {
            inlineNodes.push(child);
          }
        });

        const inlineText = inlineNodes.map(traverse).join('').trim();
        const subListsText = subListNodes.map(traverse).join('');

        const isCheckbox = el.querySelector(':scope > input[type="checkbox"]');
        let itemHeader = '';
        if (isCheckbox) {
          const checked = (isCheckbox as HTMLInputElement).checked;
          const cleanText = inlineText.replace(/<input[^>]*>/, '').trim();
          itemHeader = `${indent}- [${checked ? 'x' : ' '}] ${cleanText}\n`;
        } else {
          const parentTag = el.parentElement?.tagName.toLowerCase();
          if (parentTag === 'ol') {
            const siblings = Array.from(el.parentElement?.children || []).filter(
              (s) => s.tagName.toLowerCase() === 'li'
            );
            const parentOl = el.parentElement as HTMLOListElement;
            const startVal = parseInt(parentOl?.getAttribute('start') || '1', 10) || 1;
            const index = siblings.indexOf(el) + startVal;
            const olType = parentOl?.getAttribute('type') || '';
            const listStyle = parentOl?.style?.listStyleType || '';

            if (olType === 'A' || listStyle.includes('upper-alpha')) {
              itemHeader = `${indent}${toAlpha(index, true)}. ${inlineText}\n`;
            } else if (olType === 'a' || listStyle.includes('lower-alpha')) {
              itemHeader = `${indent}${toAlpha(index, false)}. ${inlineText}\n`;
            } else if (olType === 'I' || listStyle.includes('upper-roman')) {
              itemHeader = `${indent}${toRoman(index, true)}. ${inlineText}\n`;
            } else if (olType === 'i' || listStyle.includes('lower-roman')) {
              itemHeader = `${indent}${toRoman(index, false)}. ${inlineText}\n`;
            } else {
              itemHeader = `${indent}${index > 0 ? index : 1}. ${inlineText}\n`;
            }
          } else {
            const parentUl = el.parentElement as HTMLUListElement;
            const listStyle = parentUl?.style?.listStyleType || '';
            let marker = '-';
            if (listStyle === 'circle') marker = '○';
            else if (listStyle === 'square') marker = '■';
            else if (listStyle.includes("'") || listStyle.includes('"')) {
              const cleaned = listStyle.replace(/['"]/g, '').trim();
              if (cleaned) marker = cleaned;
            }
            itemHeader = `${indent}${marker} ${inlineText}\n`;
          }
        }

        return itemHeader + subListsText;
      }
      case 'ul':
      case 'ol': {
        if (el.parentElement?.tagName.toLowerCase() === 'li') {
          return children;
        }
        return `\n${children}\n`;
      }
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
          const dataIndent = parseInt(el.getAttribute('data-indent') || '0', 10);
          const indent = '  '.repeat(Math.max(0, dataIndent));
          return `\n${indent}- [${checked ? 'x' : ' '}] ${text}\n`;
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
