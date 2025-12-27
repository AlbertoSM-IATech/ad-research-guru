// Market Score V2 Config - Marketplace-specific scoring configuration

export interface IdealTargets {
  searchVolume: number;
  competitors: number;
  price: number;
  royalties: number;
}

export interface MarketScoreThresholds {
  volume: {
    veryLow: number;  // Below this = 0 points
    low: number;      // Below this = 10 points
    medium: number;   // Below this = 20 points
    // Above = 30 points
  };
  competitors: {
    low: number;      // Below this = 25 points (excellent)
    medium: number;   // Below this = 18 points (good)
    high: number;     // Below this = 8 points (moderate)
    // Above = 0 points (saturated)
  };
  price: {
    low: number;      // Below this = 0 points
    medium: number;   // Below this = 8 points
    high: number;     // Below this = 12 points
    // Above = 15 points
  };
  royalties: {
    low: number;      // Below this = 0 points
    medium: number;   // Below this = 8 points
    high: number;     // Below this = 14 points
    // Above = 20 points
  };
  penalties: {
    brandRiskHigh: number;    // Penalty for high brand risk
    brandRiskMedium: number;  // Penalty for medium brand risk
    nonAmazonTraffic: number; // Penalty for non-amazon traffic
  };
}

export interface MarketScoreConfig {
  id: string;
  label: string;
  ideal: IdealTargets;
  thresholds: MarketScoreThresholds;
}

// Default ideal targets
const DEFAULT_IDEAL: IdealTargets = {
  searchVolume: 600,
  competitors: 3000,
  price: 12,
  royalties: 4,
};

// US ideal targets
const US_IDEAL: IdealTargets = {
  searchVolume: 800,
  competitors: 4000,
  price: 14.99,
  royalties: 5,
};

// ES ideal targets (smaller market)
const ES_IDEAL: IdealTargets = {
  searchVolume: 300,
  competitors: 2000,
  price: 9.99,
  royalties: 3,
};

// Generate thresholds dynamically from ideal targets
function generateThresholdsFromIdeal(ideal: IdealTargets): MarketScoreThresholds {
  return {
    volume: {
      veryLow: Math.round(ideal.searchVolume * 0.1),
      low: Math.round(ideal.searchVolume * 0.25),
      medium: Math.round(ideal.searchVolume * 0.6),
    },
    competitors: {
      low: Math.round(ideal.competitors * 0.5),    // Excellent: < 50% of ideal
      medium: Math.round(ideal.competitors * 1.0), // Good: < 100% of ideal
      high: Math.round(ideal.competitors * 2.0),   // Moderate: < 200% of ideal
    },
    price: {
      low: 7.99,
      medium: Math.max(9.99, ideal.price * 0.7),
      high: ideal.price * 0.9,
    },
    royalties: {
      low: ideal.royalties * 0.4,
      medium: ideal.royalties * 0.7,
      high: ideal.royalties * 0.9,
    },
    penalties: {
      brandRiskHigh: 8,
      brandRiskMedium: 4,
      nonAmazonTraffic: 5,
    },
  };
}

// Default configuration (used as fallback)
const DEFAULT_CONFIG: MarketScoreConfig = {
  id: 'default',
  label: 'Default',
  ideal: DEFAULT_IDEAL,
  thresholds: generateThresholdsFromIdeal(DEFAULT_IDEAL),
};

// US Configuration - Higher volume thresholds, more competitive
const US_CONFIG: MarketScoreConfig = {
  id: 'us',
  label: 'Estados Unidos',
  ideal: US_IDEAL,
  thresholds: generateThresholdsFromIdeal(US_IDEAL),
};

// ES Configuration - Lower volume thresholds (smaller market)
const ES_CONFIG: MarketScoreConfig = {
  id: 'es',
  label: 'España',
  ideal: ES_IDEAL,
  thresholds: generateThresholdsFromIdeal(ES_IDEAL),
};

// Config registry
export const MARKET_SCORE_CONFIG_BY_MARKETPLACE: Record<string, MarketScoreConfig> = {
  default: DEFAULT_CONFIG,
  us: US_CONFIG,
  es: ES_CONFIG,
};

// LocalStorage key for user overrides
const USER_CONFIG_STORAGE_KEY = 'ad-research:market-score-config:v1';

// User overrides type
export type UserMarketScoreOverrides = Record<string, Partial<IdealTargets>>;

/**
 * Load user overrides from localStorage
 */
export function loadUserConfigOverrides(): UserMarketScoreOverrides {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(USER_CONFIG_STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as UserMarketScoreOverrides;
  } catch {
    return {};
  }
}

/**
 * Save user overrides to localStorage
 */
export function saveUserConfigOverrides(overrides: UserMarketScoreOverrides): void {
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
export function getMarketScoreConfig(marketplaceId?: string): MarketScoreConfig {
  const baseConfig = marketplaceId 
    ? (MARKET_SCORE_CONFIG_BY_MARKETPLACE[marketplaceId] || DEFAULT_CONFIG)
    : DEFAULT_CONFIG;
  
  // Load user overrides
  const userOverrides = loadUserConfigOverrides();
  const userIdeal = userOverrides[marketplaceId || 'default'];
  
  if (!userIdeal) {
    return baseConfig;
  }
  
  // Merge user ideal with base ideal
  const mergedIdeal: IdealTargets = {
    searchVolume: userIdeal.searchVolume ?? baseConfig.ideal.searchVolume,
    competitors: userIdeal.competitors ?? baseConfig.ideal.competitors,
    price: userIdeal.price ?? baseConfig.ideal.price,
    royalties: userIdeal.royalties ?? baseConfig.ideal.royalties,
  };
  
  return {
    ...baseConfig,
    ideal: mergedIdeal,
    thresholds: generateThresholdsFromIdeal(mergedIdeal),
  };
}

/**
 * Get the default (non-overridden) config for a marketplace
 */
export function getDefaultMarketScoreConfig(marketplaceId?: string): MarketScoreConfig {
  return marketplaceId 
    ? (MARKET_SCORE_CONFIG_BY_MARKETPLACE[marketplaceId] || DEFAULT_CONFIG)
    : DEFAULT_CONFIG;
}

/**
 * Get available marketplace configs (for UI dropdowns)
 */
export function getAvailableMarketScoreConfigs(): MarketScoreConfig[] {
  return Object.values(MARKET_SCORE_CONFIG_BY_MARKETPLACE).filter(c => c.id !== 'default');
}
