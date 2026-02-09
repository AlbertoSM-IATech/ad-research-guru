// ============================================================
// Sheet detection for multi-tab Excel files
// ============================================================

import * as XLSX from 'xlsx';
import { autoMapColumns, computeMappingConfidence } from './column-mapper';
import type { SheetInfo } from '@/types/amazon-ads';

/**
 * Analyse an Excel workbook and return info about each sheet,
 * including header detection and mapping confidence.
 */
export function detectSheets(workbook: XLSX.WorkBook): SheetInfo[] {
  const results: SheetInfo[] = [];

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;

    const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
    if (!data || data.length === 0) {
      results.push({ name, rowCount: 0, headers: [], confidence: 'low', mappings: [] });
      continue;
    }

    // First row = headers
    const headerRow = data[0] as unknown[];
    const headers = headerRow.map(h => String(h ?? '').trim()).filter(Boolean);
    const rowCount = Math.max(0, data.length - 1); // exclude header row

    const mappings = autoMapColumns(headers);
    const confidence = computeMappingConfidence(mappings);

    results.push({ name, rowCount, headers, confidence, mappings });
  }

  // Sort by confidence (high first), then by row count
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  results.sort((a, b) => {
    const diff = order[a.confidence] - order[b.confidence];
    if (diff !== 0) return diff;
    return b.rowCount - a.rowCount;
  });

  return results;
}

/**
 * Read rows from a specific sheet.
 */
export function readSheetRows(
  workbook: XLSX.WorkBook,
  sheetName: string,
  maxRows?: number,
): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return maxRows ? json.slice(0, maxRows) : json;
}
