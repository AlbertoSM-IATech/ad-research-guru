// Persistence hook for keyword UI state (filters, sort, view mode)
import { useState, useEffect, useCallback, useRef } from 'react';
import type { AdvancedFiltersState } from '@/components/advertising/AdvancedFilters';
import type { QuickFilter } from '@/lib/keyword-filters';
import type { SortField, SortOrder } from '@/lib/keyword-sorting';

export interface KeywordUIState {
  filters: AdvancedFiltersState;
  quickFilter: QuickFilter;
  searchTerm: string;
  sortField: SortField;
  sortOrder: SortOrder;
  viewMode: 'table' | 'cards';
}

const STORAGE_VERSION = 'v1';
const DEBOUNCE_MS = 300;

function getStorageKey(bookId: string | undefined, marketplaceId: string): string {
  const bookPrefix = bookId ?? 'default';
  return `ad-research:${bookPrefix}:keywords-ui:${STORAGE_VERSION}:${marketplaceId}`;
}

function getDefaultState(): KeywordUIState {
  return {
    filters: {
      competition: 'all',
      campaignType: 'all',
      minVolume: '',
      maxVolume: '',
      maxCompetition: '',
      relevance: 'all',
      intent: 'all',
      state: 'all',
      purpose: 'all',
      status: 'all',
    },
    quickFilter: 'all',
    searchTerm: '',
    sortField: 'marketScore',
    sortOrder: 'desc',
    viewMode: 'table',
  };
}

function loadFromStorage(bookId: string | undefined, marketplaceId: string): KeywordUIState | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = getStorageKey(bookId, marketplaceId);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    // Validate structure
    if (!parsed.filters || !parsed.sortField) return null;
    
    return parsed as KeywordUIState;
  } catch {
    return null;
  }
}

function saveToStorage(bookId: string | undefined, marketplaceId: string, state: KeywordUIState): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getStorageKey(bookId, marketplaceId);
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Silently fail on storage errors
  }
}

export function useKeywordUIPersistence(marketplaceId: string, bookId?: string) {
  const [isHydrated, setIsHydrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookIdRef = useRef(bookId);
  
  // Keep bookId ref updated
  useEffect(() => {
    bookIdRef.current = bookId;
  }, [bookId]);
  
  // Initialize state from localStorage on mount
  const [state, setState] = useState<KeywordUIState>(() => {
    // Server-side: return defaults
    if (typeof window === 'undefined') return getDefaultState();
    
    // Client-side: try to load from storage
    const stored = loadFromStorage(bookId, marketplaceId);
    return stored || getDefaultState();
  });
  
  // Hydrate on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const stored = loadFromStorage(bookId, marketplaceId);
    if (stored) {
      setState(stored);
    }
    setIsHydrated(true);
  }, [marketplaceId, bookId]);
  
  // Save to storage with debounce
  const persistState = useCallback((newState: KeywordUIState) => {
    if (!isHydrated) return;
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      saveToStorage(bookIdRef.current, marketplaceId, newState);
    }, DEBOUNCE_MS);
  }, [marketplaceId, isHydrated]);
  
  // Update individual fields
  const updateFilters = useCallback((filters: AdvancedFiltersState) => {
    setState(prev => {
      const newState = { ...prev, filters };
      persistState(newState);
      return newState;
    });
  }, [persistState]);
  
  const updateQuickFilter = useCallback((quickFilter: QuickFilter) => {
    setState(prev => {
      const newState = { ...prev, quickFilter };
      persistState(newState);
      return newState;
    });
  }, [persistState]);
  
  const updateSearchTerm = useCallback((searchTerm: string) => {
    setState(prev => {
      const newState = { ...prev, searchTerm };
      persistState(newState);
      return newState;
    });
  }, [persistState]);
  
  const updateSort = useCallback((sortField: SortField, sortOrder: SortOrder) => {
    setState(prev => {
      const newState = { ...prev, sortField, sortOrder };
      persistState(newState);
      return newState;
    });
  }, [persistState]);
  
  const updateViewMode = useCallback((viewMode: 'table' | 'cards') => {
    setState(prev => {
      const newState = { ...prev, viewMode };
      persistState(newState);
      return newState;
    });
  }, [persistState]);
  
  const resetAll = useCallback(() => {
    const defaultState = getDefaultState();
    setState(defaultState);
    saveToStorage(bookIdRef.current, marketplaceId, defaultState);
  }, [marketplaceId]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);
  
  return {
    state,
    isHydrated,
    updateFilters,
    updateQuickFilter,
    updateSearchTerm,
    updateSort,
    updateViewMode,
    resetAll,
  };
}
