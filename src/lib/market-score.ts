// Market Score V2 - Sistema unificado de puntuación de mercado
// Una keyword = una fuente de verdad

import { getMarketScoreConfig } from './market-score-config';

// ============ BRAND RISK & TRAFFIC SOURCE ============

export type BrandRisk = 'low' | 'medium' | 'high';
export type TrafficSource = 'amazon' | 'external' | 'brand';
export type KeywordStatus = 'pending' | 'valid' | 'discarded';
export type KeywordPurpose = 'editorial' | 'ads' | 'both';

// ============ MARKET DATA (stored in Keyword) ============

export interface MarketData {
  searchVolume: number;
  competitors: number; // Número de resultados Amazon
  price: number;
  royalties: number;
  brandRisk: BrandRisk;
  trafficSource: TrafficSource;
}

// ============ EDITORIAL DATA (separate from Market Score) ============

export interface EditorialChecklist {
  canCreate: boolean | null; // ¿Puedo crear este libro?
  canDoBetter: boolean | null; // ¿Puedo hacerlo mejor?
  canDifferentiate: boolean | null; // ¿Puedo diferenciarlo?
  fitsStrategy: boolean | null; // ¿Encaja con mi estrategia editorial?
}

export interface EditorialData {
  checklist: EditorialChecklist;
  notes: string;
}

// ============ SCORE BREAKDOWN ============

export interface MarketScoreBreakdown {
  volume: { points: number; max: number; label: string };
  competitors: { points: number; max: number; label: string };
  price: { points: number; max: number; label: string };
  royalties: { points: number; max: number; label: string };
  penalties: { points: number; label: string };
  total: number;
}

// ============ DEFAULTS ============

export const getDefaultMarketData = (): MarketData => ({
  searchVolume: 0,
  competitors: 0,
  price: 9.99,
  royalties: 2.00,
  brandRisk: 'low',
  trafficSource: 'amazon',
});

export const getDefaultEditorialChecklist = (): EditorialChecklist => ({
  canCreate: null,
  canDoBetter: null,
  canDifferentiate: null,
  fitsStrategy: null,
});

export const getDefaultEditorialData = (): EditorialData => ({
  checklist: getDefaultEditorialChecklist(),
  notes: '',
});

// ============ MARKET SCORE CALCULATION ============
// Pesos:
// - Volumen (30%)
// - Competidores (25%)
// - Precio (15%)
// - Regalías (20%)
// - Penalizaciones brandRisk + trafficSource (10%)

export function calculateMarketScore(data: MarketData, marketplaceId?: string): MarketScoreBreakdown {
  const config = getMarketScoreConfig(marketplaceId);
  const { thresholds } = config;
  
  let total = 0;
  
  // 1) VOLUMEN (30 puntos máx)
  let volumePoints = 0;
  let volumeLabel = '';
  if (data.searchVolume < thresholds.volume.veryLow) {
    volumePoints = 0;
    volumeLabel = `<${thresholds.volume.veryLow} → 0pts`;
  } else if (data.searchVolume <= thresholds.volume.low) {
    volumePoints = 10;
    volumeLabel = `${thresholds.volume.veryLow}-${thresholds.volume.low} → 10pts`;
  } else if (data.searchVolume <= thresholds.volume.medium) {
    volumePoints = 20;
    volumeLabel = `${thresholds.volume.low + 1}-${thresholds.volume.medium} → 20pts`;
  } else {
    volumePoints = 30;
    volumeLabel = `>${thresholds.volume.medium} → 30pts`;
  }
  total += volumePoints;
  
  // 2) COMPETIDORES (25 puntos máx)
  let competitorsPoints = 0;
  let competitorsLabel = '';
  if (data.competitors < thresholds.competitors.low) {
    competitorsPoints = 25;
    competitorsLabel = `<${thresholds.competitors.low} → 25pts`;
  } else if (data.competitors <= thresholds.competitors.medium) {
    competitorsPoints = 18;
    competitorsLabel = `${thresholds.competitors.low}-${thresholds.competitors.medium} → 18pts`;
  } else if (data.competitors <= thresholds.competitors.high) {
    competitorsPoints = 8;
    competitorsLabel = `${thresholds.competitors.medium}-${thresholds.competitors.high} → 8pts`;
  } else {
    competitorsPoints = 0;
    competitorsLabel = `>${thresholds.competitors.high} → 0pts`;
  }
  total += competitorsPoints;
  
  // 3) PRECIO (15 puntos máx)
  let pricePoints = 0;
  let priceLabel = '';
  if (data.price < thresholds.price.low) {
    pricePoints = 0;
    priceLabel = `<$${thresholds.price.low} → 0pts`;
  } else if (data.price < thresholds.price.medium) {
    pricePoints = 8;
    priceLabel = `$${thresholds.price.low}-${thresholds.price.medium - 0.01} → 8pts`;
  } else if (data.price < thresholds.price.high) {
    pricePoints = 12;
    priceLabel = `$${thresholds.price.medium}-${thresholds.price.high - 0.01} → 12pts`;
  } else {
    pricePoints = 15;
    priceLabel = `≥$${thresholds.price.high} → 15pts`;
  }
  total += pricePoints;
  
  // 4) REGALÍAS (20 puntos máx)
  let royaltiesPoints = 0;
  let royaltiesLabel = '';
  if (data.royalties < thresholds.royalties.low) {
    royaltiesPoints = 0;
    royaltiesLabel = `<$${thresholds.royalties.low} → 0pts`;
  } else if (data.royalties < thresholds.royalties.medium) {
    royaltiesPoints = 8;
    royaltiesLabel = `$${thresholds.royalties.low}-${thresholds.royalties.medium} → 8pts`;
  } else if (data.royalties < thresholds.royalties.high) {
    royaltiesPoints = 14;
    royaltiesLabel = `$${thresholds.royalties.medium}-${thresholds.royalties.high} → 14pts`;
  } else {
    royaltiesPoints = 20;
    royaltiesLabel = `>$${thresholds.royalties.high} → 20pts`;
  }
  total += royaltiesPoints;
  
  // 5) PENALIZACIONES (hasta -10 puntos)
  let penaltyPoints = 0;
  const penalties: string[] = [];
  
  if (data.brandRisk === 'high') {
    penaltyPoints -= thresholds.penalties.brandRiskHigh;
    penalties.push(`Brand risk alto: -${thresholds.penalties.brandRiskHigh}`);
  } else if (data.brandRisk === 'medium') {
    penaltyPoints -= thresholds.penalties.brandRiskMedium;
    penalties.push(`Brand risk medio: -${thresholds.penalties.brandRiskMedium}`);
  }
  
  if (data.trafficSource !== 'amazon') {
    penaltyPoints -= thresholds.penalties.nonAmazonTraffic;
    penalties.push(`Tráfico no Amazon: -${thresholds.penalties.nonAmazonTraffic}`);
  }
  
  total += penaltyPoints;
  
  // Clamp to 0-100
  total = Math.max(0, Math.min(100, total));
  
  return {
    volume: { points: volumePoints, max: 30, label: volumeLabel },
    competitors: { points: competitorsPoints, max: 25, label: competitorsLabel },
    price: { points: pricePoints, max: 15, label: priceLabel },
    royalties: { points: royaltiesPoints, max: 20, label: royaltiesLabel },
    penalties: { points: penaltyPoints, label: penalties.length > 0 ? penalties.join(', ') : 'Sin penalizaciones' },
    total,
  };
}

