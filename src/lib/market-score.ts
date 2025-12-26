// Market Score V2 - Sistema unificado de puntuación de mercado
// Una keyword = una fuente de verdad

// ============ MARKET DATA TYPES ============

export type PriceBucket = '<9.99' | '9.99-14.99' | '15-19.99' | '>=20';
export type RoyaltiesBucket = '<1.99' | '2-3.99' | '4-5.99' | '>=6';
export type HighReviewCountBucket = 'none' | 'few' | 'many'; // 0, 1-5, 6+

export interface MarketData {
  searchVolume: number;
  competitors: number; // Resultados Amazon (número exacto)
  brandPresent: boolean;
  priceBucket: PriceBucket;
  royaltiesBucket: RoyaltiesBucket;
  highReviewCountBucket: HighReviewCountBucket;
}

// Strategic notes - NO afecta el Market Score
export interface StrategicData {
  strategicNotes: string;
  strategicFitScore: number; // 0-5, optional manual rating
}

// ============ MARKET SCORE LEVELS ============

export type MarketScoreLevel = 'excellent' | 'good' | 'low' | 'bad';

export const MARKET_SCORE_LEVELS: { 
  value: MarketScoreLevel; 
  label: string; 
  minScore: number; 
  color: string;
  bgColor: string;
}[] = [
  { value: 'excellent', label: 'Excelente', minScore: 70, color: 'text-green-600', bgColor: 'bg-green-500/20' },
  { value: 'good', label: 'Bueno', minScore: 50, color: 'text-blue-600', bgColor: 'bg-blue-500/20' },
  { value: 'low', label: 'Bajo', minScore: 30, color: 'text-yellow-600', bgColor: 'bg-yellow-500/20' },
  { value: 'bad', label: 'Malo', minScore: 0, color: 'text-red-600', bgColor: 'bg-red-500/20' },
];

// ============ DEFAULTS ============

export const getDefaultMarketData = (): MarketData => ({
  searchVolume: 0,
  competitors: 0,
  brandPresent: false,
  priceBucket: '9.99-14.99',
  royaltiesBucket: '2-3.99',
  highReviewCountBucket: 'none',
});

export const getDefaultStrategicData = (): StrategicData => ({
  strategicNotes: '',
  strategicFitScore: 0,
});

// ============ MARKET SCORE CALCULATION ============
// Scoring with exact weights:
// - Volumen (30%)
// - Competidores (25%)
// - Marca (10%)
// - Precio (15%)
// - Regalías (15%)
// - Penalización reviews (-5% máx)

