import { useState, useRef, useCallback, type ReactNode, type MouseEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TableHead } from '@/components/ui/table';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableResizableHeaderProps {
  children: ReactNode;
  columnKey: string;
  width: number;
  onResize: (columnKey: string, newWidth: number) => void;
  className?: string;
  onClick?: () => void;
  minWidth?: number;
  maxWidth?: number;
  highlighted?: boolean;
}

export const DraggableResizableHeader = ({
  children,
  columnKey,
  width,
  onResize,
  className,
  onClick,
  minWidth = 50,
  maxWidth = 500,
  highlighted = false,
}: DraggableResizableHeaderProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnKey });

  const style = {
    transform: CSS.Transform.toString(transform ? { ...transform, scaleX: 1, scaleY: 1 } : null),
    transition,
    width: `${width}px`,
    minWidth: `${width}px`,
    maxWidth: `${width}px`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const handleMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const delta = moveEvent.clientX - startXRef.current;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + delta));
      onResize(columnKey, newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [columnKey, width, onResize, minWidth, maxWidth]);

  return (
    <TableHead 
      ref={setNodeRef}
      className={cn(
        "relative group select-none",
        highlighted && "bg-primary/10 border-x border-primary/20",
        isDragging && "shadow-lg",
        className
      )}
      style={style}
      onClick={onClick}
      {...attributes}
    >
      <div className="flex items-center gap-0.5 overflow-hidden">
        {/* Drag handle */}
        <button
          type="button"
          className={cn(
            "flex-shrink-0 p-0.5 rounded cursor-grab opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity",
            "text-muted-foreground hover:text-foreground",
            isDragging && "cursor-grabbing opacity-100"
          )}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          <GripVertical className="w-3 h-3" />
        </button>
        
        <div className="flex-1 pr-2 overflow-hidden">
          {children}
        </div>
      </div>
      
      {/* Resize Handle */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors",
          "hover:bg-primary/50 active:bg-primary",
          isResizing ? "bg-primary" : "bg-transparent group-hover:bg-border"
        )}
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
      />
    </TableHead>
  );
};
