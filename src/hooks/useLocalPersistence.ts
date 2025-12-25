import { useEffect, useRef, useCallback } from 'react';
import type { 
  Keyword, 
  TargetASIN, 
  AdvertisingCategory, 
  BookInfo,
  CampaignPlan,
} from '@/types/advertising';

const STORAGE_KEY = 'ad-research:v1';
const DEBOUNCE_MS = 400;

export interface PersistedStateV1 {
  version: 1;
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

export function getLastSyncAt(): Date | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || !parsed.updatedAt) return null;
    
    return new Date(parsed.updatedAt);
  } catch {
    return null;
  }
}

export function loadPersistedState(): PersistedStateV1 | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    
    const parsed = JSON.parse(raw) as PersistedStateV1;
    
    // Validate version
    if (parsed.version !== 1) {
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

export function savePersistedState(state: Omit<PersistedStateV1, 'version' | 'updatedAt'>): void {
  try {
    const toSave: PersistedStateV1 = {
      ...serializeData(state),
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.warn('[Persistence] Failed to save state:', error);
  }
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

export function usePersistence(
  state: UsePersistenceOptions,
  hasHydrated: boolean,
  onSave?: () => void
): void {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
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
      });
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
    onSave,
  ]);
}
