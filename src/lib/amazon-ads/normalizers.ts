// ============================================================
// Data normalisers for Amazon Ads import
// ============================================================

/**
 * Remove currency symbols and whitespace from a string.
 */
function stripCurrency(raw: string): string {
  return raw.replace(/[$€£¥₹\s]/g, '').trim();
}

/**
 * Detect decimal separator by sampling:
 * - If the string has a comma as last separator → ES format (1.234,56)
 * - If the string has a dot as last separator → EN format (1,234.56)
 */
function detectDecimalSeparator(raw: string): ',' | '.' {
  const cleaned = stripCurrency(raw);
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  if (lastComma > lastDot) return ',';
  return '.';
}

/**
 * Normalise a numeric string to a JS float.
 * Handles both "1.234,56" (ES) and "1,234.56" (EN) formats.
 * Returns 0 for empty/invalid values, or NaN if truly unparseable.
 */
export function normalizeNumber(raw: unknown): number {
  if (raw === null || raw === undefined || raw === '') return 0;
  if (typeof raw === 'number') return raw;
  const str = String(raw).trim();
  if (str === '' || str === '-' || str === '--') return 0;

  // Remove percentage sign
  const cleaned = stripCurrency(str).replace(/%/g, '');
  if (cleaned === '') return 0;

  const sep = detectDecimalSeparator(cleaned);
  let normalized: string;
  if (sep === ',') {
    // ES format: dots are thousands, comma is decimal
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // EN format: commas are thousands, dot is decimal
    normalized = cleaned.replace(/,/g, '');
  }

  const result = parseFloat(normalized);
  return isNaN(result) ? 0 : result;
}

/**
 * Infer the decimal format from a sample of values.
 * Useful for batch pre-analysis.
 */
export function inferDecimalFormat(samples: unknown[]): ',' | '.' {
  let commaCount = 0;
  let dotCount = 0;
  for (const s of samples) {
    if (s === null || s === undefined) continue;
    const str = String(s);
    if (str.includes(',')) commaCount++;
    if (str.includes('.')) dotCount++;
  }
  return commaCount > dotCount ? ',' : '.';
}

// === Date normalisation ===

const ISO_RE = /^\d{4}-\d{2}-\d{2}/;
const EU_RE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;

/**
 * Normalise a date to YYYY-MM-DD.
 * Accepts: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
 * Returns null if unparseable.
 */
export function normalizeDate(raw: unknown): string | null {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;

  // Already ISO
  if (ISO_RE.test(str)) {
    return str.slice(0, 10);
  }

  // EU format
  const match = str.match(EU_RE);
  if (match) {
    const [, day, month, year] = match;
    const d = day.padStart(2, '0');
    const m = month.padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  // Try JS Date as last resort
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return null;
}
