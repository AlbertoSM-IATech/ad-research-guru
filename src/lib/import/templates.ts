/**
 * Import templates for different keyword research tools.
 * Each template defines header aliases and field mappings.
 */

export type ImportSource = 'helium10' | 'bookbeam' | 'publisher-rocket' | 'custom';

export interface ImportTemplate {
  id: ImportSource;
  name: string;
  description: string;
  /** Maps internal field names to possible header names from the tool */
  headerAliases: Record<string, string[]>;
}

/**
 * Internal fields that can be imported
 */
export const IMPORTABLE_FIELDS = [
  { key: 'keyword', label: 'Keyword', required: true },
  { key: 'searchVolume', label: 'Volumen de Búsqueda', required: false },
  { key: 'competitors', label: 'Competidores (resultados)', required: false },
  { key: 'titleDensity', label: 'Title Density', required: false },
  { key: 'cpc', label: 'CPC Sugerido', required: false },
  { key: 'notes', label: 'Notas', required: false },
] as const;

export type ImportableFieldKey = typeof IMPORTABLE_FIELDS[number]['key'];

/**
 * Helium 10 (Cerebro / Magnet exports)
 */
const HELIUM10_TEMPLATE: ImportTemplate = {
  id: 'helium10',
  name: 'Helium 10',
  description: 'Cerebro o Magnet CSV export',
  headerAliases: {
    keyword: [
      'Keyword Phrase',
      'Keyword',
      'Search Term',
      'Phrase',
    ],
    searchVolume: [
      'Search Volume',
      'Search Volume Exact',
      'Exact Search Volume',
      'Monthly Search Volume',
      'Searches',
    ],
    competitors: [
      'Competing Products',
      'Competing ASINs',
      'Competition',
      'Results',
      'Amazon Results',
      'Number of Competitors',
    ],
    titleDensity: [
      'Title Density',
      'Title Match',
    ],
    cpc: [
      'Sponsored Bid',
      'Suggested Bid',
      'CPC',
      'PPC Bid',
    ],
  },
};

/**
 * BookBeam
 */
const BOOKBEAM_TEMPLATE: ImportTemplate = {
  id: 'bookbeam',
  name: 'BookBeam',
  description: 'BookBeam keyword research export',
  headerAliases: {
    keyword: [
      'Keyword',
      'Search Term',
      'Term',
    ],
    searchVolume: [
      'Search Volume',
      'Volume',
      'Monthly Searches',
    ],
    competitors: [
      'Results',
      'Competitors',
      'Competition',
      'Books',
      'Kindle Results',
    ],
    titleDensity: [
      'Title Density',
    ],
    cpc: [
      'CPC',
      'Suggested Bid',
    ],
  },
};

/**
 * Publisher Rocket
 */
const PUBLISHER_ROCKET_TEMPLATE: ImportTemplate = {
  id: 'publisher-rocket',
  name: 'Publisher Rocket',
  description: 'Publisher Rocket / KDSPY export',
  headerAliases: {
    keyword: [
      'Keyword Phrase',
      'Keyword',
      'Search Term',
      'Phrase',
    ],
    searchVolume: [
      'Est. Amazon Searches',
      'Amazon Searches',
      'Search Volume',
      'Searches',
    ],
    competitors: [
      'Competing Books',
      'Competition Score',
      'Results',
      'Books Found',
      'Competitors',
    ],
    titleDensity: [
      'Title Density',
    ],
    cpc: [
      'Suggested CPC',
      'CPC',
    ],
  },
};

/**
 * Custom template (fallback with common variations)
 */
