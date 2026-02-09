// ============================================================
// Amazon Ads Import — Data model
// ============================================================

/** Ad type (Sponsored Products / Brands / Display) */
export type AdType = 'SP' | 'SB' | 'SD';

/** Attribution window */
export type AttributionWindow = '7d' | '14d' | '30d';

/** Confidence level for column mapping / sheet detection */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** Import batch status */
export type ImportBatchStatus = 'success' | 'partial' | 'failed';

/** Entity types stored in daily metrics */
export type AdsEntityType = 'campaign' | 'adgroup' | 'target' | 'searchTerm' | 'asin';

/** Duplicate handling strategy */
export type DuplicateStrategy = 'replace' | 'keep-both';

// ------ Source file metadata ------
export interface AdsSourceFile {
  name: string;
  size: number;
  hash: string;
}

// ------ Import batch ------
export interface AdsImportBatch {
  id: string;
  createdAt: string; // ISO
  marketplace: string;
  currency: string;
  adType: AdType;
  attributionWindow: AttributionWindow;
  label: string;
  sourceFiles: AdsSourceFile[];
  status: ImportBatchStatus;
  stats: {
    rowsImported: number;
    rowsRejected: number;
    campaignsDetected: number;
    adgroupsDetected: number;
    targetsDetected: number;
  };
}

// ------ Entities ------
export interface AdsEntityCampaign {
  key: string; // campaignId or hash(name)
  campaignName: string;
  campaignId?: string;
  adType: AdType;
  marketplace: string;
}

export interface AdsEntityAdGroup {
  key: string;
  adGroupName: string;
  adGroupId?: string;
  campaignKey: string;
}

export interface AdsEntityTarget {
  key: string;
  targetText: string;
  targetId?: string;
  matchType?: string;
  campaignKey: string;
  adGroupKey: string;
}

// ------ Fact: daily metrics ------
export interface AdsDailyMetrics {
  date: string; // YYYY-MM-DD
  entityType: AdsEntityType;
  entityKey: string;
  marketplace: string;
  adType: AdType;
  currency: string;
  batchId: string;
  // Base metrics
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  units: number;
  // Derived (calculated)
  ctr: number | null;
  cpc: number | null;
  cvr: number | null;
  acos: number | null;
  roas: number | null;
  // Anti-duplicate
  rowHash: string;
}

// ------ Thresholds (configurable per marketplace) ------
export interface ThresholdConfig {
  acosTarget: number;       // e.g. 30 (percent)
  minClicksForRules: number; // e.g. 10
  minSpendForRules: number;  // e.g. 5 (currency units)
  minImpressionsForCTR: number; // e.g. 100
  ctrThreshold: number;     // e.g. 0.3 (percent)
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  acosTarget: 30,
  minClicksForRules: 10,
  minSpendForRules: 5,
  minImpressionsForCTR: 100,
  ctrThreshold: 0.3,
};

// ------ Recommendation ------
export type RecommendationType =
  | 'click-leak'
  | 'spend-no-return'
  | 'scale-candidate'
  | 'negative-search-term'
  | 'winner-search-term'
  | 'low-ctr';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  actions: string[];
  entityKey: string;
  entityType: AdsEntityType;
  entityName: string;
  severity: 'high' | 'medium' | 'low';
  metrics: Record<string, number | null>;
}

// ------ Persisted store ------
export interface AmazonAdsStore {
  version: 1;
  batches: AdsImportBatch[];
  campaigns: AdsEntityCampaign[];
  adgroups: AdsEntityAdGroup[];
  targets: AdsEntityTarget[];
  dailyMetrics: AdsDailyMetrics[];
  thresholds: Record<string, ThresholdConfig>; // keyed by marketplace
  updatedAt: string;
}

// ------ Column mapping ------
export interface ColumnMapping {
  fileColumn: string;
  internalField: string;
  confidence: ConfidenceLevel;
  isRequired: boolean;
}

// ------ Sheet info ------
export interface SheetInfo {
  name: string;
  rowCount: number;
  headers: string[];
  confidence: ConfidenceLevel;
  mappings: ColumnMapping[];
}

// ------ Parsed row ------
export interface ParsedRow {
  date?: string;
  campaignName?: string;
  campaignId?: string;
  adGroupName?: string;
  adGroupId?: string;
  targetText?: string;
  targetId?: string;
  matchType?: string;
  searchTerm?: string;
  asin?: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  units: number;
  rowHash: string;
  errors: string[];
  warnings: string[];
}

// ------ Validation result ------
export interface ValidationResult {
  isValid: boolean;
  blockingErrors: string[];
  warnings: string[];
  validRows: number;
  rejectedRows: number;
  campaignsDetected: number;
  adgroupsDetected: number;
  targetsDetected: number;
  searchTermsDetected: number;
}

// ------ Imported Ads Metrics (aggregated for keyword sync) ------
export interface ImportedAdsMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  units: number;
  ctr: number | null;
  cpc: number | null;
  cvr: number | null;
  acos: number | null;
  roas: number | null;
  dateRange: { from: string; to: string }; // YYYY-MM-DD
  targetKeys: string[];
  lastSyncAt: string; // ISO
}

// ------ Match suggestion ------
export type MatchConfidence = 'exact' | 'partial';

export interface MatchSuggestion {
  keywordId: string;
  targetKey: string;
  targetText: string;
  campaignName: string;
  confidence: MatchConfidence;
}

// ------ Wizard state ------
export interface WizardConfig {
  marketplace: string;
  currency: string;
  adType: AdType;
  attributionWindow: AttributionWindow;
  label: string;
}

export interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'analyzing' | 'ready' | 'error';
  error?: string;
  sheets?: SheetInfo[];
  selectedSheet?: string;
  mappings?: ColumnMapping[];
  previewRows?: Record<string, unknown>[];
  parsedRows?: ParsedRow[];
}
