/**
 * Qalam Note - Kanban Board Serializer & Utilities
 * Bi-directional conversion between KanbanBoardData and structured Markdown
 */

import type {
  KanbanBoardData,
  KanbanBoardColumn,
  KanbanCardItem,
  KanbanStatus,
  KanbanPriority,
  KanbanChecklistItem,
} from '../types';

export const DEFAULT_KANBAN_COLUMNS: { id: KanbanStatus; titleId: string; titleEn: string }[] = [
  { id: 'backlog', titleId: 'Rencana & Ide', titleEn: 'Backlog & Ideas' },
  { id: 'todo', titleId: 'Akan Dikerjakan', titleEn: 'To Do' },
  { id: 'in_progress', titleId: 'Sedang Dikerjakan', titleEn: 'In Progress' },
  { id: 'done', titleId: 'Selesai', titleEn: 'Done' },
];

/**
 * Creates default 4-column Kanban board structure
 */
export function createInitialKanbanData(
  projectTitle?: string,
  isId: boolean = true
): KanbanBoardData {
  const now = Date.now();
  return {
    version: 1,
    columns: [
      {
        id: 'backlog',
        title: isId ? 'Rencana & Ide' : 'Backlog & Ideas',
        cards: [
          {
            id: `card-${now}-1`,
            title: isId ? 'Riset kebutuhan & brief klien' : 'Research client brief & scope',
            description: isId ? 'Kumpulkan semua aset dan kebutuhan fitur proyek' : 'Gather all project specs & assets',
            priority: 'medium',
            tags: [isId ? 'perencanaan' : 'planning'],
            due_date: now + 86400000 * 5,
            created_at: now,
          },
        ],
      },
      {
        id: 'todo',
        title: isId ? 'Akan Dikerjakan' : 'To Do',
        cards: [
          {
            id: `card-${now}-2`,
            title: isId ? 'Desain antarmuka & wireframe' : 'UI Wireframes & design mockups',
            description: isId ? 'Buat layout halaman utama dan alur navigasi' : 'Create landing page and user flow',
            priority: 'high',
            tags: [isId ? 'desain' : 'design'],
            due_date: now + 86400000 * 3,
            checklist: [
              { id: `chk-${now}-1`, text: isId ? 'Draft sketsa kasar' : 'Rough sketch', completed: true },
              { id: `chk-${now}-2`, text: isId ? 'Mockup resolusi tinggi' : 'High-fidelity mockup', completed: false },
            ],
            created_at: now,
          },
        ],
      },
      {
        id: 'in_progress',
        title: isId ? 'Sedang Dikerjakan' : 'In Progress',
        cards: [
          {
            id: `card-${now}-3`,
            title: isId ? 'Implementasi fitur utama proyek' : 'Core feature implementation',
            description: isId ? 'Mulai coding modul inti dan konfigurasi awal' : 'Start building core components and setup',
            priority: 'urgent',
            tags: [isId ? 'pengembangan' : 'dev'],
            due_date: now + 86400000 * 2,
            created_at: now,
          },
        ],
      },
      {
        id: 'done',
        title: isId ? 'Selesai' : 'Done',
        cards: [
          {
            id: `card-${now}-4`,
            title: isId ? 'Kick-off meeting & persiapan repositori' : 'Kick-off meeting & repo setup',
            description: isId ? 'Koordinasi awal dan struktur folder selesai disepakati' : 'Initial setup agreed with client',
            priority: 'low',
            tags: ['setup'],
            created_at: now - 86400000,
          },
        ],
      },
    ],
  };
}

/**
 * Calculates board progress and metrics
 */
export function calculateKanbanStats(data?: KanbanBoardData | null): {
  totalCards: number;
  completedCards: number;
  percentage: number;
  backlogCount: number;
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
} {
  if (!data || !Array.isArray(data.columns)) {
    return {
      totalCards: 0,
      completedCards: 0,
      percentage: 0,
      backlogCount: 0,
      todoCount: 0,
      inProgressCount: 0,
      doneCount: 0,
    };
  }

  let totalCards = 0;
  let completedCards = 0;
  let backlogCount = 0;
  let todoCount = 0;
  let inProgressCount = 0;
  let doneCount = 0;

  for (const col of data.columns) {
    const cardCount = (col.cards || []).length;
    totalCards += cardCount;

    if (col.id === 'done') {
      completedCards += cardCount;
      doneCount += cardCount;
    } else if (col.id === 'in_progress') {
      inProgressCount += cardCount;
    } else if (col.id === 'todo') {
      todoCount += cardCount;
    } else if (col.id === 'backlog') {
      backlogCount += cardCount;
    }
  }

  const percentage = totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;

  return {
    totalCards,
    completedCards,
    percentage,
    backlogCount,
    todoCount,
    inProgressCount,
    doneCount,
  };
}

