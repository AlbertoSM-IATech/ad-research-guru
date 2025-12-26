import { useState, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  AlertTriangle,
  FileText,
  BarChart3,
  Lightbulb,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Keyword, BookInfo, IntentType } from '@/types/advertising';
import { INTENT_TYPES, classifyIntent } from '@/types/advertising';
import {
  KEYWORD_PURPOSE_OPTIONS,
  BRAND_RISK_OPTIONS,
  TRAFFIC_SOURCE_OPTIONS,
  calculateMarketScore,
  getMarketScoreInfo,
} from '@/lib/market-score';
import {
  type WizardStep1Data,
  type WizardStep2Data,
  type WizardStep3Data,
  buildNewKeywordFromWizard,
  getDefaultStep2Data,
  getDefaultStep3Data,
  findDuplicateKeyword,
  isMarketDataComplete,
} from '@/lib/keyword-builder';
import { cn } from '@/lib/utils';

interface NewKeywordWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (keyword: Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'>) => void;
  marketplaceId: string;
  bookInfo?: BookInfo;
  existingKeywords: Keyword[];
  initialKeyword?: string;
}

type WizardStep = 1 | 2 | 3;

const STEPS = [
  { number: 1, title: 'Básico', icon: FileText },
  { number: 2, title: 'Mercado', icon: BarChart3 },
  { number: 3, title: 'Editorial', icon: Lightbulb },
] as const;

