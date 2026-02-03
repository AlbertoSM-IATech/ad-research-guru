/**
 * Backup merge utilities for combining backup data with current state
 */
import type { 
  Keyword, 
  TargetASIN, 
  AdvertisingCategory, 
  CampaignPlan, 
  BookInfo,
  BookEconomy,
} from '@/types/advertising';
import { normalizeText } from '@/types/advertising';

/**
 * Merge two arrays by ID, with new items added and existing items updated
 * @param current Current items
 * @param incoming Incoming items from backup
 * @param idField Field to use as unique identifier
 * @param normalizeField Optional field to use for normalization fallback
 */
function mergeArrayById<T extends { id: string }>(
  current: T[],
  incoming: T[],
  normalizeField?: keyof T
): { merged: T[]; added: number; updated: number } {
  const currentMap = new Map(current.map(item => [item.id, item]));
  const normalizedMap = normalizeField 
    ? new Map(current.map(item => [normalizeText(String(item[normalizeField])), item]))
    : new Map<string, T>();
  
  let added = 0;
  let updated = 0;
  
  for (const item of incoming) {
    // First try to find by ID
    if (currentMap.has(item.id)) {
      // Update existing item, preserving certain fields
      const existing = currentMap.get(item.id)!;
      currentMap.set(item.id, { ...existing, ...item, id: existing.id });
      updated++;
    } else if (normalizeField) {
      // Try to find by normalized field (e.g., keyword text)
      const normalizedKey = normalizeText(String(item[normalizeField]));
      if (normalizedMap.has(normalizedKey)) {
        const existing = normalizedMap.get(normalizedKey)!;
        currentMap.set(existing.id, { ...existing, ...item, id: existing.id });
        updated++;
      } else {
        // Add new item
        currentMap.set(item.id, item);
        added++;
      }
    } else {
      // Add new item
      currentMap.set(item.id, item);
      added++;
    }
  }
  
  return {
    merged: Array.from(currentMap.values()),
    added,
    updated,
  };
}

/**
 * Merge keywords by marketplace
 * Keywords are matched by ID first, then by normalized keyword text within the same marketplace
 */
export function mergeKeywordsByMarket(
  current: Record<string, Keyword[]>,
  incoming: Record<string, Keyword[]>
): { 
  merged: Record<string, Keyword[]>; 
  stats: { added: number; updated: number } 
} {
  const merged: Record<string, Keyword[]> = { ...current };
  let totalAdded = 0;
  let totalUpdated = 0;
  
  for (const [marketplace, incomingKeywords] of Object.entries(incoming)) {
    const currentKeywords = merged[marketplace] || [];
    
    // Create lookup maps for this marketplace
    const currentById = new Map(currentKeywords.map(k => [k.id, k]));
    const currentByNormalized = new Map(
      currentKeywords.map(k => [normalizeText(k.keyword), k])
    );
    
    const result: Keyword[] = [...currentKeywords];
    
    for (const incomingKw of incomingKeywords) {
      // First try by ID
      if (currentById.has(incomingKw.id)) {
        const existing = currentById.get(incomingKw.id)!;
        const idx = result.findIndex(k => k.id === existing.id);
        if (idx >= 0) {
          // Merge, preserving adsData and history
          result[idx] = {
            ...existing,
            ...incomingKw,
            id: existing.id,
            adsData: existing.adsData || incomingKw.adsData,
            history: [...(existing.history || []), ...(incomingKw.history || [])].slice(-100),
          };
          totalUpdated++;
        }
      } else {
        // Try by normalized keyword
        const normalized = normalizeText(incomingKw.keyword);
        if (currentByNormalized.has(normalized)) {
          const existing = currentByNormalized.get(normalized)!;
          const idx = result.findIndex(k => k.id === existing.id);
          if (idx >= 0) {
            result[idx] = {
              ...existing,
              ...incomingKw,
              id: existing.id,
              adsData: existing.adsData || incomingKw.adsData,
              history: [...(existing.history || []), ...(incomingKw.history || [])].slice(-100),
            };
            totalUpdated++;
          }
        } else {
          // New keyword
          result.push(incomingKw);
          totalAdded++;
        }
      }
    }
    
    merged[marketplace] = result;
  }
  
  return {
    merged,
    stats: { added: totalAdded, updated: totalUpdated },
  };
}

/**
 * Merge ASINs by marketplace
 */
