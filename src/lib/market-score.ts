// Market Score V2 - Sistema unificado de puntuación de mercado
// Scoring continuo proporcional (no por rangos rígidos)
// 
// DISTRIBUCIÓN DE PUNTOS (100 total):
// - Volumen (Demanda): 26 pts
// - Competidores (Competencia): 34 pts
// - Precio (Rentabilidad): 8 pts
// - Regalías (Rentabilidad): 8 pts
// - Estructura del Mercado: 12 pts (6 checks × 2pts)
// - Señales de Catálogo: 12 pts
// 
// PENALIZACIONES (se aplican después):
// - trafficSource: amazon=0, brand=-20, rrss=-7, other=-10

import { getMarketScoreConfig, type MarketScoringConfig } from './market-score-config';

// ============ TYPES ============

export type TrafficSource = 'amazon' | 'rrss' | 'brand' | 'other';
export type KeywordStatus = 'pending' | 'valid' | 'discarded';
export type KeywordPurpose = 'editorial' | 'ads' | 'both';

// ============ MARKET DATA (stored in Keyword) ============
// NO incluye brandRisk - el riesgo se mide solo con trafficSource

export interface MarketData {
  searchVolume: number;
  competitors: number; // Número de resultados Amazon
  price: number;
  royalties: number;
  trafficSource: TrafficSource;
}

// ============ EDITORIAL DATA (separate from Market Score) ============
// 5 checks - NO afectan al Market Score

export interface EditorialChecklist {
  makesSenseAsBook: boolean | null;   // Tiene sentido como libro
  canCreateThisBook: boolean | null;  // Puedo crear este libro
  canDoItBetter: boolean | null;      // Puedo hacerlo mejor
  canDifferentiate: boolean | null;   // Puedo diferenciarlo
  personalInterest: boolean | null;   // Tengo interés personal
}

export interface EditorialData {
  checklist: EditorialChecklist;
  notes: string;
}

// ============ MARKET STRUCTURE (12 pts block - 6 checks x 2pts) ============
// Señales estructurales del mercado - AFECTAN al Market Score

export interface MarketStructure {
  selfContained?: boolean;        // Se entiende por sí sola (+2)
  amazonSuggestion?: boolean;     // Sugerencia Amazon (+2)
  booksSellingWell?: boolean;     // ≥3 libros vendiendo (+2)
  indieAuthorsSelling?: boolean;  // Autores indie vendiendo (+2)
  topMatchesIntent?: boolean;     // El top refleja la intención (+2)
  variantsPotential?: boolean;    // Variantes con potencial (+2)
}

// ============ CATALOG SIGNALS (12 pts block) ============
// Señales de catálogo - AFECTAN al Market Score

// Rangos para "Libros +200 reviews" - mapeo a puntos
export type BooksOver200ReviewsRange = '0-5' | '6-9' | '10-15' | '>15' | null;

export const BOOKS_OVER_200_REVIEWS_OPTIONS = [
  { value: '0-5', label: '0 - 5', points: 1 },
  { value: '6-9', label: '6 - 9', points: 2 },
  { value: '10-15', label: '10 - 15', points: 3 },
  { value: '>15', label: 'Más de 15', points: 4 },
] as const;

export function getBooksOver200ReviewsPoints(range: BooksOver200ReviewsRange): number {
  if (!range) return 0;
  const option = BOOKS_OVER_200_REVIEWS_OPTIONS.find(o => o.value === range);
  return option?.points ?? 0;
}

export interface CatalogSignals {
  booksOver200ReviewsRange?: BooksOver200ReviewsRange; // Libros +200 reviews (1-4 pts según rango)
  hasProfitableBooks?: boolean;      // ≥3 libros rentables (+5)
  hasBooksUnder100Reviews?: boolean; // Libros −100 reviews (+3)
}

// ============ SCORE BREAKDOWN ============

