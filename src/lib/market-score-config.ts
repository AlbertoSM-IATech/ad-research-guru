// Market Score V2 Config - Marketplace-specific scoring configuration
// Scoring continuo proporcional con anclas configurables

// ============ TYPES ============

export interface VolumeAnchors {
  v0: number;  // muy bajo
  v1: number;  // bajo
  v2: number;  // bueno
  ideal: number; // ideal
}

export interface CompetitorsAnchors {
  c0: number;  // excelente (pocos)
  c1: number;  // bueno
  c2: number;  // saturado
  ideal: number; // ideal (max tolerable)
}

export interface RoyaltiesAnchors {
  r0: number;  // mínimo
  r1: number;  // bajo
  r2: number;  // bueno
  ideal: number; // ideal
}

export interface ScoringWeights {
  volume: number;        // default 29.33
  competitors: number;   // default 39.11
  price: number;         // default 9.78
  royalties: number;     // default 9.78
  structure: number;     // fixed 12
}

export interface Penalties {
  brandRisk: { low: 0; medium: number; high: number };
  trafficSource: { amazon: 0; brand: number; rrss: number; other: number };
  maxPenalty: number; // default -20
}

export interface MarketScoringConfig {
  marketplaceId: string;
  label: string;
  
  // Ideal targets (user configurable)
  idealVolume: number;
  idealCompetitors: number;
  idealPrice: number;
  idealRoyalties: number;
  
  // Anchors for interpolation
  volumeAnchors: VolumeAnchors;
  competitorsAnchors: CompetitorsAnchors;
  royaltiesAnchors: RoyaltiesAnchors;
  
  // Weights (sum to 100 before structure, + 12 for structure)
  weights: ScoringWeights;
  
  // Penalties
  penalties: Penalties;
}

// ============ DEFAULT WEIGHTS ============
const DEFAULT_WEIGHTS: ScoringWeights = {
  volume: 29.33,
  competitors: 39.11,
  price: 9.78,
  royalties: 9.78,
  structure: 12, // fixed
};

// ============ DEFAULT PENALTIES ============
const DEFAULT_PENALTIES: Penalties = {
  brandRisk: { low: 0, medium: -10, high: -20 },
  trafficSource: { amazon: 0, brand: -20, rrss: -7, other: -10 },
  maxPenalty: -20,
};

// ============ GENERATE ANCHORS FROM IDEALS ============

function generateVolumeAnchors(idealVolume: number): VolumeAnchors {
  return {
    v0: Math.round(idealVolume * 0.05),   // 5% = muy bajo
    v1: Math.round(idealVolume * 0.15),   // 15% = bajo
    v2: Math.round(idealVolume * 0.5),    // 50% = bueno
    ideal: idealVolume,
  };
}

function generateCompetitorsAnchors(idealCompetitors: number): CompetitorsAnchors {
  return {
    c0: Math.round(idealCompetitors * 0.3),   // <30% = excelente
    c1: Math.round(idealCompetitors * 0.7),   // <70% = bueno
    c2: Math.round(idealCompetitors * 1.5),   // >150% = saturado
    ideal: idealCompetitors,
  };
}

function generateRoyaltiesAnchors(idealRoyalties: number): RoyaltiesAnchors {
  return {
    r0: 1.99,  // mínimo fijo
    r1: 3.99,  // bajo fijo
    r2: 6.00,  // bueno fijo
    ideal: idealRoyalties,
  };
}

// ============ MARKETPLACE CONFIGS ============

function createMarketConfig(
  marketplaceId: string,
  label: string,
  idealVolume: number,
  idealCompetitors: number,
  idealPrice: number,
  idealRoyalties: number
): MarketScoringConfig {
  return {
    marketplaceId,
    label,
    idealVolume,
    idealCompetitors,
    idealPrice,
    idealRoyalties,
    volumeAnchors: generateVolumeAnchors(idealVolume),
    competitorsAnchors: generateCompetitorsAnchors(idealCompetitors),
    royaltiesAnchors: generateRoyaltiesAnchors(idealRoyalties),
    weights: { ...DEFAULT_WEIGHTS },
    penalties: { ...DEFAULT_PENALTIES },
  };
}

