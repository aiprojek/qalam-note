import React, { useState, useMemo } from 'react';
import { X, Sparkles, Plus, FileText } from 'lucide-react';
import type { NoteTemplate, AppLanguage } from '../../types';
import { getTemplates, renderTemplateContent } from '../../services/templates';
import { markdownToHtml } from '../../utils/markdown';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (content: string, mode: 'replace' | 'append' | 'new_note', templateTitle: string) => void;
  language?: AppLanguage;
  theme?: string;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onApplyTemplate,
  language = 'id',
  theme = 'qalam-dark',
}) => {
  const isId = language === 'id';
  const isLight =
    theme === 'qalam-light' ||
    theme === 'light' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('light'));
  const templates = getTemplates(language);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const renderedContent = useMemo(() => {
    return renderTemplateContent(selectedTemplate?.content || '', isId ? 'Judul Catatan' : 'Note Title');
  }, [selectedTemplate, isId]);

  const htmlPreview = useMemo(() => {
    return markdownToHtml(renderedContent, isLight ? 'light' : 'dark');
  }, [renderedContent, isLight]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 backdrop-blur-xs select-none animate-in fade-in duration-150 ${
        isLight ? 'bg-slate-900/40' : 'bg-black/80'
      }`}
    >
      <div
        className={`w-full h-full sm:h-[88vh] sm:max-w-4xl sm:rounded-2xl rounded-none shadow-2xl overflow-hidden flex flex-col transition-colors ${
          isLight
            ? 'bg-white border-0 sm:border border-slate-200 text-slate-900'
            : 'bg-[#0f172a] border-0 sm:border border-slate-700 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 sm:px-6 py-3.5 border-b shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0a0f1d] border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg border ${
                isLight
                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                  : 'bg-blue-600/20 text-blue-400 border-blue-500/30'
              }`}
            >
              <Sparkles className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className={`text-sm sm:text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isId ? 'Galeri Templat Catatan' : 'Note Templates Gallery'}
              </h3>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isId
                  ? 'Sisipkan kerangka format terstruktur siap pakai ke dalam catatan Anda'
                  : 'Insert ready-to-use structured templates into your notes'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition active:scale-95 ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Layout: Left Template List + Right Preview */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          {/* Template List */}
          <div
            className={`flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto md:w-72 shrink-0 border-b md:border-b-0 md:border-r p-2 gap-1.5 custom-scrollbar ${
              isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-[#0b1120] border-slate-800'
            }`}
          >
            {templates.map((tpl) => {
              const isSelected = tpl.id === selectedTemplateId;
              return (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`w-full flex items-start gap-2.5 p-3 rounded-xl text-left transition shrink-0 whitespace-nowrap md:whitespace-normal border ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md border-blue-500'
                      : isLight
                      ? 'bg-white text-slate-800 hover:bg-slate-100/90 border-slate-200 hover:border-slate-300'
                      : 'text-slate-200 hover:bg-slate-800/80 border-transparent hover:border-slate-700'
                  }`}
                >
                  <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-white' : 'text-blue-500'}`} />
                  <div className="min-w-0">
                    <div className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : isLight ? 'text-slate-900' : 'text-white'}`}>
                      {tpl.title}
                    </div>
                    <div
                      className={`text-[10px] line-clamp-2 mt-0.5 ${
                        isSelected
                          ? 'text-blue-100 font-normal'
                          : isLight
                          ? 'text-slate-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {tpl.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Template Content Preview */}
          <div
            className={`flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col justify-between custom-scrollbar ${
              isLight ? 'bg-slate-100/50' : 'bg-[#070b14]'
            }`}
          >
            <div>
              <div className={`flex items-center justify-between pb-3 border-b mb-4 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <div>
                  <h4 className={`text-sm sm:text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <span>{selectedTemplate?.title}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase font-semibold ${
                        isLight
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-blue-950 text-blue-300 border-blue-800'
                      }`}
                    >
                      {selectedTemplate?.category || 'Template'}
                    </span>
                  </h4>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    {selectedTemplate?.description}
                  </p>
                </div>
              </div>

              {/* High-Contrast Preview Box that directly follows selected theme */}
              <div
                className={`p-5 sm:p-6 rounded-xl border-2 text-sm leading-relaxed max-h-[380px] overflow-y-auto custom-scrollbar select-text shadow-sm ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 shadow-sm'
                    : 'bg-[#0f172a] border-slate-700 text-slate-100 shadow-md'
                }`}
              >
                <div
                  className={`prose max-w-none text-xs sm:text-sm leading-relaxed ${
                    isLight
                      ? 'text-slate-900 [&_h1]:text-slate-950 [&_h1]:font-black [&_h1]:border-b [&_h1]:border-slate-200 [&_h1]:pb-2 [&_h2]:text-blue-900 [&_h2]:font-bold [&_h3]:text-slate-900 [&_h3]:font-bold [&_p]:text-slate-900 [&_li]:text-slate-900 [&_strong]:text-slate-950 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-600 [&_blockquote]:bg-blue-50 [&_blockquote]:text-blue-950 [&_blockquote]:p-3 [&_blockquote]:rounded-r-lg'
                      : 'prose-invert text-slate-100 [&_h1]:text-white [&_h1]:font-bold [&_h1]:border-b [&_h1]:border-slate-700 [&_h1]:pb-2 [&_h2]:text-blue-300 [&_h3]:text-emerald-300 [&_p]:text-slate-100 [&_li]:text-slate-100 [&_strong]:text-white [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:bg-slate-900/90 [&_blockquote]:text-slate-200 [&_blockquote]:p-3 [&_blockquote]:rounded-r-lg'
                  }`}
                  dangerouslySetInnerHTML={{ __html: htmlPreview }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className={`pt-4 border-t flex flex-wrap items-center justify-end gap-2.5 mt-4 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <button
                onClick={() => {
                  const rendered = renderTemplateContent(selectedTemplate?.content || '', '');
                  onApplyTemplate(rendered, 'append', selectedTemplate?.title || '');
                  onClose();
                }}
                className={`px-3.5 py-2 min-h-[42px] rounded-lg border text-xs font-medium transition active:scale-95 ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700'
                }`}
              >
                {isId ? '↳ Tambahkan di Akhir' : '↳ Append to Note'}
              </button>
              <button
                onClick={() => {
                  const rendered = renderTemplateContent(selectedTemplate?.content || '', '');
                  onApplyTemplate(rendered, 'replace', selectedTemplate?.title || '');
                  onClose();
                }}
                className="px-3.5 py-2 min-h-[42px] rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition active:scale-95 shadow-xs"
              >
                {isId ? 'Ganti Seluruh Catatan' : 'Replace Note Content'}
              </button>
              <button
                onClick={() => {
                  const rendered = renderTemplateContent(selectedTemplate?.content || '', '');
                  onApplyTemplate(rendered, 'new_note', selectedTemplate?.title || '');
                  onClose();
                }}
                className="px-4 py-2 min-h-[42px] rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition active:scale-95 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{isId ? 'Buat Catatan Baru dari Templat' : 'Create New Note from Template'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