export function calculateMarketScore(data: MarketData): number {
  let score = 0;
  
  // 1) VOLUMEN (30% = 0-30 points)
  // ≤50 → 0, 51-100 → 10, 101-600 → 20, >600 → 30
  if (data.searchVolume <= 50) {
    score += 0;
  } else if (data.searchVolume <= 100) {
    score += 10;
  } else if (data.searchVolume <= 600) {
    score += 20;
  } else {
    score += 30;
  }
  
  // 2) COMPETIDORES (25% = 0-25 points)
  // <1000 → 25, 1000-4000 → 18, 4001-10000 → 8, >10000 → 0
  if (data.competitors < 1000) {
    score += 25;
  } else if (data.competitors <= 4000) {
    score += 18;
  } else if (data.competitors <= 10000) {
    score += 8;
  } else {
    score += 0;
  }
  
  // 3) MARCA (10% = 0-10 points)
  // brandPresent = false → 10, true → 0
  if (!data.brandPresent) {
    score += 10;
  }
  
  // 4) PRECIO (15% = 0-15 points)
  // <9.99 → 0, 9.99-14.99 → 7, 15-19.99 → 12, >=20 → 15
  switch (data.priceBucket) {
    case '<9.99': score += 0; break;
    case '9.99-14.99': score += 7; break;
    case '15-19.99': score += 12; break;
    case '>=20': score += 15; break;
  }
  
  // 5) REGALÍAS (15% = 0-15 points)
  // <1.99 → 0, 2-3.99 → 5, 4-5.99 → 10, >=6 → 15
  switch (data.royaltiesBucket) {
    case '<1.99': score += 0; break;
    case '2-3.99': score += 5; break;
    case '4-5.99': score += 10; break;
    case '>=6': score += 15; break;
  }
  
  // 6) PENALIZACIÓN REVIEWS (-5% máx)
  // none → 0, few → -2, many → -5
  switch (data.highReviewCountBucket) {
    case 'none': break;
    case 'few': score -= 2; break;
    case 'many': score -= 5; break;
  }
  
  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

// ============ HELPERS ============

export function getMarketScoreLevel(score: number): MarketScoreLevel {
  if (score >= 70) return 'excellent';
  if (score >= 50) return 'good';
  if (score >= 30) return 'low';
  return 'bad';
}

export function getMarketScoreInfo(score: number) {
  const level = getMarketScoreLevel(score);
  return MARKET_SCORE_LEVELS.find(l => l.value === level)!;
}

export function getMarketScoreColor(score: number): string {
  return getMarketScoreInfo(score).color;
}

export function getMarketScoreBgColor(score: number): string {
  return getMarketScoreInfo(score).bgColor;
}

// ============ SCORE IMPACT BREAKDOWN ============

export interface MarketScoreImpact {
  field: string;
  label: string;
  value: string;
  points: number;
  maxPoints: number;
}

export function getMarketScoreBreakdown(data: MarketData): MarketScoreImpact[] {
  const impacts: MarketScoreImpact[] = [];
  
  // Volume
  let volumePoints = 0;
  if (data.searchVolume <= 50) volumePoints = 0;
  else if (data.searchVolume <= 100) volumePoints = 10;
  else if (data.searchVolume <= 600) volumePoints = 20;
  else volumePoints = 30;
  
  impacts.push({
    field: 'searchVolume',
    label: 'Volumen',
    value: data.searchVolume.toLocaleString(),
    points: volumePoints,
    maxPoints: 30,
  });
  
  // Competitors
  let compPoints = 0;
  if (data.competitors < 1000) compPoints = 25;
  else if (data.competitors <= 4000) compPoints = 18;
  else if (data.competitors <= 10000) compPoints = 8;
  else compPoints = 0;
  
  impacts.push({
    field: 'competitors',
    label: 'Competidores',
    value: data.competitors.toLocaleString(),
    points: compPoints,
    maxPoints: 25,
  });
  
  // Brand
  impacts.push({
    field: 'brandPresent',
    label: 'Sin marca',
    value: data.brandPresent ? 'Con marca' : 'Sin marca',
    points: data.brandPresent ? 0 : 10,
    maxPoints: 10,
  });
  
  // Price
  let pricePoints = 0;
  switch (data.priceBucket) {
    case '<9.99': pricePoints = 0; break;
    case '9.99-14.99': pricePoints = 7; break;
    case '15-19.99': pricePoints = 12; break;
    case '>=20': pricePoints = 15; break;
  }
  impacts.push({
    field: 'priceBucket',
    label: 'Precio',
    value: data.priceBucket,
    points: pricePoints,
    maxPoints: 15,
  });
  
  // Royalties
  let royaltyPoints = 0;
  switch (data.royaltiesBucket) {
    case '<1.99': royaltyPoints = 0; break;
    case '2-3.99': royaltyPoints = 5; break;
    case '4-5.99': royaltyPoints = 10; break;
    case '>=6': royaltyPoints = 15; break;
  }
  impacts.push({
    field: 'royaltiesBucket',
    label: 'Regalías',
    value: data.royaltiesBucket,
    points: royaltyPoints,
    maxPoints: 15,
  });
  
  // Review penalty
  let reviewPenalty = 0;
  switch (data.highReviewCountBucket) {
    case 'none': reviewPenalty = 0; break;
    case 'few': reviewPenalty = -2; break;
    case 'many': reviewPenalty = -5; break;
  }
  if (reviewPenalty !== 0) {
    impacts.push({
      field: 'highReviewCountBucket',
      label: 'Reviews altos',
      value: data.highReviewCountBucket === 'few' ? 'Pocos' : 'Muchos',
      points: reviewPenalty,
      maxPoints: 0,
    });
  }
  
  return impacts;
}

// ============ OPTIONS FOR UI ============

export const PRICE_BUCKET_OPTIONS: { value: PriceBucket; label: string }[] = [
  { value: '<9.99', label: 'Menos de $9.99' },
  { value: '9.99-14.99', label: '$9.99 - $14.99' },
  { value: '15-19.99', label: '$15 - $19.99' },
  { value: '>=20', label: '$20 o más' },
];

export const ROYALTIES_BUCKET_OPTIONS: { value: RoyaltiesBucket; label: string }[] = [
  { value: '<1.99', label: 'Menos de $1.99' },
  { value: '2-3.99', label: '$2 - $3.99' },
  { value: '4-5.99', label: '$4 - $5.99' },
  { value: '>=6', label: '$6 o más' },
];

export const HIGH_REVIEW_OPTIONS: { value: HighReviewCountBucket; label: string; description: string }[] = [
  { value: 'none', label: 'Ninguno', description: '0 libros con +200 reviews' },
  { value: 'few', label: 'Pocos', description: '1-5 libros con +200 reviews' },
  { value: 'many', label: 'Muchos', description: '6+ libros con +200 reviews' },
];