export function NewKeywordWizard({
  open,
  onOpenChange,
  onComplete,
  marketplaceId,
  bookInfo,
  existingKeywords,
  initialKeyword = '',
}: NewKeywordWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  
  // Step 1 data
  const [step1, setStep1] = useState<WizardStep1Data>({
    keyword: initialKeyword,
    marketplaceId,
    purpose: 'editorial',
    intent: undefined,
  });
  
  // Step 2 data
  const [step2, setStep2] = useState<WizardStep2Data>(getDefaultStep2Data());
  
  // Step 3 data
  const [step3, setStep3] = useState<WizardStep3Data>(getDefaultStep3Data());
  
  // Reset state when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setCurrentStep(1);
      setStep1({
        keyword: initialKeyword,
        marketplaceId,
        purpose: 'editorial',
        intent: undefined,
      });
      setStep2(getDefaultStep2Data());
      setStep3(getDefaultStep3Data());
    }
    onOpenChange(isOpen);
  };
  
  // Check for duplicate
  const duplicateKeyword = useMemo(() => {
    if (!step1.keyword.trim()) return undefined;
    return findDuplicateKeyword(step1.keyword, marketplaceId, existingKeywords);
  }, [step1.keyword, marketplaceId, existingKeywords]);
  
  // Auto-detect intent
  const detectedIntent = useMemo(() => {
    if (!step1.keyword.trim()) return undefined;
    return classifyIntent(step1.keyword);
  }, [step1.keyword]);
  
  // Calculate preview score
  const previewScore = useMemo(() => {
    return calculateMarketScore({
      searchVolume: step2.searchVolume,
      competitors: step2.competitors,
      price: step2.price,
      royalties: step2.royalties,
      brandRisk: step2.brandRisk,
      trafficSource: step2.trafficSource,
    });
  }, [step2]);
  
  const scoreInfo = getMarketScoreInfo(previewScore.total);
  const isDataComplete = isMarketDataComplete(step2);
  
  const canProceedStep1 = step1.keyword.trim().length > 0;
  const canProceedStep2 = true; // Always can proceed, just marks as incomplete
  
  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as WizardStep);
    }
  };
  
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };
  
  const handleComplete = () => {
    const keyword = buildNewKeywordFromWizard({
      step1: {
        ...step1,
        intent: step1.intent ?? detectedIntent,
      },
      step2,
      step3,
      bookInfo,
    });
    onComplete(keyword);
    onOpenChange(false);
  };
  
  const handleOpenExisting = () => {
    if (duplicateKeyword) {
      onOpenChange(false);
      // Could emit an event to open the detail panel, for now just close
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Nueva Keyword</DialogTitle>
          <DialogDescription>
            Completa los datos para crear una keyword con toda su información de mercado.
          </DialogDescription>
        </DialogHeader>
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                    currentStep === step.number
                      ? 'border-primary bg-primary text-primary-foreground'
                      : currentStep > step.number
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {currentStep > step.number ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium hidden sm:inline',
                    currentStep === step.number ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-3',
                    currentStep > step.number ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
              )}
            </div>
          ))}
        </div>
        
        {/* Step Content */}
        <div className="min-h-[300px]">
          {/* Step 1: Basic */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="keyword">Keyword *</Label>
                <Input
                  id="keyword"
                  value={step1.keyword}
                  onChange={(e) => setStep1({ ...step1, keyword: e.target.value })}
                  placeholder="Introduce la keyword..."
                  autoFocus
                />
              </div>
              
              {duplicateKeyword && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>Esta keyword ya existe en este marketplace.</span>
                    <Button variant="outline" size="sm" onClick={handleOpenExisting}>
                      Abrir ficha existente
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Propósito</Label>
                  <Select
                    value={step1.purpose}
                    onValueChange={(value) => setStep1({ ...step1, purpose: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {KEYWORD_PURPOSE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex flex-col">
                            <span>{opt.label}</span>
                            <span className="text-xs text-muted-foreground">{opt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Intención</Label>
                  <Select
                    value={step1.intent ?? detectedIntent ?? ''}
                    onValueChange={(value) => setStep1({ ...step1, intent: value as IntentType })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-detectado" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {INTENT_TYPES.map((intent) => (
                        <SelectItem key={intent.value} value={intent.value}>
                          {intent.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {detectedIntent && !step1.intent && (
                    <p className="text-xs text-muted-foreground">
                      Detectado: {INTENT_TYPES.find(i => i.value === detectedIntent)?.label}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Marketplace</Label>
                <Input value={marketplaceId} disabled className="bg-muted" />
              </div>
            </div>
          )}
          
          {/* Step 2: Market Data */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="searchVolume">Volumen de búsqueda *</Label>
                  <Input
                    id="searchVolume"
                    type="number"
                    min={0}
                    value={step2.searchVolume || ''}
                    onChange={(e) => setStep2({ ...step2, searchVolume: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    {step2.searchVolume < 50 ? '0pts' : step2.searchVolume <= 100 ? '10pts' : step2.searchVolume <= 600 ? '20pts' : '30pts'} / 30
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="competitors">Competidores (resultados Amazon) *</Label>
                  <Input
                    id="competitors"
                    type="number"
                    min={0}
                    value={step2.competitors || ''}
                    onChange={(e) => setStep2({ ...step2, competitors: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    {step2.competitors < 1000 ? '25pts' : step2.competitors <= 4000 ? '18pts' : step2.competitors <= 10000 ? '8pts' : '0pts'} / 25
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Precio ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    step={0.01}
                    value={step2.price || ''}
                    onChange={(e) => setStep2({ ...step2, price: parseFloat(e.target.value) || 0 })}
                    placeholder="9.99"
                  />
                  <p className="text-xs text-muted-foreground">
                    {step2.price < 9.99 ? '0pts' : step2.price < 15 ? '8pts' : step2.price < 20 ? '12pts' : '15pts'} / 15
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="royalties">Regalías ($)</Label>
                  <Input
                    id="royalties"
                    type="number"
                    min={0}
                    step={0.01}
                    value={step2.royalties || ''}
                    onChange={(e) => setStep2({ ...step2, royalties: parseFloat(e.target.value) || 0 })}
                    placeholder="2.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    {step2.royalties < 2 ? '0pts' : step2.royalties < 4 ? '8pts' : step2.royalties < 7 ? '14pts' : '20pts'} / 20
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Brand Risk</Label>
                  <Select
                    value={step2.brandRisk}
                    onValueChange={(value) => setStep2({ ...step2, brandRisk: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {BRAND_RISK_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <Badge variant="outline" className={opt.color}>
                            {opt.label}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Fuente de tráfico</Label>
                  <Select
                    value={step2.trafficSource}
                    onValueChange={(value) => setStep2({ ...step2, trafficSource: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {TRAFFIC_SOURCE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <Badge variant="outline" className={opt.color}>
                            {opt.label}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Score Preview */}
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">Market Score Preview</span>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-2xl font-bold', scoreInfo.color)}>
                      {previewScore.total}
                    </span>
                    <Badge className={scoreInfo.bgColor}>
                      {scoreInfo.label}
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={previewScore.total} 
                  className="h-2"
                />
                {!isDataComplete && (
                  <Alert className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Sin datos de volumen o competidores, la keyword quedará como "Incompleta".
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}
          
          {/* Step 3: Editorial (Optional) */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  Esta sección es opcional y NO afecta al Market Score. Sirve para decisiones editoriales.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="canCreate"
                    checked={step3.canCreate === true}
                    onCheckedChange={(checked) =>
                      setStep3({ ...step3, canCreate: checked === 'indeterminate' ? null : checked })
                    }
                  />
                  <Label htmlFor="canCreate" className="cursor-pointer">
                    ¿Puedo crear este libro?
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="canDoBetter"
                    checked={step3.canDoBetter === true}
                    onCheckedChange={(checked) =>
                      setStep3({ ...step3, canDoBetter: checked === 'indeterminate' ? null : checked })
                    }
                  />
                  <Label htmlFor="canDoBetter" className="cursor-pointer">
                    ¿Puedo hacerlo mejor que la competencia?
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="canDifferentiate"
                    checked={step3.canDifferentiate === true}
                    onCheckedChange={(checked) =>
                      setStep3({ ...step3, canDifferentiate: checked === 'indeterminate' ? null : checked })
                    }
                  />
                  <Label htmlFor="canDifferentiate" className="cursor-pointer">
                    ¿Puedo diferenciarlo?
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="fitsStrategy"
                    checked={step3.fitsStrategy === true}
                    onCheckedChange={(checked) =>
                      setStep3({ ...step3, fitsStrategy: checked === 'indeterminate' ? null : checked })
                    }
                  />
                  <Label htmlFor="fitsStrategy" className="cursor-pointer">
                    ¿Encaja con mi estrategia editorial?
                  </Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={step3.notes}
                  onChange={(e) => setStep3({ ...step3, notes: e.target.value })}
                  placeholder="Notas adicionales sobre esta keyword..."
                  rows={3}
                />
              </div>
              
              {/* Summary */}
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <h4 className="font-medium mb-3">Resumen</h4>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Keyword:</span>
                  <span className="font-medium">{step1.keyword}</span>
                  
                  <span className="text-muted-foreground">Market Score:</span>
                  <span className={cn('font-bold', scoreInfo.color)}>{previewScore.total}/100</span>
                  
                  <span className="text-muted-foreground">Estado:</span>
                  <Badge variant={isDataComplete ? 'default' : 'secondary'}>
                    {isDataComplete ? 'Válida' : 'Incompleta'}
                  </Badge>
                  
                  <span className="text-muted-foreground">Propósito:</span>
                  <span>{KEYWORD_PURPOSE_OPTIONS.find(o => o.value === step1.purpose)?.label}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 flex-1">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Atrás
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            
            {currentStep < 3 ? (
              <Button 
                onClick={handleNext} 
                disabled={currentStep === 1 && !canProceedStep1}
              >
                Siguiente
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleComplete}>
                <Check className="w-4 h-4 mr-2" />
                Crear Keyword
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
