import { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Step1Config } from './Step1Config';
import { Step2Upload } from './Step2Upload';
import { Step3Mapping } from './Step3Mapping';
import { Step4Validation } from './Step4Validation';
import { Step5Import } from './Step5Import';
import { Step6Matching } from './Step6Matching';
import { Step7Summary } from './Step7Summary';
import { buildAdsDataUpdate } from '@/lib/amazon-ads/import-aggregator';
import type {
  WizardConfig,
  UploadedFile,
  ValidationResult,
  ImportAgg,
  AmazonAdsImportResult,
} from '@/types/amazon-ads';
import type { MatchResult } from '@/lib/amazon-ads/import-aggregator';
import type { Keyword } from '@/types/advertising';
import { useAmazonAdsData } from '@/hooks/useAmazonAdsData';

interface AmazonAdsImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  scopeId: string; // marketplaceId — consistent key
  keywords: Keyword[];
  onUpdateKeyword: (id: string, updates: Partial<Keyword>) => void;
  onImportComplete?: (result: AmazonAdsImportResult) => void;
}

const STEP_TITLES = [
  'Qué vas a importar',
  'Sube tus archivos',
  'Detección + Mapeo',
  'Validación',
  'Importar + Analizar',
  'Resolver coincidencias',
  'Resumen',
];

