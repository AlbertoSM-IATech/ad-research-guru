// Market Score V2 - Sistema unificado de puntuación de mercado
// Scoring continuo proporcional (no por rangos rígidos)

import { getMarketScoreConfig, type MarketScoringConfig } from './market-score-config';

// ============ BRAND RISK & TRAFFIC SOURCE ============

export type BrandRisk = 'low' | 'medium' | 'high';
export type TrafficSource = 'amazon' | 'rrss' | 'brand' | 'other';
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

// ============ MARKET STRUCTURE (12 pts block - 6 checks x 2pts) ============

export interface MarketStructure {
  understandable?: boolean;       // La keyword se entiende por sí sola (+2)
  amazonSuggested?: boolean;      // Aparece como sugerencia en Amazon (+2)
  profitableBooks?: boolean;      // Veo al menos 3 libros vendiendo bien (+2)
  indieAuthors?: boolean;         // Hay autores independientes vendiendo (+2)
  intentMatch?: boolean;          // El top refleja la intención real (+2)
  variants?: boolean;             // Hay variantes cercanas con potencial (+2)
  // Legacy fields (deprecated but kept for backward compat)
  hasProfitableBooks?: boolean;
  hasBooksOver200Reviews?: boolean;
  hasBooksUnder100Reviews?: boolean;
}

// ============ SCORE BREAKDOWN ============

