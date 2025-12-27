// Market Score V2 Config - Marketplace-specific scoring configuration

export interface MarketScoreThresholds {
  volume: {
    veryLow: number;  // Below this = 0 points
    low: number;      // Below this = 10 points
    medium: number;   // Below this = 20 points
    // Above = 30 points
  };
  competitors: {
    low: number;      // Below this = 25 points
    medium: number;   // Below this = 18 points
    high: number;     // Below this = 8 points
    // Above = 0 points
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
  thresholds: MarketScoreThresholds;
}

// Default configuration (used as fallback)
const DEFAULT_CONFIG: MarketScoreConfig = {
  id: 'default',
  label: 'Default',
  thresholds: {
    volume: { veryLow: 50, low: 100, medium: 600 },
    competitors: { low: 1000, medium: 4000, high: 10000 },
    price: { low: 9.99, medium: 15, high: 20 },
    royalties: { low: 2, medium: 4, high: 7 },
    penalties: { brandRiskHigh: 6, brandRiskMedium: 3, nonAmazonTraffic: 4 },
  },
};

// US Configuration - Higher volume thresholds, more competitive
const US_CONFIG: MarketScoreConfig = {
  id: 'us',
  label: 'Estados Unidos',
  thresholds: {
    volume: { veryLow: 100, low: 250, medium: 1000 },
    competitors: { low: 2000, medium: 8000, high: 20000 },
    price: { low: 9.99, medium: 14.99, high: 19.99 },
    royalties: { low: 2.5, medium: 5, high: 8 },
    penalties: { brandRiskHigh: 8, brandRiskMedium: 4, nonAmazonTraffic: 5 },
  },
};

// ES Configuration - Lower volume thresholds (smaller market)
const ES_CONFIG: MarketScoreConfig = {
  id: 'es',
  label: 'España',
  thresholds: {
    volume: { veryLow: 30, low: 80, medium: 400 },
    competitors: { low: 500, medium: 2000, high: 5000 },
    price: { low: 7.99, medium: 12, high: 16 },
    royalties: { low: 1.5, medium: 3, high: 5 },
    penalties: { brandRiskHigh: 5, brandRiskMedium: 2, nonAmazonTraffic: 3 },
  },
};

// Config registry
export const MARKET_SCORE_CONFIG_BY_MARKETPLACE: Record<string, MarketScoreConfig> = {
  default: DEFAULT_CONFIG,
  us: US_CONFIG,
  es: ES_CONFIG,
};

/**
 * Get the market score configuration for a marketplace
 * Falls back to default if marketplace not configured
 */
export function getMarketScoreConfig(marketplaceId?: string): MarketScoreConfig {
  if (!marketplaceId) return DEFAULT_CONFIG;
  return MARKET_SCORE_CONFIG_BY_MARKETPLACE[marketplaceId] || DEFAULT_CONFIG;
}

/**
 * Get available marketplace configs (for UI dropdowns)
 */
export function getAvailableMarketScoreConfigs(): MarketScoreConfig[] {
  return Object.values(MARKET_SCORE_CONFIG_BY_MARKETPLACE).filter(c => c.id !== 'default');
}