const CUSTOM_TEMPLATE: ImportTemplate = {
  id: 'custom',
  name: 'Personalizado',
  description: 'Mapeo manual de columnas',
  headerAliases: {
    keyword: [
      'keyword', 'Keyword', 'KEYWORD',
      'palabra clave', 'Palabra Clave',
      'search term', 'Search Term',
      'phrase', 'Phrase',
      'term', 'Term',
    ],
    searchVolume: [
      'volume', 'Volume', 'VOLUME',
      'search volume', 'Search Volume',
      'volumen', 'Volumen',
      'búsquedas', 'Búsquedas',
      'searches', 'Searches',
    ],
    competitors: [
      'competitors', 'Competitors', 'COMPETITORS',
      'competition', 'Competition',
      'competidores', 'Competidores',
      'results', 'Results',
      'resultados', 'Resultados',
      'competing products', 'Competing Products',
    ],
    notes: [
      'notes', 'Notes', 'NOTES',
      'notas', 'Notas',
      'comments', 'Comments',
      'comentarios', 'Comentarios',
    ],
  },
};

/**
 * All available templates
 */
export const IMPORT_TEMPLATES: Record<ImportSource, ImportTemplate> = {
  'helium10': HELIUM10_TEMPLATE,
  'bookbeam': BOOKBEAM_TEMPLATE,
  'publisher-rocket': PUBLISHER_ROCKET_TEMPLATE,
  'custom': CUSTOM_TEMPLATE,
};

/**
 * Detect which template best matches the given headers
 */
export function detectTemplate(headers: string[]): ImportSource {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Check for Helium 10 specific headers
  if (normalizedHeaders.some(h => 
    h.includes('cerebro') || 
    h.includes('magnet') ||
    h === 'competing products' ||
    h === 'sponsored bid'
  )) {
    return 'helium10';
  }
  
  // Check for Publisher Rocket specific headers
  if (normalizedHeaders.some(h => 
    h.includes('est. amazon searches') ||
    h.includes('amazon searches') ||
    h === 'competing books'
  )) {
    return 'publisher-rocket';
  }
  
  // Check for BookBeam specific patterns
  if (normalizedHeaders.some(h => 
    h === 'kindle results' ||
    h === 'books'
  )) {
    return 'bookbeam';
  }
  
  // Default to custom
  return 'custom';
}

/**
 * Auto-map headers to internal fields based on template
 */
export function autoMapHeaders(
  headers: string[],
  templateId: ImportSource
): Record<string, ImportableFieldKey | 'ignore'> {
  const template = IMPORT_TEMPLATES[templateId];
  const mappings: Record<string, ImportableFieldKey | 'ignore'> = {};
  
  headers.forEach(header => {
    const normalizedHeader = header.toLowerCase().trim();
    let matched = false;
    
    // Check each field's aliases
    for (const [fieldKey, aliases] of Object.entries(template.headerAliases)) {
      if (aliases.some(alias => alias.toLowerCase() === normalizedHeader)) {
        mappings[header] = fieldKey as ImportableFieldKey;
        matched = true;
        break;
      }
    }
    
    // If no match, try partial matching
    if (!matched) {
      for (const [fieldKey, aliases] of Object.entries(template.headerAliases)) {
        if (aliases.some(alias => 
          normalizedHeader.includes(alias.toLowerCase()) ||
          alias.toLowerCase().includes(normalizedHeader)
        )) {
          mappings[header] = fieldKey as ImportableFieldKey;
          matched = true;
          break;
        }
      }
    }
    
    // Default to ignore
    if (!matched) {
      mappings[header] = 'ignore';
    }
  });
  
  return mappings;
}

/**
 * Parse a numeric value from a string, handling various formats
 */
export function parseNumericValue(value: string): number {
  if (!value) return 0;
  
  // Remove commas, spaces, currency symbols, percentage signs
  const cleaned = value
    .replace(/[,\s$€£%]/g, '')
    .replace(/[^\d.-]/g, '');
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Derive competition level from numeric competitors count
 */
export function deriveCompetitionLevel(competitors: number): 'low' | 'medium' | 'high' {
  if (competitors < 1000) return 'low';
  if (competitors <= 10000) return 'medium';
  return 'high';
}
