import { useState, useEffect, useRef } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseContextMenuPositionOptions {
  isOpen: boolean;
  position: Position;
  onClose: () => void;
  offset?: number;
  menuWidth?: number;
  menuHeight?: number;
}

export function useContextMenuPosition({
  isOpen,
  position,
  onClose,
  offset = 8,
  menuWidth = 240,
  menuHeight = 320,
}: UseContextMenuPositionOptions) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ left: number; top: number; maxHeight?: number }>({
    left: position.x,
    top: position.y,
  });

  // Calculate clamped coordinates so menu never overflows screen
  useEffect(() => {
    if (!isOpen) return;

    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    let targetLeft = position.x;
    let targetTop = position.y;

    // Use measured dimensions if DOM element is rendered, otherwise fallback to estimates
    const width = menuRef.current?.offsetWidth || menuWidth;
    const height = menuRef.current?.offsetHeight || menuHeight;

    // Horizontal clamping
    if (targetLeft + width + offset > winWidth) {
      targetLeft = Math.max(offset, winWidth - width - offset);
    } else {
      targetLeft = Math.max(offset, targetLeft);
    }

    // Vertical clamping
    if (targetTop + height + offset > winHeight) {
      // Flip up if space above is greater or clamp to bottom
      if (targetTop - height - offset >= offset) {
        targetTop = targetTop - height;
      } else {
        targetTop = Math.max(offset, winHeight - height - offset);
      }
    } else {
      targetTop = Math.max(offset, targetTop);
    }

    const availableHeight = winHeight - targetTop - offset;

    setCoords({
      left: targetLeft,
      top: targetTop,
      maxHeight: Math.max(220, availableHeight),
    });
  }, [isOpen, position.x, position.y, offset, menuWidth, menuHeight]);

  // Click outside, window blur, resize, scroll, and Escape key listeners
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleResize = () => {
      onClose();
    };

    window.addEventListener('pointerdown', handlePointerDown, { capture: true });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, onClose]);

  return {
    menuRef,
    coords,
  };
}
