// This file is deprecated - use market-score.ts instead
// Kept for backward compatibility during migration

import type { Keyword, RelevanceLevel } from '@/types/advertising';
import { 
  calculateMarketScore, 
  getMarketScoreLevel,
  getMarketScoreColor,
  getMarketScoreBgColor,
  getDefaultMarketData, 
  type MarketData 
} from './market-score';

// Re-export from market-score for compatibility
export {
  calculateMarketScore,
  getMarketScoreLevel,
  getMarketScoreColor,
  getMarketScoreBgColor,
  getDefaultMarketData,
} from './market-score';

export type { MarketData } from './market-score';

// Legacy function - now uses Market Score
export const calculateRelevanceScore = (keyword: Keyword): number => {
  // Build MarketData from keyword fields
  const marketData: MarketData = keyword.marketData ?? {
    searchVolume: keyword.searchVolume || 0,
    competitors: keyword.competitors || 0,
    price: keyword.price || 9.99,
    royalties: keyword.royalties || 2.00,
    brandRisk: 'low',
    trafficSource: 'amazon',
  };
  return calculateMarketScore(marketData).total;
};

export const scoreToRelevanceLevel = (score: number): RelevanceLevel => {
  if (score >= 70) return 'very-high';
  if (score >= 50) return 'high';
  if (score >= 30) return 'low';
  return 'none';
};

export const relevanceLevelToScore = (relevance: RelevanceLevel): number => {
  switch (relevance) {
    case 'very-high': return 85;
    case 'high': return 60;
    case 'low': return 40;
    case 'none': return 15;
  }
};

export const getScoreColor = (score: number): string => {
  return getMarketScoreColor(score);
};

export const getScoreBgColor = (score: number): string => {
  return getMarketScoreBgColor(score);
};
