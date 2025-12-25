// Keyword Validation Types and Scoring Logic - UNIFIED MODEL
// This module provides qualitative signals that ENRICH the keyword data
// without duplicating base fields (volume, competitors, price, royalties)

import type { Keyword, RelevanceLevel } from '@/types/advertising';

// ============ TYPES ============

export type ValidationStatus = 'discovering' | 'validated' | 'discarded' | 'approved';

// Traffic source - only 'amazon' is positive
export type TrafficSource = 'amazon' | 'brand' | 'social' | 'external';

// Books over 200 reviews - soft penalty
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

// NEW UNIFIED VALIDATION MODEL
// These are QUALITATIVE signals, NOT duplications of table data
export interface KeywordValidation {
  // Qualitative signals only (not duplicated from Keyword base fields)
  hasTrademark: boolean;                    // true = heavy penalty (×0.3)
  autosuggestPresence: boolean;             // true = demand signal (+5)
  profitableBooksCount: number;             // 0-5+ (higher = better)
  booksOver200Reviews: BooksOver200Reviews; // penalizes softly if 'many'
  booksUnder100Reviews: boolean;            // true = space to enter (+5)
  trafficSource: TrafficSource;             // only 'amazon' is neutral/positive
  
  // Editorial viability (0-3 questions answered yes)
  contentFeasibilityScore: number;          // 0-3 (+0 to +10)
  
  // Extra opportunity (0-2)
  extraOpportunityScore: number;            // 0-2 (+0 to +5)
  
  // Status
  validationStatus: ValidationStatus;
  validationStatusOverride?: ValidationStatus;
  
  // Notes
  validationNotes: string;
  
  // Checklist for detailed analysis
  checklist: ChecklistGroup[];
  
  // Metadata
  updatedAt: Date;
}

// ============ CONSTANTS ============

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

// ============ DEFAULT CHECKLIST ============

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

// ============ DEFAULT VALIDATION ============

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

// ============ UNIFIED SCORING LOGIC ============
// Uses BOTH keyword base data AND validation qualitative signals

export const calculateRelevanceScore = (keyword: Keyword): number => {
  const v = keyword.validation;
  let score = 0;
  
  // ============ 1) DEMANDA (40%) ============
  // Volume from keyword base data
  const volume = keyword.searchVolume || 0;
  if (volume <= 50) score -= 10;
  else if (volume <= 100) score -= 5;
  else if (volume <= 600) score += 10;
  else score += 20;
  
  // Autosuggest presence (from validation)
  if (v?.autosuggestPresence) score += 5;
  
  // ============ 2) COMPETENCIA (30%) ============
  // We use competitionNote if available (raw number), otherwise infer from level
  const competitorsRaw = keyword.competitionNote ? parseInt(keyword.competitionNote.replace(/[^\d]/g, '')) : null;
  
  if (competitorsRaw !== null && !isNaN(competitorsRaw)) {
    if (competitorsRaw < 1000) score += 20;
    else if (competitorsRaw <= 4000) score += 10;
    else if (competitorsRaw <= 10000) score -= 5;
    else score -= 15;
  } else {
    // Fallback to competition level
    switch (keyword.competitionLevel) {
      case 'low': score += 15; break;
      case 'medium': score += 0; break;
      case 'high': score -= 10; break;
    }
  }
  
  // Books over 200 reviews (soft penalty)
  if (v) {
    switch (v.booksOver200Reviews) {
      case 'none': score += 0; break;
      case 'few': score -= 3; break;
      case 'many': score -= 7; break;
    }
    
    // Books under 100 reviews (space to enter)
    if (v.booksUnder100Reviews) score += 5;
    else if (v.booksUnder100Reviews === false) score -= 5;
  }
  
  // ============ 3) MONETIZACIÓN (20%) ============
  // We don't have price/royalties as base keyword fields currently
  // But if they exist in future, we'd use them here
  // For now, score is neutral in this category
  
  // ============ 4) VIABILIDAD EDITORIAL (10%) ============
  if (v) {
    // contentFeasibilityScore: 0-3 → +0 to +10
    score += Math.min(v.contentFeasibilityScore, 3) * 3.33;
    
    // extraOpportunityScore: 0-2 → +0 to +5
    score += Math.min(v.extraOpportunityScore, 2) * 2.5;
  }
  
  // ============ 5) PENALIZACIONES DURAS ============
  // hasTrademark = true → multiply by 0.3
  if (v?.hasTrademark) {
    score = score * 0.3;
  }
  
  // trafficSource != amazon → -10
  if (v && v.trafficSource !== 'amazon') {
    score -= 10;
  }
  
  // Normalize to 0-100
  // Base calculation gives roughly -30 to +50, so we scale and clamp
  const normalized = Math.round(((score + 30) / 80) * 100);
  return Math.max(0, Math.min(100, normalized));
};

// Calculate status from score
export const calculateValidationStatus = (score: number, validation?: Partial<KeywordValidation>): ValidationStatus => {
  // Override takes precedence
  if (validation?.validationStatusOverride) {
    return validation.validationStatusOverride;
  }
  
  if (score >= 70) return 'validated';
  if (score <= 30) return 'discarded';
  return 'discovering';
};