// Simple score calculation (returns only total)
export function getMarketScoreTotal(data: MarketData, marketplaceId?: string): number {
  return calculateMarketScore(data, marketplaceId).total;
}

// ============ EDITORIAL SCORE ============
// NO afecta Market Score - es informativo

export function calculateEditorialScore(data: EditorialData): number {
  const { checklist } = data;
  let score = 0;
  let answered = 0;
  
  if (checklist.canCreate === true) { score += 1; answered++; }
  else if (checklist.canCreate === false) { answered++; }
  else if (checklist.canCreate !== null) { answered++; }
  
  if (checklist.canDoBetter === true) { score += 1; answered++; }
  else if (checklist.canDoBetter === false) { answered++; }
  else if (checklist.canDoBetter !== null) { answered++; }
  
  if (checklist.canDifferentiate === true) { score += 1; answered++; }
  else if (checklist.canDifferentiate === false) { answered++; }
  else if (checklist.canDifferentiate !== null) { answered++; }
  
  if (checklist.fitsStrategy === true) { score += 1; answered++; }
  else if (checklist.fitsStrategy === false) { answered++; }
  else if (checklist.fitsStrategy !== null) { answered++; }
  
  // Score is out of 4 (one point per "yes")
  return score;
}

// ============ SCORE LEVEL HELPERS ============

export type MarketScoreLevel = 'excellent' | 'good' | 'fair' | 'poor';

export function getMarketScoreLevel(score: number): MarketScoreLevel {
  if (score >= 70) return 'excellent';
  if (score >= 50) return 'good';
  if (score >= 30) return 'fair';
  return 'poor';
}

export function getMarketScoreInfo(score: number): {
  level: MarketScoreLevel;
  label: string;
  color: string;
  bgColor: string;
} {
  const level = getMarketScoreLevel(score);
  switch (level) {
    case 'excellent':
      return { level, label: 'Excelente', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-500/20' };
    case 'good':
      return { level, label: 'Bueno', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-500/20' };
    case 'fair':
      return { level, label: 'Regular', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-500/20' };
    case 'poor':
      return { level, label: 'Bajo', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500/20' };
  }
}

export function getMarketScoreColor(score: number): string {
  return getMarketScoreInfo(score).color;
}

export function getMarketScoreBgColor(score: number): string {
  return getMarketScoreInfo(score).bgColor;
}

// ============ UI OPTIONS ============

export const BRAND_RISK_OPTIONS: { value: BrandRisk; label: string; color: string }[] = [
  { value: 'low', label: 'Bajo', color: 'bg-green-500/20 text-green-600 dark:text-green-400' },
  { value: 'medium', label: 'Medio', color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' },
  { value: 'high', label: 'Alto', color: 'bg-red-500/20 text-red-600 dark:text-red-400' },
];

export const TRAFFIC_SOURCE_OPTIONS: { value: TrafficSource; label: string; color: string }[] = [
  { value: 'amazon', label: 'Amazon', color: 'bg-green-500/20 text-green-600 dark:text-green-400' },
  { value: 'external', label: 'Externo', color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' },
  { value: 'brand', label: 'Marca', color: 'bg-red-500/20 text-red-600 dark:text-red-400' },
];

export const KEYWORD_STATUS_OPTIONS: { value: KeywordStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' },
  { value: 'valid', label: 'Válida', color: 'bg-green-500/20 text-green-600 dark:text-green-400' },
  { value: 'discarded', label: 'Descartada', color: 'bg-red-500/20 text-red-600 dark:text-red-400' },
];

export const KEYWORD_PURPOSE_OPTIONS: { value: KeywordPurpose; label: string; description: string }[] = [
  { value: 'editorial', label: 'Editorial', description: 'Para decisión de crear libros' },
  { value: 'ads', label: 'Ads', description: 'Para optimización y publicidad' },
  { value: 'both', label: 'Ambos', description: 'Editorial y publicidad' },
];
