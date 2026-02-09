import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Step1Config } from './Step1Config';
import { Step2Upload } from './Step2Upload';
import { Step3Mapping } from './Step3Mapping';
import { Step4Validation } from './Step4Validation';
import { Step5Import } from './Step5Import';
import type { WizardConfig, UploadedFile, ColumnMapping, ParsedRow, ValidationResult } from '@/types/amazon-ads';
import { useAmazonAdsData } from '@/hooks/useAmazonAdsData';

interface AmazonAdsImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  bookId?: string;
  defaultMarketplace?: string;
  onImportComplete?: () => void;
}

const STEP_TITLES = [
  'Qué vas a importar',
  'Sube tus archivos',
  'Detección + Mapeo',
  'Validación',
  'Importar',
];

export const AmazonAdsImportWizard = ({
  isOpen,
  onClose,
  bookId,
  defaultMarketplace = 'ES',
  onImportComplete,
}: AmazonAdsImportWizardProps) => {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<WizardConfig>({
    marketplace: defaultMarketplace,
    currency: 'EUR',
    adType: 'SP',
    attributionWindow: '14d',
    label: '',
  });
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const adsData = useAmazonAdsData(bookId);

  const handleClose = () => {
    setStep(0);
    setFiles([]);
    setValidationResult(null);
    onClose();
  };

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
            <Step4Validation
              files={files}
              config={config}
              validationResult={validationResult}
              onValidationResult={setValidationResult}
            />
          )}
          {step === 4 && (
            <Step5Import
              files={files}
              config={config}
              adsData={adsData}
              bookId={bookId}
              onComplete={() => {
                onImportComplete?.();
                handleClose();
              }}
            />
          )}
        </div>

        {/* Navigation */}
        {step < 4 && (
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
      </DialogContent>
    </Dialog>
  );
};
