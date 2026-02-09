// ============================================================
// Rule-based recommendation engine for Amazon Ads
// ============================================================

import type {
  AdsDailyMetrics,
  ThresholdConfig,
  Recommendation,
  RecommendationType,
  AdsEntityType,
  DEFAULT_THRESHOLDS,
} from '@/types/amazon-ads';
import { aggregateMetrics } from './metrics-calculator';

interface EntityAggregate {
  entityKey: string;
  entityType: AdsEntityType;
  entityName: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  units: number;
  ctr: number | null;
  cpc: number | null;
  acos: number | null;
}

let idCounter = 0;
function nextId(): string {
  return `rec-${Date.now()}-${++idCounter}`;
}

/**
 * Aggregate daily metrics by entity.
 */
function aggregateByEntity(
  metrics: AdsDailyMetrics[],
  entityNames: Map<string, string>,
): EntityAggregate[] {
  const groups = new Map<string, AdsDailyMetrics[]>();

  for (const m of metrics) {
    const key = `${m.entityType}|${m.entityKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  const results: EntityAggregate[] = [];
  for (const [key, records] of groups) {
    const [entityType, entityKey] = key.split('|') as [AdsEntityType, string];
    const agg = aggregateMetrics(records);
    results.push({
      entityKey,
      entityType,
      entityName: entityNames.get(entityKey) ?? entityKey,
      ...agg,
    });
  }
  return results;
}

/**
 * Generate recommendations from daily metrics.
 */
export function generateRecommendations(
  metrics: AdsDailyMetrics[],
  thresholds: ThresholdConfig,
  entityNames: Map<string, string>,
): Recommendation[] {
  const recs: Recommendation[] = [];
  const entities = aggregateByEntity(metrics, entityNames);

  for (const e of entities) {
    // A) Click leak: many clicks, zero orders
    if (e.clicks >= thresholds.minClicksForRules && e.orders === 0) {
      recs.push({
        id: nextId(),
        type: 'click-leak',
        title: 'Posible fuga de clics',
        description: `"${e.entityName}" tiene ${e.clicks} clics pero 0 pedidos. Revisá relevancia o bajá puja.`,
        actions: ['Bajar puja', 'Pausar target/keyword', 'Revisar relevancia (título, portada)'],
        entityKey: e.entityKey,
        entityType: e.entityType,
        entityName: e.entityName,
        severity: 'high',
        metrics: { clicks: e.clicks, spend: e.spend, orders: e.orders },
      });
    }

    // B) Spend without return
    if (e.spend >= thresholds.minSpendForRules && e.sales < e.spend * 0.5 && e.orders > 0) {
      recs.push({
        id: nextId(),
        type: 'spend-no-return',
        title: 'Gasto alto para retorno bajo',
        description: `"${e.entityName}" gastó ${e.spend.toFixed(2)} pero generó solo ${e.sales.toFixed(2)} en ventas.`,
        actions: ['Reducir presupuesto', 'Revisar targeting', 'Evaluar pausar campaña'],
        entityKey: e.entityKey,
        entityType: e.entityType,
        entityName: e.entityName,
        severity: 'high',
        metrics: { spend: e.spend, sales: e.sales, acos: e.acos },
      });
    }

    // C) Scale candidate: ACOS under target and orders exist
    if (e.acos !== null && e.acos < thresholds.acosTarget / 100 && e.orders > 0) {
      recs.push({
        id: nextId(),
        type: 'scale-candidate',
        title: 'Candidato a escalar',
        description: `"${e.entityName}" tiene ACOS ${(e.acos * 100).toFixed(1)}% (bajo tu objetivo de ${thresholds.acosTarget}%).`,
        actions: ['Subir presupuesto', 'Subir puja moderada', 'Expandir keywords similares'],
        entityKey: e.entityKey,
        entityType: e.entityType,
        entityName: e.entityName,
        severity: 'low',
        metrics: { acos: e.acos, orders: e.orders, sales: e.sales },
      });
    }

    // D) Negative search term candidate
    if (e.entityType === 'searchTerm' && e.spend > 0 && e.orders === 0) {
      recs.push({
        id: nextId(),
        type: 'negative-search-term',
        title: 'Search term sin conversión',
        description: `"${e.entityName}" ha gastado ${e.spend.toFixed(2)} sin pedidos. Considerá añadirlo como negativa.`,
        actions: ['Añadir como keyword negativa', 'Revisar relevancia del search term'],
        entityKey: e.entityKey,
        entityType: e.entityType,
        entityName: e.entityName,
        severity: 'medium',
        metrics: { spend: e.spend, clicks: e.clicks },
      });
    }

    // E) Winner search term
    if (e.entityType === 'searchTerm' && e.orders > 0) {
      recs.push({
        id: nextId(),
        type: 'winner-search-term',
        title: 'Search term ganador',
        description: `"${e.entityName}" generó ${e.orders} pedidos. Pasalo a exact/phrase.`,
        actions: ['Pasar a concordancia exacta', 'Crear campaña dedicada'],
        entityKey: e.entityKey,
        entityType: e.entityType,
        entityName: e.entityName,
        severity: 'low',
        metrics: { orders: e.orders, sales: e.sales, acos: e.acos },
      });
    }

    // F) Low CTR with high impressions
    if (
      e.ctr !== null &&
      e.ctr < thresholds.ctrThreshold / 100 &&
      e.impressions >= thresholds.minImpressionsForCTR
    ) {
      recs.push({
        id: nextId(),
        type: 'low-ctr',
        title: 'CTR bajo',
        description: `"${e.entityName}" tiene CTR ${(e.ctr * 100).toFixed(2)}% con ${e.impressions} impresiones. Revisá relevancia.`,
        actions: ['Revisar relevancia del targeting', 'Mejorar creativos/portada', 'Reducir puja'],
        entityKey: e.entityKey,
        entityType: e.entityType,
        entityName: e.entityName,
        severity: 'medium',
        metrics: { ctr: e.ctr, impressions: e.impressions },
      });
    }
  }

  // Sort by severity
  const sevOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

  return recs;
}
