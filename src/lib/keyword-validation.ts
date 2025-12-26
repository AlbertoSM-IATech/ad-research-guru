// This file is deprecated - use market-score.ts instead
// Kept for backward compatibility during migration

export type ValidationStatus = 'discovering' | 'validated' | 'discarded' | 'approved';
export type TrafficSource = 'amazon' | 'brand' | 'social' | 'external';
export type BooksOver200Reviews = 'none' | 'few' | 'many';
export type ChecklistAnswer = 'yes' | 'no' | 'na';

export interface ChecklistItem {
  id: string;
  question: string;
  answer: ChecklistAnswer;
  notes: string;
}

export interface ChecklistGroup {
  id: string;
  title: string;
  items: ChecklistItem[];
}

// Re-export from market-score for compatibility
export {
  calculateMarketScore,
  getMarketScoreLevel,
  getMarketScoreColor,
  getMarketScoreBgColor,
  MARKET_SCORE_LEVELS,
} from './market-score';

// Deprecated - use market-score functions instead
export interface KeywordValidation {
  hasTrademark: boolean;
  autosuggestPresence: boolean;
  profitableBooksCount: number;
  booksOver200Reviews: BooksOver200Reviews;
  booksUnder100Reviews: boolean;
  trafficSource: TrafficSource;
  contentFeasibilityScore: number;
  extraOpportunityScore: number;
  validationStatus: ValidationStatus;
  validationStatusOverride?: ValidationStatus;
  validationNotes: string;
  checklist: ChecklistGroup[];
  updatedAt: Date;
}

