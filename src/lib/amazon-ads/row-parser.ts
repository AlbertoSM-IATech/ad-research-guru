// ============================================================
// Row parser — extract entities + metrics from mapped rows
// ============================================================

import { normalizeNumber, normalizeDate } from './normalizers';
import { calculateDerivedMetrics } from './metrics-calculator';
import type { ColumnMapping, ParsedRow, AdsDailyMetrics, AdsEntityType, AdType } from '@/types/amazon-ads';

/**
 * Simple hash for deduplication.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // to 32-bit
  }
  return Math.abs(hash).toString(36);
}

/**
 * Build a stable entity key from available fields.
 */
function buildEntityKey(parts: (string | undefined)[]): string {
  const joined = parts.filter(Boolean).join('|').toLowerCase().trim();
  return joined || 'unknown';
}

/**
 * Determine entity type from a parsed row.
 */
function detectEntityType(row: ParsedRow): AdsEntityType {
  if (row.searchTerm) return 'searchTerm';
  if (row.asin) return 'asin';
  if (row.targetText) return 'target';
  if (row.adGroupName || row.adGroupId) return 'adgroup';
  return 'campaign';
}

/**
 * Parse a single raw row using the column mappings.
 */
export function parseRow(
  rawRow: Record<string, unknown>,
  mappings: ColumnMapping[],
): ParsedRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Build a lookup: internalField → raw value
  const mapped: Record<string, unknown> = {};
  for (const m of mappings) {
    mapped[m.internalField] = rawRow[m.fileColumn];
  }

  // Extract string fields
  const campaignName = mapped.campaignName ? String(mapped.campaignName).trim() : undefined;
  const campaignId = mapped.campaignId ? String(mapped.campaignId).trim() : undefined;
  const adGroupName = mapped.adGroupName ? String(mapped.adGroupName).trim() : undefined;
  const adGroupId = mapped.adGroupId ? String(mapped.adGroupId).trim() : undefined;
  const targetText = mapped.targetText ? String(mapped.targetText).trim() : undefined;
  const targetId = mapped.targetId ? String(mapped.targetId).trim() : undefined;
  const matchType = mapped.matchType ? String(mapped.matchType).trim() : undefined;
  const searchTerm = mapped.searchTerm ? String(mapped.searchTerm).trim() : undefined;
  const asin = mapped.asin ? String(mapped.asin).trim() : undefined;

  // Date
  const date = normalizeDate(mapped.date) ?? undefined;

  // Metrics
  const impressions = normalizeNumber(mapped.impressions);
  const clicks = normalizeNumber(mapped.clicks);
  const spend = normalizeNumber(mapped.spend);
  const sales = normalizeNumber(mapped.sales);
  const orders = normalizeNumber(mapped.orders);
  const units = normalizeNumber(mapped.units);

  // Validation
  if (impressions === 0 && clicks === 0 && spend === 0) {
    warnings.push('Fila sin métricas (impressions/clicks/spend = 0)');
  }
  if (!campaignName && !campaignId) {
    warnings.push('Sin nombre ni ID de campaña');
  }

  // Hash for dedup
  const hashInput = [
    date ?? 'nodate',
    campaignId ?? campaignName ?? '',
    adGroupId ?? adGroupName ?? '',
    targetId ?? targetText ?? searchTerm ?? asin ?? '',
    impressions, clicks, spend, sales, orders,
  ].join('|');
  const rowHash = simpleHash(hashInput);

  return {
    date,
    campaignName,
    campaignId,
    adGroupName,
    adGroupId,
    targetText,
    targetId,
    matchType,
    searchTerm,
    asin,
    impressions,
    clicks,
    spend,
    sales,
    orders,
    units,
    rowHash,
    errors,
    warnings,
  };
}

/**
 * Convert a parsed row to a daily metrics fact record.
 */
export function parsedRowToMetrics(
  row: ParsedRow,
  marketplace: string,
  adType: AdType,
  currency: string,
  batchId: string,
): AdsDailyMetrics {
  const entityType = detectEntityType(row);
  const derived = calculateDerivedMetrics(row.impressions, row.clicks, row.spend, row.sales, row.orders);

  let entityKey: string;
  switch (entityType) {
    case 'searchTerm':
      entityKey = buildEntityKey([row.campaignId ?? row.campaignName, row.adGroupId ?? row.adGroupName, row.searchTerm]);
      break;
    case 'asin':
      entityKey = buildEntityKey([row.campaignId ?? row.campaignName, row.asin]);
      break;
    case 'target':
      entityKey = buildEntityKey([row.campaignId ?? row.campaignName, row.adGroupId ?? row.adGroupName, row.targetId ?? row.targetText]);
      break;
    case 'adgroup':
      entityKey = buildEntityKey([row.campaignId ?? row.campaignName, row.adGroupId ?? row.adGroupName]);
      break;
    default:
      entityKey = buildEntityKey([row.campaignId ?? row.campaignName]);
  }

  return {
    date: row.date ?? 'unknown',
    entityType,
    entityKey,
    marketplace,
    adType,
    currency,
    batchId,
    impressions: row.impressions,
    clicks: row.clicks,
    spend: row.spend,
    sales: row.sales,
    orders: row.orders,
    units: row.units,
    ctr: derived.ctr,
    cpc: derived.cpc,
    cvr: derived.cvr,
    acos: derived.acos,
    roas: derived.roas,
    rowHash: row.rowHash,
  };
}

/**
 * Parse multiple rows and return parsed results.
 */
export function parseAllRows(
  rawRows: Record<string, unknown>[],
  mappings: ColumnMapping[],
): ParsedRow[] {
  return rawRows.map(row => parseRow(row, mappings));
}
