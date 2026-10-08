import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  PenTool,
  Highlighter,
  Eraser,
  RotateCcw,
  Check,
  Undo,
  Redo,
  Palette,
  PaintBucket,
  Maximize2,
  SlidersHorizontal,
  Download,
  Lock,
  Unlock,
  ArrowLeftRight,
  Grid,
  AlignJustify,
  CircleDot,
  Plus,
  Trash2,
  Sparkles,
  Eye,
  Minimize2,
  ChevronDown,
  FileText,
  Monitor,
  ZoomIn,
  ZoomOut,
  Hand,
} from 'lucide-react';
import type { AppLanguage } from '../../types';

export interface InsertDrawingOptions {
  displayWidth?: string;
  width?: number;
  height?: number;
}

interface DrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertDrawing: (dataUrl: string, options?: InsertDrawingOptions) => void;
  language?: AppLanguage;
  theme?: string;
}

type CanvasPreset = 'responsive' | '1:1' | '4:3' | '16:9' | '3:1' | '3:4' | '4:1' | 'custom';
type ExportScale = '100' | '75' | '50' | '25' | 'custom';
type PaperPattern = 'none' | 'grid' | 'dots' | 'ruled';
type NoteDisplayOption = 'full' | 'medium' | 'compact' | 'custom';
type DrawingTool = 'pen' | 'brush' | 'highlighter' | 'eraser' | 'hand';
type ActivePopover = 'none' | 'color' | 'bg' | 'size' | 'brush';

interface PresetConfig {
  id: CanvasPreset;
  labelId: string;
  labelEn: string;
  width?: number;
  height?: number;
  ratio?: string;
}

const CANVAS_PRESETS: PresetConfig[] = [
  { id: 'responsive', labelId: 'Otomatis', labelEn: 'Auto', ratio: 'Fleksibel' },
  { id: '1:1', labelId: '1:1 Persegi', labelEn: '1:1 Square', width: 800, height: 800, ratio: '1:1' },
  { id: '4:3', labelId: '4:3 Standar', labelEn: '4:3 Standard', width: 1024, height: 768, ratio: '4:3' },
  { id: '16:9', labelId: '16:9 Lebar', labelEn: '16:9 Widescreen', width: 1280, height: 720, ratio: '16:9' },
  { id: '3:1', labelId: '3:1 Spanduk', labelEn: '3:1 Banner', width: 1200, height: 400, ratio: '3:1' },
  { id: '3:4', labelId: '3:4 Dokumen', labelEn: '3:4 Document', width: 768, height: 1024, ratio: '3:4' },
  { id: '4:1', labelId: '4:1 Tanda Tangan', labelEn: '4:1 Signature', width: 800, height: 200, ratio: '4:1' },
  { id: 'custom', labelId: 'Kustom Px', labelEn: 'Custom Px', ratio: 'Kustom' },
];

const PRESET_STROKE_COLORS = [
  { hex: '#000000', name: 'Hitam' },
  { hex: '#ffffff', name: 'Putih' },
  { hex: '#2563eb', name: 'Biru' },
  { hex: '#059669', name: 'Hijau' },
  { hex: '#d97706', name: 'Amber' },
  { hex: '#dc2626', name: 'Merah' },
  { hex: '#7c3aed', name: 'Ungu' },
  { hex: '#0891b2', name: 'Sian' },
  { hex: '#db2777', name: 'Pink' },
  { hex: '#65a30d', name: 'Lime' },
  { hex: '#ea580c', name: 'Oranye' },
  { hex: '#475569', name: 'Abu-abu' },
];

const PRESET_BG_COLORS = [
  { value: 'transparent', nameId: 'Transparan', nameEn: 'Transparent (PNG)', hex: '#ffffff' },
  { value: '#ffffff', nameId: 'Putih Bersih', nameEn: 'Pure White', hex: '#ffffff' },
  { value: '#0f172a', nameId: 'Slate Gelap', nameEn: 'Dark Slate', hex: '#0f172a' },
  { value: '#000000', nameId: 'Hitam Pekat', nameEn: 'Pitch Black', hex: '#000000' },
  { value: '#fef9ee', nameId: 'Kertas Krem', nameEn: 'Warm Paper', hex: '#fef9ee' },
  { value: '#f1f5f9', nameId: 'Abu Lembut', nameEn: 'Soft Light Gray', hex: '#f1f5f9' },
  { value: '#091428', nameId: 'Biru Malam', nameEn: 'Midnight Blue', hex: '#091428' },
  { value: '#fef9c3', nameId: 'Kertas Kuning', nameEn: 'Legal Yellow', hex: '#fef9c3' },
  { value: '#142e23', nameId: 'Papan Tulis', nameEn: 'Chalkboard Green', hex: '#142e23' },
  { value: '#172554', nameId: 'Cetak Biru', nameEn: 'Blueprint Navy', hex: '#172554' },
  { value: '#f3e8ff', nameId: 'Pastel Lavender', nameEn: 'Pastel Lavender', hex: '#f3e8ff' },
  { value: '#ecfdf5', nameId: 'Pastel Mint', nameEn: 'Pastel Mint', hex: '#ecfdf5' },
];

