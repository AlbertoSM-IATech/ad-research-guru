// ============================================================
// Column alias dictionary for Amazon Ads files (EN / ES)
// ============================================================

export interface AliasEntry {
  internalField: string;
  aliases: string[];
  isRequired: boolean;
}

/**
 * Normalise a header string for fuzzy matching:
 * lowercase, trim, collapse whitespace, remove special chars.
 */
export function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .replace(/[^a-záéíóúñü0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

export const COLUMN_ALIASES: AliasEntry[] = [
  // Date
  {
    internalField: 'date',
    aliases: ['date', 'fecha', 'day', 'dia', 'start date', 'fecha inicio', 'report date'],
    isRequired: false, // not always present per-row (summary reports)
  },
  // Campaign
  {
    internalField: 'campaignName',
    aliases: ['campaign name', 'nombre de campana', 'nombre de campaña', 'campaign', 'campana', 'campaña'],
    isRequired: false,
  },
  {
    internalField: 'campaignId',
    aliases: ['campaign id', 'id de campana', 'id de campaña', 'campaign entity id'],
    isRequired: false,
  },
  // Ad Group
  {
    internalField: 'adGroupName',
    aliases: ['ad group name', 'nombre del grupo de anuncios', 'ad group', 'grupo de anuncios'],
    isRequired: false,
  },
  {
    internalField: 'adGroupId',
    aliases: ['ad group id', 'id del grupo de anuncios'],
    isRequired: false,
  },
  // Targeting / Keyword
  {
    internalField: 'targetText',
    aliases: ['targeting', 'keyword', 'palabra clave', 'keyword text', 'target', 'targeting expression'],
    isRequired: false,
  },
  {
    internalField: 'targetId',
    aliases: ['keyword id', 'target id', 'targeting id'],
    isRequired: false,
  },
  {
    internalField: 'matchType',
    aliases: ['match type', 'tipo de concordancia', 'concordancia'],
    isRequired: false,
  },
  // Search Term
  {
    internalField: 'searchTerm',
    aliases: ['search term', 'customer search term', 'termino de busqueda', 'término de búsqueda', 'query'],
    isRequired: false,
  },
  // ASIN
  {
    internalField: 'asin',
    aliases: ['asin', 'advertised asin', 'asin anunciado', 'sku'],
    isRequired: false,
  },
  // === METRICS (at least impressions/clicks/spend required) ===
  {
    internalField: 'impressions',
    aliases: ['impressions', 'impresiones', 'impr'],
    isRequired: true,
  },
  {
    internalField: 'clicks',
    aliases: ['clicks', 'clics'],
    isRequired: true,
  },
  {
    internalField: 'spend',
    aliases: ['spend', 'cost', 'gasto', 'coste', 'costo'],
    isRequired: true,
  },
  {
    internalField: 'sales',
    aliases: [
      'sales', 'ventas', 'attributed sales',
      '7 day total sales', '14 day total sales', '30 day total sales',
      'ventas totales de 7 dias', 'ventas totales de 14 dias', 'ventas totales de 30 dias',
      'total sales',
    ],
    isRequired: false,
  },
  {
    internalField: 'orders',
    aliases: [
      'orders', 'pedidos', 'attributed orders',
      '7 day total orders', '14 day total orders', '30 day total orders',
      'pedidos totales de 7 dias', 'pedidos totales de 14 dias', 'pedidos totales de 30 dias',
      'total orders',
    ],
    isRequired: false,
  },
  {
    internalField: 'units',
    aliases: [
      'units', 'unidades', 'attributed units',
      '7 day total units', '14 day total units', '30 day total units',
      'total units',
    ],
    isRequired: false,
  },
  // Pre-calculated ACOS (we recalculate, but detect it for validation)
  {
    internalField: 'acosRaw',
    aliases: ['acos', 'total acos'],
    isRequired: false,
  },
  // CPC
  {
    internalField: 'cpcRaw',
    aliases: ['cpc', 'cost per click', 'coste por clic', 'cpc medio', 'average cpc'],
    isRequired: false,
  },
  // CTR
  {
    internalField: 'ctrRaw',
    aliases: ['ctr', 'click through rate', 'tasa de clics'],
    isRequired: false,
  },
];