export const AmazonAdsImportWizard = ({
  isOpen,
  onClose,
  scopeId,
  keywords,
  onUpdateKeyword,
  onImportComplete,
}: AmazonAdsImportWizardProps) => {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<WizardConfig>({
    marketplace: scopeId,
    currency: 'EUR',
    adType: 'SP',
    attributionWindow: '14d',
    label: '',
  });
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'accumulate'>('replace');

  // Step 5 results
  const [aggregates, setAggregates] = useState<ImportAgg[]>([]);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  // Step 6 — manual resolutions
  const [manualResolutions, setManualResolutions] = useState<Map<string, string | null>>(new Map());

  // Step 7 — final result
  const [importResult, setImportResult] = useState<AmazonAdsImportResult | null>(null);

  const adsData = useAmazonAdsData(scopeId);

  const handleClose = () => {
    setStep(0);
    setFiles([]);
    setValidationResult(null);
    setAggregates([]);
    setMatchResult(null);
    setManualResolutions(new Map());
    setImportResult(null);
    onClose();
  };

  const handleAggregatesReady = useCallback((aggs: ImportAgg[], match: MatchResult) => {
    setAggregates(aggs);
    setMatchResult(match);
  }, []);

  const handleImportDone = useCallback((result: AmazonAdsImportResult) => {
    setImportResult(result);
    // If there are unmatched, go to step 6. Otherwise skip to 7.
    if (result.unmatched.length > 0) {
      setStep(5);
    } else {
      setStep(6);
      onImportComplete?.(result);
    }
  }, [onImportComplete]);

  // Apply manual resolutions and finish
  const handleApplyResolutions = useCallback(() => {
    if (!matchResult || !importResult) {
      setStep(6);
      return;
    }

    // Apply resolved manual matches to keywords
    let extraApplied = 0;
    // buildAdsDataUpdate imported at top
    for (const [normalizedText, keywordId] of manualResolutions) {
      if (keywordId === null) continue;
      const agg = aggregates.find(a => a.normalizedText === normalizedText);
      if (!agg) continue;
      const kw = keywords.find(k => k.id === keywordId);
      if (!kw) continue;
      const newAdsData = buildAdsDataUpdate(agg, kw.adsData, importMode);
      onUpdateKeyword(keywordId, { adsData: newAdsData });
      extraApplied++;
    }

    // Update the result
    const updatedResult: AmazonAdsImportResult = {
      ...importResult,
      appliedKeywordUpdates: importResult.appliedKeywordUpdates + extraApplied,
      matched: [
        ...importResult.matched,
        ...Array.from(manualResolutions.entries())
          .filter(([, id]) => id !== null)
          .map(([normalizedText, keywordId]) => ({ keywordId: keywordId!, normalizedText })),
      ],
      unmatched: importResult.unmatched.filter(u =>
        !manualResolutions.has(u.normalizedText) ||
        manualResolutions.get(u.normalizedText) === null
      ),
    };

    setImportResult(updatedResult);
    onImportComplete?.(updatedResult);
    setStep(6);
  }, [manualResolutions, matchResult, importResult, aggregates, keywords, importMode, onUpdateKeyword, onImportComplete]);

  const canNext = (): boolean => {
    switch (step) {
      case 0: return true;
      case 1: return files.some(f => f.status === 'ready');
      case 2: return files.some(f => f.mappings && f.mappings.length > 0);
      case 3: return validationResult !== null && validationResult.blockingErrors.length === 0;
      default: return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-lg">Importar Amazon Ads</span>
            <span className="text-xs text-muted-foreground font-normal">
              Paso {step + 1} de {STEP_TITLES.length} — {STEP_TITLES[step]}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex gap-1 mb-2">
          {STEP_TITLES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[300px]">
          {step === 0 && (
            <Step1Config config={config} onChange={setConfig} />
          )}
          {step === 1 && (
            <Step2Upload files={files} onFilesChange={setFiles} />
          )}
          {step === 2 && (
            <Step3Mapping files={files} onFilesChange={setFiles} />
          )}
          {step === 3 && (
            <div className="space-y-4">
              <Step4Validation
                files={files}
                config={config}
                validationResult={validationResult}
                onValidationResult={setValidationResult}
              />
              {/* Re-import mode selector */}
              {validationResult && validationResult.isValid && (
                <div className="border rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium">Modo de re-importación</p>
                  <RadioGroup
                    value={importMode}
                    onValueChange={v => setImportMode(v as 'replace' | 'accumulate')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="replace" id="mode-replace" />
                      <Label htmlFor="mode-replace" className="text-xs">Sustituir datos</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="accumulate" id="mode-accumulate" />
                      <Label htmlFor="mode-accumulate" className="text-xs">Acumular</Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                    {importMode === 'replace'
                      ? 'Los datos actuales de keywords matched se reemplazarán por los del archivo.'
                      : 'Las métricas se sumarán a los valores actuales.'}
                  </p>
                </div>
              )}
            </div>
          )}
          {step === 4 && (
            <Step5Import
              files={files}
              config={config}
              keywords={keywords}
              scopeId={scopeId}
              adsData={adsData}
              onUpdateKeyword={onUpdateKeyword}
              mode={importMode}
              manualResolutions={manualResolutions}
              onImportDone={handleImportDone}
              onAggregatesReady={handleAggregatesReady}
            />
          )}
          {step === 5 && matchResult && (
            <Step6Matching
              unmatched={matchResult.unmatched}
              keywords={keywords}
              resolutions={manualResolutions}
              onResolutionsChange={setManualResolutions}
            />
          )}
          {step === 6 && importResult && (
            <Step7Summary
              result={importResult}
              onViewDashboard={handleClose}
            />
          )}
        </div>

        {/* Navigation */}
        {step <= 3 && (
          <div className="flex justify-between pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => step > 0 ? setStep(step - 1) : handleClose()}
            >
              {step === 0 ? 'Cancelar' : 'Anterior'}
            </Button>
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
            >
              {step === 3 ? 'Importar' : 'Siguiente'}
            </Button>
          </div>
        )}

        {/* Step 5 has no nav (auto-advances) */}

        {/* Step 6: Matching resolution nav */}
        {step === 5 && (
          <div className="flex justify-between pt-2 border-t">
            <Button variant="outline" onClick={() => setStep(6)}>
              Saltar (ignorar todos)
            </Button>
            <Button onClick={handleApplyResolutions}>
              Aplicar y finalizar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
