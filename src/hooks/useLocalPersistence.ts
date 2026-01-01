import { useEffect, useRef, useCallback } from 'react';
import type { 
  Keyword, 
  TargetASIN, 
  AdvertisingCategory, 
  BookInfo,
  CampaignPlan,
} from '@/types/advertising';

const STORAGE_VERSION = 2;

// Dynamic storage key based on bookId
export function getAdResearchStorageKey(bookId?: string): string {
  return bookId 
    ? `ad-research:${bookId}:v${STORAGE_VERSION}` 
    : `ad-research:v${STORAGE_VERSION}`;
}

const DEBOUNCE_MS = 400;

export interface PersistedStateV1 {
  version: 2;
  selectedMarketplace: string;
  activeTab: 'keywords' | 'asins' | 'categories';
  bookInfo: BookInfo;
  keywordsByMarket: Record<string, Keyword[]>;
  asinsByMarket: Record<string, TargetASIN[]>;
  categoriesByMarket: Record<string, AdvertisingCategory[]>;
  campaignPlansByMarket: Record<string, CampaignPlan[]>;
  showInsights?: boolean;
  updatedAt: string;
}

// Serialize dates for localStorage
function serializeData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (key, value) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }));
}

// Deserialize ISO strings back to Date objects
function deserializeDates<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    // Check if it's an ISO date string
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
      return new Date(obj) as unknown as T;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(deserializeDates) as unknown as T;
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      result[key] = deserializeDates((obj as Record<string, unknown>)[key]);
    }
    return result as T;
  }
  return obj;
}

export function getLastSyncAt(bookId?: string): Date | null {
  try {
    const storageKey = getAdResearchStorageKey(bookId);
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    
    const parsed = JSON.parse(raw);
    // Fixed: validate version === 2 (not !== 1)
    if (parsed.version !== 2 || !parsed.updatedAt) return null;
    
    return new Date(parsed.updatedAt);
  } catch {
    return null;
  }
}

export function loadPersistedState(bookId?: string): PersistedStateV1 | null {
  try {
    const storageKey = getAdResearchStorageKey(bookId);
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    
    const parsed = JSON.parse(raw) as PersistedStateV1;
    
    // Validate version
    if (parsed.version !== 2) {
      console.warn('[Persistence] Invalid version, ignoring stored data');
      return null;
    }
    
    // Deserialize dates
    return deserializeDates(parsed);
  } catch (error) {
    console.warn('[Persistence] Failed to load stored data:', error);
    return null;
  }
}

export function savePersistedState(state: Omit<PersistedStateV1, 'version' | 'updatedAt'>, bookId?: string): void {
  try {
    const storageKey = getAdResearchStorageKey(bookId);
    const toSave: PersistedStateV1 = {
      ...serializeData(state),
      version: 2,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(toSave));
  } catch (error) {
    console.warn('[Persistence] Failed to save state:', error);
  }
}

// Helper to clear all localStorage keys for a specific book
export function clearBookStorage(bookId?: string): void {
  const prefix = bookId ? `ad-research:${bookId}:` : 'ad-research:';
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }
  
  // Also remove global keys if no bookId (standalone mode)
  if (!bookId) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('ad-research:v') ||
        key.startsWith('ad-research:keywords-ui:')
      )) {
        if (!keysToRemove.includes(key)) {
          keysToRemove.push(key);
        }
      }
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

export interface UsePersistenceOptions {
  selectedMarketplace: string;
  activeTab: 'keywords' | 'asins' | 'categories';
  bookInfo: BookInfo;
  keywordsByMarket: Record<string, Keyword[]>;
  asinsByMarket: Record<string, TargetASIN[]>;
  categoriesByMarket: Record<string, AdvertisingCategory[]>;
  campaignPlansByMarket: Record<string, CampaignPlan[]>;
  showInsights: boolean;
}

export interface UsePersistenceReturn {
  saveNow: () => void;
}

export function usePersistence(
  state: UsePersistenceOptions,
  hasHydrated: boolean,
  onSave?: () => void,
  bookId?: string
): UsePersistenceReturn {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  const bookIdRef = useRef(bookId);
  
  // Keep refs updated
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  useEffect(() => {
    bookIdRef.current = bookId;
  }, [bookId]);
  
  // Force save function (no debounce)
  const saveNow = useCallback(() => {
    if (!hasHydrated) return;
    
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    
    // Save immediately
    savePersistedState({
      selectedMarketplace: stateRef.current.selectedMarketplace,
      activeTab: stateRef.current.activeTab,
      bookInfo: stateRef.current.bookInfo,
      keywordsByMarket: stateRef.current.keywordsByMarket,
      asinsByMarket: stateRef.current.asinsByMarket,
      categoriesByMarket: stateRef.current.categoriesByMarket,
      campaignPlansByMarket: stateRef.current.campaignPlansByMarket,
      showInsights: stateRef.current.showInsights,
    }, bookIdRef.current);
    onSave?.();
  }, [hasHydrated, onSave]);
  
  // Debounced save effect
  useEffect(() => {
    // Don't save before hydration
    if (!hasHydrated) return;
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      savePersistedState({
        selectedMarketplace: state.selectedMarketplace,
        activeTab: state.activeTab,
        bookInfo: state.bookInfo,
        keywordsByMarket: state.keywordsByMarket,
        asinsByMarket: state.asinsByMarket,
        categoriesByMarket: state.categoriesByMarket,
        campaignPlansByMarket: state.campaignPlansByMarket,
        showInsights: state.showInsights,
      }, bookId);
      // Notify caller that save completed
      onSave?.();
    }, DEBOUNCE_MS);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [
    hasHydrated,
    state.selectedMarketplace,
    state.activeTab,
    state.bookInfo,
    state.keywordsByMarket,
    state.asinsByMarket,
    state.categoriesByMarket,
    state.campaignPlansByMarket,
    state.showInsights,
    bookId,
    onSave,
  ]);
  
  return { saveNow };
}
