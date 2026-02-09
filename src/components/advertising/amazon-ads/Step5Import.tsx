import { useState, useEffect, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, BarChart3, ListChecks } from 'lucide-react';
import { parsedRowToMetrics } from '@/lib/amazon-ads/row-parser';
import type {
  UploadedFile,
  WizardConfig,
  AdsImportBatch,
  AdsEntityCampaign,
  AdsEntityAdGroup,
  AdsEntityTarget,
  AdsDailyMetrics,
} from '@/types/amazon-ads';

interface Step5ImportProps {
  files: UploadedFile[];
  config: WizardConfig;
  adsData: {
    importData: (batch: AdsImportBatch, campaigns: AdsEntityCampaign[], adgroups: AdsEntityAdGroup[], targets: AdsEntityTarget[], metrics: AdsDailyMetrics[]) => void;
  };
  bookId?: string;
  onComplete: () => void;
}

type Phase = 'analyzing' | 'normalizing' | 'saving' | 'done';

const PHASE_LABELS: Record<Phase, string> = {
  analyzing: 'Analizando datos...',
  normalizing: 'Normalizando métricas...',
  saving: 'Guardando en almacenamiento local...',
  done: '¡Importación completada!',
};

const PHASE_PROGRESS: Record<Phase, number> = {
  analyzing: 25,
  normalizing: 50,
  saving: 75,
  done: 100,
};

export const Step5Import = ({ files, config, adsData, bookId, onComplete }: Step5ImportProps) => {
  const [phase, setPhase] = useState<Phase>('analyzing');
  const [stats, setStats] = useState({ rows: 0, campaigns: 0, adgroups: 0, targets: 0 });

  const runImport = useCallback(async () => {
    setPhase('analyzing');
    await delay(300);

    const readyFiles = files.filter(f => f.status === 'ready' && f.parsedRows);

    // Collect all parsed rows
    const allParsedRows = readyFiles.flatMap(f => f.parsedRows ?? []);
    const validRows = allParsedRows.filter(r => r.errors.length === 0);

    setPhase('normalizing');
    await delay(300);

    // Convert to daily metrics
    const batchId = `batch-${Date.now()}`;
    const metrics: AdsDailyMetrics[] = validRows.map(row =>
      parsedRowToMetrics(row, config.marketplace, config.adType, config.currency, batchId)
    );

    // Extract entities
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

    setPhase('saving');
    await delay(200);

    // Create batch record
    const batch: AdsImportBatch = {
      id: batchId,
      createdAt: new Date().toISOString(),
      marketplace: config.marketplace,
      currency: config.currency,
      adType: config.adType,
      attributionWindow: config.attributionWindow,
      label: config.label,
      sourceFiles: readyFiles.map(f => ({
        name: f.file.name,
        size: f.file.size,
        hash: f.id,
      })),
      status: validRows.length > 0 ? 'success' : 'failed',
      stats: {
        rowsImported: validRows.length,
        rowsRejected: allParsedRows.length - validRows.length,
        campaignsDetected: campaignMap.size,
        adgroupsDetected: adgroupMap.size,
        targetsDetected: targetMap.size,
      },
    };

    // Persist everything
    adsData.importData(
      batch,
      Array.from(campaignMap.values()),
      Array.from(adgroupMap.values()),
      Array.from(targetMap.values()),
      metrics,
    );

    setStats({
      rows: validRows.length,
      campaigns: campaignMap.size,
      adgroups: adgroupMap.size,
      targets: targetMap.size,
    });

    setPhase('done');
  }, [files, config, adsData]);

  useEffect(() => {
    runImport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 py-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <Progress value={PHASE_PROGRESS[phase]} className="h-2" />
        <p className="text-sm text-center font-medium">{PHASE_LABELS[phase]}</p>
      </div>

      {/* Done state */}
      {phase === 'done' && (
        <div className="space-y-4 text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
          <div>
            <p className="text-lg font-semibold">Importación completada</p>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.rows} filas importadas · {stats.campaigns} campañas · {stats.adgroups} grupos · {stats.targets} targets
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Button onClick={onComplete} className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Ver dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
