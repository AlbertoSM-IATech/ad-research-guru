// Centralized keyword filtering logic
import type { Keyword } from '@/types/advertising';
import type { KeywordPurpose, KeywordStatus } from './market-score';
import { getKeywordMarketScore } from './keyword-sorting';

export interface KeywordFilters {
  searchTerm?: string;
  purpose?: KeywordPurpose | 'all';
  status?: KeywordStatus | 'all';
  competition?: string;
  campaignType?: string;
  minVolume?: string;
  maxVolume?: string;
  maxCompetition?: string;
  relevance?: string;
  intent?: string;
  state?: string;
}

export type QuickFilter = 'all' | 'ready-for-ads' | 'candidates' | 'discard';

export interface QuickFilterOption {
  value: QuickFilter;
  label: string;
  description: string;
  color: string;
}

export const QUICK_FILTER_OPTIONS: QuickFilterOption[] = [
  { 
    value: 'all', 
    label: 'Todas', 
    description: 'Sin filtro rápido',
    color: 'bg-muted text-muted-foreground'
  },
  { 
    value: 'ready-for-ads', 
    label: 'Listas para Ads', 
    description: 'Score ≥70, purpose ads/both, no descartadas',
    color: 'bg-green-500/20 text-green-600 border-green-500/30'
  },
  { 
    value: 'candidates', 
    label: 'Candidatas', 
    description: 'Score 40-69, no descartadas',
    color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30'
  },
  { 
    value: 'discard', 
    label: 'Descartar', 
    description: 'Score <40 o descartadas',
    color: 'bg-red-500/20 text-red-600 border-red-500/30'
  },
];

// Get keyword purpose with fallback for old keywords
export function getKeywordPurpose(keyword: Keyword): KeywordPurpose {
  return keyword.purpose || 'editorial';
}

// Get keyword status with fallback for old keywords
export function getKeywordStatus(keyword: Keyword): KeywordStatus {
  if (keyword.status) return keyword.status;
  // Map old state to new status
  if (keyword.state === 'discarded') return 'discarded';
  if (keyword.state === 'tested-works') return 'valid';
  return 'pending';
}

// Apply all filters to a keyword list
export function applyKeywordFilters(
  keywords: Keyword[],
  filters: KeywordFilters
): Keyword[] {
  return keywords.filter((k) => {
    // Search term
    if (filters.searchTerm && 
        !k.keyword.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
      return false;
    }
    
    // Purpose filter
    if (filters.purpose && filters.purpose !== 'all') {
      const keywordPurpose = getKeywordPurpose(k);
      if (keywordPurpose !== filters.purpose) {
        return false;
      }
    }
    
    // Status filter
    if (filters.status && filters.status !== 'all') {
      const keywordStatus = getKeywordStatus(k);
      if (keywordStatus !== filters.status) {
        return false;
      }
    }
    
    // Competition filter
    if (filters.competition && filters.competition !== 'all' && 
        k.competitionLevel !== filters.competition) {
      return false;
    }
    
    // Campaign type filter
    if (filters.campaignType && filters.campaignType !== 'all' && 
        !k.campaignTypes.includes(filters.campaignType as any)) {
      return false;
    }
    
    // Volume filters
    if (filters.minVolume && k.searchVolume < parseInt(filters.minVolume)) {
      return false;
    }
    if (filters.maxVolume && k.searchVolume > parseInt(filters.maxVolume)) {
      return false;
    }
    
    // Relevance filter
    if (filters.relevance && filters.relevance !== 'all' && 
        k.relevance !== filters.relevance) {
      return false;
    }
    
    // Intent filter
    if (filters.intent && filters.intent !== 'all' && 
        k.intent !== filters.intent) {
      return false;
    }
    
    // State filter (legacy)
    if (filters.state && filters.state !== 'all' && 
        k.state !== filters.state) {
      return false;
    }
    
    return true;
  });
}

// Apply quick filter (sets appropriate filters)
export function applyQuickFilter(
  keywords: Keyword[],
  quickFilter: QuickFilter
): Keyword[] {
  if (quickFilter === 'all') {
    return keywords;
  }
  
  return keywords.filter((k) => {
    const score = getKeywordMarketScore(k);
    const status = getKeywordStatus(k);
    const purpose = getKeywordPurpose(k);
    
    switch (quickFilter) {
      case 'ready-for-ads':
        // purpose in (ads, both) AND marketScore >= 70 AND status != discarded
        return (
          (purpose === 'ads' || purpose === 'both') &&
          score >= 70 &&
          status !== 'discarded'
        );
        
      case 'candidates':
        // marketScore 40-69 AND status != discarded
        return (
          score >= 40 &&
          score < 70 &&
          status !== 'discarded'
        );
        
      case 'discard':
        // marketScore < 40 OR status == discarded
        return (
          score < 40 ||
          status === 'discarded'
        );
        
      default:
        return true;
    }
  });
}

// Get filters from quick filter (for UI state sync)
export function getFiltersFromQuickFilter(quickFilter: QuickFilter): Partial<KeywordFilters> {
  switch (quickFilter) {
    case 'ready-for-ads':
      return {
        purpose: 'ads', // Will also include 'both' via custom logic
        status: 'pending', // Not discarded
      };
    case 'candidates':
    case 'discard':
      return {}; // These are score-based, handled separately
    default:
      return {};
  }
}
