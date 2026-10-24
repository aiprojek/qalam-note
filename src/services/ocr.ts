import { recognize, type RecognizeResult } from 'tesseract.js';

export interface OCRProgress {
  status: string;
  progress: number; // 0 to 1
}

export type OCRLanguage = 'ind' | 'eng' | 'ara' | 'ind+eng';

/**
 * Runs client-side optical character recognition (OCR) purely in the browser.
 * 100% Local-First: Zero data is transmitted to external servers.
 */
export async function extractTextFromImage(
  imageSource: string | File | Blob,
  lang: OCRLanguage = 'ind+eng',
  onProgress?: (p: OCRProgress) => void
): Promise<{ text: string; confidence: number }> {
  try {
    const result: RecognizeResult = await recognize(imageSource, lang, {
      logger: (m) => {
        if (onProgress && typeof m.progress === 'number') {
          onProgress({
            status: m.status || 'processing',
            progress: m.progress,
          });
        }
      },
    });

    const text = result.data.text ? result.data.text.trim() : '';
    const confidence = result.data.confidence || 0;

    return {
      text,
      confidence,
    };
  } catch (err: any) {
    console.error('Local OCR error:', err);
    throw new Error(err?.message || 'Gagal mengekstrak teks dari gambar secara lokal.');
  }
}
