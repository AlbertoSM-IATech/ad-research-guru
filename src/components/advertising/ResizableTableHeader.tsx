import { useState, useRef, useCallback, type ReactNode, type MouseEvent } from 'react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface ResizableTableHeaderProps {
  children: ReactNode;
  columnKey: string;
  width: number;
  onResize: (columnKey: string, newWidth: number) => void;
  className?: string;
  onClick?: () => void;
  minWidth?: number;
  maxWidth?: number;
}

export const ResizableTableHeader = ({
  children,
  columnKey,
  width,
  onResize,
  className,
  onClick,
  minWidth = 50,
  maxWidth = 500,
}: ResizableTableHeaderProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

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
      className={cn("relative group", className)}
      style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
      onClick={onClick}
    >
      <div className="pr-2 overflow-hidden">
        {children}
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
