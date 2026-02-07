import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY_PREFIX = 'column-order-';

export const useColumnOrder = (
  viewId: string,
  defaultOrder: string[]
) => {
  const [order, setOrder] = useState<string[]>(defaultOrder);
  const defaultOrderRef = useRef(defaultOrder);
  defaultOrderRef.current = defaultOrder;

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + viewId);
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        const validKeys = new Set(defaultOrderRef.current);
        // Keep stored order for valid keys, append any new keys at end
        const storedValid = parsed.filter(k => validKeys.has(k));
        const missing = defaultOrderRef.current.filter(k => !storedValid.includes(k));
        setOrder([...storedValid, ...missing]);
      } else {
        setOrder(defaultOrderRef.current);
      }
    } catch (e) {
      console.warn('Failed to load column order:', e);
      setOrder(defaultOrderRef.current);
    }
  }, [viewId]);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + viewId, JSON.stringify(order));
    } catch (e) {
      console.warn('Failed to save column order:', e);
    }
  }, [order, viewId]);

  const reorder = useCallback((activeId: string, overId: string) => {
    setOrder(prev => {
      const oldIndex = prev.indexOf(activeId);
      const newIndex = prev.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const newOrder = [...prev];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, activeId);
      return newOrder;
    });
  }, []);

  const resetOrder = useCallback(() => {
    setOrder(defaultOrderRef.current);
    try {
      localStorage.removeItem(STORAGE_KEY_PREFIX + viewId);
    } catch (e) {
      // ignore
    }
  }, [viewId]);

  return { order, reorder, resetOrder };
};