// ============ RELEVANCE MAPPING ============

export const scoreToRelevanceLevel = (score: number): RelevanceLevel => {
  if (score >= 75) return 'very-high';
  if (score >= 55) return 'high';
  if (score >= 35) return 'low';
  return 'none';
};

export const relevanceLevelToScore = (relevance: RelevanceLevel): number => {
  switch (relevance) {
    case 'very-high': return 87;
    case 'high': return 65;
    case 'low': return 45;
    case 'none': return 17;
  }
};

// ============ ALERTS ============

export interface ValidationAlert {
  type: 'error' | 'warning';
  message: string;
  field: string;
}

export const getValidationAlerts = (keyword: Keyword): ValidationAlert[] => {
  const alerts: ValidationAlert[] = [];
  const v = keyword.validation;
  
  if (v?.hasTrademark) {
    alerts.push({ type: 'error', field: 'hasTrademark', message: 'Marca registrada - penalización severa (×0.3)' });
  }
  
  if (v?.trafficSource && v.trafficSource !== 'amazon') {
    alerts.push({ type: 'warning', field: 'trafficSource', message: `Tráfico no orgánico (${v.trafficSource})` });
  }
  
  if (v?.booksOver200Reviews === 'many') {
    alerts.push({ type: 'warning', field: 'booksOver200Reviews', message: 'Muchos libros con +200 reviews' });
  }
  
  if (v?.booksUnder100Reviews === false) {
    alerts.push({ type: 'warning', field: 'booksUnder100Reviews', message: 'Sin espacio para entrar (no hay libros con -100 reviews)' });
  }
  
  // Base data alerts
  if (keyword.searchVolume <= 50) {
    alerts.push({ type: 'warning', field: 'searchVolume', message: 'Volumen de búsqueda muy bajo' });
  }
  
  if (keyword.competitionLevel === 'high') {
    alerts.push({ type: 'warning', field: 'competitionLevel', message: 'Competencia alta' });
  }
  
  return alerts;
};

// ============ SCORE COLORS ============

export const getScoreColor = (score: number): string => {
  if (score >= 70) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  if (score >= 35) return 'text-orange-600';
  return 'text-red-600';
};

export const getScoreBgColor = (score: number): string => {
  if (score >= 70) return 'bg-green-500/20';
  if (score >= 50) return 'bg-yellow-500/20';
  if (score >= 35) return 'bg-orange-500/20';
  return 'bg-red-500/20';
};

// ============ SCORE IMPACT PREVIEW ============
// Shows how each field impacts the score

export interface ScoreImpact {
  field: string;
  label: string;
  impact: number;
  type: 'positive' | 'negative' | 'neutral';
}

export const getScoreImpacts = (keyword: Keyword): ScoreImpact[] => {
  const impacts: ScoreImpact[] = [];
  const v = keyword.validation;
  
  // Volume impact
  const volume = keyword.searchVolume || 0;
  let volumeImpact = 0;
  if (volume <= 50) volumeImpact = -10;
  else if (volume <= 100) volumeImpact = -5;
  else if (volume <= 600) volumeImpact = 10;
  else volumeImpact = 20;
  impacts.push({
    field: 'volume',
    label: `Volumen: ${volume.toLocaleString()}`,
    impact: volumeImpact,
    type: volumeImpact > 0 ? 'positive' : volumeImpact < 0 ? 'negative' : 'neutral',
  });
  
  // Competition impact
  let compImpact = 0;
  switch (keyword.competitionLevel) {
    case 'low': compImpact = 15; break;
    case 'medium': compImpact = 0; break;
    case 'high': compImpact = -10; break;
  }
  impacts.push({
    field: 'competition',
    label: `Competencia: ${keyword.competitionLevel}`,
    impact: compImpact,
    type: compImpact > 0 ? 'positive' : compImpact < 0 ? 'negative' : 'neutral',
  });
  
  if (v) {
    // Autosuggest
    if (v.autosuggestPresence) {
      impacts.push({ field: 'autosuggest', label: 'Autosuggest: Sí', impact: 5, type: 'positive' });
    }
    
    // Trademark
    if (v.hasTrademark) {
      impacts.push({ field: 'trademark', label: 'Marca registrada', impact: -70, type: 'negative' });
    }
    
    // Traffic source
    if (v.trafficSource !== 'amazon') {
      impacts.push({ field: 'traffic', label: `Tráfico: ${v.trafficSource}`, impact: -10, type: 'negative' });
    }
    
    // Feasibility
    if (v.contentFeasibilityScore > 0) {
      impacts.push({
        field: 'feasibility',
        label: `Viabilidad: ${v.contentFeasibilityScore}/3`,
        impact: Math.round(v.contentFeasibilityScore * 3.33),
        type: 'positive',
      });
    }
    
    // Extra opportunity
    if (v.extraOpportunityScore > 0) {
      impacts.push({
        field: 'opportunity',
        label: `Oportunidad extra: ${v.extraOpportunityScore}/2`,
        impact: Math.round(v.extraOpportunityScore * 2.5),
        type: 'positive',
      });
    }
  }
  
  return impacts;
};
