import { useMemo } from 'react';
import type { Keyword } from '@/types/advertising';
import {
  type MarketData,
  type MarketScoreBreakdown,
  calculateMarketScore,
  getDefaultMarketData,
  getMarketScoreLevel,
  getMarketScoreInfo,
} from '@/lib/market-score';

export interface UseMarketScoreResult {
  score: number;
  breakdown: MarketScoreBreakdown;
  level: ReturnType<typeof getMarketScoreLevel>;
  info: ReturnType<typeof getMarketScoreInfo>;
}

/**
 * Hook that calculates Market Score from a keyword
 * Returns score, breakdown, level, and styling info
 */
export function useMarketScore(keyword: Keyword | null): UseMarketScoreResult | null {
  return useMemo(() => {
    if (!keyword) return null;
    
    // Build MarketData from keyword fields
    const marketData: MarketData = keyword.marketData ?? {
      searchVolume: keyword.searchVolume || 0,
      competitors: keyword.competitors || 0,
      price: keyword.price || 9.99,
      royalties: keyword.royalties || 2.00,
      brandRisk: 'low',
      trafficSource: 'amazon',
    };
    
    const breakdown = calculateMarketScore(marketData);
    const score = breakdown.total;
    const level = getMarketScoreLevel(score);
    const info = getMarketScoreInfo(score);
    
    return { score, breakdown, level, info };
  }, [keyword]);
}

/**
 * Calculate Market Score from raw MarketData
 */
export function useMarketScoreFromData(data: MarketData | null): UseMarketScoreResult | null {
  return useMemo(() => {
    if (!data) return null;
    
    const breakdown = calculateMarketScore(data);
    const score = breakdown.total;
    const level = getMarketScoreLevel(score);
    const info = getMarketScoreInfo(score);
    
    return { score, breakdown, level, info };
  }, [data]);
}

/**
 * Get Market Score for a keyword (synchronous helper)
 */
export function getKeywordMarketScore(keyword: Keyword): number {
  // If marketScore is already calculated, use it
  if (keyword.marketScore !== undefined && keyword.marketScore > 0) {
    return keyword.marketScore;
  }
  
  // Build MarketData and calculate
  const marketData: MarketData = keyword.marketData ?? {
    searchVolume: keyword.searchVolume || 0,
    competitors: keyword.competitors || 0,
    price: keyword.price || 9.99,
    royalties: keyword.royalties || 2.00,
    brandRisk: 'low',
    trafficSource: 'amazon',
  };
  
  return calculateMarketScore(marketData).total;
}
