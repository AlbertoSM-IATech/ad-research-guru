// Predefined filter presets for ADS and Editorial (Nicho) views

import type { AdvancedFiltersState } from '@/components/advertising/AdvancedFilters';
import type { AdsFiltersState } from '@/components/advertising/AdvancedFiltersAds';

export interface PredefinedPreset {
  id: string;
  name: string;
  type: 'editorial' | 'ads';
  filters: AdvancedFiltersState | AdsFiltersState;
  description?: string;
}

// Default editorial filters state
const defaultEditorialFilters: AdvancedFiltersState = {
  minVolume: '',
  maxVolume: '',
  minCompetition: '',
  maxCompetition: '',
  status: 'all',
  campaignName: '',
  marketScoreRanges: [],
  has200PlusReviews: false,
  hasUnder100Reviews: false,
};

// Default ADS filters state
const defaultAdsFilters: AdsFiltersState = {
  campaignName: '',
  minClicks: '',
  maxClicks: '',
  minCpc: '',
  maxCpc: '',
  minPedidos: '',
  maxPedidos: '',
  minAcos: '',
  maxAcos: '',
  minBeneficio: '',
  maxBeneficio: '',
  rentabilidad: 'all',
  needsAttention: false,
};

// ========== EDITORIAL (NICHO) PRESETS ==========

export const EDITORIAL_PRESETS: PredefinedPreset[] = [
  {
    id: 'preset-editorial-pending',
    name: 'KW Pendiente de validar',
    type: 'editorial',
    description: 'Keywords que aún no han sido revisadas',
    filters: {
      ...defaultEditorialFilters,
      status: 'pending',
    },
  },
  {
    id: 'preset-editorial-200rw-100rw',
    name: '+200RW y -100RW (Competencia baja)',
    type: 'editorial',
    description: 'Mercados con libros establecidos pero espacio para nuevos',
    filters: {
      ...defaultEditorialFilters,
      has200PlusReviews: true,
      hasUnder100Reviews: true,
    },
  },
  {
    id: 'preset-editorial-high-score',
    name: 'Market Score alto (70+)',
    type: 'editorial',
    description: 'Keywords con mejor puntuación de mercado',
    filters: {
      ...defaultEditorialFilters,
      marketScoreRanges: ['70-100'],
    },
  },
  {
    id: 'preset-editorial-low-competition',
    name: 'Competencia baja (<1000)',
    type: 'editorial',
    description: 'Mercados con pocos resultados en Amazon',
    filters: {
      ...defaultEditorialFilters,
      maxCompetition: '1000',
    },
  },
  {
    id: 'preset-editorial-candidate',
    name: 'Candidatas a validar (40-70)',
    type: 'editorial',
    description: 'Keywords con potencial que requieren revisión',
    filters: {
      ...defaultEditorialFilters,
      marketScoreRanges: ['40-70'],
      status: 'pending',
    },
  },
];

// ========== ADS PRESETS ==========

export const ADS_PRESETS: PredefinedPreset[] = [
  {
    id: 'preset-ads-above-acos-pe',
    name: 'Por encima del ACOS PE',
    type: 'ads',
    description: 'Keywords con ACOS actual mayor al punto de equilibrio (perdiendo dinero)',
    filters: {
      ...defaultAdsFilters,
      rentabilidad: 'unprofitable',
    },
  },
  {
    id: 'preset-ads-below-acos-pe',
    name: 'Por debajo del ACOS PE',
    type: 'ads',
    description: 'Keywords con ACOS actual menor al punto de equilibrio (rentables)',
    filters: {
      ...defaultAdsFilters,
      rentabilidad: 'profitable',
    },
  },
  {
    id: 'preset-ads-conversion-0-2',
    name: 'Conversión 0-2%',
    type: 'ads',
    description: 'Keywords con baja tasa de conversión',
    filters: {
      ...defaultAdsFilters,
      minClicks: '1', // At least some clicks to calculate conversion
    },
  },
  {
    id: 'preset-ads-conversion-2-4',
    name: 'Conversión 2-4%',
    type: 'ads',
    description: 'Keywords con conversión media-baja',
    filters: {
      ...defaultAdsFilters,
      minPedidos: '1',
    },
  },
  {
    id: 'preset-ads-high-clicks-no-sales',
    name: 'Muchos clicks, sin ventas',
    type: 'ads',
    description: 'Keywords que consumen presupuesto sin generar ventas',
    filters: {
      ...defaultAdsFilters,
      minClicks: '10',
      maxPedidos: '0',
    },
  },
  {
    id: 'preset-ads-positive-benefit',
    name: 'Beneficio positivo',
    type: 'ads',
    description: 'Keywords que están generando beneficio neto',
    filters: {
      ...defaultAdsFilters,
      rentabilidad: 'profitable',
      minBeneficio: '0.01',
    },
  },
  {
    id: 'preset-ads-negative-benefit',
    name: 'Beneficio negativo',
    type: 'ads',
    description: 'Keywords que están generando pérdidas',
    filters: {
      ...defaultAdsFilters,
      rentabilidad: 'unprofitable',
    },
  },
];

// Get all predefined presets
export const ALL_PREDEFINED_PRESETS: PredefinedPreset[] = [
  ...EDITORIAL_PRESETS,
  ...ADS_PRESETS,
];

// Get presets by type
export const getPredefinedPresetsByType = (type: 'editorial' | 'ads'): PredefinedPreset[] => {
  return type === 'editorial' ? EDITORIAL_PRESETS : ADS_PRESETS;
};
