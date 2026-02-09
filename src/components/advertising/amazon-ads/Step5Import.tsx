import { useState, useEffect, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle } from 'lucide-react';
import { parseAllRows } from '@/lib/amazon-ads/row-parser';
import { parsedRowToMetrics } from '@/lib/amazon-ads/row-parser';
import { aggregateByTarget, matchAggregatesToKeywords, buildAdsDataUpdate } from '@/lib/amazon-ads/import-aggregator';
import type {
  UploadedFile,
  WizardConfig,
  AdsImportBatch,
  AdsEntityCampaign,
  AdsEntityAdGroup,
  AdsEntityTarget,
  AdsDailyMetrics,
  ImportAgg,
  AmazonAdsImportResult,
} from '@/types/amazon-ads';
import type { Keyword } from '@/types/advertising';

interface Step5ImportProps {
  files: UploadedFile[];
  config: WizardConfig;
  keywords: Keyword[];
  scopeId: string;
  adsData: {
    importData: (batch: AdsImportBatch, campaigns: AdsEntityCampaign[], adgroups: AdsEntityAdGroup[], targets: AdsEntityTarget[], metrics: AdsDailyMetrics[]) => void;
  };
  onUpdateKeyword: (id: string, updates: Partial<Keyword>) => void;
  mode: 'replace' | 'accumulate';
  /** Resolved manual matches: normalizedText -> keywordId | null (ignored) */
  manualResolutions: Map<string, string | null>;
  onImportDone: (result: AmazonAdsImportResult) => void;
  onAggregatesReady: (aggregates: ImportAgg[], matched: ReturnType<typeof matchAggregatesToKeywords>) => void;
}

type Phase = 'parsing' | 'aggregating' | 'matching' | 'applying' | 'done';

const PHASE_LABELS: Record<Phase, string> = {
  parsing: 'Parseando filas...',
  aggregating: 'Agregando métricas por target...',
  matching: 'Vinculando con keywords...',
  applying: 'Aplicando datos a keywords...',
  done: '¡Importación completada!',
};

