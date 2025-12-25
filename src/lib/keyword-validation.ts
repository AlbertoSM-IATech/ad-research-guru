// Keyword Validation Types and Scoring Logic

import type { RelevanceLevel } from '@/types/advertising';

// ============ TYPES ============

export type ValidationStatus = 'unvalidated' | 'reviewing' | 'validated' | 'discarded';
export type RelevanceMode = 'manual' | 'from_validation';

export type BrandRegistered = 'yes' | 'no';
export type VolumeBucket = '<50' | '50-100' | '101-600' | '>600';
export type CompetitorsBucket = '<1000' | '1000-4000' | '4000-10000' | '>10000';
export type ProfitableBooks = '0' | '1' | '2' | '3' | '4' | '5+';
export type BooksOver200ReviewsBucket = '0-5' | '5-9' | '9-15' | '>15';
export type HasBooksUnder100Reviews = 'yes' | 'no';
export type PriceBucket = '<9.99' | '9.99-12' | '>12';
export type RoyaltiesBucket = '<1.99' | '2-3.99' | '4-5.99' | '>6';
export type MainTrafficSource = 'amazon' | 'personal_brand' | 'social' | 'other';
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

export interface KeywordValidation {
  // Core validation fields
  brandRegistered?: BrandRegistered;
  volumeBucket?: VolumeBucket;
  competitorsBucket?: CompetitorsBucket;
  profitableBooks?: ProfitableBooks;
  booksOver200ReviewsBucket?: BooksOver200ReviewsBucket;
  hasBooksUnder100Reviews?: HasBooksUnder100Reviews;
  priceBucket?: PriceBucket;
  royaltiesBucket?: RoyaltiesBucket;
  mainTrafficSource?: MainTrafficSource;
  validationNotes: string;
  
  // Checklist
  excelCriteria: ChecklistGroup[];
  
  // Calculated fields
  validationScore: number;
  validationStatus: ValidationStatus;
  validationStatusOverride?: ValidationStatus;
  
  // Relevance integration
  relevanceMode: RelevanceMode;
  
  // Metadata
  updatedAt: Date;
}

// ============ CONSTANTS ============

export const BRAND_REGISTERED_OPTIONS: { value: BrandRegistered; label: string; color: string }[] = [
  { value: 'no', label: 'No registrada', color: 'bg-green-500/20 text-green-600 border-green-500/30' },
  { value: 'yes', label: 'Marca registrada', color: 'bg-red-500/20 text-red-600 border-red-500/30' },
];

