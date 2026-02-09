// ============================================================
// Column alias dictionary for Amazon Ads files (EN / ES / IT)
// ============================================================

export interface AliasEntry {
  internalField: string;
  aliases: string[];
  isRequired: boolean;
}

/**
 * Normalise a header string for fuzzy matching:
 * lowercase, trim, collapse whitespace, remove special chars (keep accented letters).
 */
export function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .replace(/\(.*?\)/g, '') // remove parenthetical (e.g. "Spesa(USD)")
    .replace(/[^a-záéíóúñüàèìòùâêîôû0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const COLUMN_ALIASES: AliasEntry[] = [
  // Date
  {
    internalField: 'date',
    aliases: [
      'date', 'day', 'report date', 'start date',
      'fecha', 'dia', 'fecha inicio',
      'data', 'giorno',
    ],
    isRequired: false,
  },
  // Campaign
  {
    internalField: 'campaignName',
    aliases: [
      'campaign name', 'campaign', 'nombre de campana', 'nombre de campaña', 'campana', 'campaña',
      'campagne', 'nome campagna', 'nome della campagna',
    ],
    isRequired: false,
  },
  {
    internalField: 'campaignId',
    aliases: [
      'campaign id', 'id de campana', 'id de campaña', 'campaign entity id',
      'id campagna',
    ],
    isRequired: false,
  },
  // Ad Group
  {
    internalField: 'adGroupName',
    aliases: [
      'ad group name', 'ad group',
      'nombre del grupo de anuncios', 'grupo de anuncios',
      'gruppo di annunci', 'nome gruppo di annunci',
    ],
    isRequired: false,
  },
  {
    internalField: 'adGroupId',
    aliases: [
      'ad group id',
      'id del grupo de anuncios',
      'id gruppo di annunci',
    ],
    isRequired: false,
  },
  // Targeting / Keyword
  {
    internalField: 'targetText',
    aliases: [
      'targeting', 'keyword', 'keyword text', 'target', 'targeting expression',
      'keyword or product targeting',
      'palabra clave', 'segmentacion', 'objetivo',
      'parola chiave', 'targeting', 'bersaglio',
    ],
    isRequired: false,
  },
  {
    internalField: 'targetId',
    aliases: [
      'keyword id', 'target id', 'targeting id',
      'id parola chiave',
    ],
    isRequired: false,
  },
  {
    internalField: 'matchType',
    aliases: [
      'match type',
      'tipo de concordancia', 'concordancia',
      'tipo di corrispondenza', 'corrispondenza',
    ],
    isRequired: false,
  },
  // Search Term
  {
    internalField: 'searchTerm',
    aliases: [
      'search term', 'customer search term', 'query',
      'termino de busqueda', 'término de búsqueda', 'término de búsqueda del cliente',
      'termine di ricerca', 'termine di ricerca del cliente',
    ],
    isRequired: false,
  },
  // ASIN
  {
    internalField: 'asin',
    aliases: ['asin', 'advertised asin', 'asin anunciado', 'sku', 'asin pubblicizzato'],
    isRequired: false,
  },
  // === METRICS ===
  {
    internalField: 'impressions',
    aliases: ['impressions', 'impresiones', 'impr', 'impressioni'],
    isRequired: true,
  },
  {
    internalField: 'clicks',
    aliases: ['clicks', 'clics', 'clic'],
    isRequired: true,
  },
  {
    internalField: 'spend',
    aliases: [
      'spend', 'cost', 'gasto', 'coste', 'costo', 'coste total',
      'spesa',
    ],
    isRequired: true,
  },
  {
    internalField: 'sales',
    aliases: [
      'sales', 'ventas', 'attributed sales',
      '7 day total sales', '14 day total sales', '30 day total sales',
      'ventas totales de 7 dias', 'ventas totales de 14 dias', 'ventas totales de 30 dias',
      'total sales',
      'vendite',
    ],
    isRequired: false,
  },
  {
    internalField: 'orders',
    aliases: [
      'orders', 'pedidos', 'attributed orders', 'compras',
      '7 day total orders', '14 day total orders', '30 day total orders',
      'pedidos totales de 7 dias', 'pedidos totales de 14 dias', 'pedidos totales de 30 dias',
      'total orders',
      'ordini',
    ],
    isRequired: false,
  },
  {
    internalField: 'units',
    aliases: [
      'units', 'unidades', 'attributed units',
      '7 day total units', '14 day total units', '30 day total units',
      'total units',
      'unità',
    ],
    isRequired: false,
  },
  // Pre-calculated ACOS
  {
    internalField: 'acosRaw',
    aliases: ['acos', 'total acos'],
    isRequired: false,
  },
  // CPC
  {
    internalField: 'cpcRaw',
    aliases: [
      'cpc', 'cost per click', 'coste por clic', 'cpc medio', 'average cpc',
      'costo per clic',
    ],
    isRequired: false,
  },
  // CTR
  {
    internalField: 'ctrRaw',
    aliases: [
      'ctr', 'click through rate', 'tasa de clics',
      'tasso di clic', 'tasso di clic ctr',
    ],
    isRequired: false,
  },
  // Campaign state (IT: "Stato", ES: "Estado", EN: "State"/"Status")
  {
    internalField: 'campaignState',
    aliases: ['state', 'status', 'stato', 'estado'],
    isRequired: false,
  },
  // Campaign type (IT: "Tipo", ES: "Tipo", EN: "Type")
  {
    internalField: 'campaignType',
    aliases: ['type', 'tipo', 'ad type', 'tipo de anuncio'],
    isRequired: false,
  },
];

// ========= Report-level detection helpers =========

/** Internal fields that indicate keyword/target-level data */
const KEYWORD_LEVEL_FIELDS = new Set(['targetText', 'searchTerm']);

/** Internal fields that indicate campaign-level data */
const CAMPAIGN_LEVEL_FIELDS = new Set(['campaignName', 'campaignId']);

/** Internal metric fields */
const METRIC_FIELDS = new Set(['impressions', 'clicks', 'spend']);

export type DetectedReportLevel = 'keyword' | 'search_term' | 'campaign_only' | 'unknown';

/**
 * Given a set of mapped internal fields, determine the report level.
 * This is CRITICAL: a campaign-only report cannot populate keyword.adsData.
 */
export function detectReportLevel(mappedFields: string[]): DetectedReportLevel {
  const fieldSet = new Set(mappedFields);
  const hasMetrics = METRIC_FIELDS.size > 0 && [...METRIC_FIELDS].some(f => fieldSet.has(f));

  if (!hasMetrics) return 'unknown';

  if (fieldSet.has('targetText')) return 'keyword';
  if (fieldSet.has('searchTerm')) return 'search_term';

  // Has campaign fields but NO keyword/search term fields → campaign only
  if ([...CAMPAIGN_LEVEL_FIELDS].some(f => fieldSet.has(f))) return 'campaign_only';

  return 'unknown';
}
