// ============================================================
// Auto-map file columns to internal fields
// ============================================================

import { COLUMN_ALIASES, normalizeHeader, type AliasEntry } from './column-aliases';
import type { ColumnMapping, ConfidenceLevel } from '@/types/amazon-ads';

/**
 * Try to map a list of file headers to internal fields.
 * Returns an array of mappings with confidence levels.
 */
export function autoMapColumns(fileHeaders: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];
  const usedFileColumns = new Set<string>();
  const usedInternalFields = new Set<string>();

  // Pass 1: exact match
  for (const alias of COLUMN_ALIASES) {
    for (const header of fileHeaders) {
      if (usedFileColumns.has(header) || usedInternalFields.has(alias.internalField)) continue;
      const norm = normalizeHeader(header);
      if (alias.aliases.includes(norm)) {
        mappings.push({
          fileColumn: header,
          internalField: alias.internalField,
          confidence: 'high',
          isRequired: alias.isRequired,
        });
        usedFileColumns.add(header);
        usedInternalFields.add(alias.internalField);
        break;
      }
    }
  }

  // Pass 2: partial/fuzzy match for remaining
  for (const alias of COLUMN_ALIASES) {
    if (usedInternalFields.has(alias.internalField)) continue;
    for (const header of fileHeaders) {
      if (usedFileColumns.has(header)) continue;
      const norm = normalizeHeader(header);
      const found = alias.aliases.some(a => norm.includes(a) || a.includes(norm));
      if (found) {
        mappings.push({
          fileColumn: header,
          internalField: alias.internalField,
          confidence: 'medium',
          isRequired: alias.isRequired,
        });
        usedFileColumns.add(header);
        usedInternalFields.add(alias.internalField);
        break;
      }
    }
  }

  return mappings;
}

/**
 * Compute overall mapping confidence based on individual mappings.
 */
export function computeMappingConfidence(mappings: ColumnMapping[]): ConfidenceLevel {
  const requiredFields = COLUMN_ALIASES.filter(a => a.isRequired).map(a => a.internalField);
  const mappedRequired = mappings.filter(m => requiredFields.includes(m.internalField));

  if (mappedRequired.length < requiredFields.length) return 'low';

  const allHigh = mappings.every(m => m.confidence === 'high');
  if (allHigh && mappings.length >= 5) return 'high';

  return 'medium';
}

/**
 * Get missing required fields.
 */
export function getMissingRequired(mappings: ColumnMapping[]): AliasEntry[] {
  const mapped = new Set(mappings.map(m => m.internalField));
  return COLUMN_ALIASES.filter(a => a.isRequired && !mapped.has(a.internalField));
}
