// ============================================================
// Hook: Amazon Ads data persistence (localStorage)
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import type {
  AmazonAdsStore,
  AdsImportBatch,
  AdsEntityCampaign,
  AdsEntityAdGroup,
  AdsEntityTarget,
  AdsDailyMetrics,
  ThresholdConfig,
} from '@/types/amazon-ads';
import { DEFAULT_THRESHOLDS } from '@/types/amazon-ads';

const STORE_VERSION = 1;

function getStorageKey(bookId?: string): string {
  return bookId
    ? `amazon-ads:${bookId}:v${STORE_VERSION}`
    : `amazon-ads:v${STORE_VERSION}`;
}

function loadStore(bookId?: string): AmazonAdsStore {
  try {
    const raw = localStorage.getItem(getStorageKey(bookId));
    if (!raw) return createEmpty();
    const parsed = JSON.parse(raw) as AmazonAdsStore;
    if (parsed.version !== STORE_VERSION) return createEmpty();
    return parsed;
  } catch {
    return createEmpty();
  }
}

function createEmpty(): AmazonAdsStore {
  return {
    version: 1,
    batches: [],
    campaigns: [],
    adgroups: [],
    targets: [],
    dailyMetrics: [],
    thresholds: {},
    updatedAt: new Date().toISOString(),
  };
}

function saveStore(store: AmazonAdsStore, bookId?: string): void {
  try {
    store.updatedAt = new Date().toISOString();
    localStorage.setItem(getStorageKey(bookId), JSON.stringify(store));
  } catch (e) {
    console.warn('[AmazonAds] Failed to save:', e);
  }
}

export function useAmazonAdsData(bookId?: string) {
  const [store, setStore] = useState<AmazonAdsStore>(() => loadStore(bookId));

  // Reload when bookId changes
  useEffect(() => {
    setStore(loadStore(bookId));
  }, [bookId]);

  const persist = useCallback((updated: AmazonAdsStore) => {
    setStore(updated);
    saveStore(updated, bookId);
  }, [bookId]);

  // --- Batches ---
  const addBatch = useCallback((batch: AdsImportBatch) => {
    const updated = { ...store, batches: [...store.batches, batch] };
    persist(updated);
  }, [store, persist]);

  // --- Campaigns ---
  const upsertCampaigns = useCallback((campaigns: AdsEntityCampaign[]) => {
    const map = new Map(store.campaigns.map(c => [c.key, c]));
    for (const c of campaigns) map.set(c.key, c);
    persist({ ...store, campaigns: Array.from(map.values()) });
  }, [store, persist]);

  // --- Ad Groups ---
  const upsertAdGroups = useCallback((adgroups: AdsEntityAdGroup[]) => {
    const map = new Map(store.adgroups.map(a => [a.key, a]));
    for (const a of adgroups) map.set(a.key, a);
    persist({ ...store, adgroups: Array.from(map.values()) });
  }, [store, persist]);

  // --- Targets ---
  const upsertTargets = useCallback((targets: AdsEntityTarget[]) => {
    const map = new Map(store.targets.map(t => [t.key, t]));
    for (const t of targets) map.set(t.key, t);
    persist({ ...store, targets: Array.from(map.values()) });
  }, [store, persist]);

  // --- Daily Metrics (upsert by rowHash) ---
  const upsertMetrics = useCallback((metrics: AdsDailyMetrics[]) => {
    const map = new Map(store.dailyMetrics.map(m => [m.rowHash, m]));
    for (const m of metrics) map.set(m.rowHash, m);
    persist({ ...store, dailyMetrics: Array.from(map.values()) });
  }, [store, persist]);

  // --- Thresholds ---
  const getThresholds = useCallback((marketplace: string): ThresholdConfig => {
    return store.thresholds[marketplace] ?? DEFAULT_THRESHOLDS;
  }, [store]);

  const setThresholds = useCallback((marketplace: string, config: ThresholdConfig) => {
    persist({
      ...store,
      thresholds: { ...store.thresholds, [marketplace]: config },
    });
  }, [store, persist]);

  // --- Full import (batch operation) ---
  const importData = useCallback((
    batch: AdsImportBatch,
    campaigns: AdsEntityCampaign[],
    adgroups: AdsEntityAdGroup[],
    targets: AdsEntityTarget[],
    metrics: AdsDailyMetrics[],
  ) => {
    const updated = { ...store };

    // Batch
    updated.batches = [...updated.batches, batch];

    // Upsert campaigns
    const campaignMap = new Map(updated.campaigns.map(c => [c.key, c]));
    for (const c of campaigns) campaignMap.set(c.key, c);
    updated.campaigns = Array.from(campaignMap.values());

    // Upsert adgroups
    const adgroupMap = new Map(updated.adgroups.map(a => [a.key, a]));
    for (const a of adgroups) adgroupMap.set(a.key, a);
    updated.adgroups = Array.from(adgroupMap.values());

    // Upsert targets
    const targetMap = new Map(updated.targets.map(t => [t.key, t]));
    for (const t of targets) targetMap.set(t.key, t);
    updated.targets = Array.from(targetMap.values());

    // Upsert metrics by hash
    const metricMap = new Map(updated.dailyMetrics.map(m => [m.rowHash, m]));
    for (const m of metrics) metricMap.set(m.rowHash, m);
    updated.dailyMetrics = Array.from(metricMap.values());

    persist(updated);
  }, [store, persist]);

  // --- Clear all data ---
  const clearAll = useCallback(() => {
    persist(createEmpty());
  }, [persist]);

  // --- Has data ---
  const hasData = store.dailyMetrics.length > 0;

  // --- Build entity name map ---
  const entityNames = new Map<string, string>();
  for (const c of store.campaigns) entityNames.set(c.key, c.campaignName);
  for (const a of store.adgroups) entityNames.set(a.key, a.adGroupName);
  for (const t of store.targets) entityNames.set(t.key, t.targetText);

  return {
    store,
    hasData,
    entityNames,
    addBatch,
    upsertCampaigns,
    upsertAdGroups,
    upsertTargets,
    upsertMetrics,
    getThresholds,
    setThresholds,
    importData,
    clearAll,
  };
}
