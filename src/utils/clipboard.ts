import { htmlToMarkdown } from './markdown';
import type { Note } from '../types';

/**
 * Formats a note into clean, social-media ready Markdown.
 * Even if the note was edited in rich text (WYSIWYG), it converts any live HTML or note.body
 * into clean Markdown and prefixes the title as a Markdown heading (# Title) if not already present.
 */
export function formatNoteAsMarkdown(note: Pick<Note, 'title' | 'body'>, liveHtml?: string): string {
  let bodyMd = note.body || '';

  // If live HTML from contenteditable is provided, convert it to ensure latest unsaved edits are captured
  if (liveHtml && liveHtml.trim().length > 0) {
    try {
      const converted = htmlToMarkdown(liveHtml);
      if (converted && converted.trim().length > 0) {
        bodyMd = converted;
      }
    } catch (e) {
      console.warn('Failed to convert live HTML to Markdown:', e);
    }
  }

  const trimmedBody = (bodyMd || '').trim();
  const trimmedTitle = (note.title || '').trim();

  if (!trimmedTitle) {
    return trimmedBody;
  }

  // Check if body already begins with this title as heading (# Title or ## Title)
  const escapedTitle = trimmedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headingRegex = new RegExp(`^#+\\s*${escapedTitle}(\\s*\\n|$)`, 'i');
  if (headingRegex.test(trimmedBody)) {
    return trimmedBody;
  }

  if (!trimmedBody) {
    return `# ${trimmedTitle}`;
  }

  return `# ${trimmedTitle}\n\n${trimmedBody}`;
}

/**
 * Copies text to the system clipboard across modern browsers, mobile web, and fallback environments
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Modern Async Clipboard API
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to textarea fallback
    }
  }

  // Fallback for iframes or older mobile browsers
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Convenience helper to format note and copy to clipboard in one call
 */
export async function copyNoteAsMarkdown(
  note: Pick<Note, 'title' | 'body'>,
  liveHtml?: string
): Promise<{ success: boolean; text: string }> {
  const markdownText = formatNoteAsMarkdown(note, liveHtml);
  const success = await copyToClipboard(markdownText);
  return { success, text: markdownText };
}
