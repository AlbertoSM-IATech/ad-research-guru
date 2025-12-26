// Wizard builder - single point of entry for creating keywords with complete data
import type { Keyword, BookInfo, RelevanceLevel, IntentType, KeywordState } from '@/types/advertising';
import type { 
  MarketData, 
  EditorialData, 
  KeywordStatus, 
  KeywordPurpose,
  BrandRisk,
  TrafficSource 
} from '@/lib/market-score';
import { 
  calculateMarketScore, 
  calculateEditorialScore, 
  getDefaultMarketData,
  getDefaultEditorialData 
} from '@/lib/market-score';
import { calculateRelevance, classifyIntent } from '@/types/advertising';

export interface WizardStep1Data {
  keyword: string;
  marketplaceId: string;
  purpose: KeywordPurpose;
  intent?: IntentType;
}

export interface WizardStep2Data {
  searchVolume: number;
  competitors: number;
  price: number;
  royalties: number;
  brandRisk: BrandRisk;
  trafficSource: TrafficSource;
}

export interface WizardStep3Data {
  canCreate: boolean | null;
  canDoBetter: boolean | null;
  canDifferentiate: boolean | null;
  fitsStrategy: boolean | null;
  notes: string;
}

export interface WizardPayload {
  step1: WizardStep1Data;
  step2: WizardStep2Data;
  step3?: WizardStep3Data;
  bookInfo?: BookInfo;
}

/**
 * Check if market data is complete enough for a valid keyword
 */
export function isMarketDataComplete(data: WizardStep2Data): boolean {
  return data.searchVolume > 0 || data.competitors > 0;
}

/**
 * Convert market score to relevance level for backward compat
 */
function scoreToRelevanceLevel(score: number): RelevanceLevel {
  if (score >= 70) return 'very-high';
  if (score >= 50) return 'high';
  if (score >= 30) return 'low';
  return 'none';
}

/**
 * Build a complete Keyword from wizard data
 * This is the SINGLE source of truth for manual keyword creation
 */
export function buildNewKeywordFromWizard(payload: WizardPayload): Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'> {
  const { step1, step2, step3, bookInfo } = payload;
  
  // Build MarketData
  const marketData: MarketData = {
    searchVolume: step2.searchVolume,
    competitors: step2.competitors,
    price: step2.price,
    royalties: step2.royalties,
    brandRisk: step2.brandRisk,
    trafficSource: step2.trafficSource,
  };
  
  // Calculate Market Score
  const breakdown = calculateMarketScore(marketData);
  const marketScore = breakdown.total;
  
  // Build EditorialData if step3 provided
  let editorialData: EditorialData | undefined;
  let editorialScore: number | undefined;
  
  if (step3) {
    editorialData = {
      checklist: {
        canCreate: step3.canCreate,
        canDoBetter: step3.canDoBetter,
        canDifferentiate: step3.canDifferentiate,
        fitsStrategy: step3.fitsStrategy,
      },
      notes: step3.notes,
    };
    editorialScore = calculateEditorialScore(editorialData);
  }
  
  // Determine status based on completeness
  const isComplete = isMarketDataComplete(step2);
  const status: KeywordStatus = isComplete ? 'valid' : 'pending';
  const state: KeywordState = isComplete ? 'pending' : 'pending';
  
  // Calculate relevance from score or bookInfo
  const relevance = bookInfo 
    ? calculateRelevance(step1.keyword, bookInfo) 
    : scoreToRelevanceLevel(marketScore);
  
  // Get intent from step1 or classify automatically
  const intent = step1.intent ?? classifyIntent(step1.keyword);
  
  // Determine competition level from competitors
  let competitionLevel: 'low' | 'medium' | 'high' = 'medium';
  if (step2.competitors < 1000) competitionLevel = 'low';
  else if (step2.competitors > 10000) competitionLevel = 'high';
  
  return {
    keyword: step1.keyword.trim(),
    marketplaceId: step1.marketplaceId,
    
    // Market Data V2
    searchVolume: step2.searchVolume,
    competitors: step2.competitors,
    price: step2.price,
    royalties: step2.royalties,
    marketScore,
    marketData,
    
    // Editorial Data
    editorialData,
    editorialScore,
    
    // Status & Purpose
    status,
    purpose: step1.purpose,
    
    // Legacy fields
    competitionLevel,
    relevance,
    
    // Operational
    campaignTypes: ['SP'],
    notes: step3?.notes ?? '',
    intent,
    state,
    history: [],
  };
}

/**
 * Get default values for Step 2 (market data)
 */
export function getDefaultStep2Data(): WizardStep2Data {
  const defaults = getDefaultMarketData();
  return {
    searchVolume: 0,
    competitors: 0,
    price: defaults.price,
    royalties: defaults.royalties,
    brandRisk: defaults.brandRisk,
    trafficSource: defaults.trafficSource,
  };
}

/**
 * Get default values for Step 3 (editorial)
 */
export function getDefaultStep3Data(): WizardStep3Data {
  return {
    canCreate: null,
    canDoBetter: null,
    canDifferentiate: null,
    fitsStrategy: null,
    notes: '',
  };
}

/**
 * Check for duplicate keywords (case-insensitive)
 */
export function findDuplicateKeyword(
  keyword: string, 
  marketplaceId: string, 
  existingKeywords: Keyword[]
): Keyword | undefined {
  const normalized = keyword.trim().toLowerCase();
  return existingKeywords.find(
    k => k.keyword.toLowerCase() === normalized && k.marketplaceId === marketplaceId
  );
}