export const VOLUME_BUCKET_OPTIONS: { value: VolumeBucket; label: string; color: string }[] = [
  { value: '<50', label: '< 50', color: 'bg-red-500/20 text-red-600 border-red-500/30' },
  { value: '50-100', label: '50-100', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  { value: '101-600', label: '101-600', color: 'bg-green-500/20 text-green-600 border-green-500/30' },
  { value: '>600', label: '> 600', color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' },
];

export const COMPETITORS_BUCKET_OPTIONS: { value: CompetitorsBucket; label: string; color: string }[] = [
  { value: '<1000', label: '< 1,000', color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' },
  { value: '1000-4000', label: '1,000-4,000', color: 'bg-green-500/20 text-green-600 border-green-500/30' },
  { value: '4000-10000', label: '4,000-10,000', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  { value: '>10000', label: '> 10,000', color: 'bg-red-500/20 text-red-600 border-red-500/30' },
];

export const PROFITABLE_BOOKS_OPTIONS: { value: ProfitableBooks; label: string; color: string }[] = [
  { value: '0', label: '0 libros', color: 'bg-red-500/20 text-red-600 border-red-500/30' },
  { value: '1', label: '1 libro', color: 'bg-orange-500/20 text-orange-600 border-orange-500/30' },
  { value: '2', label: '2 libros', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  { value: '3', label: '3 libros', color: 'bg-lime-500/20 text-lime-600 border-lime-500/30' },
  { value: '4', label: '4 libros', color: 'bg-green-500/20 text-green-600 border-green-500/30' },
  { value: '5+', label: '5+ libros', color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' },
];

export const BOOKS_OVER_200_REVIEWS_OPTIONS: { value: BooksOver200ReviewsBucket; label: string; color: string }[] = [
  { value: '0-5', label: '0-5', color: 'bg-green-500/20 text-green-600 border-green-500/30' },
  { value: '5-9', label: '5-9', color: 'bg-lime-500/20 text-lime-600 border-lime-500/30' },
  { value: '9-15', label: '9-15', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  { value: '>15', label: '> 15', color: 'bg-orange-500/20 text-orange-600 border-orange-500/30' },
];

export const HAS_BOOKS_UNDER_100_REVIEWS_OPTIONS: { value: HasBooksUnder100Reviews; label: string; color: string }[] = [
  { value: 'yes', label: 'Sí hay espacio', color: 'bg-green-500/20 text-green-600 border-green-500/30' },
  { value: 'no', label: 'No hay espacio', color: 'bg-red-500/20 text-red-600 border-red-500/30' },
];

export const PRICE_BUCKET_OPTIONS: { value: PriceBucket; label: string; color: string }[] = [
  { value: '<9.99', label: '< $9.99', color: 'bg-red-500/20 text-red-600 border-red-500/30' },
  { value: '9.99-12', label: '$9.99-12', color: 'bg-green-500/20 text-green-600 border-green-500/30' },
  { value: '>12', label: '> $12', color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' },
];

export const ROYALTIES_BUCKET_OPTIONS: { value: RoyaltiesBucket; label: string; color: string }[] = [
  { value: '<1.99', label: '< $1.99', color: 'bg-red-500/20 text-red-600 border-red-500/30' },
  { value: '2-3.99', label: '$2-3.99', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  { value: '4-5.99', label: '$4-5.99', color: 'bg-green-500/20 text-green-600 border-green-500/30' },
  { value: '>6', label: '> $6', color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' },
];

export const TRAFFIC_SOURCE_OPTIONS: { value: MainTrafficSource; label: string; color: string; warning?: boolean }[] = [
  { value: 'amazon', label: 'Amazon orgánico', color: 'bg-green-500/20 text-green-600 border-green-500/30' },
  { value: 'personal_brand', label: 'Marca personal', color: 'bg-red-500/20 text-red-600 border-red-500/30', warning: true },
  { value: 'social', label: 'Redes sociales', color: 'bg-red-500/20 text-red-600 border-red-500/30', warning: true },
  { value: 'other', label: 'Otro', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
];

export const VALIDATION_STATUS_OPTIONS: { value: ValidationStatus; label: string; color: string }[] = [
  { value: 'unvalidated', label: 'Sin validar', color: 'bg-muted text-muted-foreground border-border' },
  { value: 'reviewing', label: 'En revisión', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  { value: 'validated', label: 'Validada', color: 'bg-green-500/20 text-green-600 border-green-500/30' },
  { value: 'discarded', label: 'Descartada', color: 'bg-red-500/20 text-red-600 border-red-500/30' },
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
      { id: 'cp-1', question: '¿El tamaño del mercado está en un rango asumible (competidores)?', answer: 'na', notes: '' },
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

// ============ SCORING LOGIC ============

export const calculateValidationScore = (validation: Partial<KeywordValidation>): number => {
  let score = 50; // Base score

  // 1) brandRegistered
  if (validation.brandRegistered === 'yes') score -= 25;
  // no = 0

  // 2) volumeBucket
  switch (validation.volumeBucket) {
    case '<50': score -= 12; break;
    case '50-100': score -= 5; break;
    case '101-600': score += 10; break;
    case '>600': score += 18; break;
  }

  // 3) competitorsBucket
  switch (validation.competitorsBucket) {
    case '<1000': score += 22; break;
    case '1000-4000': score += 12; break;
    case '4000-10000': score -= 12; break;
    case '>10000': score -= 22; break;
  }

  // 4) profitableBooks
  switch (validation.profitableBooks) {
    case '0': score -= 18; break;
    case '1': score -= 10; break;
    case '2': score += 0; break;
    case '3': score += 8; break;
    case '4': score += 12; break;
    case '5+': score += 16; break;
  }

  // 5) hasBooksUnder100Reviews
  if (validation.hasBooksUnder100Reviews === 'yes') score += 10;
  else if (validation.hasBooksUnder100Reviews === 'no') score -= 10;

  // 6) booksOver200ReviewsBucket (penaliza suave)
  switch (validation.booksOver200ReviewsBucket) {
    case '0-5': score += 0; break;
    case '5-9': score -= 2; break;
    case '9-15': score -= 4; break;
    case '>15': score -= 6; break;
  }

  // 7) priceBucket
  switch (validation.priceBucket) {
    case '<9.99': score -= 12; break;
    case '9.99-12': score += 6; break;
    case '>12': score += 12; break;
  }

  // 8) royaltiesBucket
  switch (validation.royaltiesBucket) {
    case '<1.99': score -= 15; break;
    case '2-3.99': score += 0; break;
    case '4-5.99': score += 12; break;
    case '>6': score += 18; break;
  }

  // 9) mainTrafficSource
  switch (validation.mainTrafficSource) {
    case 'amazon': score += 10; break;
    case 'personal_brand': score -= 15; break;
    case 'social': score -= 15; break;
    case 'other': score -= 5; break;
  }

  // Clamp 0..100
  return Math.max(0, Math.min(100, score));
};

export const hasMinimumValidationData = (validation: Partial<KeywordValidation>): boolean => {
  return !!(validation.brandRegistered && validation.volumeBucket && validation.competitorsBucket);
};

export const calculateValidationStatus = (validation: Partial<KeywordValidation>): ValidationStatus => {
  // Check for override first
  if (validation.validationStatusOverride) {
    return validation.validationStatusOverride;
  }

  // Check minimum data
  if (!hasMinimumValidationData(validation)) {
    return 'unvalidated';
  }

  const score = validation.validationScore ?? calculateValidationScore(validation);

  if (score >= 70) return 'validated';
  if (score <= 35) return 'discarded';
  return 'reviewing';
};

// ============ RELEVANCE MAPPING ============

export const scoreToRelevanceLevel = (score: number): RelevanceLevel => {
  if (score >= 75) return 'very-high';
  if (score >= 56) return 'high';
  if (score >= 36) return 'low';
  return 'none';
};

export const relevanceLevelToScore = (relevance: RelevanceLevel): number => {
  switch (relevance) {
    case 'very-high': return 87; // midpoint of 75-100
    case 'high': return 65; // midpoint of 56-74
    case 'low': return 45; // midpoint of 36-55
    case 'none': return 17; // midpoint of 0-35
  }
};

// ============ ALERTS ============

export interface ValidationAlert {
  type: 'error' | 'warning';
  message: string;
  field: string;
}

export const getValidationAlerts = (validation: Partial<KeywordValidation>): ValidationAlert[] => {
  const alerts: ValidationAlert[] = [];

  if (validation.brandRegistered === 'yes') {
    alerts.push({ type: 'error', field: 'brandRegistered', message: 'Marca registrada - alto riesgo' });
  }

  if (validation.competitorsBucket === '>10000') {
    alerts.push({ type: 'error', field: 'competitorsBucket', message: 'Competencia extrema (>10,000)' });
  }

  if (validation.priceBucket === '<9.99') {
    alerts.push({ type: 'warning', field: 'priceBucket', message: 'Precio bajo (<$9.99)' });
  }

  if (validation.royaltiesBucket === '<1.99') {
    alerts.push({ type: 'warning', field: 'royaltiesBucket', message: 'Regalías bajas (<$1.99)' });
  }

  if (validation.mainTrafficSource === 'personal_brand' || validation.mainTrafficSource === 'social') {
    alerts.push({ type: 'error', field: 'mainTrafficSource', message: 'Tráfico no orgánico (RRSS/Marca)' });
  }

  if (validation.hasBooksUnder100Reviews === 'no') {
    alerts.push({ type: 'warning', field: 'hasBooksUnder100Reviews', message: 'Sin espacio para entrar' });
  }

  return alerts;
};

// ============ DEFAULT VALIDATION ============

export const getDefaultValidation = (): KeywordValidation => ({
  validationNotes: '',
  excelCriteria: getDefaultChecklist(),
  validationScore: 50,
  validationStatus: 'unvalidated',
  relevanceMode: 'manual',
  updatedAt: new Date(),
});

// ============ SCORE COLOR ============

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
