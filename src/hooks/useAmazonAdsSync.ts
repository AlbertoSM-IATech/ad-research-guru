// ============================================================
// Hook: Sync Amazon Ads imported data with keywords
// ============================================================

import { useMemo, useCallback } from 'react';
import type { Keyword } from '@/types/advertising';
import type {
  AmazonAdsStore,
  AdsEntityTarget,
  AdsEntityCampaign,
  AdsDailyMetrics,
  ImportedAdsMetrics,
  MatchSuggestion,
  MatchConfidence,
} from '@/types/amazon-ads';
import { aggregateMetrics } from '@/lib/amazon-ads/metrics-calculator';

// ---- Text normalization for matching ----
function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---- Auto-match keywords to targets ----
function findMatches(
  keywords: Keyword[],
  targets: AdsEntityTarget[],
  campaigns: AdsEntityCampaign[],
): MatchSuggestion[] {
  const suggestions: MatchSuggestion[] = [];
  const campaignMap = new Map(campaigns.map(c => [c.key, c]));

  for (const kw of keywords) {
    // Skip already linked
    if (kw.amazonAdsTargetKeys && kw.amazonAdsTargetKeys.length > 0) continue;

    const normalizedKw = normalizeForMatch(kw.keyword);
    if (!normalizedKw) continue;

    for (const target of targets) {
      const normalizedTarget = normalizeForMatch(target.targetText);
      if (!normalizedTarget) continue;

      let confidence: MatchConfidence | null = null;

      if (normalizedKw === normalizedTarget) {
        confidence = 'exact';
      } else if (
        normalizedTarget.includes(normalizedKw) ||
        normalizedKw.includes(normalizedTarget)
      ) {
        confidence = 'partial';
      }

      if (confidence) {
        const campaign = campaignMap.get(target.campaignKey);
        suggestions.push({
          keywordId: kw.id,
          targetKey: target.key,
          targetText: target.targetText,
          campaignName: campaign?.campaignName ?? '—',
          confidence,
        });
      }
    }
  }

  // Sort: exact first, then partial
  suggestions.sort((a, b) => {
    if (a.confidence === 'exact' && b.confidence !== 'exact') return -1;
    if (a.confidence !== 'exact' && b.confidence === 'exact') return 1;
    return 0;
  });

  return suggestions;
}

// ---- Aggregate metrics for a set of target keys ----
function aggregateForTargetKeys(
  targetKeys: string[],
  dailyMetrics: AdsDailyMetrics[],
): ImportedAdsMetrics | null {
  if (targetKeys.length === 0) return null;

  const keySet = new Set(targetKeys);
  const matching = dailyMetrics.filter(m => keySet.has(m.entityKey));
  if (matching.length === 0) return null;

  const agg = aggregateMetrics(matching);

  // Date range
  const dates = matching.map(m => m.date).sort();
  const from = dates[0];
  const to = dates[dates.length - 1];

  return {
    impressions: agg.impressions,
    clicks: agg.clicks,
    spend: agg.spend,
    sales: agg.sales,
    orders: agg.orders,
    units: agg.units,
    ctr: agg.ctr,
    cpc: agg.cpc,
    cvr: agg.cvr,
    acos: agg.acos,
    roas: agg.roas,
    dateRange: { from, to },
    targetKeys,
    lastSyncAt: new Date().toISOString(),
  };
}

export interface UseAmazonAdsSyncResult {
  /** Auto-match suggestions for unlinked keywords */
  matchSuggestions: MatchSuggestion[];
  /** Aggregated metrics for linked keywords (keywordId -> metrics) */
  aggregatedMetrics: Map<string, ImportedAdsMetrics>;
  /** Count of keywords with available matches */
  matchableCount: number;
  /** Count of linked keywords */
  linkedCount: number;
  /** All available targets for manual linking */
  availableTargets: Array<{
    key: string;
    text: string;
    campaignName: string;
    campaignKey: string;
  }>;
}

export function useAmazonAdsSync(
  keywords: Keyword[],
  store: AmazonAdsStore,
): UseAmazonAdsSyncResult {
  // Auto-match suggestions
  const matchSuggestions = useMemo(
    () => findMatches(keywords, store.targets, store.campaigns),
    [keywords, store.targets, store.campaigns],
  );

  // Aggregated metrics for linked keywords
  const aggregatedMetrics = useMemo(() => {
    const map = new Map<string, ImportedAdsMetrics>();
    for (const kw of keywords) {
      if (!kw.amazonAdsTargetKeys || kw.amazonAdsTargetKeys.length === 0) continue;
      const agg = aggregateForTargetKeys(kw.amazonAdsTargetKeys, store.dailyMetrics);
      if (agg) map.set(kw.id, agg);
    }
    return map;
  }, [keywords, store.dailyMetrics]);

  // Counts
  const matchableCount = useMemo(() => {
    const kwIds = new Set(matchSuggestions.map(s => s.keywordId));
    return kwIds.size;
  }, [matchSuggestions]);

  const linkedCount = useMemo(
    () => keywords.filter(k => k.amazonAdsTargetKeys && k.amazonAdsTargetKeys.length > 0).length,
    [keywords],
  );

  // Available targets for manual linking
  const availableTargets = useMemo(() => {
    const campaignMap = new Map(store.campaigns.map(c => [c.key, c]));
    return store.targets.map(t => ({
      key: t.key,
      text: t.targetText,
      campaignName: campaignMap.get(t.campaignKey)?.campaignName ?? '—',
      campaignKey: t.campaignKey,
    }));
  }, [store.targets, store.campaigns]);

  return {
    matchSuggestions,
    aggregatedMetrics,
    matchableCount,
    linkedCount,
    availableTargets,
  };
}