export function mergeAsinsByMarket(
  current: Record<string, TargetASIN[]>,
  incoming: Record<string, TargetASIN[]>
): { 
  merged: Record<string, TargetASIN[]>; 
  stats: { added: number; updated: number } 
} {
  const merged: Record<string, TargetASIN[]> = { ...current };
  let totalAdded = 0;
  let totalUpdated = 0;
  
  for (const [marketplace, incomingAsins] of Object.entries(incoming)) {
    const currentAsins = merged[marketplace] || [];
    
    // Create lookup maps
    const currentById = new Map(currentAsins.map(a => [a.id, a]));
    const currentByAsin = new Map(
      currentAsins.map(a => [a.asin.toUpperCase(), a])
    );
    
    const result: TargetASIN[] = [...currentAsins];
    
    for (const incomingAsin of incomingAsins) {
      if (currentById.has(incomingAsin.id)) {
        const existing = currentById.get(incomingAsin.id)!;
        const idx = result.findIndex(a => a.id === existing.id);
        if (idx >= 0) {
          result[idx] = { ...existing, ...incomingAsin, id: existing.id };
          totalUpdated++;
        }
      } else {
        const normalizedAsin = incomingAsin.asin.toUpperCase();
        if (currentByAsin.has(normalizedAsin)) {
          const existing = currentByAsin.get(normalizedAsin)!;
          const idx = result.findIndex(a => a.id === existing.id);
          if (idx >= 0) {
            result[idx] = { ...existing, ...incomingAsin, id: existing.id };
            totalUpdated++;
          }
        } else {
          result.push(incomingAsin);
          totalAdded++;
        }
      }
    }
    
    merged[marketplace] = result;
  }
  
  return {
    merged,
    stats: { added: totalAdded, updated: totalUpdated },
  };
}

/**
 * Merge categories by marketplace
 */
export function mergeCategoriesByMarket(
  current: Record<string, AdvertisingCategory[]>,
  incoming: Record<string, AdvertisingCategory[]>
): { 
  merged: Record<string, AdvertisingCategory[]>; 
  stats: { added: number; updated: number } 
} {
  const merged: Record<string, AdvertisingCategory[]> = { ...current };
  let totalAdded = 0;
  let totalUpdated = 0;
  
  for (const [marketplace, incomingCats] of Object.entries(incoming)) {
    const currentCats = merged[marketplace] || [];
    
    // Create lookup maps
    const currentById = new Map(currentCats.map(c => [c.id, c]));
    const currentByAmazonId = new Map(
      currentCats.filter(c => c.amazonId).map(c => [c.amazonId, c])
    );
    const currentByName = new Map(
      currentCats.map(c => [normalizeText(c.name), c])
    );
    
    const result: AdvertisingCategory[] = [...currentCats];
    
    for (const incomingCat of incomingCats) {
      if (currentById.has(incomingCat.id)) {
        const existing = currentById.get(incomingCat.id)!;
        const idx = result.findIndex(c => c.id === existing.id);
        if (idx >= 0) {
          result[idx] = { ...existing, ...incomingCat, id: existing.id };
          totalUpdated++;
        }
      } else if (incomingCat.amazonId && currentByAmazonId.has(incomingCat.amazonId)) {
        const existing = currentByAmazonId.get(incomingCat.amazonId)!;
        const idx = result.findIndex(c => c.id === existing.id);
        if (idx >= 0) {
          result[idx] = { ...existing, ...incomingCat, id: existing.id };
          totalUpdated++;
        }
      } else {
        const normalizedName = normalizeText(incomingCat.name);
        if (currentByName.has(normalizedName)) {
          const existing = currentByName.get(normalizedName)!;
          const idx = result.findIndex(c => c.id === existing.id);
          if (idx >= 0) {
            result[idx] = { ...existing, ...incomingCat, id: existing.id };
            totalUpdated++;
          }
        } else {
          result.push(incomingCat);
          totalAdded++;
        }
      }
    }
    
    merged[marketplace] = result;
  }
  
  return {
    merged,
    stats: { added: totalAdded, updated: totalUpdated },
  };
}

/**
 * Merge campaign plans by marketplace
 */
export function mergeCampaignPlansByMarket(
  current: Record<string, CampaignPlan[]>,
  incoming: Record<string, CampaignPlan[]>
): { 
  merged: Record<string, CampaignPlan[]>; 
  stats: { added: number; updated: number } 
} {
  const merged: Record<string, CampaignPlan[]> = { ...current };
  let totalAdded = 0;
  let totalUpdated = 0;
  
  for (const [marketplace, incomingPlans] of Object.entries(incoming)) {
    const currentPlans = merged[marketplace] || [];
    
    const currentById = new Map(currentPlans.map(p => [p.id, p]));
    const currentByName = new Map(
      currentPlans.map(p => [normalizeText(p.name), p])
    );
    
    const result: CampaignPlan[] = [...currentPlans];
    
    for (const incomingPlan of incomingPlans) {
      if (currentById.has(incomingPlan.id)) {
        const existing = currentById.get(incomingPlan.id)!;
        const idx = result.findIndex(p => p.id === existing.id);
        if (idx >= 0) {
          result[idx] = { ...existing, ...incomingPlan, id: existing.id };
          totalUpdated++;
        }
      } else {
        const normalizedName = normalizeText(incomingPlan.name);
        if (currentByName.has(normalizedName)) {
          const existing = currentByName.get(normalizedName)!;
          const idx = result.findIndex(p => p.id === existing.id);
          if (idx >= 0) {
            result[idx] = { ...existing, ...incomingPlan, id: existing.id };
            totalUpdated++;
          }
        } else {
          result.push(incomingPlan);
          totalAdded++;
        }
      }
    }
    
    merged[marketplace] = result;
  }
  
  return {
    merged,
    stats: { added: totalAdded, updated: totalUpdated },
  };
}

