// Centralized keyword filtering logic
import type { Keyword } from '@/types/advertising';
import type { KeywordStatus } from './market-score';
import { getKeywordMarketScore } from './keyword-sorting';

export interface KeywordFilters {
  searchTerm?: string;
  status?: KeywordStatus | 'all';
  minVolume?: string;
  maxVolume?: string;
  minCompetition?: string;
  maxCompetition?: string;
  campaignName?: string;
  marketScoreRanges?: string[];
  has200PlusReviews?: boolean;
  hasUnder100Reviews?: boolean;
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
export function getKeywordPurpose(keyword: Keyword): 'editorial' | 'ads' | 'both' {
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

// Helper to check if score falls within a range
function isScoreInRange(score: number, range: string): boolean {
  const [min, max] = range.split('-').map(Number);
  return score >= min && score < max;
}

// Apply all filters to a keyword list
export function applyKeywordFilters(
  keywords: Keyword[],
  filters: KeywordFilters
): Keyword[] {
  return keywords.filter((k) => {
    // Search term (includes keyword text and campaign name)
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const matchesKeyword = k.keyword.toLowerCase().includes(searchLower);
      const matchesCampaign = k.adsData?.campaignName?.toLowerCase().includes(searchLower);
      if (!matchesKeyword && !matchesCampaign) {
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
    
    // Volume filters
    if (filters.minVolume && k.searchVolume < parseInt(filters.minVolume)) {
      return false;
    }
    if (filters.maxVolume && k.searchVolume > parseInt(filters.maxVolume)) {
      return false;
    }
    
    // Competition (competitors) filters
    if (filters.minCompetition && k.competitors < parseInt(filters.minCompetition)) {
      return false;
    }
    if (filters.maxCompetition && k.competitors > parseInt(filters.maxCompetition)) {
      return false;
    }
    
    // Campaign name filter
    if (filters.campaignName && filters.campaignName.trim()) {
      const campaignNameLower = filters.campaignName.toLowerCase();
      if (!k.adsData?.campaignName?.toLowerCase().includes(campaignNameLower)) {
        return false;
      }
    }
    
    // Market Score ranges (multiselect - pass if in ANY selected range)
    if (filters.marketScoreRanges && filters.marketScoreRanges.length > 0) {
      const score = getKeywordMarketScore(k);
      const inAnyRange = filters.marketScoreRanges.some(range => isScoreInRange(score, range));
      if (!inAnyRange) {
        return false;
      }
    }
    
    // +200 reviews filter (check catalogSignals)
    if (filters.has200PlusReviews) {
      const range = k.catalogSignals?.booksOver200ReviewsRange;
      // Only pass if range indicates presence of books with +200 reviews
      if (!range) {
        return false;
      }
    }
    
    // -100 reviews filter (check catalogSignals)
    if (filters.hasUnder100Reviews) {
      if (!k.catalogSignals?.hasBooksUnder100Reviews) {
        return false;
      }
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
        return (
          (purpose === 'ads' || purpose === 'both') &&
          score >= 70 &&
          status !== 'discarded'
        );
        
      case 'candidates':
        return (
          score >= 40 &&
          score < 70 &&
          status !== 'discarded'
        );
        
      case 'discard':
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
        status: 'pending',
      };
    case 'candidates':
    case 'discard':
      return {};
    default:
      return {};
  }
}
