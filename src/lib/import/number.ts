/**
 * Flexible number parsing for Amazon Ads imports.
 * Handles EU/US decimal separators, currency symbols, percentages, etc.
 * IMPORTANT: This does NOT replace parseNumericValue in templates.ts (keyword import).
 */

/**
 * Parse a flexible number from a string, handling:
 * - Currency symbols (€, $, £)
 * - Percentage signs
 * - EU comma decimals (e.g., "0,0152")
 * - US dot decimals (e.g., "0.0152")
 * - Mixed thousands/decimal separators (e.g., "1.234,56" or "1,234.56")
 */
export function parseNumberFlexible(input: string): number | null {
  if (!input || typeof input !== 'string') return null;

  // Clean whitespace and currency/percentage symbols
  let cleaned = input.trim().replace(/[\s€$£%]/g, '');

  if (cleaned === '' || cleaned === '-' || cleaned === '—') return null;

  // Handle negative
  const isNegative = cleaned.startsWith('-');
  if (isNegative) cleaned = cleaned.substring(1);

  const hasDot = cleaned.includes('.');
  const hasComma = cleaned.includes(',');

  if (hasDot && hasComma) {
    // Both present: the LAST separator is the decimal
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');

    if (lastComma > lastDot) {
      // Comma is decimal: "1.234,56"
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Dot is decimal: "1,234.56"
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // Only comma present
    const parts = cleaned.split(',');
    // Heuristic: if pattern is like "1,234" (exactly 3 digits after comma, >= 1 digit before), treat comma as thousands
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length >= 1) {
      cleaned = cleaned.replace(',', '');
    } else {
      // Treat comma as decimal: "0,0152" -> "0.0152"
      cleaned = cleaned.replace(',', '.');
    }
  }
  // If only dot, it's already standard format

  // Remove any remaining non-numeric chars except dot
  cleaned = cleaned.replace(/[^\d.]/g, '');

  const result = parseFloat(cleaned);
  if (isNaN(result)) return null;

  return isNegative ? -result : result;
}

/**
 * Parse a flexible integer (rounds the result of parseNumberFlexible)
 */
export function parseIntegerFlexible(input: string): number | null {
  const num = parseNumberFlexible(input);
  if (num === null) return null;
  return Math.round(num);
}
