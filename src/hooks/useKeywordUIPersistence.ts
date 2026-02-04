// Persistence hook for keyword UI state (filters, sort, view mode)
// IMPORTANT: Editorial and Ads filters are stored SEPARATELY to ensure independence
import { useState, useEffect, useCallback, useRef } from 'react';
import type { AdvancedFiltersState } from '@/components/advertising/AdvancedFilters';
import type { AdsFiltersState } from '@/components/advertising/AdvancedFiltersAds';
import { defaultAdsFiltersState } from '@/components/advertising/AdvancedFiltersAds';
import type { QuickFilter } from '@/lib/keyword-filters';
import type { SortField, SortOrder } from '@/lib/keyword-sorting';

export type FunctionalView = 'editorial' | 'ads';

export interface KeywordUIState {
  filters: AdvancedFiltersState;
  adsFilters: AdsFiltersState; // Separate ads filters
  quickFilter: QuickFilter;
  searchTerm: string;
  sortField: SortField;
  sortOrder: SortOrder;
  viewMode: 'table' | 'cards';
  functionalView: FunctionalView;
}

const STORAGE_VERSION = 'v2'; // Bumped version for new structure
const DEBOUNCE_MS = 300;

function getStorageKey(bookId: string | undefined, marketplaceId: string): string {
  const bookPrefix = bookId ?? 'default';
  return `ad-research:${bookPrefix}:keywords-ui:${STORAGE_VERSION}:${marketplaceId}`;
}

function getDefaultFilters(): AdvancedFiltersState {
  return {
    minVolume: '',
    maxVolume: '',
    minCompetition: '',
    maxCompetition: '',
    status: 'all',
    campaignName: '',
    marketScoreRanges: [],
    has200PlusReviews: false,
    hasUnder100Reviews: false,
  };
}

function getDefaultState(): KeywordUIState {
  return {
    filters: getDefaultFilters(),
    adsFilters: { ...defaultAdsFiltersState },
    quickFilter: 'all',
    searchTerm: '',
    sortField: 'marketScore',
    sortOrder: 'desc',
    viewMode: 'table',
    functionalView: 'editorial',
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
    
    // Ensure adsFilters exists (migration from v1)
    if (!parsed.adsFilters) {
      parsed.adsFilters = { ...defaultAdsFiltersState };
    }
    
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
  
  // Update editorial filters (only affects editorial view)
  const updateFilters = useCallback((filters: AdvancedFiltersState) => {
    setState(prev => {
      const newState = { ...prev, filters };
      persistState(newState);
      return newState;
    });
  }, [persistState]);
  
  // Update ads filters (only affects ads view)
  const updateAdsFilters = useCallback((adsFilters: AdsFiltersState) => {
    setState(prev => {
      const newState = { ...prev, adsFilters };
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
  
  const updateFunctionalView = useCallback((functionalView: FunctionalView) => {
    setState(prev => {
      const newState = { ...prev, functionalView };
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
    updateAdsFilters,
    updateQuickFilter,
    updateSearchTerm,
    updateSort,
    updateViewMode,
    updateFunctionalView,
    resetAll,
  };
}
