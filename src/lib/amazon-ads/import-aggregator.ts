// ============================================================
// Import Aggregator — bridge between raw import and keyword.adsData
// ============================================================

import type { ParsedRow, ImportAgg, ReportType, AmazonAdsImportResult } from '@/types/amazon-ads';
import type { Keyword, AdsData } from '@/types/advertising';
import { normalizeText } from '@/types/advertising';

/**
 * Detect report type from parsed rows based on available fields.
 */
function detectReportType(rows: ParsedRow[]): ReportType {
  const sample = rows.slice(0, 50);
  const hasSearchTerm = sample.some(r => !!r.searchTerm);
  const hasTarget = sample.some(r => !!r.targetText);
  const hasCampaign = sample.some(r => !!r.campaignName || !!r.campaignId);

  if (hasSearchTerm) return 'search_terms';
  if (hasTarget) return 'targeting';
  if (hasCampaign) return 'campaign';
  return 'unknown';
}

/**
 * Get the text identifier from a parsed row based on report type.
 */
function getRowText(row: ParsedRow, reportType: ReportType): string | null {
  switch (reportType) {
    case 'targeting':
      return row.targetText ?? row.searchTerm ?? null;
    case 'search_terms':
      return row.searchTerm ?? row.targetText ?? null;
    case 'campaign':
      return row.campaignName ?? null;
    default:
      return row.targetText ?? row.searchTerm ?? row.campaignName ?? null;
  }
}

/**
 * Aggregate parsed rows by normalized text key.
 * Groups all metrics for the same keyword/target.
 */
export function aggregateByTarget(rows: ParsedRow[]): ImportAgg[] {
  const reportType = detectReportType(rows);
  const map = new Map<string, ImportAgg>();

  for (const row of rows) {
    if (row.errors.length > 0) continue;

    const rawText = getRowText(row, reportType);
    if (!rawText) continue;

    const normalized = normalizeText(rawText);
    if (!normalized) continue;

    const existing = map.get(normalized);
    if (existing) {
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      existing.spend += row.spend;
      existing.orders += row.orders;
      existing.sales += row.sales;
      existing.units += row.units;
      if (!existing.originalTexts.includes(rawText)) {
        existing.originalTexts.push(rawText);
      }
      if (row.campaignName && !existing.campaignNames.includes(row.campaignName)) {
        existing.campaignNames.push(row.campaignName);
      }
      if (row.adGroupName && !existing.adGroupNames.includes(row.adGroupName)) {
        existing.adGroupNames.push(row.adGroupName);
      }
      if (row.matchType && !existing.matchTypes.includes(row.matchType)) {
        existing.matchTypes.push(row.matchType);
      }
    } else {
      map.set(normalized, {
        normalizedText: normalized,
        originalTexts: [rawText],
        impressions: row.impressions,
        clicks: row.clicks,
        spend: row.spend,
        orders: row.orders,
        sales: row.sales,
        units: row.units,
        campaignNames: row.campaignName ? [row.campaignName] : [],
        adGroupNames: row.adGroupName ? [row.adGroupName] : [],
        matchTypes: row.matchType ? [row.matchType] : [],
        sourceReportType: reportType,
      });
    }
  }

  return Array.from(map.values());
}

/**
 * Word overlap similarity score (0–1).
 */
function wordOverlapScore(a: string, b: string): number {
  const wordsA = new Set(a.split(' ').filter(w => w.length > 1));
  const wordsB = new Set(b.split(' ').filter(w => w.length > 1));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  return overlap / Math.max(wordsA.size, wordsB.size);
}

export interface MatchResult {
  matched: Array<{ keywordId: string; normalizedText: string; agg: ImportAgg }>;
  unmatched: ImportAgg[];
}

/**
 * Match aggregated imports to existing keywords by normalized text.
 */
export function matchAggregatesToKeywords(
  aggregates: ImportAgg[],
  keywords: Keyword[],
): MatchResult {
  // Build normalized keyword map
  const kwMap = new Map<string, string>(); // normalizedText -> keywordId
  for (const kw of keywords) {
    const norm = normalizeText(kw.keyword);
    if (norm) kwMap.set(norm, kw.id);
  }

  const matched: MatchResult['matched'] = [];
  const unmatched: ImportAgg[] = [];

  for (const agg of aggregates) {
    const kwId = kwMap.get(agg.normalizedText);
    if (kwId) {
      matched.push({ keywordId: kwId, normalizedText: agg.normalizedText, agg });
    } else {
      unmatched.push(agg);
    }
  }

  return { matched, unmatched };
}

/**
 * Auto-suggest matches for unmatched aggregates using word overlap.
 */
export function suggestMatches(
  unmatched: ImportAgg[],
  keywords: Keyword[],
  threshold = 0.4,
): Array<{ agg: ImportAgg; suggestions: Array<{ keywordId: string; keyword: string; score: number }> }> {
  const result: Array<{ agg: ImportAgg; suggestions: Array<{ keywordId: string; keyword: string; score: number }> }> = [];

  for (const agg of unmatched) {
    const suggestions: Array<{ keywordId: string; keyword: string; score: number }> = [];
    for (const kw of keywords) {
      const norm = normalizeText(kw.keyword);
      const score = wordOverlapScore(agg.normalizedText, norm);
      if (score >= threshold) {
        suggestions.push({ keywordId: kw.id, keyword: kw.keyword, score });
      }
    }
    suggestions.sort((a, b) => b.score - a.score);
    result.push({ agg, suggestions: suggestions.slice(0, 5) });
  }

  return result;
}

/**
 * Build AdsData update from an ImportAgg for a keyword.
 * Respects existing cpcActual — does NOT overwrite if present.
 */
export function buildAdsDataUpdate(
  agg: ImportAgg,
  existingAdsData?: AdsData,
  mode: 'replace' | 'accumulate' = 'replace',
): AdsData {
  const impressions = mode === 'accumulate'
    ? (existingAdsData?.impresiones ?? 0) + agg.impressions
    : agg.impressions;
  const clicks = mode === 'accumulate'
    ? (existingAdsData?.clicks ?? 0) + agg.clicks
    : agg.clicks;
  const spend = mode === 'accumulate'
    ? (existingAdsData?.gasto ?? 0) + agg.spend
    : agg.spend;
  const orders = mode === 'accumulate'
    ? (existingAdsData?.pedidos ?? 0) + agg.orders
    : agg.orders;
  const sales = mode === 'accumulate'
    ? (existingAdsData?.ventas ?? 0) + agg.sales
    : agg.sales;

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const campaignName = agg.campaignNames.length === 1
    ? agg.campaignNames[0]
    : agg.campaignNames.length > 1
      ? 'Varias campañas'
      : existingAdsData?.campaignName;

  // Preserve existing cpcActual if set
  const cpcActual = existingAdsData?.cpcActual && existingAdsData.cpcActual > 0
    ? existingAdsData.cpcActual
    : (clicks > 0 ? spend / clicks : null);

  return {
    ...existingAdsData, // preserve history and other fields
    impresiones: impressions,
    clicks,
    gasto: spend,
    pedidos: orders,
    ventas: sales,
    ctr,
    cpcActual: cpcActual ?? undefined,
    campaignName: campaignName ?? undefined,
  };
}
