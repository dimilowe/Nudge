import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight } from 'lucide-react';

interface OverlayPanelProps {
  children?: React.ReactNode;
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onClose?: () => void;
  title?: string;
}

export function OverlayPanel({ 
  children, 
  isCollapsed: controlledCollapsed,
  onCollapsedChange,
  onClose,
  title = 'Suggestions'
}: OverlayPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(controlledCollapsed ?? true);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Load saved position from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('overlayPanelPosition');
    if (saved) {
      try {
        const savedPos = JSON.parse(saved);
        setPosition(constrainPosition(savedPos, isCollapsed ? 48 : 300, isCollapsed ? 48 : 400));
      } catch (e) {
        console.error('Failed to parse saved position', e);
      }
    }
  }, []);

  // Sync controlled collapsed state and re-constrain position
  useEffect(() => {
    if (controlledCollapsed !== undefined) {
      setIsCollapsed(controlledCollapsed);
      
      // Re-constrain position when state changes to prevent off-screen rendering
      const width = controlledCollapsed ? 48 : 300;
      const height = controlledCollapsed ? 48 : 400;
      setPosition(prevPos => constrainPosition(prevPos, width, height));
    }
  }, [controlledCollapsed]);

  // Constrain position within viewport
  function constrainPosition(
    pos: { x: number; y: number }, 
    width: number, 
    height: number
  ): { x: number; y: number } {
    const maxX = Math.max(0, window.innerWidth - width);
    const maxY = Math.max(0, window.innerHeight - height);
    return {
      x: Math.max(0, Math.min(pos.x, maxX)),
      y: Math.max(0, Math.min(pos.y, maxY))
    };
  }

  // Handle mouse down on header (start dragging)
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return; // Don't drag when clicking buttons

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  // Handle mouse move (dragging)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newPosition = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };

      const width = isCollapsed ? 48 : 300;
      const height = isCollapsed ? 48 : 400;
      setPosition(constrainPosition(newPosition, width, height));
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        // Save position to localStorage
        localStorage.setItem('overlayPanelPosition', JSON.stringify(position));
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, position, isCollapsed]);

  // Toggle collapsed state
  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    
    // Re-validate position when expanding/collapsing
    const width = newCollapsed ? 48 : 300;
    const height = newCollapsed ? 48 : 400;
    setPosition(constrainPosition(position, width, height));

    onCollapsedChange?.(newCollapsed);
  };

  return (
    <div
      ref={panelRef}
      className={`fixed pointer-events-auto transition-all duration-250 ease-out ${
        isCollapsed ? 'w-12 h-12' : 'w-[300px] h-[400px]'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999
      }}
      data-testid="overlay-panel"
    >
      {/* Glass-morphism panel */}
      <div
        className={`w-full h-full backdrop-blur-[24px] bg-white/10 dark:bg-black/85 border border-white/20 dark:border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden transition-opacity ${
          isDragging ? 'opacity-90' : 'opacity-100'
        }`}
        style={{
          backdropFilter: 'blur(24px) saturate(180%)'
        }}
      >
        {/* Header - Draggable */}
        <div
          className={`flex items-center justify-between h-12 px-3 ${
            isDragging ? 'cursor-grabbing' : 'cursor-move'
          } select-none`}
          onMouseDown={handleMouseDown}
          data-testid="overlay-panel-header"
        >
          <div className="flex items-center gap-2">
            <button
              onClick={toggleCollapse}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              data-testid="button-toggle-collapse"
            >
              <ChevronRight
                className={`w-4 h-4 transition-transform ${
                  isCollapsed ? '' : 'rotate-90'
                }`}
              />
            </button>
            {!isCollapsed && (
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {title}
              </span>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded transition-colors opacity-60 hover:opacity-100"
              data-testid="button-close-panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content - Only visible when expanded */}
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto p-3 text-gray-900 dark:text-gray-100">
            {children || (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                <div className="text-4xl mb-3">💡</div>
                <div className="text-sm">Start typing to see suggestions</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