export const TRAFFIC_SOURCE_OPTIONS: { value: TrafficSource; label: string; color: string; penalty: boolean }[] = [
  { value: 'amazon', label: 'Amazon orgánico', color: 'bg-green-500/20 text-green-600 border-green-500/30', penalty: false },
  { value: 'brand', label: 'Marca personal', color: 'bg-red-500/20 text-red-600 border-red-500/30', penalty: true },
  { value: 'social', label: 'Redes sociales', color: 'bg-orange-500/20 text-orange-600 border-orange-500/30', penalty: true },
  { value: 'external', label: 'Tráfico externo', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30', penalty: true },
];

export const BOOKS_OVER_200_OPTIONS: { value: BooksOver200Reviews; label: string; color: string }[] = [
  { value: 'none', label: 'Ninguno (0)', color: 'bg-green-500/20 text-green-600 border-green-500/30' },
  { value: 'few', label: 'Pocos (1-5)', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  { value: 'many', label: 'Muchos (6+)', color: 'bg-orange-500/20 text-orange-600 border-orange-500/30' },
];

export const VALIDATION_STATUS_OPTIONS: { value: ValidationStatus; label: string; color: string }[] = [
  { value: 'discovering', label: 'Descubriendo', color: 'bg-blue-500/20 text-blue-600 border-blue-500/30' },
  { value: 'validated', label: 'Validada', color: 'bg-green-500/20 text-green-600 border-green-500/30' },
  { value: 'approved', label: 'Aprobada', color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' },
  { value: 'discarded', label: 'Descartada', color: 'bg-red-500/20 text-red-600 border-red-500/30' },
];

export const PROFITABLE_BOOKS_OPTIONS = [
  { value: 0, label: '0 libros', color: 'bg-red-500/20 text-red-600' },
  { value: 1, label: '1 libro', color: 'bg-orange-500/20 text-orange-600' },
  { value: 2, label: '2 libros', color: 'bg-yellow-500/20 text-yellow-600' },
  { value: 3, label: '3 libros', color: 'bg-lime-500/20 text-lime-600' },
  { value: 4, label: '4 libros', color: 'bg-green-500/20 text-green-600' },
  { value: 5, label: '5+ libros', color: 'bg-emerald-500/20 text-emerald-600' },
];

export const getDefaultChecklist = (): ChecklistGroup[] => [
  {
    id: 'market-interest',
    title: 'Interés del mercado',
    items: [
      { id: 'mi-1', question: '¿La keyword se entiende sola, sin contexto adicional?', answer: 'na', notes: '' },
      { id: 'mi-2', question: '¿Amazon la sugiere al escribirla (autocompletado)?', answer: 'na', notes: '' },
      { id: 'mi-3', question: '¿Ves varios títulos con ventas consistentes usando esta keyword?', answer: 'na', notes: '' },
      { id: 'mi-4', question: '¿Hay independientes compitiendo con resultados razonables?', answer: 'na', notes: '' },
    ],
  },
  {
    id: 'competitive-pressure',
    title: 'Presión competitiva',
    items: [
      { id: 'cp-1', question: '¿El tamaño del mercado está en un rango asumible?', answer: 'na', notes: '' },
      { id: 'cp-2', question: '¿Los resultados están alineados con la intención real de la keyword?', answer: 'na', notes: '' },
      { id: 'cp-3', question: '¿Hay señales de demanda sólida (muchos títulos con reviews altas)?', answer: 'na', notes: '' },
      { id: 'cp-4', question: '¿Hay espacio para entrar (títulos con pocas reviews visibles)?', answer: 'na', notes: '' },
    ],
  },
  {
    id: 'execution-capability',
    title: 'Capacidad de ejecución',
    items: [
      { id: 'ec-1', question: '¿Podemos producir este tipo de libro con nuestros recursos?', answer: 'na', notes: '' },
      { id: 'ec-2', question: '¿Podemos hacerlo mejor en valor/estructura/promesa?', answer: 'na', notes: '' },
      { id: 'ec-3', question: '¿Podemos diferenciarlo de forma clara?', answer: 'na', notes: '' },
    ],
  },
  {
    id: 'strategic-fit',
    title: 'Encaje estratégico',
    items: [
      { id: 'sf-1', question: '¿Hay variaciones cercanas que también parecen rentables?', answer: 'na', notes: '' },
      { id: 'sf-2', question: '¿Encaja con nuestra estrategia/intereses a medio plazo?', answer: 'na', notes: '' },
    ],
  },
];

export const getDefaultValidation = (): KeywordValidation => ({
  hasTrademark: false,
  autosuggestPresence: false,
  profitableBooksCount: 0,
  booksOver200Reviews: 'none',
  booksUnder100Reviews: false,
  trafficSource: 'amazon',
  contentFeasibilityScore: 0,
  extraOpportunityScore: 0,
  validationStatus: 'discovering',
  validationNotes: '',
  checklist: getDefaultChecklist(),
  updatedAt: new Date(),
});

// ============ DEPRECATED FUNCTIONS ============
// These are now replaced by market-score.ts

import type { Keyword, RelevanceLevel } from '@/types/advertising';
import { 
  calculateMarketScore, 
  getDefaultMarketData, 
  type MarketData 
} from './market-score';

// Legacy function - now uses Market Score
export const calculateRelevanceScore = (keyword: Keyword): number => {
  if (keyword.marketData) {
    return calculateMarketScore(keyword.marketData);
  }
  // Fallback: derive from legacy fields
  const legacyMarketData: MarketData = {
    searchVolume: keyword.searchVolume || 0,
    competitors: keyword.competitionNote 
      ? parseInt(keyword.competitionNote.replace(/[^\d]/g, '')) || 0 
      : keyword.competitionLevel === 'low' ? 500 : keyword.competitionLevel === 'high' ? 15000 : 3000,
    brandPresent: false,
    priceBucket: '9.99-14.99',
    royaltiesBucket: '2-3.99',
    highReviewCountBucket: 'none',
  };
  return calculateMarketScore(legacyMarketData);
};

export const calculateValidationStatus = (score: number): ValidationStatus => {
  if (score >= 70) return 'validated';
  if (score >= 50) return 'discovering';
  if (score >= 30) return 'discovering';
  return 'discarded';
};

export const scoreToRelevanceLevel = (score: number): RelevanceLevel => {
  if (score >= 70) return 'very-high';
  if (score >= 50) return 'high';
  if (score >= 30) return 'low';
  return 'none';
};

export const relevanceLevelToScore = (relevance: RelevanceLevel): number => {
  switch (relevance) {
    case 'very-high': return 85;
    case 'high': return 60;
    case 'low': return 40;
    case 'none': return 15;
  }
};

export interface ValidationAlert {
  type: 'error' | 'warning';
  message: string;
  field: string;
}

export const getValidationAlerts = (keyword: Keyword): ValidationAlert[] => {
  const alerts: ValidationAlert[] = [];
  
  if (keyword.searchVolume <= 50) {
    alerts.push({ type: 'warning', field: 'searchVolume', message: 'Volumen de búsqueda muy bajo' });
  }
  
  if (keyword.competitionLevel === 'high') {
    alerts.push({ type: 'warning', field: 'competitionLevel', message: 'Competencia alta' });
  }
  
  return alerts;
};

export const getScoreColor = (score: number): string => {
  if (score >= 70) return 'text-green-600';
  if (score >= 50) return 'text-blue-600';
  if (score >= 30) return 'text-yellow-600';
  return 'text-red-600';
};

export const getScoreBgColor = (score: number): string => {
  if (score >= 70) return 'bg-green-500/20';
  if (score >= 50) return 'bg-blue-500/20';
  if (score >= 30) return 'bg-yellow-500/20';
  return 'bg-red-500/20';
};

export interface ScoreImpact {
  field: string;
  label: string;
  impact: number;
  type: 'positive' | 'negative' | 'neutral';
}

export const getScoreImpacts = (keyword: Keyword): ScoreImpact[] => {
  const impacts: ScoreImpact[] = [];
  const volume = keyword.searchVolume || 0;
  
  let volumeImpact = 0;
  if (volume <= 50) volumeImpact = 0;
  else if (volume <= 100) volumeImpact = 10;
  else if (volume <= 600) volumeImpact = 20;
  else volumeImpact = 30;
  
  impacts.push({
    field: 'volume',
    label: `Volumen: ${volume.toLocaleString()}`,
    impact: volumeImpact,
    type: volumeImpact > 10 ? 'positive' : volumeImpact < 10 ? 'negative' : 'neutral',
  });
  
  let compImpact = 0;
  switch (keyword.competitionLevel) {
    case 'low': compImpact = 25; break;
    case 'medium': compImpact = 18; break;
    case 'high': compImpact = 0; break;
  }
  impacts.push({
    field: 'competition',
    label: `Competencia: ${keyword.competitionLevel}`,
    impact: compImpact,
    type: compImpact > 10 ? 'positive' : compImpact < 10 ? 'negative' : 'neutral',
  });
  
  return impacts;
};
