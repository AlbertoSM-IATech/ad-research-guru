// Centralized keyword sorting logic
import type { Keyword } from '@/types/advertising';
import { calculateMarketScore, getDefaultMarketData } from './market-score';

export type SortField = 
  | 'keyword' 
  | 'searchVolume' 
  | 'competitors'
  | 'competitionLevel' 
  | 'relevance' 
  | 'state' 
  | 'marketScore';
export type SortOrder = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  order: SortOrder;
  label: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { field: 'marketScore', order: 'desc', label: 'Market Score (mayor primero)' },
  { field: 'marketScore', order: 'asc', label: 'Market Score (menor primero)' },
  { field: 'keyword', order: 'asc', label: 'Keyword (A-Z)' },
  { field: 'keyword', order: 'desc', label: 'Keyword (Z-A)' },
  { field: 'searchVolume', order: 'desc', label: 'Volumen (mayor primero)' },
  { field: 'searchVolume', order: 'asc', label: 'Volumen (menor primero)' },
  { field: 'competitors', order: 'asc', label: 'Competidores (menor primero)' },
  { field: 'competitors', order: 'desc', label: 'Competidores (mayor primero)' },
  { field: 'competitionLevel', order: 'asc', label: 'Nivel competencia (menor primero)' },
  { field: 'competitionLevel', order: 'desc', label: 'Nivel competencia (mayor primero)' },
  { field: 'state', order: 'asc', label: 'Estado' },
];

// Get the market score for a keyword (uses cached value or calculates)
export function getKeywordMarketScore(keyword: Keyword): number {
  // If marketScore is cached and valid, use it
  if (keyword.marketScore !== undefined && keyword.marketScore > 0) {
    return keyword.marketScore;
  }
  
  // Build market data from keyword fields
  const data = {
    ...getDefaultMarketData(),
    searchVolume: keyword.searchVolume || 0,
    competitors: keyword.competitors || 0,
    price: keyword.price || 9.99,
    royalties: keyword.royalties || 2.00,
    trafficSource: keyword.marketData?.trafficSource || 'amazon',
  };
  
  return calculateMarketScore(data).total;
}

// Check if keyword has incomplete market data
export function isMarketDataIncomplete(keyword: Keyword): boolean {
  return (
    !keyword.searchVolume || 
    keyword.searchVolume === 0 ||
    !keyword.competitors ||
    keyword.competitors === 0
  );
}

// Sort keywords by a given field and order (stable sort)
export function sortKeywords(
  keywords: Keyword[], 
  field: SortField, 
  order: SortOrder
): Keyword[] {
  const modifier = order === 'asc' ? 1 : -1;
  
  return [...keywords].sort((a, b) => {
    let comparison = 0;
    
    switch (field) {
      case 'keyword':
        comparison = a.keyword.localeCompare(b.keyword);
        break;
        
      case 'searchVolume':
        comparison = (a.searchVolume || 0) - (b.searchVolume || 0);
        break;
        
      case 'competitors':
        comparison = (a.competitors || 0) - (b.competitors || 0);
        break;
        
      case 'competitionLevel': {
        const competitionOrder = ['low', 'medium', 'high'];
        comparison = 
          competitionOrder.indexOf(a.competitionLevel) - 
          competitionOrder.indexOf(b.competitionLevel);
        break;
      }
        
      case 'relevance': {
        const relevanceOrder = ['very-high', 'high', 'low', 'none'];
        comparison = 
          relevanceOrder.indexOf(a.relevance || 'none') - 
          relevanceOrder.indexOf(b.relevance || 'none');
        break;
      }
        
      case 'state': {
        const stateOrder = ['tested-works', 'pending', 'low-competition', 'discarded'];
        comparison = 
          stateOrder.indexOf(a.state || 'pending') - 
          stateOrder.indexOf(b.state || 'pending');
        break;
      }
        
      case 'marketScore': {
        // Get scores, treating null/undefined as -1 to push to end
        const scoreA = getKeywordMarketScore(a);
        const scoreB = getKeywordMarketScore(b);
        const effectiveA = scoreA > 0 ? scoreA : -1;
        const effectiveB = scoreB > 0 ? scoreB : -1;
        comparison = effectiveA - effectiveB;
        break;
      }
        
      default:
        comparison = 0;
    }
    
    // Apply direction modifier
    const result = comparison * modifier;
    
    // Stable sort: if equal, sort by keyword name asc
    if (result === 0 && field !== 'keyword') {
      return a.keyword.localeCompare(b.keyword);
    }
    
    return result;
  });
}
