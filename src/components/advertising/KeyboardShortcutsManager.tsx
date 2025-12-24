import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface KeyboardShortcutsManagerProps {
  onSave?: () => void;
  onSearch?: () => void;
  onCloseModals?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  isEnabled?: boolean;
}

export const KeyboardShortcutsManager = ({
  onSave,
  onSearch,
  onCloseModals,
  searchInputRef,
  isEnabled = true,
}: KeyboardShortcutsManagerProps) => {
  const { toast } = useToast();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isEnabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    // Ctrl/Cmd + S: Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (onSave) {
        onSave();
        toast({ title: 'Cambios guardados', description: 'Los datos se han guardado correctamente' });
      }
      return;
    }

    // Ctrl/Cmd + F: Focus search (only if not already typing)
    if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !isTyping) {
      e.preventDefault();
      if (searchInputRef?.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      } else if (onSearch) {
        onSearch();
      }
      return;
    }

    // Escape: Close modals
    if (e.key === 'Escape') {
      if (onCloseModals) {
        onCloseModals();
      }
      return;
    }
  }, [isEnabled, onSave, onSearch, onCloseModals, searchInputRef, toast]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return null;
};

// Hook for keyboard navigation in tables
export const useTableKeyboardNavigation = (
  rowCount: number,
  columnCount: number,
  onCellFocus?: (row: number, col: number) => void,
  isEnabled: boolean = true
) => {
  const handleKeyDown = useCallback((e: KeyboardEvent, currentRow: number, currentCol: number) => {
    if (!isEnabled) return;

    let newRow = currentRow;
    let newCol = currentCol;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        newRow = Math.max(0, currentRow - 1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newRow = Math.min(rowCount - 1, currentRow + 1);
        break;
      case 'ArrowLeft':
        if (!e.shiftKey) {
          e.preventDefault();
          newCol = Math.max(0, currentCol - 1);
        }
        break;
      case 'ArrowRight':
        if (!e.shiftKey) {
          e.preventDefault();
          newCol = Math.min(columnCount - 1, currentCol + 1);
        }
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          newCol = currentCol - 1;
          if (newCol < 0) {
            newCol = columnCount - 1;
            newRow = Math.max(0, currentRow - 1);
          }
        } else {
          newCol = currentCol + 1;
          if (newCol >= columnCount) {
            newCol = 0;
            newRow = Math.min(rowCount - 1, currentRow + 1);
          }
        }
        break;
      case 'Enter':
        // Trigger edit mode
        break;
      default:
        return;
    }

    if (newRow !== currentRow || newCol !== currentCol) {
      onCellFocus?.(newRow, newCol);
    }
  }, [rowCount, columnCount, onCellFocus, isEnabled]);

  return { handleKeyDown };
};

// Keyboard shortcuts help panel content
export const KEYBOARD_SHORTCUTS = [
  { keys: ['Ctrl', 'S'], description: 'Guardar cambios' },
  { keys: ['Ctrl', 'F'], description: 'Buscar/filtrar keywords' },
  { keys: ['Esc'], description: 'Cerrar modal o cancelar' },
  { keys: ['↑', '↓'], description: 'Navegar entre filas' },
  { keys: ['←', '→'], description: 'Navegar entre columnas' },
  { keys: ['Tab'], description: 'Siguiente celda editable' },
  { keys: ['Shift', 'Tab'], description: 'Celda anterior' },
  { keys: ['Enter'], description: 'Editar celda seleccionada' },
];
