import { useState, useEffect, useCallback } from 'react';
import type { AdvancedFiltersState } from '@/components/advertising/AdvancedFilters';
import type { AdsFiltersState } from '@/components/advertising/AdvancedFiltersAds';

export interface FilterPreset {
  id: string;
  name: string;
  type: 'editorial' | 'ads';
  filters: AdvancedFiltersState | AdsFiltersState;
  createdAt: Date;
}

interface UseFilterPresetsReturn {
  presets: FilterPreset[];
  savePreset: (name: string, type: 'editorial' | 'ads', filters: AdvancedFiltersState | AdsFiltersState) => void;
  deletePreset: (id: string) => void;
  loadPreset: (id: string) => FilterPreset | undefined;
  getPresetsByType: (type: 'editorial' | 'ads') => FilterPreset[];
}

const STORAGE_KEY = 'keyword-filter-presets';

export const useFilterPresets = (): UseFilterPresetsReturn => {
  const [presets, setPresets] = useState<FilterPreset[]>([]);

  // Load presets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const presetsWithDates = parsed.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
        }));
        setPresets(presetsWithDates);
      }
    } catch (e) {
      console.error('Error loading filter presets:', e);
    }
  }, []);

  // Persist presets to localStorage
  const persistPresets = useCallback((newPresets: FilterPreset[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPresets));
    } catch (e) {
      console.error('Error saving filter presets:', e);
    }
  }, []);

  const savePreset = useCallback((
    name: string,
    type: 'editorial' | 'ads',
    filters: AdvancedFiltersState | AdsFiltersState
  ) => {
    const newPreset: FilterPreset = {
      id: `preset-${Date.now()}`,
      name: name.trim(),
      type,
      filters,
      createdAt: new Date(),
    };

    setPresets(prev => {
      const updated = [...prev, newPreset];
      persistPresets(updated);
      return updated;
    });
  }, [persistPresets]);

  const deletePreset = useCallback((id: string) => {
    setPresets(prev => {
      const updated = prev.filter(p => p.id !== id);
      persistPresets(updated);
      return updated;
    });
  }, [persistPresets]);

  const loadPreset = useCallback((id: string): FilterPreset | undefined => {
    return presets.find(p => p.id === id);
  }, [presets]);

  const getPresetsByType = useCallback((type: 'editorial' | 'ads'): FilterPreset[] => {
    return presets.filter(p => p.type === type);
  }, [presets]);

  return {
    presets,
    savePreset,
    deletePreset,
    loadPreset,
    getPresetsByType,
  };
};
