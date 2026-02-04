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
// Criterios claros basados en ACOS vs PE (punto de equilibrio)

export const ADS_PRESETS: PredefinedPreset[] = [
  {
    id: 'preset-ads-needs-attention',
    name: 'Necesitan atención',
    type: 'ads',
    description: 'Keywords con ACOS > PE (perdiendo dinero)',
    filters: {
      ...defaultAdsFilters,
      needsAttention: true,
    },
  },
  {
    id: 'preset-ads-profitable',
    name: 'Rentables (ACOS ≤ PE)',
    type: 'ads',
    description: 'Keywords con ACOS actual por debajo del punto de equilibrio',
    filters: {
      ...defaultAdsFilters,
      rentabilidad: 'profitable',
    },
  },
  {
    id: 'preset-ads-unprofitable',
    name: 'No rentables (ACOS > PE)',
    type: 'ads',
    description: 'Keywords con ACOS actual por encima del punto de equilibrio',
    filters: {
      ...defaultAdsFilters,
      rentabilidad: 'unprofitable',
    },
  },
  {
    id: 'preset-ads-high-spend-no-sales',
    name: 'Alto gasto sin ventas',
    type: 'ads',
    description: 'Keywords con clicks pero sin pedidos',
    filters: {
      ...defaultAdsFilters,
      minClicks: '10',
      maxPedidos: '0',
    },
  },
  {
    id: 'preset-ads-low-acos',
    name: 'ACOS muy bajo (<20%)',
    type: 'ads',
    description: 'Keywords muy eficientes, posiblemente escalables',
    filters: {
      ...defaultAdsFilters,
      maxAcos: '20',
    },
  },
  {
    id: 'preset-ads-high-acos',
    name: 'ACOS alto (>50%)',
    type: 'ads',
    description: 'Keywords con ACOS muy alto, revisar optimización',
    filters: {
      ...defaultAdsFilters,
      minAcos: '50',
    },
  },
  {
    id: 'preset-ads-with-orders',
    name: 'Con ventas',
    type: 'ads',
    description: 'Keywords que han generado al menos un pedido',
    filters: {
      ...defaultAdsFilters,
      minPedidos: '1',
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