export const DrawingModal: React.FC<DrawingModalProps> = ({
  isOpen,
  onClose,
  onInsertDrawing,
  language = 'id',
  theme = 'qalam-dark',
}) => {
  const isId = language === 'id';
  const isLight =
    theme === 'qalam-light' ||
    theme === 'light' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('light'));

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Popover Drawer State
  const [activePopover, setActivePopover] = useState<ActivePopover>('none');
  const [isZenMode, setIsZenMode] = useState(false);

  // Note Viewport Simulation
  const [previewInNoteScale, setPreviewInNoteScale] = useState(false);

  // Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mobile Pinch-to-Zoom refs
  const isPinchingRef = useRef<boolean>(false);
  const initialPinchDistRef = useRef<number>(0);
  const initialZoomRef = useRef<number>(1);
  const initialPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialMidpointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchTimeRef = useRef<number>(0);

  // Drawing tools
  const [tool, setTool] = useState<DrawingTool>('pen');
  const [strokeColor, setStrokeColor] = useState('#2563eb');
  const [customStrokeHex, setCustomStrokeHex] = useState('#2563eb');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [strokeOpacity, setStrokeOpacity] = useState(100);
  const [isDrawing, setIsDrawing] = useState(false);

  // Saved Custom Stroke Colors (Personal Palette)
  const [savedStrokeColors, setSavedStrokeColors] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('qalam_custom_stroke_colors');
      return stored ? JSON.parse(stored) : ['#e11d48', '#8b5cf6', '#059669', '#f97316'];
    } catch {
      return ['#e11d48', '#8b5cf6', '#059669', '#f97316'];
    }
  });

  // Background color state & custom hex
  const [bgColor, setBgColor] = useState('#0f172a');
  const [customBgHex, setCustomBgHex] = useState('#0f172a');
  const [paperPattern, setPaperPattern] = useState<PaperPattern>('none');
  const [includePatternInExport, setIncludePatternInExport] = useState(true);

  // Saved Custom Background Colors
  const [savedBgColors, setSavedBgColors] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('qalam_custom_bg_colors');
      return stored ? JSON.parse(stored) : ['#fef3c7', '#dbeafe', '#fce7f3', '#1e293b'];
    } catch {
      return ['#fef3c7', '#dbeafe', '#fce7f3', '#1e293b'];
    }
  });

  // Canvas Dimensions & Aspect Ratio
  const [preset, setPreset] = useState<CanvasPreset>('responsive');
  const [customWidth, setCustomWidth] = useState(1024);
  const [customHeight, setCustomHeight] = useState(640);
  const [lockAspectRatio, setLockAspectRatio] = useState(false);

  // Output Export Resolution & Note Display Size
  const [exportScale, setExportScale] = useState<ExportScale>('100');
  const [customExportWidth, setCustomExportWidth] = useState(800);
  const [noteDisplaySize, setNoteDisplaySize] = useState<NoteDisplayOption>('medium');
  const [customDisplayWidth, setCustomDisplayWidth] = useState(600);

  // Undo / Redo history
  const historyRef = useRef<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Current canvas buffer size
  const [actualDimensions, setActualDimensions] = useState({ width: 900, height: 550 });

  // Observed container available dimensions
  const [containerSize, setContainerSize] = useState({ width: 900, height: 600 });

  // ResizeObserver for container to ensure responsive scaling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
      }
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [isOpen]);

  // Synchronize initial background with current app theme when modal opens
  useEffect(() => {
    if (isOpen) {
      if (isLight) {
        setBgColor('#ffffff');
        setCustomBgHex('#ffffff');
      } else {
        setBgColor('#0f172a');
        setCustomBgHex('#0f172a');
      }
      setActivePopover('none');
      setIsZenMode(false);
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [isOpen, isLight]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(4.0, +(prev + 0.25).toFixed(2)));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(0.3, +(prev - 0.25).toFixed(2)));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Desktop keyboard shortcuts (Space to pan, Ctrl/Cmd + / - to zoom)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        handleZoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, handleZoomIn, handleZoomOut, handleResetZoom]);

  // Trackpad pinch gesture and mouse wheel zoom listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomDelta = -e.deltaY * 0.006;
        setZoomLevel((prev) => Math.min(4.0, Math.max(0.3, +(prev + zoomDelta).toFixed(2))));
      } else if (isSpacePressed || tool === 'hand') {
        e.preventDefault();
        setPanOffset((prev) => ({
          x: Math.round(prev.x - e.deltaX),
          y: Math.round(prev.y - e.deltaY),
        }));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen, isSpacePressed, tool]);

  // Toggle popover helper
  const togglePopover = (pop: ActivePopover) => {
    setActivePopover((prev) => (prev === pop ? 'none' : pop));
  };

  // Save custom stroke colors to localStorage
  const handleSaveCustomStroke = (hex: string) => {
    const formatted = hex.startsWith('#') ? hex.toLowerCase() : `#${hex.toLowerCase()}`;
    if (!savedStrokeColors.includes(formatted)) {
      const updated = [formatted, ...savedStrokeColors.slice(0, 11)];
      setSavedStrokeColors(updated);
      try {
        localStorage.setItem('qalam_custom_stroke_colors', JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const handleRemoveCustomStroke = (hex: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedStrokeColors.filter((c) => c !== hex);
    setSavedStrokeColors(updated);
    try {
      localStorage.setItem('qalam_custom_stroke_colors', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Save custom background color to localStorage
  const handleSaveCustomBg = (hex: string) => {
    const formatted = hex.startsWith('#') ? hex.toLowerCase() : `#${hex.toLowerCase()}`;
    if (!savedBgColors.includes(formatted)) {
      const updated = [formatted, ...savedBgColors.slice(0, 11)];
      setSavedBgColors(updated);
      try {
        localStorage.setItem('qalam_custom_bg_colors', JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const handleRemoveCustomBg = (hex: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedBgColors.filter((c) => c !== hex);
    setSavedBgColors(updated);
    try {
      localStorage.setItem('qalam_custom_bg_colors', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Initialize or resize canvas preserving existing artwork
  const initCanvas = useCallback(
    (targetW?: number, targetH?: number, shouldScaleExisting = true, targetPreset?: CanvasPreset) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const containerW = Math.max(Math.floor(rect.width) || 800, 320);
      const containerH = Math.max(Math.floor(rect.height) || 520, 240);

      const activePreset = targetPreset || preset;
      let finalW = containerW;
      let finalH = containerH;

      if (activePreset === 'responsive') {
        finalW = targetW || containerW;
        finalH = targetH || containerH;
      } else if (activePreset === '1:1') {
        finalW = 800;
        finalH = 800;
      } else if (activePreset === '4:3') {
        finalW = 1024;
        finalH = 768;
      } else if (activePreset === '16:9') {
        finalW = 1280;
        finalH = 720;
      } else if (activePreset === '3:1') {
        finalW = 1200;
        finalH = 400;
      } else if (activePreset === '3:4') {
        finalW = 768;
        finalH = 1024;
      } else if (activePreset === '4:1') {
        finalW = 800;
        finalH = 200;
      } else if (activePreset === 'custom') {
        finalW = Math.max(200, Math.min(3600, targetW || customWidth));
        finalH = Math.max(150, Math.min(2600, targetH || customHeight));
      }

      setActualDimensions({ width: finalW, height: finalH });

      let snapshot: HTMLCanvasElement | null = null;
      if (canvas.width > 0 && canvas.height > 0) {
        snapshot = document.createElement('canvas');
        snapshot.width = canvas.width;
        snapshot.height = canvas.height;
        const sCtx = snapshot.getContext('2d');
        if (sCtx) {
          sCtx.drawImage(canvas, 0, 0);
        }
      }

      canvas.width = finalW;
      canvas.height = finalH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, finalW, finalH);
        if (snapshot) {
          if (shouldScaleExisting) {
            ctx.drawImage(snapshot, 0, 0, finalW, finalH);
          } else {
            ctx.drawImage(snapshot, 0, 0);
          }
        }
        const imgData = ctx.getImageData(0, 0, finalW, finalH);
        historyRef.current = [imgData];
        setHistoryIndex(0);
      }
    },
    [preset, customWidth, customHeight]
  );

  // Initialize on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        initCanvas();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initCanvas]);

  // Handle instant preset selection with real-time resizing
  const handleSelectPreset = (pId: CanvasPreset) => {
    setPreset(pId);
    const p = CANVAS_PRESETS.find((x) => x.id === pId);
    if (p && p.width && p.height) {
      setCustomWidth(p.width);
      setCustomHeight(p.height);
      initCanvas(p.width, p.height, true, pId);
    } else if (pId === 'responsive') {
      initCanvas(undefined, undefined, true, 'responsive');
    } else if (pId === 'custom') {
      initCanvas(customWidth, customHeight, true, 'custom');
    }
  };

  // Handle custom width / height changes with optional aspect-ratio lock
  const handleCustomWidthChange = (val: number) => {
    const w = Math.max(200, Math.min(3600, val));
    if (lockAspectRatio && customWidth > 0) {
      const ratio = customHeight / customWidth;
      setCustomHeight(Math.round(w * ratio));
    }
    setCustomWidth(w);
  };

  const handleCustomHeightChange = (val: number) => {
    const h = Math.max(150, Math.min(2600, val));
    if (lockAspectRatio && customHeight > 0) {
      const ratio = customWidth / customHeight;
      setCustomWidth(Math.round(h * ratio));
    }
    setCustomHeight(h);
  };

  // Swap width and height (landscape ⇄ portrait)
  const handleSwapDimensions = () => {
    const prevW = customWidth;
    const prevH = customHeight;
    setCustomWidth(prevH);
    setCustomHeight(prevW);
    if (preset === 'custom') {
      setTimeout(() => initCanvas(prevH, prevW, true, 'custom'), 30);
    }
  };

  // Calculate PRECISE screen display dimensions for the canvas wrapper
  const displayDimensions = useMemo(() => {
    const pad = 36;
    const availW = Math.max(containerSize.width - pad, 200);
    const availH = Math.max(containerSize.height - pad, 140);
    const ratio = actualDimensions.width / (actualDimensions.height || 1);

    if (previewInNoteScale) {
      // 1:1 Note Scale Preview
      let targetW = availW;
      if (noteDisplaySize === 'medium') targetW = 600;
      else if (noteDisplaySize === 'compact') targetW = 350;
      else if (noteDisplaySize === 'custom') targetW = customDisplayWidth;

      let w = Math.min(targetW, availW);
      let h = Math.round(w / ratio);
      if (h > availH) {
        h = availH;
        w = Math.round(h * ratio);
      }
      return { width: Math.max(w, 120), height: Math.max(h, 50) };
    }

    // Standard Mode: Viewport Fit strictly locking aspect ratio
    let w: number;
    let h: number;
    if (availW / availH > ratio) {
      h = availH;
      w = Math.round(h * ratio);
    } else {
      w = availW;
      h = Math.round(w / ratio);
    }
    return { width: Math.max(w, 120), height: Math.max(h, 50) };
  }, [containerSize, actualDimensions, previewInNoteScale, noteDisplaySize, customDisplayWidth]);

  // Push new state to undo history
  const pushState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = historyRef.current.slice(0, historyIndex + 1);
    newHistory.push(imgData);
    if (newHistory.length > 30) {
      newHistory.shift();
    }
    historyRef.current = newHistory;
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo action
  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prevIndex = historyIndex - 1;
    const prevState = historyRef.current[prevIndex];
    if (prevState) {
      ctx.putImageData(prevState, 0, 0);
      setHistoryIndex(prevIndex);
    }
  };

  // Redo action
  const handleRedo = () => {
    if (historyIndex >= historyRef.current.length - 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nextIndex = historyIndex + 1;
    const nextState = historyRef.current[nextIndex];
    if (nextState) {
      ctx.putImageData(nextState, 0, 0);
      setHistoryIndex(nextIndex);
    }
  };

  // Clear all drawings
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pushState();
  };

  // Drawing event coordinates helper (perfect scale mapping even when zoomed and panned)
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Start Drawing
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (activePopover !== 'none') {
      setActivePopover('none');
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCanvasCoords(e);

    ctx.beginPath();
    ctx.moveTo(x, y);

    const alpha = Math.max(0.05, Math.min(1.0, strokeOpacity / 100));

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = strokeWidth * 4;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.globalAlpha = 1.0;
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth * 3.5;
      ctx.globalAlpha = alpha * 0.35;
    } else if (tool === 'brush') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth * 2.2;
      ctx.globalAlpha = alpha;
    } else {
      // Pen
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.globalAlpha = alpha;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.closePath();
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
      pushState();
    }
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || tool === 'hand' || isSpacePressed) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y,
      };
      return;
    }
    if (e.button === 0) {
      startDraw(e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPanOffset({
        x: Math.round(e.clientX - panStartRef.current.x),
        y: Math.round(e.clientY - panStartRef.current.y),
      });
      return;
    }
    draw(e);
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    stopDraw();
  };

  // Mobile Touch handlers: Seamless 2-finger Pinch-to-Zoom & Pan vs 1-finger Draw
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (activePopover !== 'none') {
      setActivePopover('none');
    }

    if (e.touches.length === 2) {
      // 2-finger pinch gesture initiated!
      isPinchingRef.current = true;
      setIsDrawing(false);
      setIsPanning(false);

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      initialPinchDistRef.current = dist;
      initialZoomRef.current = zoomLevel;
      initialPanRef.current = { ...panOffset };
      initialMidpointRef.current = { x: midX, y: midY };
      return;
    }

    if (e.touches.length === 1) {
      if (Date.now() - lastTouchTimeRef.current < 200 || isPinchingRef.current) {
        return;
      }

      if (tool === 'hand' || isSpacePressed) {
        setIsPanning(true);
        panStartRef.current = {
          x: e.touches[0].clientX - panOffset.x,
          y: e.touches[0].clientY - panOffset.y,
        };
        return;
      }

      startDraw(e);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      if (initialPinchDistRef.current > 0) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const scaleFactor = currentDist / initialPinchDistRef.current;
        const newZoom = Math.min(4.0, Math.max(0.3, +(initialZoomRef.current * scaleFactor).toFixed(2)));

        const curMidX = (t1.clientX + t2.clientX) / 2;
        const curMidY = (t1.clientY + t2.clientY) / 2;
        const deltaX = curMidX - initialMidpointRef.current.x;
        const deltaY = curMidY - initialMidpointRef.current.y;

        setZoomLevel(newZoom);
        setPanOffset({
          x: Math.round(initialPanRef.current.x + deltaX),
          y: Math.round(initialPanRef.current.y + deltaY),
        });
      }
      return;
    }

    if (e.touches.length === 1) {
      if (isPinchingRef.current) return;

      if (isPanning) {
        setPanOffset({
          x: Math.round(e.touches[0].clientX - panStartRef.current.x),
          y: Math.round(e.touches[0].clientY - panStartRef.current.y),
        });
        return;
      }

      draw(e);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length < 2 && isPinchingRef.current) {
      isPinchingRef.current = false;
      initialPinchDistRef.current = 0;
      lastTouchTimeRef.current = Date.now();
      return;
    }

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    stopDraw();
  };

  // Calculate final exported image dimensions
  const getExportDimensions = useCallback(() => {
    const origW = actualDimensions.width;
    const origH = actualDimensions.height;

    if (exportScale === '100') {
      return { width: origW, height: origH };
    }
    if (exportScale === '75') {
      return { width: Math.round(origW * 0.75), height: Math.round(origH * 0.75) };
    }
    if (exportScale === '50') {
      return { width: Math.round(origW * 0.5), height: Math.round(origH * 0.5) };
    }
    if (exportScale === '25') {
      return { width: Math.round(origW * 0.25), height: Math.round(origH * 0.25) };
    }
    if (exportScale === 'custom') {
      const targetW = Math.max(100, Math.min(3600, customExportWidth));
      const ratio = origH / (origW || 1);
      return { width: targetW, height: Math.round(targetW * ratio) };
    }
    return { width: origW, height: origH };
  }, [actualDimensions, exportScale, customExportWidth]);

  // Determine display width inside note
  const getNoteDisplayWidth = (): string => {
    if (noteDisplaySize === 'full') return '100%';
    if (noteDisplaySize === 'medium') return '600px';
    if (noteDisplaySize === 'compact') return '350px';
    if (noteDisplaySize === 'custom') return `${Math.max(150, Math.min(1600, customDisplayWidth))}px`;
    return '100%';
  };

  // Helper to render paper patterns onto a canvas context
  const renderPatternToContext = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    pattern: PaperPattern,
    isDarkBg: boolean
  ) => {
    if (pattern === 'none') return;

    ctx.save();
    const lineColor = isDarkBg ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)';
    const dotColor = isDarkBg ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.14)';
    const marginColor = isDarkBg ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.35)';

    if (pattern === 'grid') {
      const step = 28;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = step; x < width; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = step; y < height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    } else if (pattern === 'dots') {
      const step = 28;
      ctx.fillStyle = dotColor;
      for (let x = step; x < width; x += step) {
        for (let y = step; y < height; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (pattern === 'ruled') {
      const step = 32;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = step; y < height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      const marginX = 54;
      ctx.strokeStyle = marginColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(marginX, 0);
      ctx.lineTo(marginX, height);
      ctx.stroke();
    }
    ctx.restore();
  };

  // Generate exported canvas image with full styling & background
  const generateExportCanvas = useCallback((): HTMLCanvasElement | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const { width: exportW, height: exportH } = getExportDimensions();

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportW;
    exportCanvas.height = exportH;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return null;

    let isDarkBg = !isLight;
    if (bgColor !== 'transparent') {
      exportCtx.fillStyle = bgColor;
      exportCtx.fillRect(0, 0, exportW, exportH);

      const hex = bgColor.replace('#', '');
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        isDarkBg = lum < 0.5;
      }
    }

    if (paperPattern !== 'none' && includePatternInExport && bgColor !== 'transparent') {
      renderPatternToContext(exportCtx, exportW, exportH, paperPattern, isDarkBg);
    }

    exportCtx.imageSmoothingEnabled = true;
    exportCtx.imageSmoothingQuality = 'high';
    exportCtx.drawImage(canvas, 0, 0, exportW, exportH);

    return exportCanvas;
  }, [getExportDimensions, bgColor, isLight, paperPattern, includePatternInExport]);

  // Insert into note
  const handleSave = () => {
    const exportCanvas = generateExportCanvas();
    if (!exportCanvas) return;

    const dataUrl = exportCanvas.toDataURL('image/png');
    const { width: exportW, height: exportH } = getExportDimensions();
    const displayWidth = getNoteDisplayWidth();

    onInsertDrawing(dataUrl, {
      displayWidth,
      width: exportW,
      height: exportH,
    });
    onClose();
  };

  // Direct download to disk as PNG
  const handleDownload = () => {
    const exportCanvas = generateExportCanvas();
    if (!exportCanvas) return;

    const dataUrl = exportCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qalam-sketsa-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportDims = useMemo(() => getExportDimensions(), [getExportDimensions]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-3 bg-black/85 backdrop-blur-xs select-none animate-in fade-in duration-150"
    >
      <div
        className={`w-full h-full md:h-[96vh] md:max-w-6xl md:rounded-2xl rounded-none border-0 md:border shadow-2xl overflow-hidden flex flex-col relative transition-colors ${
          isLight
            ? 'bg-slate-100 border-slate-300 text-slate-900'
            : 'bg-[#101725] border-slate-800 text-slate-100'
        }`}
      >
        {/* DESKTOP TOP BAR (Only visible on md: screens and larger) */}
        {!isZenMode && (
          <div
            className={`hidden md:flex items-center justify-between px-3 md:px-4 py-2 border-b shrink-0 gap-2 z-30 transition-all ${
              isLight
                ? 'bg-white/95 border-slate-200 shadow-xs backdrop-blur-md'
                : 'bg-[#151f32]/95 border-slate-800 shadow-xs backdrop-blur-md'
            }`}
          >
            {/* Left: Close & Undo/Redo/Clear Group */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                onClick={onClose}
                aria-label="Tutup"
                title={isId ? 'Tutup Kanvas' : 'Close Canvas'}
                className={`p-1.5 rounded-lg transition active:scale-95 shrink-0 ${
                  isLight
                    ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title={isId ? 'Urungkan (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
                className={`p-1.5 rounded-lg transition shrink-0 ${
                  historyIndex <= 0
                    ? 'opacity-35 cursor-not-allowed'
                    : isLight
                    ? 'hover:bg-slate-100 text-slate-700'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Undo className="w-4 h-4" />
              </button>

              <button
                onClick={handleRedo}
                disabled={historyIndex >= historyRef.current.length - 1}
                title={isId ? 'Ulangi (Ctrl+Y)' : 'Redo (Ctrl+Y)'}
                className={`p-1.5 rounded-lg transition shrink-0 ${
                  historyIndex >= historyRef.current.length - 1
                    ? 'opacity-35 cursor-not-allowed'
                    : isLight
                    ? 'hover:bg-slate-100 text-slate-700'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Redo className="w-4 h-4" />
              </button>

              <button
                onClick={handleClear}
                title={isId ? 'Bersihkan Coretan' : 'Clear Canvas'}
                className={`p-1.5 rounded-lg transition shrink-0 ${
                  isLight
                    ? 'hover:bg-red-50 text-red-600'
                    : 'hover:bg-red-950/40 text-red-400'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Center: Essential Drawing Tools & Floating Popover Toggles */}
            <div className="min-w-0 flex-1 flex items-center justify-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {/* Primary Tool Switcher */}
              <div
                className={`flex items-center p-0.5 rounded-lg border shrink-0 ${
                  isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-900 border-slate-700/80'
                }`}
              >
                <button
                  onClick={() => setTool('pen')}
                  title={isId ? 'Pena Halus' : 'Pen'}
                  className={`p-1.5 rounded-md transition shrink-0 ${
                    tool === 'pen'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <PenTool className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setTool('brush')}
                  title={isId ? 'Spidol Kuas' : 'Brush Marker'}
                  className={`p-1.5 rounded-md transition shrink-0 ${
                    tool === 'brush'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setTool('highlighter')}
                  title={isId ? 'Stabilo' : 'Highlighter'}
                  className={`p-1.5 rounded-md transition shrink-0 ${
                    tool === 'highlighter'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Highlighter className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setTool('eraser')}
                  title={isId ? 'Penghapus' : 'Eraser'}
                  className={`p-1.5 rounded-md transition shrink-0 ${
                    tool === 'eraser'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eraser className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setTool('hand')}
                  title={isId ? 'Alat Geser Kanvas (Pan)' : 'Pan Canvas Tool'}
                  className={`p-1.5 rounded-md transition shrink-0 ${
                    tool === 'hand'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Hand className="w-4 h-4" />
                </button>
              </div>

              {/* Stroke Size & Opacity Popover Button */}
              <button
                onClick={() => togglePopover('brush')}
                title={isId ? 'Atur Ketebalan & Opasitas' : 'Adjust Brush Size & Opacity'}
                className={`h-8 flex-nowrap inline-flex items-center gap-1.5 px-2 rounded-lg border text-xs font-mono font-medium transition shrink-0 whitespace-nowrap select-none ${
                  activePopover === 'brush'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap shrink-0">{strokeWidth}px</span>
                {strokeOpacity < 100 && <span className="opacity-75 whitespace-nowrap shrink-0">{strokeOpacity}%</span>}
              </button>

              {/* TOGGLE 1: Stroke Color Popover */}
              <button
                onClick={() => togglePopover('color')}
                title={isId ? 'Pilih / Kustom Warna Coretan' : 'Stroke Color & Custom Palette'}
                className={`h-8 flex-nowrap inline-flex items-center gap-1.5 px-2.5 rounded-lg border text-xs font-medium transition shrink-0 whitespace-nowrap select-none ${
                  activePopover === 'color'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs shrink-0"
                  style={{ backgroundColor: strokeColor }}
                />
                <span className="whitespace-nowrap shrink-0">{isId ? 'Warna' : 'Color'}</span>
                <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
              </button>

              {/* TOGGLE 2: Canvas Background & Pattern Popover */}
              <button
                onClick={() => togglePopover('bg')}
                title={isId ? 'Pilih Warna Latar & Pola Kertas' : 'Canvas Background & Pattern'}
                className={`h-8 flex-nowrap inline-flex items-center gap-1.5 px-2.5 rounded-lg border text-xs font-medium transition shrink-0 whitespace-nowrap select-none ${
                  activePopover === 'bg'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <PaintBucket className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <div
                  className="w-3.5 h-3.5 rounded-sm border border-black/30 shrink-0"
                  style={{
                    backgroundColor: bgColor === 'transparent' ? '#ffffff' : bgColor,
                    backgroundImage:
                      bgColor === 'transparent'
                        ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                        : 'none',
                    backgroundSize: '4px 4px',
                  }}
                />
                <span className="whitespace-nowrap shrink-0">{isId ? 'Latar' : 'Paper'}</span>
                {paperPattern !== 'none' && (
                  <span className="text-[10px] px-1 bg-amber-500/20 text-amber-600 dark:text-amber-300 rounded font-semibold uppercase shrink-0">
                    {paperPattern}
                  </span>
                )}
                <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
              </button>

              {/* QUICK TOGGLE: Note Scale 1:1 Simulation Button - GUARANTEED NEVER WRAPS */}
              <button
                onClick={() => setPreviewInNoteScale(!previewInNoteScale)}
                title={
                  previewInNoteScale
                    ? isId
                      ? 'Kembali ke mode layar penuh'
                      : 'Switch back to fit viewport'
                    : isId
                    ? 'Lihat ukuran asli saat ditempel di catatan'
                    : 'Preview actual note size scale'
                }
                className={`h-8 shrink-0 flex-nowrap inline-flex items-center gap-1.5 px-2.5 rounded-lg border text-xs font-medium transition select-none ${
                  previewInNoteScale
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold'
                    : isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap shrink-0 select-none hidden xl:inline">
                  {previewInNoteScale
                    ? isId
                      ? 'Skala Catatan'
                      : 'Note Scale'
                    : isId
                    ? 'Pratinjau Catatan'
                    : 'Note Preview'}
                </span>
                <span className="whitespace-nowrap shrink-0 select-none xl:hidden">
                  {previewInNoteScale
                    ? isId
                      ? 'Skala'
                      : 'Scale'
                    : isId
                    ? 'Pratinjau'
                    : 'Preview'}
                </span>
              </button>
            </div>

            {/* Right: Zen Focus Mode, Download, and Insert Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={() => {
                  setIsZenMode(true);
                  setActivePopover('none');
                }}
                title={isId ? 'Layar Penuh Kanvas (Fokus Menggambar)' : 'Zen Focus Mode (Hide Menus)'}
                className={`h-8 w-8 rounded-lg border transition shrink-0 flex items-center justify-center ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <Maximize2 className="w-4 h-4 text-blue-500" />
              </button>

              <button
                onClick={handleDownload}
                title={isId ? 'Unduh Gambar (PNG)' : 'Download PNG'}
                className={`h-8 px-2.5 rounded-lg border text-xs font-semibold transition active:scale-95 flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 shadow-xs'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="whitespace-nowrap hidden lg:inline">{isId ? 'Unduh' : 'Download'}</span>
              </button>

              <button
                onClick={handleSave}
                className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5 hover:shadow-lg shrink-0 whitespace-nowrap"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{isId ? 'Sisipkan' : 'Insert'}</span>
              </button>
            </div>
          </div>
        )}

        {/* MOBILE TOP COMPACT BAR (Only visible on mobile screens < md) */}
        {!isZenMode && (
          <div
            className={`flex md:hidden items-center justify-between px-2 py-1 h-11 border-b shrink-0 z-30 transition-all ${
              isLight
                ? 'bg-white/95 border-slate-200 shadow-xs backdrop-blur-md'
                : 'bg-[#151f32]/95 border-slate-800 shadow-xs backdrop-blur-md'
            }`}
          >
            {/* Left: Close, Undo, Redo, Clear */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={onClose}
                aria-label="Tutup"
                title={isId ? 'Tutup' : 'Close'}
                className={`h-8 w-8 rounded-lg transition active:scale-95 flex items-center justify-center shrink-0 ${
                  isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title={isId ? 'Urungkan' : 'Undo'}
                className={`h-8 w-8 rounded-lg transition flex items-center justify-center shrink-0 ${
                  historyIndex <= 0
                    ? 'opacity-30'
                    : isLight
                    ? 'hover:bg-slate-100 text-slate-700'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Undo className="w-4 h-4" />
              </button>

              <button
                onClick={handleRedo}
                disabled={historyIndex >= historyRef.current.length - 1}
                title={isId ? 'Ulangi' : 'Redo'}
                className={`h-8 w-8 rounded-lg transition flex items-center justify-center shrink-0 ${
                  historyIndex >= historyRef.current.length - 1
                    ? 'opacity-30'
                    : isLight
                    ? 'hover:bg-slate-100 text-slate-700'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Redo className="w-4 h-4" />
              </button>

              <button
                onClick={handleClear}
                title={isId ? 'Bersihkan' : 'Clear'}
                className={`h-8 w-8 rounded-lg transition flex items-center justify-center shrink-0 ${
                  isLight ? 'text-red-600 hover:bg-red-50' : 'text-red-400 hover:bg-red-950/40'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Note Preview Toggle, Zen mode, Download, Insert */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Note Preview icon toggle */}
              <button
                onClick={() => setPreviewInNoteScale(!previewInNoteScale)}
                title={isId ? 'Pratinjau Catatan' : 'Note Preview'}
                className={`h-8 w-8 rounded-lg border text-xs transition flex items-center justify-center shrink-0 ${
                  previewInNoteScale
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold'
                    : isLight
                    ? 'bg-white text-slate-700 border-slate-300'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setIsZenMode(true);
                  setActivePopover('none');
                }}
                title={isId ? 'Mode Penuh' : 'Zen'}
                className={`h-8 w-8 rounded-lg border transition flex items-center justify-center shrink-0 ${
                  isLight ? 'bg-white text-blue-600 border-slate-300' : 'bg-slate-900 text-blue-400 border-slate-700'
                }`}
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleDownload}
                title={isId ? 'Unduh PNG' : 'Download PNG'}
                className={`h-8 w-8 rounded-lg border transition flex items-center justify-center shrink-0 ${
                  isLight ? 'bg-white text-slate-700 border-slate-300' : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                <Download className="w-4 h-4 text-blue-500" />
              </button>

              <button
                onClick={handleSave}
                className="h-8 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition active:scale-95 flex items-center gap-1 shrink-0 whitespace-nowrap"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap hidden xs:inline">{isId ? 'Sisipkan' : 'Insert'}</span>
              </button>
            </div>
          </div>
        )}

        {/* FLOATING ZEN-MODE PILL */}
        {isZenMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-slate-900/90 text-white backdrop-blur-md px-3 py-1.5 rounded-full shadow-2xl border border-slate-700 text-xs">
            <span className="font-medium text-slate-300">
              ✍️ {isId ? 'Mode Kanvas Penuh' : 'Zen Focus Mode'} ({actualDimensions.width}×{actualDimensions.height})
            </span>
            <button
              onClick={() => setIsZenMode(false)}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
            >
              <Minimize2 className="w-3 h-3" />
              <span>{isId ? 'Buka Menu' : 'Show Menus'}</span>
            </button>
            <button
              onClick={handleSave}
              className="px-2.5 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 transition"
            >
              <Check className="w-3 h-3" />
              <span>{isId ? 'Sisipkan' : 'Insert'}</span>
            </button>
          </div>
        )}

        {/* FLOATING POPOVER 1: Brush Size & Opacity */}
        {activePopover === 'brush' && (
          <div
            className={`fixed md:absolute bottom-16 md:bottom-auto md:top-14 inset-x-3 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 mx-auto z-50 p-4 rounded-2xl border shadow-2xl w-[calc(100%-1.5rem)] max-w-sm backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 md:slide-in-from-top-2 duration-150 ${
              isLight
                ? 'bg-white/95 border-slate-300 text-slate-800'
                : 'bg-[#162238]/95 border-slate-700 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/30 mb-3">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
                {isId ? 'Pengaturan Goresan' : 'Stroke Settings'}
              </span>
              <button
                onClick={() => setActivePopover('none')}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500 dark:text-slate-400">{isId ? 'Ketebalan' : 'Thickness'}</span>
                  <span className="font-mono font-bold text-blue-500">{strokeWidth}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-2"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500 dark:text-slate-400">{isId ? 'Opasitas' : 'Opacity'}</span>
                  <span className="font-mono font-bold text-blue-500">{strokeOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={strokeOpacity}
                  onChange={(e) => setStrokeOpacity(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-2"
                />
              </div>

              <div className="pt-2 border-t border-slate-700/30 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">{isId ? 'Pratinjau Goresan:' : 'Live Sample:'}</span>
                <div
                  className="rounded-full shadow-xs transition-all"
                  style={{
                    width: Math.min(32, Math.max(6, strokeWidth)),
                    height: Math.min(32, Math.max(6, strokeWidth)),
                    backgroundColor: tool === 'eraser' ? '#94a3b8' : strokeColor,
                    opacity: tool === 'highlighter' ? 0.35 : strokeOpacity / 100,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* FLOATING POPOVER 2: Custom Stroke Color */}
        {activePopover === 'color' && (
          <div
            className={`fixed md:absolute bottom-16 md:bottom-auto md:top-14 inset-x-3 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 mx-auto z-50 p-4 rounded-2xl border shadow-2xl w-[calc(100%-1.5rem)] max-w-sm md:max-w-md backdrop-blur-xl max-h-[65vh] md:max-h-[75vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-2 md:slide-in-from-top-2 duration-150 ${
              isLight
                ? 'bg-white/95 border-slate-300 text-slate-800'
                : 'bg-[#162238]/95 border-slate-700 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/30 mb-3">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-blue-500" />
                {isId ? 'Pilihan & Kustom Warna Coretan' : 'Stroke Color & Custom Palette'}
              </span>
              <button
                onClick={() => setActivePopover('none')}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-3">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                {isId ? 'Warna Populer:' : 'Curated Colors:'}
              </div>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_STROKE_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => {
                      setStrokeColor(c.hex);
                      setCustomStrokeHex(c.hex);
                      if (tool === 'eraser' || tool === 'hand') setTool('pen');
                    }}
                    style={{ backgroundColor: c.hex }}
                    title={`${c.name} (${c.hex})`}
                    className={`h-8 rounded-lg border-2 transition-all relative flex items-center justify-center ${
                      strokeColor.toLowerCase() === c.hex.toLowerCase()
                        ? 'border-blue-500 scale-105 shadow-md ring-2 ring-blue-400/40'
                        : isLight
                        ? 'border-slate-300 hover:scale-105'
                        : 'border-slate-600 hover:scale-105'
                    }`}
                  >
                    {strokeColor.toLowerCase() === c.hex.toLowerCase() && (
                      <span
                        className={`text-xs font-bold ${c.hex === '#ffffff' ? 'text-black' : 'text-white'}`}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3 pt-2 border-t border-slate-700/30">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                {isId ? 'Kode Hex / Pemilih Bebas:' : 'Hex Code / Custom Picker:'}
              </div>
              <div className="flex items-center gap-2">
                <label
                  title={isId ? 'Buka palet visual sistem' : 'Open system visual color picker'}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border cursor-pointer transition shadow-xs ${
                    isLight
                      ? 'bg-slate-50 hover:bg-slate-100 border-slate-300'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-700'
                  }`}
                >
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => {
                      setStrokeColor(e.target.value);
                      setCustomStrokeHex(e.target.value);
                      if (tool === 'eraser' || tool === 'hand') setTool('pen');
                    }}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <Palette className="w-3.5 h-3.5 text-blue-500" />
                </label>

                <input
                  type="text"
                  value={customStrokeHex}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomStrokeHex(val);
                    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                      setStrokeColor(val);
                      if (tool === 'eraser' || tool === 'hand') setTool('pen');
                    }
                  }}
                  placeholder="#2563eb"
                  className={`flex-1 px-2.5 py-1.5 rounded-l text-xs font-mono font-medium border uppercase ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800'
                      : 'bg-slate-900 border-slate-700 text-slate-100'
                  }`}
                />
                <button
                  onClick={() => handleSaveCustomStroke(strokeColor)}
                  title={isId ? 'Simpan ke palet favorit' : 'Save to personal palette'}
                  className="px-3 py-1.5 rounded-r bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1 transition shadow-xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isId ? 'Simpan' : 'Save'}</span>
                </button>
              </div>
            </div>

            {savedStrokeColors.length > 0 && (
              <div className="pt-2 border-t border-slate-700/30">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  {isId ? 'Palet Kustom Tersimpan:' : 'Saved Palette Slots:'}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {savedStrokeColors.map((sc) => (
                    <div key={sc} className="group relative">
                      <button
                        onClick={() => {
                          setStrokeColor(sc);
                          setCustomStrokeHex(sc);
                          if (tool === 'eraser' || tool === 'hand') setTool('pen');
                        }}
                        style={{ backgroundColor: sc }}
                        title={sc}
                        className={`w-7 h-7 rounded-full border transition-all ${
                          strokeColor.toLowerCase() === sc.toLowerCase()
                            ? 'border-blue-500 scale-110 ring-2 ring-blue-400/40'
                            : 'border-black/30 hover:scale-105'
                        }`}
                      />
                      <button
                        onClick={(e) => handleRemoveCustomStroke(sc, e)}
                        title={isId ? 'Hapus' : 'Delete'}
                        className="hidden group-hover:flex absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full items-center justify-center text-[10px] shadow-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FLOATING POPOVER 3: Background & Paper Pattern */}
        {activePopover === 'bg' && (
          <div
            className={`fixed md:absolute bottom-16 md:bottom-auto md:top-14 inset-x-3 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 mx-auto z-50 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl w-[calc(100%-1.5rem)] max-w-sm md:max-w-md max-h-[65vh] md:max-h-[75vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-2 md:slide-in-from-top-2 duration-150 ${
              isLight
                ? 'bg-white/95 border-slate-300 text-slate-800'
                : 'bg-[#162238]/95 border-slate-700 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/30 mb-3">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <PaintBucket className="w-3.5 h-3.5 text-amber-500" />
                {isId ? 'Warna Latar & Pola Kertas' : 'Canvas Background & Paper Grid'}
              </span>
              <button
                onClick={() => setActivePopover('none')}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-3">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                {isId ? 'Pilihan Latar Standar:' : 'Standard Backgrounds:'}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {PRESET_BG_COLORS.map((bg) => {
                  const isSelected = bgColor === bg.value;
                  return (
                    <button
                      key={bg.value}
                      onClick={() => {
                        setBgColor(bg.value);
                        if (bg.value !== 'transparent') setCustomBgHex(bg.value);
                      }}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border transition ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500 text-blue-500 ring-1 ring-blue-500 font-bold'
                          : isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div
                        className="w-3.5 h-3.5 rounded-sm border border-black/30 shrink-0"
                        style={{
                          backgroundColor: bg.value === 'transparent' ? '#ffffff' : bg.value,
                          backgroundImage:
                            bg.value === 'transparent'
                              ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                              : 'none',
                          backgroundSize: '4px 4px',
                        }}
                      />
                      <span className="truncate text-[11px]">{isId ? bg.nameId : bg.nameEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-3 pt-2 border-t border-slate-700/30">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                {isId ? 'Warna Latar Kustom (Hex / Picker):' : 'Custom Background Hex:'}
              </div>
              <div className="flex items-center gap-2">
                <label
                  title={isId ? 'Pilih warna latar' : 'Pick background color'}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border cursor-pointer transition shadow-xs ${
                    isLight
                      ? 'bg-slate-50 hover:bg-slate-100 border-slate-300'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-700'
                  }`}
                >
                  <input
                    type="color"
                    value={bgColor === 'transparent' ? '#ffffff' : bgColor}
                    onChange={(e) => {
                      setBgColor(e.target.value);
                      setCustomBgHex(e.target.value);
                    }}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <PaintBucket className="w-3.5 h-3.5 text-amber-500" />
                </label>

                <input
                  type="text"
                  value={customBgHex}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomBgHex(val);
                    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                      setBgColor(val);
                    }
                  }}
                  placeholder="#0f172a"
                  className={`flex-1 px-2.5 py-1.5 rounded-l text-xs font-mono font-medium border uppercase ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800'
                      : 'bg-slate-900 border-slate-700 text-slate-100'
                  }`}
                />
                <button
                  onClick={() => handleSaveCustomBg(bgColor !== 'transparent' ? bgColor : customBgHex)}
                  title={isId ? 'Simpan latar' : 'Save background'}
                  className="px-3 py-1.5 rounded-r bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium flex items-center gap-1 transition shadow-xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isId ? 'Simpan' : 'Save'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700/30">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                {isId ? 'Pola Kertas Buku Catatan:' : 'Paper Texture / Grid Pattern:'}
              </div>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                <button
                  onClick={() => setPaperPattern('none')}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition text-center ${
                    paperPattern === 'none'
                      ? 'bg-blue-600 text-white font-bold'
                      : isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {isId ? 'Polos' : 'Plain'}
                </button>

                <button
                  onClick={() => setPaperPattern('grid')}
                  className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                    paperPattern === 'grid'
                      ? 'bg-blue-600 text-white font-bold'
                      : isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Grid className="w-3 h-3 text-blue-400" />
                  <span>Grid</span>
                </button>

                <button
                  onClick={() => setPaperPattern('dots')}
                  className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                    paperPattern === 'dots'
                      ? 'bg-blue-600 text-white font-bold'
                      : isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <CircleDot className="w-3 h-3 text-purple-400" />
                  <span>Titik</span>
                </button>

                <button
                  onClick={() => setPaperPattern('ruled')}
                  className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                    paperPattern === 'ruled'
                      ? 'bg-blue-600 text-white font-bold'
                      : isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <AlignJustify className="w-3 h-3 text-emerald-400" />
                  <span>Garis</span>
                </button>
              </div>

              {paperPattern !== 'none' && (
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-400">
                  <input
                    type="checkbox"
                    checked={includePatternInExport}
                    onChange={(e) => setIncludePatternInExport(e.target.checked)}
                    className="accent-blue-600 rounded"
                  />
                  <span>{isId ? 'Sertakan pola garis/grid saat gambar diekspor' : 'Include grid in exported PNG'}</span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* FLOATING POPOVER 4: Canvas Size & Accurate Preview Options */}
        {activePopover === 'size' && (
          <div
            className={`fixed md:absolute bottom-16 md:bottom-auto md:top-14 inset-x-3 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 mx-auto z-50 p-4 rounded-2xl border shadow-2xl w-[calc(100%-1.5rem)] max-w-sm md:max-w-[460px] backdrop-blur-xl max-h-[65vh] md:max-h-[75vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-2 md:slide-in-from-top-2 duration-150 ${
              isLight
                ? 'bg-white/95 border-slate-300 text-slate-800'
                : 'bg-[#162238]/95 border-slate-700 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/30 mb-3">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-emerald-500" />
                {isId ? 'Ukuran Kanvas & Akurasi Hasil Catatan' : 'Canvas Size & Note Accuracy'}
              </span>
              <button
                onClick={() => setActivePopover('none')}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Presets Grid */}
            <div className="mb-3">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                <span>{isId ? 'Rasio Bentuk Kanvas (Otomatis Menyesuaikan Layar):' : 'Canvas Aspect Ratio:'}</span>
                <span className="text-[10px] text-blue-500 font-mono font-semibold">
                  {actualDimensions.width} × {actualDimensions.height} px
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {CANVAS_PRESETS.map((p) => {
                  const isSelected = preset === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPreset(p.id)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition text-center flex flex-col items-center justify-center min-h-[46px] ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-400/40 shadow-xs'
                          : isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-[11px] font-semibold leading-tight">{isId ? p.labelId : p.labelEn}</span>
                      {p.ratio && (
                        <span className="text-[9px] opacity-80 font-mono mt-0.5">
                          {p.ratio}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Pixel Dimensions */}
            <div className="mb-3 pt-2 border-t border-slate-700/30">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                {isId ? 'Dimensi Kanvas Kustom (Lebar × Tinggi Px):' : 'Custom Pixel Dimensions:'}
              </div>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
                <input
                  type="number"
                  min="200"
                  max="3600"
                  step="50"
                  value={customWidth}
                  onChange={(e) => handleCustomWidthChange(Number(e.target.value))}
                  className={`w-20 px-2 py-1 rounded text-xs border font-mono font-medium ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800'
                      : 'bg-slate-900 border-slate-700 text-white'
                  }`}
                  placeholder="Lebar"
                />
                <span className="text-xs text-slate-500">×</span>
                <input
                  type="number"
                  min="150"
                  max="2600"
                  step="50"
                  value={customHeight}
                  onChange={(e) => handleCustomHeightChange(Number(e.target.value))}
                  className={`w-20 px-2 py-1 rounded text-xs border font-mono font-medium ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800'
                      : 'bg-slate-900 border-slate-700 text-white'
                  }`}
                  placeholder="Tinggi"
                />

                <button
                  onClick={() => setLockAspectRatio(!lockAspectRatio)}
                  title={lockAspectRatio ? 'Rasio terkunci' : 'Kunci rasio aspek'}
                  className={`p-1.5 rounded border transition ${
                    lockAspectRatio
                      ? 'bg-blue-600 text-white border-blue-600'
                      : isLight
                      ? 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {lockAspectRatio ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={handleSwapDimensions}
                  title="Tukar Lebar & Tinggi (Putar Orientasi)"
                  className={`p-1.5 rounded border transition ${
                    isLight
                      ? 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    setPreset('custom');
                    initCanvas(customWidth, customHeight, true, 'custom');
                  }}
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-xs transition"
                >
                  {isId ? 'Terapkan' : 'Apply'}
                </button>
              </div>
            </div>

            {/* Note Display Size Configuration */}
            <div className="pt-2 border-t border-slate-700/30 space-y-2">
              <div>
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  <span>{isId ? 'Ukuran Tampilan Saat Ditempel ke Catatan:' : 'Display Size in Note:'}</span>
                  <span className="font-mono text-emerald-500 font-bold">{getNoteDisplayWidth()}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => setNoteDisplaySize('full')}
                    className={`py-1.5 rounded text-xs transition ${
                      noteDisplaySize === 'full'
                        ? 'bg-emerald-600 text-white font-bold'
                        : isLight
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {isId ? 'Penuh (100%)' : 'Full (100%)'}
                  </button>
                  <button
                    onClick={() => setNoteDisplaySize('medium')}
                    className={`py-1.5 rounded text-xs transition ${
                      noteDisplaySize === 'medium'
                        ? 'bg-emerald-600 text-white font-bold'
                        : isLight
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {isId ? 'Sedang (600px)' : 'Medium (600px)'}
                  </button>
                  <button
                    onClick={() => setNoteDisplaySize('compact')}
                    className={`py-1.5 rounded text-xs transition ${
                      noteDisplaySize === 'compact'
                        ? 'bg-emerald-600 text-white font-bold'
                        : isLight
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {isId ? 'Ringkas (350px)' : 'Compact (350px)'}
                  </button>
                </div>
              </div>

              {/* Toggle Mode Preview Catatan */}
              <div className="pt-2 border-t border-slate-700/30 flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold whitespace-nowrap truncate">
                      {isId ? 'Pratinjau Skala Catatan (1:1)' : 'Note Scale Preview (1:1)'}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {isId
                        ? 'Tampilkan ukuran persis seperti yang akan terlihat di catatan'
                        : 'Show exact size as rendered inside note'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewInNoteScale(!previewInNoteScale)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition shrink-0 whitespace-nowrap flex-nowrap ${
                    previewInNoteScale
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isLight
                      ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {previewInNoteScale ? (isId ? 'Aktif' : 'Active') : isId ? 'Aktifkan' : 'Enable'}
                </button>
              </div>

              {/* Export Scale Selection */}
              <div className="pt-2 border-t border-slate-700/30">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {isId ? 'Resolusi File Gambar Simpanan:' : 'Exported Image File Resolution:'}
                </div>
                <div className="flex items-center gap-1">
                  {(['100', '75', '50', '25'] as ExportScale[]).map((scale) => (
                    <button
                      key={scale}
                      onClick={() => setExportScale(scale)}
                      className={`flex-1 py-1 rounded text-xs transition ${
                        exportScale === scale
                          ? 'bg-blue-600 text-white font-bold'
                          : isLight
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {scale}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FULL-HEIGHT DYNAMIC CANVAS DRAWING AREA */}
        <div
          ref={containerRef}
          onClick={() => {
            if (activePopover !== 'none') setActivePopover('none');
          }}
          className={`flex-1 w-full h-full relative overflow-hidden touch-none flex flex-col items-center justify-center p-2 pb-16 md:p-5 select-none transition-colors ${
            tool === 'hand' || isSpacePressed ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair'
          }`}
          style={{
            backgroundColor: isLight ? '#e2e8f0' : '#080d1a',
            backgroundImage:
              'radial-gradient(circle, rgba(148, 163, 184, 0.18) 1.2px, transparent 1.2px)',
            backgroundSize: '20px 20px',
          }}
        >
          {/* Note Page Simulator Wrapper (when in Note Scale mode) */}
          <div
            className={`transition-all duration-200 flex flex-col items-center justify-center ${
              previewInNoteScale
                ? `p-3 sm:p-6 rounded-2xl border shadow-2xl ${
                    isLight
                      ? 'bg-white border-slate-300/80 text-slate-800'
                      : 'bg-[#151c2c] border-slate-700 text-slate-200'
                  }`
                : ''
            }`}
            style={{
              maxWidth: previewInNoteScale ? '900px' : 'none',
              width: previewInNoteScale ? '100%' : 'auto',
            }}
          >
            {/* Note simulation header */}
            {previewInNoteScale && (
              <div className="w-full flex items-center justify-between pb-2 mb-2 sm:pb-3 sm:mb-3 border-b border-dashed border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-500">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs">
                    {isId ? 'Simulasi di Catatan' : 'Note Simulation'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                    {getNoteDisplayWidth()}
                  </span>
                  <span>•</span>
                  <span>{actualDimensions.width}×{actualDimensions.height} px</span>
                </div>
              </div>
            )}

            {/* Exact-Ratio Canvas Frame with Pan and Zoom transform */}
            <div
              className={`relative rounded-xl overflow-hidden shadow-2xl border transition-transform duration-75 ${
                isLight ? 'border-slate-300 shadow-slate-300/50' : 'border-slate-700/80 shadow-black/60'
              }`}
              style={{
                width: `${displayDimensions.width}px`,
                height: `${displayDimensions.height}px`,
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                transformOrigin: 'center center',
                backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor,
                backgroundImage:
                  bgColor === 'transparent'
                    ? 'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)'
                    : 'none',
                backgroundSize: '16px 16px',
              }}
            >
              {/* Paper Pattern Overlay */}
              {paperPattern === 'grid' && bgColor !== 'transparent' && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(to right, rgba(148, 163, 184, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.2) 1px, transparent 1px)`,
                    backgroundSize: '28px 28px',
                  }}
                />
              )}
              {paperPattern === 'dots' && bgColor !== 'transparent' && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `radial-gradient(circle, rgba(148, 163, 184, 0.35) 1.5px, transparent 1.5px)`,
                    backgroundSize: '28px 28px',
                  }}
                />
              )}
              {paperPattern === 'ruled' && bgColor !== 'transparent' && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(to bottom, rgba(148, 163, 184, 0.22) 1px, transparent 1px)`,
                    backgroundSize: '100% 32px',
                  }}
                >
                  <div className="absolute left-[54px] top-0 bottom-0 w-[1.5px] bg-red-500/40" />
                </div>
              )}

              {/* Responsive interactive Canvas */}
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="block relative z-10 w-full h-full"
              />
            </div>
          </div>

          {/* Minimal Floating Canvas Info Tag (Desktop only to prevent mobile clutter) */}
          <div
            className={`absolute bottom-3 left-4 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-mono border backdrop-blur-md shadow-md z-20 ${
              isLight
                ? 'bg-white/90 border-slate-300 text-slate-700'
                : 'bg-slate-900/90 border-slate-700 text-slate-300'
            }`}
          >
            <button
              onClick={() => togglePopover('size')}
              title={isId ? 'Atur Ukuran & Rasio Kanvas' : 'Set Canvas Size & Aspect Ratio'}
              className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition cursor-pointer"
            >
              <Maximize2 className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>{CANVAS_PRESETS.find((p) => p.id === preset)?.ratio || 'Kustom'}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            <span>•</span>
            <span>({actualDimensions.width} × {actualDimensions.height} px)</span>
            <span>•</span>
            <span>{previewInNoteScale ? `Tampilan Catatan: ${getNoteDisplayWidth()}` : `Layar: ${displayDimensions.width}×${displayDimensions.height} px`}</span>
            {zoomLevel !== 1 && (
              <>
                <span>•</span>
                <span className="text-emerald-500 font-bold">Zoom {Math.round(zoomLevel * 100)}%</span>
              </>
            )}
            <span>•</span>
            <span>{bgColor === 'transparent' ? 'PNG Transparan' : bgColor}</span>
          </div>

          {/* FLOATING ZOOM & PAN CONTROLS (Desktop Only - Mobile uses pinch-to-zoom gestures) */}
          <div
            className={`hidden md:flex absolute bottom-3 right-4 z-30 items-center gap-1 p-1 rounded-xl border backdrop-blur-md shadow-lg transition-all ${
              isLight
                ? 'bg-white/95 border-slate-300 text-slate-800'
                : 'bg-slate-900/95 border-slate-700 text-slate-200'
            }`}
          >
            {/* Quick Size / Ratio Popover Toggle at bottom */}
            <button
              onClick={() => togglePopover('size')}
              title={isId ? 'Atur Ukuran Kanvas & Resolusi' : 'Canvas Size & Ratio'}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition active:scale-95 ${
                activePopover === 'size'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isLight
                  ? 'hover:bg-slate-100 text-slate-700'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>{CANVAS_PRESETS.find((p) => p.id === preset)?.ratio || 'Kustom'}</span>
            </button>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

            {/* Zoom Out Button */}
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.3}
              title={isId ? 'Perkecil (Zoom Out)' : 'Zoom Out'}
              className={`p-1.5 rounded-lg transition active:scale-95 ${
                zoomLevel <= 0.3
                  ? 'opacity-35 cursor-not-allowed'
                  : isLight
                  ? 'hover:bg-slate-100 text-slate-700'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            {/* Clickable Zoom Level indicator */}
            <button
              onClick={handleResetZoom}
              title={isId ? 'Klik untuk reset zoom ke 100%' : 'Click to reset zoom to 100%'}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition hover:scale-105 ${
                zoomLevel !== 1
                  ? 'bg-blue-600/10 text-blue-500 border border-blue-500/30'
                  : isLight
                  ? 'hover:bg-slate-100 text-slate-700'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              {Math.round(zoomLevel * 100)}%
            </button>

            {/* Zoom In Button */}
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 4.0}
              title={isId ? 'Perbesar (Zoom In)' : 'Zoom In'}
              className={`p-1.5 rounded-lg transition active:scale-95 ${
                zoomLevel >= 4.0
                  ? 'opacity-35 cursor-not-allowed'
                  : isLight
                  ? 'hover:bg-slate-100 text-slate-700'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

            {/* Hand Pan Tool Toggle */}
            <button
              onClick={() => setTool((prev) => (prev === 'hand' ? 'pen' : 'hand'))}
              title={
                tool === 'hand'
                  ? isId
                    ? 'Mode Geser Aktif (Klik untuk kembali ke Pena)'
                    : 'Pan Active (Click to switch to Pen)'
                  : isId
                  ? 'Alat Geser Kanvas (Pan)'
                  : 'Pan Canvas'
              }
              className={`p-1.5 rounded-lg transition active:scale-95 ${
                tool === 'hand'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isLight
                  ? 'hover:bg-slate-100 text-slate-700'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Hand className="w-4 h-4" />
            </button>

            {/* Reset View Button */}
            {(zoomLevel !== 1 || panOffset.x !== 0 || panOffset.y !== 0) && (
              <button
                onClick={handleResetZoom}
                title={isId ? 'Reset Posisi & Zoom ke 100%' : 'Reset View to 100%'}
                className={`p-1.5 rounded-lg transition active:scale-95 ${
                  isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-400'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* MOBILE FLOATING ZOOM INDICATOR (Only appears when canvas is zoomed) */}
          {zoomLevel !== 1 && (
            <div className="md:hidden absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 text-white text-xs font-mono shadow-lg border border-slate-700/80 backdrop-blur-md animate-in fade-in">
              <span className="text-blue-400 font-bold">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={handleResetZoom}
                className="px-1.5 py-0.5 rounded-full bg-blue-600 hover:bg-blue-500 text-[10px] font-semibold transition"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* MOBILE FLOATING BOTTOM DOCK (Only visible on screens < md) */}
        {!isZenMode && (
          <div className="md:hidden absolute bottom-2.5 inset-x-2 z-30 flex items-center justify-center pointer-events-none">
            <div
              className={`pointer-events-auto max-w-full flex items-center gap-1 p-1 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all overflow-x-auto no-scrollbar ${
                isLight
                  ? 'bg-white/95 border-slate-300 shadow-slate-300/60'
                  : 'bg-[#151f32]/95 border-slate-700 shadow-black/80'
              }`}
            >
              {/* Primary Drawing Tool Switcher */}
              <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0">
                <button
                  onClick={() => setTool('pen')}
                  title={isId ? 'Pena' : 'Pen'}
                  className={`h-8 w-8 rounded-lg transition shrink-0 flex items-center justify-center ${
                    tool === 'pen'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isLight
                      ? 'text-slate-600'
                      : 'text-slate-400'
                  }`}
                >
                  <PenTool className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setTool('brush')}
                  title={isId ? 'Spidol' : 'Marker'}
                  className={`h-8 w-8 rounded-lg transition shrink-0 flex items-center justify-center ${
                    tool === 'brush'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isLight
                      ? 'text-slate-600'
                      : 'text-slate-400'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setTool('highlighter')}
                  title={isId ? 'Stabilo' : 'Highlighter'}
                  className={`h-8 w-8 rounded-lg transition shrink-0 flex items-center justify-center ${
                    tool === 'highlighter'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isLight
                      ? 'text-slate-600'
                      : 'text-slate-400'
                  }`}
                >
                  <Highlighter className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setTool('eraser')}
                  title={isId ? 'Penghapus' : 'Eraser'}
                  className={`h-8 w-8 rounded-lg transition shrink-0 flex items-center justify-center ${
                    tool === 'eraser'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isLight
                      ? 'text-slate-600'
                      : 'text-slate-400'
                  }`}
                >
                  <Eraser className="w-4 h-4" />
                </button>
              </div>

              <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0" />

              {/* Stroke Size Button */}
              <button
                onClick={() => togglePopover('brush')}
                title={isId ? 'Tebal Kuas' : 'Size'}
                className={`px-2 h-8 rounded-xl border text-xs font-mono font-bold transition shrink-0 flex items-center justify-center gap-1 ${
                  activePopover === 'brush'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : isLight
                    ? 'bg-slate-50 text-slate-700 border-slate-300'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{strokeWidth}p</span>
              </button>

              {/* Color Button with Color Swatch */}
              <button
                onClick={() => togglePopover('color')}
                title={isId ? 'Warna Coretan' : 'Color'}
                className={`h-8 w-8 rounded-xl border transition shrink-0 flex items-center justify-center ${
                  activePopover === 'color'
                    ? 'bg-blue-600 border-blue-600 ring-2 ring-blue-400 shadow-xs'
                    : isLight
                    ? 'bg-slate-50 border-slate-300'
                    : 'bg-slate-900 border-slate-700'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full border border-black/30 shadow-xs shrink-0"
                  style={{ backgroundColor: strokeColor }}
                />
              </button>

              {/* Paper Pattern & Background Button */}
              <button
                onClick={() => togglePopover('bg')}
                title={isId ? 'Latar & Pola' : 'Background'}
                className={`h-8 w-8 rounded-xl border transition shrink-0 flex items-center justify-center ${
                  activePopover === 'bg'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : isLight
                    ? 'bg-slate-50 text-slate-700 border-slate-300'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                <PaintBucket className="w-4 h-4 text-amber-500" />
              </button>

              {/* Canvas Dimensions Button */}
              <button
                onClick={() => togglePopover('size')}
                title={isId ? 'Ukuran Kanvas' : 'Size'}
                className={`px-1.5 h-8 rounded-xl border transition shrink-0 flex items-center justify-center gap-1 text-xs font-semibold ${
                  activePopover === 'size'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : isLight
                    ? 'bg-slate-50 text-slate-700 border-slate-300'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                <Maximize2 className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-mono">
                  {CANVAS_PRESETS.find((p) => p.id === preset)?.ratio || 'Kustom'}
                </span>
              </button>

              <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0" />

              {/* Hand Tool (Pan with 1 finger on mobile) */}
              <button
                onClick={() => setTool((prev) => (prev === 'hand' ? 'pen' : 'hand'))}
                title={isId ? 'Geser Kanvas (Pan)' : 'Pan'}
                className={`h-8 w-8 rounded-xl border transition shrink-0 flex items-center justify-center ${
                  tool === 'hand'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : isLight
                    ? 'bg-slate-50 text-slate-700 border-slate-300'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                <Hand className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
