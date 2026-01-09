import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_PREFIX = 'column-widths-';

export interface ColumnWidths {
  [columnKey: string]: number;
}

export const useColumnWidths = (
  viewId: string, // e.g., 'keywords-editorial', 'keywords-ads'
  defaultWidths: ColumnWidths
) => {
  const [widths, setWidths] = useState<ColumnWidths>(defaultWidths);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + viewId);
      if (stored) {
        const parsed = JSON.parse(stored);
        setWidths({ ...defaultWidths, ...parsed });
      }
    } catch (e) {
      console.warn('Failed to load column widths:', e);
    }
    setIsHydrated(true);
  }, [viewId, defaultWidths]);

  // Save to localStorage when widths change (after hydration)
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + viewId, JSON.stringify(widths));
      } catch (e) {
        console.warn('Failed to save column widths:', e);
      }
    }
  }, [widths, viewId, isHydrated]);

  const setColumnWidth = useCallback((columnKey: string, width: number) => {
    setWidths(prev => ({
      ...prev,
      [columnKey]: Math.max(50, width), // Minimum 50px
    }));
  }, []);

  const resetWidths = useCallback(() => {
    setWidths(defaultWidths);
  }, [defaultWidths]);

  return {
    widths,
    setColumnWidth,
    resetWidths,
    isHydrated,
  };
};