// Default config (España)
const DEFAULT_CONFIG = createMarketConfig('default', 'Por defecto', 600, 1000, 12.99, 4.5);

// Spain
const ES_CONFIG = createMarketConfig('es', 'España', 600, 1000, 12.99, 4.5);

// USA
const US_CONFIG = createMarketConfig('us', 'Estados Unidos', 1000, 1500, 14.99, 5.5);

// UK
const UK_CONFIG = createMarketConfig('uk', 'Reino Unido', 800, 1200, 12.99, 4.5);

// Germany
const DE_CONFIG = createMarketConfig('de', 'Alemania', 700, 1100, 12.99, 4.5);

// France
const FR_CONFIG = createMarketConfig('fr', 'Francia', 600, 1000, 11.99, 4.0);

// Italy
const IT_CONFIG = createMarketConfig('it', 'Italia', 500, 900, 10.99, 3.5);

// Config registry
export const MARKET_SCORE_CONFIG_BY_MARKETPLACE: Record<string, MarketScoringConfig> = {
  default: DEFAULT_CONFIG,
  es: ES_CONFIG,
  us: US_CONFIG,
  uk: UK_CONFIG,
  de: DE_CONFIG,
  fr: FR_CONFIG,
  it: IT_CONFIG,
};

// ============ USER OVERRIDES ============

const USER_CONFIG_STORAGE_KEY = 'ad-research:market-score-config:v2';

export interface UserMarketScoreOverrides {
  idealVolume?: number;
  idealCompetitors?: number;
  idealPrice?: number;
  idealRoyalties?: number;
}

export type AllUserOverrides = Record<string, UserMarketScoreOverrides>;

/**
 * Load user overrides from localStorage
 */
export function loadUserConfigOverrides(): AllUserOverrides {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(USER_CONFIG_STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as AllUserOverrides;
  } catch {
    return {};
  }
}

/**
 * Save user overrides to localStorage
 */
export function saveUserConfigOverrides(overrides: AllUserOverrides): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USER_CONFIG_STORAGE_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.warn('[MarketScoreConfig] Failed to save user overrides:', e);
  }
}

/**
 * Get the market score configuration for a marketplace
 * Merges base config with user overrides if present
 */
export function getMarketScoreConfig(marketplaceId?: string): MarketScoringConfig {
  const id = marketplaceId || 'default';
  const baseConfig = MARKET_SCORE_CONFIG_BY_MARKETPLACE[id] || DEFAULT_CONFIG;
  
  // Load user overrides
  const userOverrides = loadUserConfigOverrides();
  const userConfig = userOverrides[id];
  
  if (!userConfig) {
    return baseConfig;
  }
  
  // Merge user ideals with base
  const idealVolume = userConfig.idealVolume ?? baseConfig.idealVolume;
  const idealCompetitors = userConfig.idealCompetitors ?? baseConfig.idealCompetitors;
  const idealPrice = userConfig.idealPrice ?? baseConfig.idealPrice;
  const idealRoyalties = userConfig.idealRoyalties ?? baseConfig.idealRoyalties;
  
  return {
    ...baseConfig,
    idealVolume,
    idealCompetitors,
    idealPrice,
    idealRoyalties,
    volumeAnchors: generateVolumeAnchors(idealVolume),
    competitorsAnchors: generateCompetitorsAnchors(idealCompetitors),
    royaltiesAnchors: generateRoyaltiesAnchors(idealRoyalties),
  };
}

/**
 * Get the default (non-overridden) config for a marketplace
 */
export function getDefaultMarketScoreConfig(marketplaceId?: string): MarketScoringConfig {
  const id = marketplaceId || 'default';
  return MARKET_SCORE_CONFIG_BY_MARKETPLACE[id] || DEFAULT_CONFIG;
}

/**
 * Get available marketplace configs (for UI dropdowns)
 */
export function getAvailableMarketScoreConfigs(): MarketScoringConfig[] {
  return Object.values(MARKET_SCORE_CONFIG_BY_MARKETPLACE).filter(c => c.marketplaceId !== 'default');
}

// Legacy exports for backward compatibility
export type IdealTargets = {
  searchVolume: number;
  competitors: number;
  price: number;
  royalties: number;
};

export type MarketScoreConfig = MarketScoringConfig;
