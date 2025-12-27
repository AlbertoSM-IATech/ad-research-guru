// Wizard builder - single point of entry for creating keywords with complete data
import type { Keyword, BookInfo, RelevanceLevel, IntentType, KeywordState, MarketStructure } from '@/types/advertising';
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
  getDefaultEditorialData,
  MARKET_STRUCTURE_CHECKS,
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
  // Market Structure (12 pts block - 6 checks x 2pts)
  understandable?: boolean;
  amazonSuggested?: boolean;
  profitableBooks?: boolean;
  indieAuthors?: boolean;
  intentMatch?: boolean;
  variants?: boolean;
}

// Editorial checks aligned with wizard (4 checks - does NOT affect Market Score)
export interface WizardStep3Data {
  editorialChecks: Record<string, boolean>;
  notes: string;
}

export interface WizardPayload {
  step1: WizardStep1Data;
  step2: WizardStep2Data;
  step3?: WizardStep3Data;
  bookInfo?: BookInfo;
}

/**
 * Get automatic status based on market score
 * - score >= 70 → 'valid'
 * - score 40-69 → 'pending'
 * - score < 40 → 'discarded'
 */
export function getAutoStatusFromScore(marketScore: number): KeywordStatus {
  if (marketScore >= 70) return 'valid';
  if (marketScore >= 40) return 'pending';
  return 'discarded';
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
  
  // Build Market Structure (6 checks x 2pts = 12pts max)
  const marketStructure: MarketStructure = {
    understandable: step2.understandable ?? false,
    amazonSuggested: step2.amazonSuggested ?? false,
    profitableBooks: step2.profitableBooks ?? false,
    indieAuthors: step2.indieAuthors ?? false,
    intentMatch: step2.intentMatch ?? false,
    variants: step2.variants ?? false,
  };
  
  // Calculate Market Score with structure
  const breakdown = calculateMarketScore(marketData, step1.marketplaceId, marketStructure);
  const marketScore = breakdown.total;
  
  // Build EditorialData if step3 provided (4 editorial checks - NOT affecting score)
  let editorialData: EditorialData | undefined;
  let editorialScore: number | undefined;
  
  if (step3) {
    const checks = step3.editorialChecks || {};
    editorialData = {
      checklist: {
        canCreate: checks.canProduce ?? null,
        canDoBetter: checks.canDoBetter ?? null,
        canDifferentiate: checks.canDifferentiate ?? null,
        fitsStrategy: checks.hasInterest ?? null,
      },
      notes: step3.notes,
    };
    // Calculate editorial score from 4 checks only
    const editorialCheckKeys = ['canProduce', 'canDoBetter', 'canDifferentiate', 'hasInterest'];
    editorialScore = editorialCheckKeys.filter(k => checks[k]).length;
  }
  
  // Determine status based on market score
  const status = getAutoStatusFromScore(marketScore);
  const state: KeywordState = isMarketDataComplete(step2) ? 'pending' : 'pending';
  
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
    marketStructure,
    
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
    understandable: false,
    amazonSuggested: false,
    profitableBooks: false,
    indieAuthors: false,
    intentMatch: false,
    variants: false,
  };
}

/**
 * Get default values for Step 3 (editorial)
 */
export function getDefaultStep3Data(): WizardStep3Data {
  return {
    editorialChecks: {},
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
