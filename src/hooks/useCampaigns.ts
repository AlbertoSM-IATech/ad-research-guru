import { useMemo, useCallback } from 'react';
import type { Keyword } from '@/types/advertising';

// Storage key for custom campaign names
const CAMPAIGNS_STORAGE_KEY = 'ad-research:campaigns';

export interface UseCampaignsReturn {
  campaigns: string[];
  addCampaign: (name: string) => void;
  removeCampaign: (name: string) => void;
}

// Get unique campaign names from keywords
function extractCampaignNames(keywords: Keyword[]): string[] {
  const names = new Set<string>();
  keywords.forEach(k => {
    if (k.adsData?.campaignName && k.adsData.campaignName.trim()) {
      names.add(k.adsData.campaignName.trim());
    }
  });
  return Array.from(names).sort();
}

// Load custom campaigns from localStorage
function loadCustomCampaigns(): string[] {
  try {
    const stored = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
      }
    }
  } catch {
    // Ignore errors
  }
  return [];
}

// Save custom campaigns to localStorage
function saveCustomCampaigns(campaigns: string[]): void {
  try {
    localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(campaigns));
  } catch {
    // Ignore errors
  }
}

export function useCampaigns(keywords: Keyword[]): UseCampaignsReturn {
  // Extract unique campaigns from keywords
  const keywordCampaigns = useMemo(() => extractCampaignNames(keywords), [keywords]);
  
  // Load custom campaigns from storage
  const customCampaigns = useMemo(() => loadCustomCampaigns(), []);
  
  // Merge and deduplicate
  const campaigns = useMemo(() => {
    const allCampaigns = new Set([...keywordCampaigns, ...customCampaigns]);
    return Array.from(allCampaigns).sort();
  }, [keywordCampaigns, customCampaigns]);
  
  const addCampaign = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    
    const current = loadCustomCampaigns();
    if (!current.includes(trimmed)) {
      const updated = [...current, trimmed].sort();
      saveCustomCampaigns(updated);
    }
  }, []);
  
  const removeCampaign = useCallback((name: string) => {
    const current = loadCustomCampaigns();
    const updated = current.filter(c => c !== name);
    saveCustomCampaigns(updated);
  }, []);
  
  return { campaigns, addCampaign, removeCampaign };
}
