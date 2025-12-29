// Helper to create complete Keyword objects with defaults for new fields
import type { Keyword, CompetitionLevel, CampaignType, RelevanceLevel, IntentType, KeywordState } from '@/types/advertising';
import { getDefaultMarketData, getMarketScoreTotal } from './market-score';

export interface PartialKeywordInput {
  keyword: string;
  marketplaceId: string;
  searchVolume?: number;
  competitors?: number;
  price?: number;
  royalties?: number;
  competitionLevel?: CompetitionLevel;
  campaignTypes?: CampaignType[];
  notes?: string;
  relevance?: RelevanceLevel;
  intent?: IntentType;
  state?: KeywordState;
  history?: any[];
}

export function createKeywordDefaults(input: PartialKeywordInput): Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'> {
  const defaults = getDefaultMarketData();
  
  const searchVolume = input.searchVolume ?? 0;
  const competitors = input.competitors ?? 0;
  const price = input.price ?? defaults.price;
  const royalties = input.royalties ?? defaults.royalties;
  
  const marketScore = getMarketScoreTotal({
    searchVolume,
    competitors,
    price,
    royalties,
    trafficSource: defaults.trafficSource,
  });

  return {
    keyword: input.keyword,
    marketplaceId: input.marketplaceId,
    searchVolume,
    competitors,
    price,
    royalties,
    marketScore,
    competitionLevel: input.competitionLevel ?? 'medium',
    campaignTypes: input.campaignTypes ?? ['SP'],
    notes: input.notes ?? '',
    relevance: input.relevance,
    intent: input.intent,
    state: input.state ?? 'pending',
    status: 'pending',
    purpose: 'both',
    history: input.history ?? [],
  };
}