export interface MarketScoreBreakdown {
  volume: { points: number; max: number; label: string; ratio: number };
  competitors: { points: number; max: number; label: string; ratio: number };
  price: { points: number; max: number; label: string; ratio: number };
  royalties: { points: number; max: number; label: string; ratio: number };
  marketStructure: { points: number; max: number; label: string; checks: number };
  catalogSignals: { points: number; max: number; label: string; checks: number };
  penalties: { points: number; label: string };
  total: number;
}

// ============ DEFAULTS ============

export const getDefaultMarketData = (): MarketData => ({
  searchVolume: 0,
  competitors: 0,
  price: 9.99,
  royalties: 2.00,
  trafficSource: 'amazon',
});

export const getDefaultEditorialChecklist = (): EditorialChecklist => ({
  makesSenseAsBook: null,
  canCreateThisBook: null,
  canDoItBetter: null,
  canDifferentiate: null,
  personalInterest: null,
});

export const getDefaultEditorialData = (): EditorialData => ({
  checklist: getDefaultEditorialChecklist(),
  notes: '',
});

export const getDefaultMarketStructure = (): MarketStructure => ({
  selfContained: false,
  amazonSuggestion: false,
  booksSellingWell: false,
  indieAuthorsSelling: false,
  topMatchesIntent: false,
  variantsPotential: false,
});

export const getDefaultCatalogSignals = (): CatalogSignals => ({
  booksOver200ReviewsRange: null,
  hasProfitableBooks: false,
  hasBooksUnder100Reviews: false,
});

// ============ INTERPOLATION HELPERS ============

/**
 * Linear interpolation between 0 and 1
 * Returns ratio based on value position between min and max
 */
