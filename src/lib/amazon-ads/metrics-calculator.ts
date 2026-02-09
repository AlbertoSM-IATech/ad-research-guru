// ============================================================
// Derived metrics calculator with safe division
// ============================================================

export interface DerivedMetrics {
  ctr: number | null;  // clicks / impressions
  cpc: number | null;  // spend / clicks
  cvr: number | null;  // orders / clicks
  acos: number | null; // spend / sales
  roas: number | null; // sales / spend
}

function safeDivide(numerator: number, denominator: number): number | null {
  if (denominator === 0 || !isFinite(denominator)) return null;
  const result = numerator / denominator;
  return isFinite(result) ? result : null;
}

/**
 * Calculate derived metrics from base metrics.
 */
export function calculateDerivedMetrics(
  impressions: number,
  clicks: number,
  spend: number,
  sales: number,
  orders: number,
): DerivedMetrics {
  return {
    ctr: safeDivide(clicks, impressions),
    cpc: safeDivide(spend, clicks),
    cvr: safeDivide(orders, clicks),
    acos: safeDivide(spend, sales),
    roas: safeDivide(sales, spend),
  };
}

/**
 * Aggregate metrics from an array of daily records.
 */
export function aggregateMetrics(records: {
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  units: number;
}[]): {
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  units: number;
} & DerivedMetrics {
  let impressions = 0, clicks = 0, spend = 0, sales = 0, orders = 0, units = 0;

  for (const r of records) {
    impressions += r.impressions;
    clicks += r.clicks;
    spend += r.spend;
    sales += r.sales;
    orders += r.orders;
    units += r.units;
  }

  const derived = calculateDerivedMetrics(impressions, clicks, spend, sales, orders);

  return { impressions, clicks, spend, sales, orders, units, ...derived };
}

/**
 * Format a metric for display.
 */
export function formatMetric(value: number | null | undefined, type: 'percent' | 'currency' | 'number'): string {
  if (value === null || value === undefined) return 'N/A';
  switch (type) {
    case 'percent':
      return `${(value * 100).toFixed(1)}%`;
    case 'currency':
      return `${value.toFixed(2)}`;
    case 'number':
      return value.toLocaleString('es-ES', { maximumFractionDigits: 0 });
    default:
      return String(value);
  }
}