/**
 * Merge book info - only fill empty fields, don't overwrite existing
 */
export function mergeBookInfo(current: BookInfo, incoming: BookInfo): BookInfo {
  return {
    title: current.title || incoming.title,
    subtitle: current.subtitle || incoming.subtitle,
    description: current.description || incoming.description,
    categories: current.categories.length > 0 ? current.categories : incoming.categories,
    mainKeywordId: current.mainKeywordId || incoming.mainKeywordId,
  };
}

/**
 * Merge book economy - only fill if current has zeros
 */
export function mergeBookEconomy(current: BookEconomy, incoming: BookEconomy): BookEconomy {
  return {
    precioLibro: current.precioLibro > 0 ? current.precioLibro : incoming.precioLibro,
    regaliasPorVenta: current.regaliasPorVenta > 0 ? current.regaliasPorVenta : incoming.regaliasPorVenta,
  };
}

/**
 * Full backup merge operation
 */
export interface MergeResult {
  selectedMarketplace: string;
  activeTab: 'keywords' | 'asins' | 'categories';
  bookInfo: BookInfo;
  bookEconomy: BookEconomy;
  keywordsByMarket: Record<string, Keyword[]>;
  asinsByMarket: Record<string, TargetASIN[]>;
  categoriesByMarket: Record<string, AdvertisingCategory[]>;
  campaignPlansByMarket: Record<string, CampaignPlan[]>;
  showInsights: boolean;
  stats: {
    keywordsAdded: number;
    keywordsUpdated: number;
    asinsAdded: number;
    asinsUpdated: number;
    categoriesAdded: number;
    categoriesUpdated: number;
    plansAdded: number;
    plansUpdated: number;
  };
}

export function performMerge(
  current: {
    selectedMarketplace: string;
    activeTab: 'keywords' | 'asins' | 'categories';
    bookInfo: BookInfo;
    bookEconomy: BookEconomy;
    keywordsByMarket: Record<string, Keyword[]>;
    asinsByMarket: Record<string, TargetASIN[]>;
    categoriesByMarket: Record<string, AdvertisingCategory[]>;
    campaignPlansByMarket: Record<string, CampaignPlan[]>;
    showInsights: boolean;
  },
  incoming: {
    selectedMarketplace: string;
    activeTab: 'keywords' | 'asins' | 'categories';
    bookInfo: BookInfo;
    bookEconomy: BookEconomy;
    keywordsByMarket: Record<string, Keyword[]>;
    asinsByMarket: Record<string, TargetASIN[]>;
    categoriesByMarket: Record<string, AdvertisingCategory[]>;
    campaignPlansByMarket: Record<string, CampaignPlan[]>;
    showInsights: boolean;
  }
): MergeResult {
  const keywordsResult = mergeKeywordsByMarket(current.keywordsByMarket, incoming.keywordsByMarket);
  const asinsResult = mergeAsinsByMarket(current.asinsByMarket, incoming.asinsByMarket);
  const categoriesResult = mergeCategoriesByMarket(current.categoriesByMarket, incoming.categoriesByMarket);
  const plansResult = mergeCampaignPlansByMarket(current.campaignPlansByMarket, incoming.campaignPlansByMarket);
  
  return {
    selectedMarketplace: current.selectedMarketplace, // Keep current
    activeTab: current.activeTab, // Keep current
    bookInfo: mergeBookInfo(current.bookInfo, incoming.bookInfo),
    bookEconomy: mergeBookEconomy(current.bookEconomy, incoming.bookEconomy),
    keywordsByMarket: keywordsResult.merged,
    asinsByMarket: asinsResult.merged,
    categoriesByMarket: categoriesResult.merged,
    campaignPlansByMarket: plansResult.merged,
    showInsights: current.showInsights, // Keep current
    stats: {
      keywordsAdded: keywordsResult.stats.added,
      keywordsUpdated: keywordsResult.stats.updated,
      asinsAdded: asinsResult.stats.added,
      asinsUpdated: asinsResult.stats.updated,
      categoriesAdded: categoriesResult.stats.added,
      categoriesUpdated: categoriesResult.stats.updated,
      plansAdded: plansResult.stats.added,
      plansUpdated: plansResult.stats.updated,
    },
  };
}