export interface MarketScoreBreakdown {
  volume: { points: number; max: number; label: string; ratio: number };
  competitors: { points: number; max: number; label: string; ratio: number };
  price: { points: number; max: number; label: string; ratio: number };
  royalties: { points: number; max: number; label: string; ratio: number };
  marketStructure: { points: number; max: number; label: string; checks: number };
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

export const getDefaultMarketStructure = (): MarketStructure => ({
  understandable: false,
  amazonSuggested: false,
  profitableBooks: false,
  indieAuthors: false,
  intentMatch: false,
  variants: false,
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

// ============ MARKET SCORE CALCULATION ============
// Pesos (total 100):
// - Volumen: 29.33 pts
// - Competidores: 39.11 pts
// - Precio: 9.78 pts
// - Regalías: 9.78 pts
// - Estructura del mercado: 12 pts
// - Penalizaciones: hasta -20 pts

export function calculateMarketScore(
  data: MarketData, 
  marketplaceId?: string,
  marketStructure?: MarketStructure
): MarketScoreBreakdown {
  const config = getMarketScoreConfig(marketplaceId);
  const { weights, penalties } = config;
  
  let total = 0;
  
  // 1) VOLUMEN (proporcional creciente)
  const volumeRatio = interpolateVolume(data.searchVolume, config);
  const volumePoints = Math.round(volumeRatio * weights.volume * 100) / 100;
  const volumeLabel = `${data.searchVolume.toLocaleString()} → ${Math.round(volumeRatio * 100)}%`;
  total += volumePoints;
  
  // 2) COMPETIDORES (proporcional decreciente)
  const competitorsRatio = interpolateCompetitors(data.competitors, config);
  const competitorsPoints = Math.round(competitorsRatio * weights.competitors * 100) / 100;
  const competitorsLabel = `${data.competitors.toLocaleString()} → ${Math.round(competitorsRatio * 100)}%`;
  total += competitorsPoints;
  
  // 3) PRECIO (crítico: <9.99 penaliza)
  const priceRatio = interpolatePrice(data.price, config);
  const pricePoints = Math.round(priceRatio * weights.price * 100) / 100;
  const priceLabel = `$${data.price.toFixed(2)} → ${Math.round(priceRatio * 100)}%`;
  total += pricePoints;
  
  // 4) REGALÍAS (proporcional creciente)
  const royaltiesRatio = interpolateRoyalties(data.royalties, config);
  const royaltiesPoints = Math.round(royaltiesRatio * weights.royalties * 100) / 100;
  const royaltiesLabel = `$${data.royalties.toFixed(2)} → ${Math.round(royaltiesRatio * 100)}%`;
  total += royaltiesPoints;
  
  // 5) ESTRUCTURA DEL MERCADO (12 puntos máx - 6 checks x 2pts)
  let structurePoints = 0;
  let structureChecks = 0;
  const structureLabels: string[] = [];
  
  if (marketStructure) {
    // New 6-check system (2 pts each)
    if (marketStructure.understandable) { structurePoints += 2; structureChecks++; }
    if (marketStructure.amazonSuggested) { structurePoints += 2; structureChecks++; }
    if (marketStructure.profitableBooks) { structurePoints += 2; structureChecks++; }
    if (marketStructure.indieAuthors) { structurePoints += 2; structureChecks++; }
    if (marketStructure.intentMatch) { structurePoints += 2; structureChecks++; }
    if (marketStructure.variants) { structurePoints += 2; structureChecks++; }
    
    // Legacy support (if new fields not set, check legacy)
    if (structureChecks === 0) {
      if (marketStructure.hasProfitableBooks) { structurePoints += 4; structureChecks++; }
      if (marketStructure.hasBooksOver200Reviews) { structurePoints += 4; structureChecks++; }
      if (marketStructure.hasBooksUnder100Reviews) { structurePoints += 4; structureChecks++; }
    }
    
    if (structureChecks > 0) {
      structureLabels.push(`${structureChecks} señales confirmadas`);
    }
  }
  
  total += structurePoints;
  
  // 6) PENALIZACIONES (se restan al final)
  let penaltyPoints = 0;
  const penaltyLabels: string[] = [];
  
  // Brand Risk
  if (data.brandRisk === 'high') {
    penaltyPoints += penalties.brandRisk.high;
    penaltyLabels.push(`Brand risk alto: ${penalties.brandRisk.high}`);
  } else if (data.brandRisk === 'medium') {
    penaltyPoints += penalties.brandRisk.medium;
    penaltyLabels.push(`Brand risk medio: ${penalties.brandRisk.medium}`);
  }
  
  // Traffic Source
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
    volume: { points: volumePoints, max: weights.volume, label: volumeLabel, ratio: volumeRatio },
    competitors: { points: competitorsPoints, max: weights.competitors, label: competitorsLabel, ratio: competitorsRatio },
    price: { points: pricePoints, max: weights.price, label: priceLabel, ratio: priceRatio },
    royalties: { points: royaltiesPoints, max: weights.royalties, label: royaltiesLabel, ratio: royaltiesRatio },
    marketStructure: { 
      points: structurePoints, 
      max: weights.structure, 
      label: structureLabels.length > 0 ? structureLabels.join(', ') : 'Sin datos de estructura',
      checks: structureChecks,
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
// NO afecta Market Score - es informativo

export function calculateEditorialScore(data: EditorialData): number {
  const { checklist } = data;
  let score = 0;
  
  if (checklist.canCreate === true) score += 1;
  if (checklist.canDoBetter === true) score += 1;
  if (checklist.canDifferentiate === true) score += 1;
  if (checklist.fitsStrategy === true) score += 1;
  
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
  { value: 'editorial', label: 'Editorial', description: 'Para decisión de crear libros' },
  { value: 'ads', label: 'Ads', description: 'Para optimización y publicidad' },
  { value: 'both', label: 'Ambos', description: 'Editorial y publicidad' },
];

// ============ MARKET STRUCTURE CHECKS ============

export const MARKET_STRUCTURE_CHECKS = [
  { id: 'understandable', label: 'La keyword se entiende por sí sola', points: 2 },
  { id: 'amazonSuggested', label: 'Aparece como sugerencia en Amazon', points: 2 },
  { id: 'profitableBooks', label: 'Veo al menos 3 libros vendiendo bien', points: 2 },
  { id: 'indieAuthors', label: 'Hay autores independientes vendiendo', points: 2 },
  { id: 'intentMatch', label: 'El top refleja la intención real', points: 2 },
  { id: 'variants', label: 'Hay variantes cercanas con potencial', points: 2 },
] as const;
