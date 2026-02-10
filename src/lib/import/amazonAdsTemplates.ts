/**
 * Amazon Ads import templates for auto-mapping CSV/Excel report headers.
 * Supports ES, EN, and IT header variants.
 */

export type AmazonAdsFieldKey =
  | 'term'
  | 'campaign'
  | 'impressions'
  | 'clicks'
  | 'orders'
  | 'spend'
  | 'cpc'
  | 'ctr'
  | 'sales';

export interface AmazonAdsField {
  key: AmazonAdsFieldKey;
  label: string;
  required: boolean;
}

export const AMAZON_ADS_FIELDS: AmazonAdsField[] = [
  { key: 'term', label: 'Término / Keyword', required: true },
  { key: 'campaign', label: 'Campaña', required: false },
  { key: 'impressions', label: 'Impresiones', required: false },
  { key: 'clicks', label: 'Clicks', required: false },
  { key: 'ctr', label: 'CTR', required: false },
  { key: 'spend', label: 'Gasto', required: false },
  { key: 'cpc', label: 'CPC', required: false },
  { key: 'orders', label: 'Pedidos', required: false },
  { key: 'sales', label: 'Ventas', required: false },
];

/**
 * Header aliases by field and language (ES/EN/IT)
 */
const HEADER_ALIASES: Record<AmazonAdsFieldKey, string[]> = {
  term: [
    // ES
    'Término de búsqueda', 'Término', 'Keyword', 'Palabra clave',
    'Consulta del cliente', 'Search term', 'Termino de busqueda', 'Termino',
    // EN
    'Customer Search Term', 'Search Term', 'Targeting', 'Keyword',
    'Keyword Text', 'Query',
    // IT
    'Termine di ricerca', 'Parola chiave',
  ],
  campaign: [
    'Campaña', 'Campañas', 'Nombre de campaña', 'Nombre de la campaña',
    'Campaign', 'Campaigns', 'Campaign Name', 'Campaign name',
    'Campagne', 'Nome campagna',
  ],
  impressions: [
    'Impresiones', 'Impressions', 'Impressioni', 'Impr.',
  ],
  clicks: [
    'Clics', 'Clicks', 'Clic', 'Click',
  ],
  ctr: [
    'CTR', 'Tasa de clics', 'Click-through Rate (CTR)', 'Click-Through Rate',
    'Click-through rate (CTR)', 'Tasso di clic (CTR)', 'Tasso di clic',
  ],
  spend: [
    'Gasto', 'Coste', 'Inversión', 'Spend', 'Cost', 'Spesa', 'Costo',
    'Total Spend', 'Gasto total',
  ],
  cpc: [
    'CPC', 'CPC medio', 'Average CPC', 'Avg. CPC', 'CPC medio',
    'Coste por clic', 'Cost Per Click', 'Cost per click',
  ],
  orders: [
    'Pedidos', 'Órdenes', 'Pedidos de 7 días', 'Pedidos de 14 días',
    'Orders', '7 Day Total Orders (#)',
    '14 Day Total Orders (#)', 'Total Orders',
    'Ordini', 'Ordini totali',
  ],
  sales: [
    'Ventas', 'Ventas de 7 días', 'Ventas de 14 días',
    'Sales', '7 Day Total Sales',
    '14 Day Total Sales', 'Total Sales',
    'Vendite', 'Vendite totali',
  ],
};

export type AmazonAdsReportType = 'searchTerm' | 'campaignOnly' | 'unknown';

/**
 * Detect the type of Amazon Ads report based on headers
 */
export function detectAmazonAdsTemplate(headers: string[]): AmazonAdsReportType {
  const normalized = headers.map(h => h.toLowerCase().trim());

  // Check if any header matches a term alias
  const hasTerm = HEADER_ALIASES.term.some(alias =>
    normalized.some(h => h === alias.toLowerCase() || h.includes(alias.toLowerCase()))
  );

  if (hasTerm) return 'searchTerm';

  // Check if it's a campaign-level report (has campaign + some metrics but no term)
  const hasCampaign = HEADER_ALIASES.campaign.some(alias =>
    normalized.some(h => h === alias.toLowerCase() || h.includes(alias.toLowerCase()))
  );
  const hasMetrics = ['impressions', 'clicks'].some(fieldKey =>
    HEADER_ALIASES[fieldKey as AmazonAdsFieldKey].some(alias =>
      normalized.some(h => h === alias.toLowerCase() || h.includes(alias.toLowerCase()))
    )
  );

  if (hasCampaign && hasMetrics) return 'campaignOnly';

  return 'unknown';
}

/**
 * Auto-map headers to Amazon Ads field keys
 */
export function autoMapAmazonAdsHeaders(
  headers: string[]
): Record<string, AmazonAdsFieldKey | 'ignore'> {
  const mappings: Record<string, AmazonAdsFieldKey | 'ignore'> = {};
  const usedFields = new Set<AmazonAdsFieldKey>();

  headers.forEach(header => {
    const normalizedHeader = header.toLowerCase().trim();
    let matched = false;

    // Exact match first
    for (const [fieldKey, aliases] of Object.entries(HEADER_ALIASES)) {
      if (usedFields.has(fieldKey as AmazonAdsFieldKey)) continue;
      if (aliases.some(alias => alias.toLowerCase() === normalizedHeader)) {
        mappings[header] = fieldKey as AmazonAdsFieldKey;
        usedFields.add(fieldKey as AmazonAdsFieldKey);
        matched = true;
        break;
      }
    }

    // Partial match
    if (!matched) {
      for (const [fieldKey, aliases] of Object.entries(HEADER_ALIASES)) {
        if (usedFields.has(fieldKey as AmazonAdsFieldKey)) continue;
        if (aliases.some(alias =>
          normalizedHeader.includes(alias.toLowerCase()) ||
          alias.toLowerCase().includes(normalizedHeader)
        )) {
          mappings[header] = fieldKey as AmazonAdsFieldKey;
          usedFields.add(fieldKey as AmazonAdsFieldKey);
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      mappings[header] = 'ignore';
    }
  });

  return mappings;
}