const PHASE_PROGRESS: Record<Phase, number> = {
  parsing: 20,
  aggregating: 40,
  matching: 60,
  applying: 80,
  done: 100,
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const Step5Import = ({
  files,
  config,
  keywords,
  scopeId,
  adsData,
  onUpdateKeyword,
  mode,
  manualResolutions,
  onImportDone,
  onAggregatesReady,
}: Step5ImportProps) => {
  const [phase, setPhase] = useState<Phase>('parsing');
  const [hasRun, setHasRun] = useState(false);

  const runImport = useCallback(async () => {
    if (hasRun) return;
    setHasRun(true);

    setPhase('parsing');
    await delay(200);

    const readyFiles = files.filter(f => f.status === 'ready' && f.mappings);

    // Parse ALL rows (use allRawRows if available, else previewRows)
    const allParsed = readyFiles.flatMap(f => {
      const rows = f.allRawRows ?? f.previewRows ?? [];
      const mappings = (f.mappings ?? []).filter(m => m.internalField !== '_skip');
      return parseAllRows(rows, mappings);
    });

    const validRows = allParsed.filter(r => r.errors.length === 0);
    const rejectedRows = allParsed.filter(r => r.errors.length > 0);
    const rejectsSample = rejectedRows.slice(0, 10).map((r, i) => ({
      rowIndex: i,
      reason: r.errors.join('; '),
    }));

    setPhase('aggregating');
    await delay(200);

    // Aggregate by target text
    const aggregates = aggregateByTarget(validRows);

    // Also save to the internal store for dashboard
    const batchId = `batch-${Date.now()}`;
    const metrics: AdsDailyMetrics[] = validRows.map(row =>
      parsedRowToMetrics(row, config.marketplace, config.adType, config.currency, batchId)
    );

    // Extract entities for internal store
    const campaignMap = new Map<string, AdsEntityCampaign>();
    const adgroupMap = new Map<string, AdsEntityAdGroup>();
    const targetMap = new Map<string, AdsEntityTarget>();

    for (const row of validRows) {
      const campaignKey = (row.campaignId ?? row.campaignName ?? '').toLowerCase();
      if (campaignKey && !campaignMap.has(campaignKey)) {
        campaignMap.set(campaignKey, {
          key: campaignKey,
          campaignName: row.campaignName ?? campaignKey,
          campaignId: row.campaignId,
          adType: config.adType,
          marketplace: config.marketplace,
        });
      }
      if (row.adGroupName || row.adGroupId) {
        const agKey = `${campaignKey}|${(row.adGroupId ?? row.adGroupName ?? '').toLowerCase()}`;
        if (!adgroupMap.has(agKey)) {
          adgroupMap.set(agKey, {
            key: agKey,
            adGroupName: row.adGroupName ?? agKey,
            adGroupId: row.adGroupId,
            campaignKey,
          });
        }
      }
      if (row.targetText || row.targetId) {
        const agKey = `${campaignKey}|${(row.adGroupId ?? row.adGroupName ?? '').toLowerCase()}`;
        const tKey = `${agKey}|${(row.targetId ?? row.targetText ?? '').toLowerCase()}`;
        if (!targetMap.has(tKey)) {
          targetMap.set(tKey, {
            key: tKey,
            targetText: row.targetText ?? tKey,
            targetId: row.targetId,
            matchType: row.matchType,
            campaignKey,
            adGroupKey: agKey,
          });
        }
      }
    }

    // Save to internal store (for dashboard)
    const batch: AdsImportBatch = {
      id: batchId,
      createdAt: new Date().toISOString(),
      marketplace: config.marketplace,
      currency: config.currency,
      adType: config.adType,
      attributionWindow: config.attributionWindow,
      label: config.label,
      sourceFiles: readyFiles.map(f => ({ name: f.file.name, size: f.file.size, hash: f.id })),
      status: validRows.length > 0 ? 'success' : 'failed',
      stats: {
        rowsImported: validRows.length,
        rowsRejected: rejectedRows.length,
        campaignsDetected: campaignMap.size,
        adgroupsDetected: adgroupMap.size,
        targetsDetected: targetMap.size,
      },
    };

    adsData.importData(
      batch,
      Array.from(campaignMap.values()),
      Array.from(adgroupMap.values()),
      Array.from(targetMap.values()),
      metrics,
    );

    setPhase('matching');
    await delay(200);

    // Match aggregates to keywords
    const matchResult = matchAggregatesToKeywords(aggregates, keywords);

    // Signal aggregates ready for Step6 (matching resolution)
    onAggregatesReady(aggregates, matchResult);

    // Apply manual resolutions: move resolved from unmatched to matched
    for (const [normalizedText, keywordId] of manualResolutions) {
      if (keywordId === null) continue; // ignored
      const aggItem = matchResult.unmatched.find(a => a.normalizedText === normalizedText);
      if (aggItem) {
        matchResult.matched.push({ keywordId, normalizedText, agg: aggItem });
        const idx = matchResult.unmatched.indexOf(aggItem);
        if (idx >= 0) matchResult.unmatched.splice(idx, 1);
      }
    }

    setPhase('applying');
    await delay(200);

    // Apply matched data to keyword.adsData
    let appliedCount = 0;
    for (const m of matchResult.matched) {
      const kw = keywords.find(k => k.id === m.keywordId);
      if (!kw) continue;
      const newAdsData = buildAdsDataUpdate(m.agg, kw.adsData, mode);
      onUpdateKeyword(m.keywordId, { adsData: newAdsData });
      appliedCount++;
    }

    const result: AmazonAdsImportResult = {
      scopeId,
      rowsImported: validRows.length,
      rowsRejected: rejectedRows.length,
      rejectsSample,
      aggregates,
      matched: matchResult.matched.map(m => ({ keywordId: m.keywordId, normalizedText: m.normalizedText })),
      unmatched: matchResult.unmatched.map(u => ({
        normalizedText: u.normalizedText,
        sampleOriginal: u.originalTexts[0] ?? u.normalizedText,
        clicks: u.clicks,
        spend: u.spend,
      })),
      appliedKeywordUpdates: appliedCount,
    };

    setPhase('done');
    onImportDone(result);
  }, [files, config, keywords, scopeId, adsData, onUpdateKeyword, mode, manualResolutions, onImportDone, onAggregatesReady, hasRun]);

  useEffect(() => {
    runImport();
  }, [runImport]);

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-2">
        <Progress value={PHASE_PROGRESS[phase]} className="h-2" />
        <p className="text-sm text-center font-medium">{PHASE_LABELS[phase]}</p>
      </div>
      {phase === 'done' && (
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
          <p className="text-lg font-semibold mt-2">Procesamiento completo</p>
          <p className="text-xs text-muted-foreground">Revisa el resumen a continuación.</p>
        </div>
      )}
    </div>
  );
};