/**
 * Serializes KanbanBoardData into clean, readable Markdown
 */
export function kanbanDataToMarkdown(
  data: KanbanBoardData,
  projectTitle?: string
): string {
  if (!data || !Array.isArray(data.columns)) {
    return '';
  }

  const lines: string[] = [];
  if (projectTitle) {
    lines.push(`# 📋 ${projectTitle.trim()}`);
    lines.push('');
  }

  const columnHeaders: Record<KanbanStatus, string> = {
    backlog: '## 📥 Rencana & Ide (Backlog)',
    todo: '## 🔵 Akan Dikerjakan (To Do)',
    in_progress: '## 🟡 Sedang Dikerjakan (In Progress)',
    done: '## 🟢 Selesai (Done)',
  };

  for (const col of data.columns) {
    const header = columnHeaders[col.id] || `## ${col.title || col.id}`;
    lines.push(header);
    lines.push('');

    if (!col.cards || col.cards.length === 0) {
      lines.push('*Tidak ada tugas di kolom ini.*');
      lines.push('');
      continue;
    }

    for (const card of col.cards) {
      const isDone = col.id === 'done';
      let metaTags: string[] = [];

      if (card.priority && card.priority !== 'medium') {
        metaTags.push(`[prioritas:${card.priority}]`);
      }
      if (card.due_date && card.due_date > 0) {
        const dateStr = new Date(card.due_date).toISOString().split('T')[0];
        metaTags.push(`[tenggat:${dateStr}]`);
      }
      if (card.tags && card.tags.length > 0) {
        for (const t of card.tags) {
          metaTags.push(`#${t.replace(/\s+/g, '-')}`);
        }
      }

      const metaSuffix = metaTags.length > 0 ? ` ${metaTags.join(' ')}` : '';
      lines.push(`- [${isDone ? 'x' : ' '}] **${card.title}**${metaSuffix}`);

      if (card.description && card.description.trim()) {
        lines.push(`  > ${card.description.trim().replace(/\n/g, '\n  > ')}`);
      }

      if (card.checklist && card.checklist.length > 0) {
        for (const chk of card.checklist) {
          lines.push(`  - [${chk.completed ? 'x' : ' '}] ${chk.text}`);
        }
      }

      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

/**
 * Parses Markdown into structured KanbanBoardData
 */
export function markdownToKanbanData(
  markdown: string,
  existingData?: KanbanBoardData | null
): KanbanBoardData {
  const result: KanbanBoardData = {
    version: 1,
    columns: [
      { id: 'backlog', title: 'Rencana & Ide', cards: [] },
      { id: 'todo', title: 'Akan Dikerjakan', cards: [] },
      { id: 'in_progress', title: 'Sedang Dikerjakan', cards: [] },
      { id: 'done', title: 'Selesai', cards: [] },
    ],
  };

  if (!markdown || !markdown.trim()) {
    return result;
  }

  const lines = markdown.split('\n');
  let currentColumnId: KanbanStatus = 'todo';
  let currentCard: KanbanCardItem | null = null;
  const now = Date.now();

  const getCol = (id: KanbanStatus) => result.columns.find((c) => c.id === id);

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Column header detection
    const headerMatch = trimmed.match(/^##+\s+(.*)$/);
    if (headerMatch) {
      if (currentCard) {
        getCol(currentColumnId)?.cards.push(currentCard);
        currentCard = null;
      }

      const text = headerMatch[1].toLowerCase();
      if (/backlog|rencana|ide|idea/i.test(text)) {
        currentColumnId = 'backlog';
      } else if (/in[- ]?progress|sedang|wip|proses/i.test(text)) {
        currentColumnId = 'in_progress';
      } else if (/done|selesai|rampung|completed/i.test(text)) {
        currentColumnId = 'done';
      } else {
        currentColumnId = 'todo';
      }
      continue;
    }

    // Task item detection (- [ ] or - [x] or * [ ])
    const taskMatch = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const isIndented = /^\s{2,}/.test(rawLine);

      if (isIndented && currentCard) {
        // Sub-checklist item under current card
        if (!currentCard.checklist) currentCard.checklist = [];
        currentCard.checklist.push({
          id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          text: taskMatch[2].trim(),
          completed: taskMatch[1].toLowerCase() === 'x',
        });
        continue;
      }

      // New top-level card
      if (currentCard) {
        getCol(currentColumnId)?.cards.push(currentCard);
        currentCard = null;
      }

      let taskText = taskMatch[2].trim();
      let priority: KanbanPriority | undefined = undefined;
      let dueDate: number | undefined = undefined;
      const tags: string[] = [];

      // Extract priority [prioritas:urgent|high|medium|low]
      const prioMatch = taskText.match(/\[prioritas:\s*(urgent|high|medium|low|tinggi|sedang|rendah|mendesak)\]/i);
      if (prioMatch) {
        const val = prioMatch[1].toLowerCase();
        if (val === 'urgent' || val === 'mendesak') priority = 'urgent';
        else if (val === 'high' || val === 'tinggi') priority = 'high';
        else if (val === 'low' || val === 'rendah') priority = 'low';
        else priority = 'medium';
        taskText = taskText.replace(prioMatch[0], '').trim();
      }

      // Extract due date [tenggat:YYYY-MM-DD]
      const dueMatch = taskText.match(/\[(?:tenggat|due):\s*(\d{4}-\d{2}-\d{2})\]/i);
      if (dueMatch) {
        const parsed = Date.parse(dueMatch[1]);
        if (!isNaN(parsed)) dueDate = parsed;
        taskText = taskText.replace(dueMatch[0], '').trim();
      }

      // Extract tags #tag
      const tagMatches = taskText.match(/#([\w-]+)/g);
      if (tagMatches) {
        for (const tm of tagMatches) {
          tags.push(tm.substring(1));
          taskText = taskText.replace(tm, '').trim();
        }
      }

      // Strip bold markers from title if wrapped
      taskText = taskText.replace(/^\*\*|\*\*$/g, '').trim();

      const isChecked = taskMatch[1].toLowerCase() === 'x';
      const colId: KanbanStatus = isChecked && currentColumnId !== 'done' ? 'done' : currentColumnId;

      currentCard = {
        id: `card-${now}-${Math.random().toString(36).substring(2, 7)}`,
        title: taskText || 'Tugas Baru',
        description: '',
        priority: priority || 'medium',
        due_date: dueDate,
        tags: tags.length > 0 ? tags : undefined,
        created_at: now,
      };
      continue;
    }

    // Blockquote or description line under current card
    if (currentCard) {
      const descMatch = trimmed.match(/^>\s*(.*)$/);
      if (descMatch) {
        currentCard.description = currentCard.description
          ? `${currentCard.description}\n${descMatch[1]}`
          : descMatch[1];
      }
    }
  }

  if (currentCard) {
    getCol(currentColumnId)?.cards.push(currentCard);
  }

  return result;
}

/**
 * Renders KanbanBoardData into structured, standalone HTML for public publishing
 */
export function kanbanDataToHtml(data: KanbanBoardData, projectTitle?: string): string {
  const stats = calculateKanbanStats(data);
  const escape = (str?: string) =>
    (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const colColors: Record<KanbanStatus, { border: string; badgeBg: string; badgeText: string }> = {
    backlog: { border: '#475569', badgeBg: '#1e293b', badgeText: '#94a3b8' },
    todo: { border: '#2563eb', badgeBg: '#172554', badgeText: '#60a5fa' },
    in_progress: { border: '#d97706', badgeBg: '#451a03', badgeText: '#fbbf24' },
    done: { border: '#059669', badgeBg: '#064e3b', badgeText: '#34d399' },
  };

  const getPriorityStyle = (p?: KanbanPriority) => {
    switch (p) {
      case 'urgent':
        return { label: 'Mendesak', bg: '#4c0519', color: '#fb7185', border: '#9f1239' };
      case 'high':
        return { label: 'Tinggi', bg: '#451a03', color: '#fbbf24', border: '#b45309' };
      case 'low':
        return { label: 'Rendah', bg: '#1e293b', color: '#94a3b8', border: '#334155' };
      default:
        return { label: 'Sedang', bg: '#172554', color: '#60a5fa', border: '#1d4ed8' };
    }
  };

  let colsHtml = '';
  for (const col of data.columns) {
    const colTheme = colColors[col.id] || colColors.todo;
    let cardsHtml = '';

    if (!col.cards || col.cards.length === 0) {
      cardsHtml = `<div style="padding:14px; border-radius:8px; border:1px dashed #334155; text-align:center; font-size:12px; color:#64748b;">Belum ada tugas</div>`;
    } else {
      for (const card of col.cards) {
        const isDone = col.id === 'done';
        const prio = getPriorityStyle(card.priority);
        const prioTag = card.priority
          ? `<span style="font-size:10px; font-weight:700; text-transform:uppercase; padding:2px 6px; border-radius:4px; background:${prio.bg}; color:${prio.color}; border:1px solid ${prio.border};">${prio.label}</span>`
          : '';
        const dueTag = card.due_date && card.due_date > 0
          ? `<span style="font-size:10px; font-family:monospace; color:#94a3b8;">📅 ${new Date(card.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>`
          : '';

        let checklistHtml = '';
        if (card.checklist && card.checklist.length > 0) {
          const total = card.checklist.length;
          const done = card.checklist.filter((c) => c.completed).length;
          checklistHtml = `
            <div style="margin-top:10px; padding-top:8px; border-top:1px solid #1e293b; font-size:11px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:4px; color:#94a3b8; font-size:10px;">
                <span>Sub-Tugas</span>
                <strong style="color:#e2e8f0; font-family:monospace;">${done}/${total}</strong>
              </div>
              ${card.checklist
                .map(
                  (chk) => `
                <div style="display:flex; align-items:center; gap:6px; margin-top:3px; color:${chk.completed ? '#64748b; text-decoration:line-through;' : '#cbd5e1;'}">
                  <span>${chk.completed ? '☑' : '☐'}</span>
                  <span>${escape(chk.text)}</span>
                </div>`
                )
                .join('')}
            </div>`;
        }

        let tagsHtml = '';
        if (card.tags && card.tags.length > 0) {
          tagsHtml = `
            <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:8px;">
              ${card.tags
                .map(
                  (t) =>
                    `<span style="font-size:9px; font-family:monospace; padding:1px 5px; border-radius:3px; background:#0f172a; color:#94a3b8; border:1px solid #334155;">#${escape(t)}</span>`
                )
                .join('')}
            </div>`;
        }

        cardsHtml += `
          <div style="background:${isDone ? '#064e3b15' : '#1e293b'}; border:1px solid ${isDone ? '#064e3b' : '#334155'}; border-radius:8px; padding:12px; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              ${prioTag}
              ${dueTag}
            </div>
            <div style="font-weight:600; font-size:13px; color:#f8fafc; line-height:1.4; ${isDone ? 'text-decoration:line-through; color:#94a3b8;' : ''}">
              ${escape(card.title)}
            </div>
            ${card.description ? `<div style="font-size:11px; color:#94a3b8; margin-top:6px; line-height:1.4;">${escape(card.description)}</div>` : ''}
            ${checklistHtml}
            ${tagsHtml}
          </div>`;
      }
    }

    colsHtml += `
      <div style="flex:1; min-width:240px; background:#111827; border:1px solid #1f2937; border-top:3px solid ${colTheme.border}; border-radius:10px; padding:12px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:8px; margin-bottom:12px; border-bottom:1px solid #1f2937;">
          <strong style="font-size:12px; text-transform:uppercase; letter-spacing:0.5px; color:#f3f4f6;">${escape(col.title)}</strong>
          <span style="font-size:11px; font-weight:700; font-family:monospace; padding:2px 8px; border-radius:999px; background:${colTheme.badgeBg}; color:${colTheme.badgeText};">
            ${(col.cards || []).length}
          </span>
        </div>
        <div>${cardsHtml}</div>
      </div>`;
  }

  return `
    <div class="qalam-kanban-board-container" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; margin:16px 0;">
      <!-- Project Progress Header Banner -->
      <div style="background:#0f172a; border:1px solid #1e293b; border-radius:12px; padding:18px; margin-bottom:20px; color:#fff;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
          <div>
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#818cf8; letter-spacing:0.5px;">Pantauan Progres Proyek Klien</div>
            <div style="font-size:16px; font-weight:700; color:#f8fafc; margin-top:2px;">
              Tingkat Penyelesaian: <span style="color:#34d399; font-family:monospace; font-size:18px;">${stats.percentage}%</span>
            </div>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:6px; font-size:11px;">
            <span style="background:#1e293b; padding:4px 8px; border-radius:6px; color:#cbd5e1;">Total: <strong style="color:#fff;">${stats.totalCards}</strong> Tugas</span>
            <span style="background:#064e3b; padding:4px 8px; border-radius:6px; color:#6ee7b7;">Selesai: <strong style="color:#fff;">${stats.doneCount}</strong></span>
            <span style="background:#451a03; padding:4px 8px; border-radius:6px; color:#fcd34d;">Sedang: <strong style="color:#fff;">${stats.inProgressCount}</strong></span>
            <span style="background:#172554; padding:4px 8px; border-radius:6px; color:#93c5fd;">Akan Dikerjakan: <strong style="color:#fff;">${stats.todoCount}</strong></span>
          </div>
        </div>
        <div style="background:#1e293b; border-radius:999px; height:8px; overflow:hidden;">
          <div style="width:${Math.max(stats.percentage, 2)}%; height:100%; background:linear-gradient(90deg, #3b82f6, #6366f1, #10b981); border-radius:999px;"></div>
        </div>
      </div>

      <!-- 4 Columns Grid -->
      <div style="display:flex; gap:14px; flex-wrap:wrap; align-items:flex-start;">
        ${colsHtml}
      </div>
    </div>
  `;
}

