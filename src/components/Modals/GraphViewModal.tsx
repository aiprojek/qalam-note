import React, { useRef, useEffect, useState, useMemo } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Share2, Search, FileText } from 'lucide-react';
import type { Note, Folder, AppLanguage } from '../../types';
import { extractWikiLinks, normalizeTitle, cleanTitleKey } from '../../utils/wikilinks';

interface GraphNode {
  id: string;
  title: string;
  isTodo: boolean;
  folderId: string;
  connectionsCount: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface GraphLink {
  sourceId: string;
  targetId: string;
}

interface GraphViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  activeNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  language?: AppLanguage;
  theme?: string;
}

export const GraphViewModal: React.FC<GraphViewModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  activeNoteId,
  onSelectNote,
  language = 'id',
  theme = 'qalam-dark',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const isId = language === 'id';
  const isLight =
    theme === 'qalam-light' ||
    theme === 'light' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('light'));

  // Build Graph Nodes and Links from WikiLinks
  const { nodes, links } = useMemo(() => {
    const validNotes = notes.filter((n) => !n.is_deleted);
    const titleToNoteMap = new Map<string, Note>();
    const cleanTitleToNoteMap = new Map<string, Note>();

    validNotes.forEach((n) => {
      if (n.title) {
        titleToNoteMap.set(normalizeTitle(n.title), n);
        const clean = cleanTitleKey(n.title);
        if (clean) cleanTitleToNoteMap.set(clean, n);
      }
    });

    const linksList: GraphLink[] = [];
    const connectionCounts = new Map<string, number>();

    validNotes.forEach((n) => {
      connectionCounts.set(n.id, 0);
    });

    validNotes.forEach((n) => {
      const fullText = (n.body || '') + ' ' + (n.body_html || '');
      const wikiLinks = extractWikiLinks(fullText);
      const linkedTargetIds = new Set<string>();

      wikiLinks.forEach((w) => {
        const norm = normalizeTitle(w.target);
        const clean = cleanTitleKey(w.target);
        const target = titleToNoteMap.get(norm) || (clean ? cleanTitleToNoteMap.get(clean) : undefined);
        if (target && target.id !== n.id && !linkedTargetIds.has(target.id)) {
          linkedTargetIds.add(target.id);
          linksList.push({ sourceId: n.id, targetId: target.id });
          connectionCounts.set(n.id, (connectionCounts.get(n.id) || 0) + 1);
          connectionCounts.set(target.id, (connectionCounts.get(target.id) || 0) + 1);
        }
      });
    });

    const darkColors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#6366f1'];
    const lightColors = ['#2563eb', '#059669', '#d97706', '#db2777', '#7c3aed', '#0891b2', '#0d9488', '#4f46e5'];
    const colors = isLight ? lightColors : darkColors;
    const folderColorMap = new Map<string, string>();
    folders.forEach((f, idx) => {
      folderColorMap.set(f.id, colors[idx % colors.length]);
    });

    const total = validNotes.length;
    const nodesList: GraphNode[] = validNotes.map((n, i) => {
      const connCount = connectionCounts.get(n.id) || 0;
      let initX = 0;
      let initY = 0;

      if (total === 1) {
        initX = 0;
        initY = 0;
      } else {
        const angle = (i / total) * 2 * Math.PI;
        const radiusDist = 90 + (i % 4) * 45;
        initX = Math.cos(angle) * radiusDist;
        initY = Math.sin(angle) * radiusDist;
      }

      return {
        id: n.id,
        title: n.title || (isId ? 'Catatan Tanpa Judul' : 'Untitled Note'),
        isTodo: n.is_todo,
        folderId: n.folder_id,
        connectionsCount: connCount,
        x: initX,
        y: initY,
        vx: 0,
        vy: 0,
        radius: Math.min(18, Math.max(7, 7 + connCount * 2.5)),
        color: n.id === activeNoteId ? (isLight ? '#2563eb' : '#60a5fa') : folderColorMap.get(n.folder_id) || (isLight ? '#3b82f6' : '#60a5fa'),
      };
    });

    return { nodes: nodesList, links: linksList };
  }, [notes, folders, activeNoteId, isId, isLight]);

  // Handle Canvas Resize using ResizeObserver with reliable fallback
  useEffect(() => {
    if (!isOpen) return;

    const updateSize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const w = Math.round(rect.width || container.clientWidth || 800);
      const h = Math.round(rect.height || container.clientHeight || 550);

      if (w > 50 && h > 50) {
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
      }
    };

    updateSize();

    let ro: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateSize();
      });
      ro.observe(containerRef.current);
    }

    const t1 = setTimeout(updateSize, 30);
    const t2 = setTimeout(updateSize, 120);
    const t3 = setTimeout(updateSize, 300);

    window.addEventListener('resize', updateSize);
    return () => {
      if (ro) ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', updateSize);
    };
  }, [isOpen]);

  // Simulation physics & canvas animation loop
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const nodeMap = new Map<string, GraphNode>();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    const render = () => {
      const width = canvas.width || 600;
      const height = canvas.height || 450;
      const cx = width / 2 + pan.x;
      const cy = height / 2 + pan.y;

      // Physics update: Repulsion & Attraction
      if (nodes.length > 1) {
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i];
          a.vx -= a.x * 0.0008;
          a.vy -= a.y * 0.0008;

          for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < 260) {
              const force = ((260 - dist) / dist) * 0.035;
              a.vx -= dx * force;
              a.vy -= dy * force;
              b.vx += dx * force;
              b.vy += dy * force;
            }
          }
        }

        // Link attraction
        links.forEach((link) => {
          const source = nodeMap.get(link.sourceId);
          const target = nodeMap.get(link.targetId);
          if (source && target) {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - 110) * 0.002;
            source.vx += dx * force;
            source.vy += dy * force;
            target.vx -= dx * force;
            target.vy -= dy * force;
          }
        });

        // Position update with damping
        nodes.forEach((n) => {
          n.x += n.vx;
          n.y += n.vy;
          n.vx *= 0.86;
          n.vy *= 0.86;
        });
      }

      // Fill Canvas Background to match theme
      ctx.fillStyle = isLight ? '#f8fafc' : '#070b14';
      ctx.fillRect(0, 0, width, height);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);

      // Draw Links
      links.forEach((link) => {
        const source = nodeMap.get(link.sourceId);
        const target = nodeMap.get(link.targetId);
        if (source && target) {
          const isConnectedToHovered =
            hoveredNode && (hoveredNode.id === source.id || hoveredNode.id === target.id);
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = isConnectedToHovered
            ? (isLight ? '#2563eb' : '#60a5fa')
            : (isLight ? '#cbd5e1' : '#334155');
          ctx.lineWidth = isConnectedToHovered ? 2.5 : 1.2;
          ctx.stroke();
        }
      });

      // Draw Nodes
      nodes.forEach((n) => {
        const matchesFilter =
          !searchFilter.trim() || n.title.toLowerCase().includes(searchFilter.toLowerCase());
        const isHovered = hoveredNode?.id === n.id;
        const isActive = activeNoteId === n.id;

        // Glowing outer halo for active / hovered node
        if (isActive || isHovered) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 6, 0, 2 * Math.PI);
          ctx.fillStyle = isActive
            ? (isLight ? 'rgba(37, 99, 235, 0.2)' : 'rgba(56, 189, 248, 0.25)')
            : (isLight ? 'rgba(59, 130, 246, 0.2)' : 'rgba(96, 165, 250, 0.25)');
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, isHovered ? n.radius + 2.5 : n.radius, 0, 2 * Math.PI);
        ctx.fillStyle = matchesFilter ? (isActive ? (isLight ? '#2563eb' : '#38bdf8') : n.color) : (isLight ? '#94a3b8' : '#475569');
        ctx.fill();

        if (isActive || isHovered) {
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = isLight ? '#1e40af' : '#ffffff';
          ctx.stroke();
        } else {
          ctx.lineWidth = 1;
          ctx.strokeStyle = isLight ? '#ffffff' : '#1e293b';
          ctx.stroke();
        }

        // Draw title labels
        if (n.connectionsCount > 0 || isHovered || isActive || nodes.length <= 20) {
          ctx.font = `${isHovered ? 'bold 12px' : '11px'} system-ui, sans-serif`;
          ctx.fillStyle = isHovered
            ? (isLight ? '#1e3a8a' : '#ffffff')
            : (isLight ? '#0f172a' : '#e2e8f0');
          ctx.textAlign = 'center';
          ctx.fillText(n.title, n.x, n.y + n.radius + 14);
        }
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isOpen, nodes, links, zoom, pan, hoveredNode, activeNoteId, searchFilter, isLight]);

  // Mouse & Touch interactivity: Hover, Drag-to-Pan, Zoom, and Click
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    const canvasMouseX = (e.clientX - rect.left) * scaleX;
    const canvasMouseY = (e.clientY - rect.top) * scaleY;

    const cx = canvas.width / 2 + pan.x;
    const cy = canvas.height / 2 + pan.y;
    const mouseX = (canvasMouseX - cx) / zoom;
    const mouseY = (canvasMouseY - cy) / zoom;

    const hit = nodes.find((n) => {
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 6;
    });

    setHoveredNode(hit || null);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredNode) {
      onSelectNote(hoveredNode.id);
      onClose();
    }
  };

  // Touch gesture support for mobile and tablet devices
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsPanning(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isPanning) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setIsPanning(false);
    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / (rect.width || 1);
      const scaleY = canvas.height / (rect.height || 1);
      const canvasX = (touch.clientX - rect.left) * scaleX;
      const canvasY = (touch.clientY - rect.top) * scaleY;
      const cx = canvas.width / 2 + pan.x;
      const cy = canvas.height / 2 + pan.y;
      const touchX = (canvasX - cx) / zoom;
      const touchY = (canvasY - cy) / zoom;
      const hit = nodes.find((n) => {
        const dx = n.x - touchX;
        const dy = n.y - touchY;
        return Math.sqrt(dx * dx + dy * dy) <= n.radius + 10;
      });
      if (hit) {
        onSelectNote(hit.id);
        onClose();
      }
    }
  };

  // Mouse wheel zoom support
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.88;
    setZoom((z) => Math.min(3, Math.max(0.3, Number((z * factor).toFixed(2)))));
  };

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
        className={`w-full h-full sm:h-[88vh] sm:max-w-5xl sm:rounded-2xl rounded-none shadow-2xl overflow-hidden flex flex-col transition-colors ${
          isLight
            ? 'bg-white border-0 sm:border border-slate-200 text-slate-900'
            : 'bg-[#0f172a] border-0 sm:border border-slate-700 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 sm:px-6 py-3 border-b shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0a0f1d] border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg border ${
                isLight
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
              }`}
            >
              <Share2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className={`text-sm sm:text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <span>{isId ? 'Grafik Pengetahuan (Knowledge Graph)' : 'Knowledge Graph View'}</span>
                <span
                  className={`text-[11px] font-normal px-2 py-0.5 rounded-full border ${
                    isLight
                      ? 'bg-slate-100 text-slate-700 border-slate-300'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {nodes.length} {isId ? 'catatan' : 'notes'} • {links.length} {isId ? 'koneksi' : 'links'}
                </span>
              </h3>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isId
                  ? 'Visualisasi hubungan antar-catatan berbasis tautan dua arah ([[WikiLinks]])'
                  : 'Interactive visual network of note connections powered by [[WikiLinks]]'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
        </div>

        {/* Canvas & Controls Area */}
        <div
          ref={containerRef}
          className={`flex-1 relative overflow-hidden min-h-[320px] ${
            isLight ? 'bg-[#f8fafc]' : 'bg-[#070b14]'
          } ${isPanning ? 'cursor-grabbing' : hoveredNode ? 'cursor-pointer' : 'cursor-grab'}`}
        >
          {/* Canvas with Full Mouse, Touch, and Wheel Interactions */}
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleCanvasClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className="w-full h-full block touch-none"
          />

          {/* Empty State Overlay */}
          {nodes.length === 0 && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none ${isLight ? 'bg-white/80' : 'bg-black/60'}`}>
              <FileText className={`w-12 h-12 mb-3 ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
              <h4 className={`text-base font-bold mb-1 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                {isId ? 'Belum Ada Catatan untuk Ditampilkan' : 'No Notes to Display in Graph'}
              </h4>
              <p className={`text-xs max-w-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {isId
                  ? 'Buat beberapa catatan dan hubungkan dengan mengetik [[Nama Catatan]] di editor untuk melihat jaringannya di sini.'
                  : 'Create notes and link them by typing [[Note Title]] in the editor to see your knowledge network.'}
              </p>
            </div>
          )}

          {/* Floating Controls Top Left: Search Filter */}
          <div
            className={`absolute top-4 left-4 z-10 flex items-center gap-2 backdrop-blur-xs px-3 py-1.5 rounded-xl border shadow-md max-w-xs ${
              isLight
                ? 'bg-white/95 border-slate-300 text-slate-900'
                : 'bg-[#131b2e]/90 border-slate-700 text-white'
            }`}
          >
            <Search className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={isId ? 'Cari simpul catatan...' : 'Filter graph nodes...'}
              className={`bg-transparent text-xs outline-none w-full ${isLight ? 'text-slate-900 placeholder:text-slate-400' : 'text-white placeholder:text-slate-500'}`}
            />
            {searchFilter && (
              <button onClick={() => setSearchFilter('')} className={`${isLight ? 'text-slate-400 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Floating Controls Bottom Right: Zoom & Reset */}
          <div
            className={`absolute bottom-4 right-4 z-10 flex items-center gap-1.5 backdrop-blur-xs p-1.5 rounded-xl border shadow-md ${
              isLight
                ? 'bg-white/95 border-slate-300'
                : 'bg-[#131b2e]/90 border-slate-700'
            }`}
          >
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
              title="Zoom In"
              className={`p-1.5 rounded-lg transition ${
                isLight ? 'text-slate-700 hover:text-black hover:bg-slate-100' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
              title="Zoom Out"
              className={`p-1.5 rounded-lg transition ${
                isLight ? 'text-slate-700 hover:text-black hover:bg-slate-100' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              title={isId ? 'Atur Ulang Tampilan' : 'Reset View'}
              className={`p-1.5 rounded-lg transition ${
                isLight ? 'text-slate-700 hover:text-black hover:bg-slate-100' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Hovered Node Tooltip Preview */}
          {hoveredNode && (
            <div
              className={`absolute bottom-4 left-4 z-10 max-w-sm shadow-xl p-3 rounded-xl pointer-events-none animate-in fade-in duration-100 border ${
                isLight
                  ? 'bg-white border-blue-400 text-slate-900'
                  : 'bg-[#131b2e] border-blue-500/60 text-white'
              }`}
            >
              <div className="text-xs font-bold mb-1 flex items-center gap-1.5">
                <span>🔗</span>
                <span className={`truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{hoveredNode.title}</span>
              </div>
              <div className={`text-[11px] flex items-center gap-3 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <span>
                  {hoveredNode.connectionsCount} {isId ? 'koneksi WikiLink' : 'connections'}
                </span>
                <span className={`font-semibold ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                  {isId ? 'Klik untuk membuka' : 'Click to open'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