function lerp(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

/**
 * Piecewise linear interpolation for volume
 * v0 → 0%, v1 → 33%, v2 → 66%, ideal → 100%
 */
function interpolateVolume(volume: number, config: MarketScoringConfig): number {
  const { v0, v1, v2, ideal } = config.volumeAnchors;
  
  if (volume <= v0) return 0;
  if (volume <= v1) return lerp(volume, v0, v1) * 0.33;
  if (volume <= v2) return 0.33 + lerp(volume, v1, v2) * 0.33;
  if (volume <= ideal) return 0.66 + lerp(volume, v2, ideal) * 0.34;
  // Beyond ideal: cap at 1
  return 1;
}

/**
 * Piecewise linear interpolation for competitors (INVERTED - less is better)
 * c0 → 100%, c1 → 66%, c2 → 33%, beyond → 0%
 */
function interpolateCompetitors(competitors: number, config: MarketScoringConfig): number {
  const { c0, c1, c2 } = config.competitorsAnchors;
  
  if (competitors <= c0) return 1; // Excellent
  if (competitors <= c1) return 1 - lerp(competitors, c0, c1) * 0.34; // 1 → 0.66
  if (competitors <= c2) return 0.66 - lerp(competitors, c1, c2) * 0.33; // 0.66 → 0.33
  // Beyond c2: decrease to 0
  const beyondC2 = Math.min(lerp(competitors, c2, c2 * 2), 1);
  return 0.33 - beyondC2 * 0.33;
}

/**
 * Price interpolation
 * <9.99 → penalizes heavily (0-40%)
 * 9.99 → base (40%)
 * 9.99 to ideal → progressive (40%-100%)
 * Beyond ideal → cap at 100%
 */
function interpolatePrice(price: number, config: MarketScoringConfig): number {
  const idealPrice = config.idealPrice;
  const minPrice = 9.99;
  
  if (price < 7.99) return 0;
  if (price < minPrice) return lerp(price, 7.99, minPrice) * 0.4; // 0 → 40%
  if (price <= idealPrice) return 0.4 + lerp(price, minPrice, idealPrice) * 0.6; // 40% → 100%
  return 1;
}

/**
 * Royalties interpolation
 * r0 → 0%, r1 → 40%, r2 → 70%, ideal → 100%
 */
function interpolateRoyalties(royalties: number, config: MarketScoringConfig): number {
  const { r0, r1, r2, ideal } = config.royaltiesAnchors;
  
  if (royalties <= r0) return 0;
  if (royalties <= r1) return lerp(royalties, r0, r1) * 0.4;
  if (royalties <= r2) return 0.4 + lerp(royalties, r1, r2) * 0.3;
  if (royalties <= ideal) return 0.7 + lerp(royalties, r2, ideal) * 0.3;
  return 1;
}

// ============ MARKET SCORE WEIGHTS (total = 100) ============
const SCORE_WEIGHTS = {
  volume: 26,           // Demanda
  competitors: 34,      // Competencia
  price: 8,             // Rentabilidad
  royalties: 8,         // Rentabilidad
  marketStructure: 12,  // Estructura del mercado
  catalogSignals: 12,   // Señales de catálogo
};

// ============ MARKET SCORE CALCULATION ============

export function calculateMarketScore(
  data: MarketData, 
  marketplaceId?: string,
  marketStructure?: MarketStructure,
  catalogSignals?: CatalogSignals
): MarketScoreBreakdown {
  const config = getMarketScoreConfig(marketplaceId);
  const { penalties } = config;
  
  let total = 0;
  
  // 1) VOLUMEN (26 pts - proporcional creciente)
  const volumeRatio = interpolateVolume(data.searchVolume, config);
  const volumePoints = Math.round(volumeRatio * SCORE_WEIGHTS.volume * 100) / 100;
  const volumeLabel = `${data.searchVolume.toLocaleString()} → ${Math.round(volumeRatio * 100)}%`;
  total += volumePoints;
  
  // 2) COMPETIDORES (34 pts - proporcional decreciente)
  const competitorsRatio = interpolateCompetitors(data.competitors, config);
  const competitorsPoints = Math.round(competitorsRatio * SCORE_WEIGHTS.competitors * 100) / 100;
  const competitorsLabel = `${data.competitors.toLocaleString()} → ${Math.round(competitorsRatio * 100)}%`;
  total += competitorsPoints;
  
  // 3) PRECIO (8 pts - crítico: <9.99 penaliza)
  const priceRatio = interpolatePrice(data.price, config);
  const pricePoints = Math.round(priceRatio * SCORE_WEIGHTS.price * 100) / 100;
  const priceLabel = `$${data.price.toFixed(2)} → ${Math.round(priceRatio * 100)}%`;
  total += pricePoints;
  
  // 4) REGALÍAS (8 pts - proporcional creciente)
  const royaltiesRatio = interpolateRoyalties(data.royalties, config);
  const royaltiesPoints = Math.round(royaltiesRatio * SCORE_WEIGHTS.royalties * 100) / 100;
  const royaltiesLabel = `$${data.royalties.toFixed(2)} → ${Math.round(royaltiesRatio * 100)}%`;
  total += royaltiesPoints;
  
  // 5) ESTRUCTURA DEL MERCADO (12 pts - 6 checks x 2pts)
  let structurePoints = 0;
  let structureChecks = 0;
  const structureLabels: string[] = [];
  
  if (marketStructure) {
    if (marketStructure.selfContained) { structurePoints += 2; structureChecks++; }
    if (marketStructure.amazonSuggestion) { structurePoints += 2; structureChecks++; }
    if (marketStructure.booksSellingWell) { structurePoints += 2; structureChecks++; }
    if (marketStructure.indieAuthorsSelling) { structurePoints += 2; structureChecks++; }
    if (marketStructure.topMatchesIntent) { structurePoints += 2; structureChecks++; }
    if (marketStructure.variantsPotential) { structurePoints += 2; structureChecks++; }
    
    if (structureChecks > 0) {
      structureLabels.push(`${structureChecks} señales confirmadas`);
    }
  }
  
  total += structurePoints;
  
  // 6) SEÑALES DE CATÁLOGO (12 pts)
  let catalogPoints = 0;
  let catalogChecks = 0;
  const catalogLabels: string[] = [];
  
  if (catalogSignals) {
    // Libros +200 reviews (rango → 1-4 pts)
    const booksOver200Points = getBooksOver200ReviewsPoints(catalogSignals.booksOver200ReviewsRange ?? null);
    if (booksOver200Points > 0) { 
      catalogPoints += booksOver200Points; 
      catalogChecks++; 
      catalogLabels.push(`+200 RW (${booksOver200Points}pts)`);
    }
    if (catalogSignals.hasProfitableBooks) { 
      catalogPoints += 5; 
      catalogChecks++; 
      catalogLabels.push('≥3 rentables');
    }
    if (catalogSignals.hasBooksUnder100Reviews) { 
      catalogPoints += 3; 
      catalogChecks++; 
      catalogLabels.push('-100 reviews');
    }
  }
  
  total += catalogPoints;
  
  // 7) PENALIZACIONES (solo trafficSource - se restan al final)
  let penaltyPoints = 0;
  const penaltyLabels: string[] = [];
  
  // Traffic Source penalties (NO brandRisk)
  if (data.trafficSource === 'brand') {
    penaltyPoints += penalties.trafficSource.brand;
    penaltyLabels.push(`Tráfico marca: ${penalties.trafficSource.brand}`);
  } else if (data.trafficSource === 'rrss') {
    penaltyPoints += penalties.trafficSource.rrss;
    penaltyLabels.push(`Tráfico RRSS: ${penalties.trafficSource.rrss}`);
  } else if (data.trafficSource === 'other') {
    penaltyPoints += penalties.trafficSource.other;
    penaltyLabels.push(`Tráfico externo: ${penalties.trafficSource.other}`);
  }
  
  // Cap penalty
  penaltyPoints = Math.max(penaltyPoints, penalties.maxPenalty);
  
  total += penaltyPoints;
  
  // Clamp to 0-100
  total = Math.max(0, Math.min(100, Math.round(total)));
  
  return {
    volume: { points: volumePoints, max: SCORE_WEIGHTS.volume, label: volumeLabel, ratio: volumeRatio },
    competitors: { points: competitorsPoints, max: SCORE_WEIGHTS.competitors, label: competitorsLabel, ratio: competitorsRatio },
    price: { points: pricePoints, max: SCORE_WEIGHTS.price, label: priceLabel, ratio: priceRatio },
    royalties: { points: royaltiesPoints, max: SCORE_WEIGHTS.royalties, label: royaltiesLabel, ratio: royaltiesRatio },
    marketStructure: { 
      points: structurePoints, 
      max: SCORE_WEIGHTS.marketStructure, 
      label: structureLabels.length > 0 ? structureLabels.join(', ') : 'Sin datos de estructura',
      checks: structureChecks,
    },
    catalogSignals: {
      points: catalogPoints,
      max: SCORE_WEIGHTS.catalogSignals,
      label: catalogLabels.length > 0 ? catalogLabels.join(', ') : 'Sin señales de catálogo',
      checks: catalogChecks,
    },
    penalties: { 
      points: penaltyPoints, 
      label: penaltyLabels.length > 0 ? penaltyLabels.join(', ') : 'Sin penalizaciones' 
    },
    total,
  };
}

// Simple score calculation (returns only total)
export function getMarketScoreTotal(data: MarketData, marketplaceId?: string): number {
  return calculateMarketScore(data, marketplaceId).total;
}

// ============ EDITORIAL SCORE ============
// NO afecta Market Score - es informativo (5 checks)

export function calculateEditorialScore(data: EditorialData): number {
  const { checklist } = data;
  let score = 0;
  
  if (checklist.makesSenseAsBook === true) score += 1;
  if (checklist.canCreateThisBook === true) score += 1;
  if (checklist.canDoItBetter === true) score += 1;
  if (checklist.canDifferentiate === true) score += 1;
  if (checklist.personalInterest === true) score += 1;
  
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

export const TRAFFIC_SOURCE_OPTIONS: { value: TrafficSource; label: string; color: string; penalty: number }[] = [
  { value: 'amazon', label: 'Amazon', color: 'bg-green-500/20 text-green-600 dark:text-green-400', penalty: 0 },
  { value: 'rrss', label: 'RRSS', color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400', penalty: -7 },
  { value: 'brand', label: 'Marca personal', color: 'bg-red-500/20 text-red-600 dark:text-red-400', penalty: -20 },
  { value: 'other', label: 'Otras', color: 'bg-orange-500/20 text-orange-600 dark:text-orange-400', penalty: -10 },
];

export const KEYWORD_STATUS_OPTIONS: { value: KeywordStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' },
  { value: 'valid', label: 'Válida', color: 'bg-green-500/20 text-green-600 dark:text-green-400' },
  { value: 'discarded', label: 'Descartada', color: 'bg-red-500/20 text-red-600 dark:text-red-400' },
];

export const KEYWORD_PURPOSE_OPTIONS: { value: KeywordPurpose; label: string; description: string }[] = [
  { value: 'editorial', label: 'Editorial', description: 'Para decidir si crear libros' },
  { value: 'ads', label: 'Ads', description: 'Para gestión de campañas' },
  { value: 'both', label: 'Ambos', description: 'Editorial y publicidad' },
];

// ============ MARKET STRUCTURE CHECKS ============

export const MARKET_STRUCTURE_CHECKS = [
  { id: 'selfContained', label: 'Se entiende por sí sola', tooltip: 'La keyword es clara y no requiere contexto adicional.', points: 2 },
  { id: 'amazonSuggestion', label: 'Sugerencia Amazon', tooltip: 'Aparece como autocompletado en la barra de búsqueda de Amazon.', points: 2 },
  { id: 'booksSellingWell', label: '≥3 libros vendiendo', tooltip: 'Hay al menos 3 libros con ventas consistentes en el nicho.', points: 2 },
  { id: 'indieAuthorsSelling', label: 'Autores indie vendiendo', tooltip: 'Hay autores independientes posicionados, no solo editoriales grandes.', points: 2 },
  { id: 'topMatchesIntent', label: 'Top refleja intención', tooltip: 'Los resultados top coinciden con la intención real de búsqueda.', points: 2 },
  { id: 'variantsPotential', label: 'Variantes con potencial', tooltip: 'Existen keywords relacionadas que también pueden funcionar.', points: 2 },
] as const;

// ============ CATALOG SIGNALS CHECKS ============

// Checks booleanos de catálogo (sin incluir booksOver200ReviewsRange que es un rango)
export const CATALOG_SIGNALS_CHECKS = [
  { id: 'hasProfitableBooks', label: '≥3 libros rentables', tooltip: 'Al menos 3 libros generan ingresos consistentes.', points: 5 },
  { id: 'hasBooksUnder100Reviews', label: 'Libros −100 reviews', tooltip: 'Hay libros con menos de 100 reviews, indica oportunidad de entrada.', points: 3 },
] as const;

// Metadata para el campo de rango "Libros +200 reviews"
export const BOOKS_OVER_200_REVIEWS_FIELD = {
  id: 'booksOver200ReviewsRange',
  label: 'Libros con +200 reviews',
  tooltip: 'Número aproximado de libros del nicho que superan las 200 reviews. Indica validación fuerte de demanda y aporta hasta 4 puntos al Market Score.',
  maxPoints: 4,
} as const;

// ============ EDITORIAL CHECKS ============
// 5 checks que NO afectan al Market Score

export const EDITORIAL_CHECKS = [
  { id: 'makesSenseAsBook', label: 'Tiene sentido como libro' },
  { id: 'canCreateThisBook', label: 'Puedo crear este libro' },
  { id: 'canDoItBetter', label: 'Puedo hacerlo mejor' },
  { id: 'canDifferentiate', label: 'Puedo diferenciarlo' },
  { id: 'personalInterest', label: 'Tengo interés personal' },
] as const;
