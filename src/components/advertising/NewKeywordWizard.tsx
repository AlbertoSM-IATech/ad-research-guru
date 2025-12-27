import { useState, useMemo, useEffect, useCallback } from 'react';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  AlertTriangle,
  FileText,
  BarChart3,
  Lightbulb,
  ClipboardCheck,
  Info,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Keyword, BookInfo, IntentType } from '@/types/advertising';
import { INTENT_TYPES, classifyIntent, MARKETPLACES } from '@/types/advertising';
import {
  KEYWORD_PURPOSE_OPTIONS,
  KEYWORD_STATUS_OPTIONS,
  BRAND_RISK_OPTIONS,
  TRAFFIC_SOURCE_OPTIONS,
  calculateMarketScore,
  getMarketScoreInfo,
  type KeywordPurpose,
  type KeywordStatus,
  type BrandRisk,
  type TrafficSource,
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

// ============ TOOLTIPS ============
const FIELD_TOOLTIPS = {
  searchVolume: 'Búsquedas mensuales estimadas en Amazon. Afecta demanda y potencial de Ads.',
  competitors: 'Resultados en Amazon para esta keyword. Menos suele ser mejor.',
  price: 'Precio promedio de los libros que rankean. Referencia de mercado, no tu precio.',
  royalties: 'Regalías estimadas por venta. A mayor regalía, más margen para invertir en Ads.',
  brandRisk: 'Riesgo de marca registrada o términos protegidos. Alto = posibles problemas para posicionar o publicar.',
  trafficSource: 'Si el nicho depende de Amazon (mejor) o de marca personal/rrss (competencia más dura).',
  purpose: 'Para qué usarás la keyword: decidir libros, campañas de Ads, o ambas.',
  intent: 'Qué busca el comprador. Compra = listo para comprar. Investigación = busca info. Problema = busca solución. Competencia = busca autor/título específico.',
  status: 'Estado de validación: Pendiente = por revisar, Válida = confirmada, Descartada = no usar.',
};

// ============ EDITORIAL CHECKLIST ============
const EDITORIAL_CHECKS = [
  { id: 'keywordClear', label: 'La keyword se entiende por sí sola' },
  { id: 'amazonSuggestion', label: 'Aparece como sugerencia en Amazon' },
  { id: 'booksSellingWell', label: 'Veo al menos 3 libros vendiendo bien' },
  { id: 'indieAuthors', label: 'Hay autores independientes vendiendo' },
  { id: 'topReflectsIntent', label: 'El top refleja realmente la intención de esta keyword' },
  { id: 'canProduce', label: 'Puedo producir este tipo de libro' },
  { id: 'canDoBetter', label: 'Puedo hacerlo mejor o más útil' },
  { id: 'canDifferentiate', label: 'Puedo diferenciarlo claramente' },
  { id: 'hasVariants', label: 'Hay variantes cercanas con potencial' },
  { id: 'hasInterest', label: 'Tengo interés en el tema (opcional)' },
];

interface NewKeywordWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (keyword: Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'>) => void;
  marketplaceId: string;
  bookInfo?: BookInfo;
  existingKeywords: Keyword[];
  initialKeyword?: string;
  onOpenExistingKeyword?: (keyword: Keyword) => void;
}

type WizardStep = 1 | 2 | 3 | 4;

const STEPS = [
  { number: 1, title: 'Básico', icon: FileText },
  { number: 2, title: 'Mercado', icon: BarChart3 },
  { number: 3, title: 'Editorial', icon: Lightbulb },
  { number: 4, title: 'Resumen', icon: ClipboardCheck },
] as const;

// Tooltip component wrapper
function FieldTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help inline-block ml-1" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-sm">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

// Default states factory
function getInitialStep1(keyword: string, marketplaceId: string): WizardStep1Data {
  return {
    keyword,
    marketplaceId,
    purpose: 'editorial',
    intent: undefined,
  };
}

export function NewKeywordWizard({
  open,
  onOpenChange,
  onComplete,
  marketplaceId,
  bookInfo,
  existingKeywords,
  initialKeyword = '',
  onOpenExistingKeyword,
}: NewKeywordWizardProps) {
  // ============ WIZARD STATE ============
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [step1, setStep1] = useState<WizardStep1Data>(getInitialStep1(initialKeyword, marketplaceId));
  const [step2, setStep2] = useState<WizardStep2Data>(getDefaultStep2Data());
  const [step3, setStep3] = useState<WizardStep3Data>(getDefaultStep3Data());
  const [editorialChecks, setEditorialChecks] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<KeywordStatus>('pending');
  
  // ============ RESET FUNCTION ============
  const resetWizard = useCallback(() => {
    setCurrentStep(1);
    setStep1(getInitialStep1('', marketplaceId));
    setStep2(getDefaultStep2Data());
    setStep3(getDefaultStep3Data());
    setEditorialChecks({});
    setStatus('pending');
  }, [marketplaceId]);
  
  // Reset when dialog opens with new initial keyword
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setStep1(getInitialStep1(initialKeyword, marketplaceId));
      setStep2(getDefaultStep2Data());
      setStep3(getDefaultStep3Data());
      setEditorialChecks({});
      setStatus('pending');
    }
  }, [open, initialKeyword, marketplaceId]);
  
  // Handle dialog close - always reset
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetWizard();
    }
    onOpenChange(isOpen);
  };
  
  // ============ DERIVED STATE ============
  const duplicateKeyword = useMemo(() => {
    if (!step1.keyword.trim()) return undefined;
    return findDuplicateKeyword(step1.keyword, marketplaceId, existingKeywords);
  }, [step1.keyword, marketplaceId, existingKeywords]);
  
  const detectedIntent = useMemo(() => {
    if (!step1.keyword.trim()) return undefined;
    return classifyIntent(step1.keyword);
  }, [step1.keyword]);
  
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
  
  const selectedMarketplace = MARKETPLACES.find(m => m.id === marketplaceId);
  
  // Count editorial checks
  const editorialScore = Object.values(editorialChecks).filter(Boolean).length;
  
  // ============ NAVIGATION ============
  const handleNext = () => {
    if (currentStep < 4) {
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
      step3: {
        ...step3,
        notes: step3.notes,
      },
      bookInfo,
    });
    
    // Add status override
    const finalKeyword = {
      ...keyword,
      status: status,
    };
    
    onComplete(finalKeyword);
    resetWizard();
    onOpenChange(false);
  };
  
  const handleOpenExisting = () => {
    if (duplicateKeyword && onOpenExistingKeyword) {
      onOpenExistingKeyword(duplicateKeyword);
      resetWizard();
      onOpenChange(false);
    }
  };
  
  // ============ RENDER ============
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
        <div className="min-h-[350px]">
          {/* ============ STEP 1: BÁSICO ============ */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="keyword">
                  Keyword *
                </Label>
                <Input
                  id="keyword"
                  value={step1.keyword}
                  onChange={(e) => setStep1({ ...step1, keyword: e.target.value })}
                  placeholder="Introduce la keyword..."
                  autoFocus
                />
              </div>
              
              {duplicateKeyword && (
                <Alert className="border-amber-500/50 bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                    <span>Esta keyword ya existe en este marketplace.</span>
                    {onOpenExistingKeyword && (
                      <Button variant="outline" size="sm" onClick={handleOpenExisting}>
                        Abrir ficha existente
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Propósito
                    <FieldTooltip content={FIELD_TOOLTIPS.purpose} />
                  </Label>
                  <Select
                    value={step1.purpose}
                    onValueChange={(value) => setStep1({ ...step1, purpose: value as KeywordPurpose })}
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
                  <Label>
                    Estado
                    <FieldTooltip content={FIELD_TOOLTIPS.status} />
                  </Label>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as KeywordStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {KEYWORD_STATUS_OPTIONS.map((opt) => (
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
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Intención
                    <FieldTooltip content={FIELD_TOOLTIPS.intent} />
                  </Label>
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
                          <div className="flex flex-col">
                            <span>{intent.label}</span>
                            <span className="text-xs text-muted-foreground">{intent.description}</span>
                          </div>
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
                
                <div className="space-y-2">
                  <Label>Marketplace</Label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md border">
                    <span className="text-lg">{selectedMarketplace?.flag}</span>
                    <span className="text-sm">{selectedMarketplace?.name}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* ============ STEP 2: DATOS DE MERCADO ============ */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="searchVolume">
                    Volumen de búsqueda *
                    <FieldTooltip content={FIELD_TOOLTIPS.searchVolume} />
                  </Label>
                  <Input
                    id="searchVolume"
                    type="number"
                    min={0}
                    value={step2.searchVolume || ''}
                    onChange={(e) => setStep2({ ...step2, searchVolume: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    {previewScore.volume.label}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="competitors">
                    Competidores (resultados Amazon) *
                    <FieldTooltip content={FIELD_TOOLTIPS.competitors} />
                  </Label>
                  <Input
                    id="competitors"
                    type="number"
                    min={0}
                    value={step2.competitors || ''}
                    onChange={(e) => setStep2({ ...step2, competitors: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    {previewScore.competitors.label}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">
                    Precio medio de la competencia ($)
                    <FieldTooltip content={FIELD_TOOLTIPS.price} />
                  </Label>
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
                    {previewScore.price.label}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="royalties">
                    Regalías medias aprox. ($)
                    <FieldTooltip content={FIELD_TOOLTIPS.royalties} />
                  </Label>
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
                    {previewScore.royalties.label}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Brand Risk
                    <FieldTooltip content={FIELD_TOOLTIPS.brandRisk} />
                  </Label>
                  <Select
                    value={step2.brandRisk}
                    onValueChange={(value) => setStep2({ ...step2, brandRisk: value as BrandRisk })}
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
                  <Label>
                    Fuente de tráfico
                    <FieldTooltip content={FIELD_TOOLTIPS.trafficSource} />
                  </Label>
                  <Select
                    value={step2.trafficSource}
                    onValueChange={(value) => setStep2({ ...step2, trafficSource: value as TrafficSource })}
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
                    <span className={cn(
                      'text-2xl font-bold',
                      previewScore.total >= 70 ? 'text-green-600 dark:text-green-400' :
                      previewScore.total >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    )}>
                      {previewScore.total}
                    </span>
                    <Badge className={cn(
                      previewScore.total >= 70 ? 'bg-green-500/20 text-green-700 dark:text-green-300' :
                      previewScore.total >= 40 ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                      'bg-red-500/20 text-red-700 dark:text-red-300'
                    )}>
                      {scoreInfo.label}
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={previewScore.total} 
                  className="h-2"
                />
                {previewScore.penalties.points < 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    ⚠ {previewScore.penalties.label}
                  </p>
                )}
                {!isDataComplete && (
                  <Alert className="mt-3 border-amber-500/30 bg-amber-500/10">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-amber-700 dark:text-amber-300">
                      Sin datos de volumen o competidores, la keyword quedará como "Incompleta".
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}
          
          {/* ============ STEP 3: EDITORIAL (Optional) ============ */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Alert className="border-blue-500/30 bg-blue-500/10">
                <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-700 dark:text-blue-300">
                  {step1.purpose === 'ads' 
                    ? 'Esta sección es opcional para keywords de Ads.'
                    : 'Esta sección es para decisiones editoriales y NO afecta al Market Score.'
                  }
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                {EDITORIAL_CHECKS.map((check) => (
                  <div key={check.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={check.id}
                      checked={editorialChecks[check.id] === true}
                      onCheckedChange={(checked) =>
                        setEditorialChecks({ ...editorialChecks, [check.id]: checked === true })
                      }
                    />
                    <Label htmlFor={check.id} className="cursor-pointer text-sm">
                      {check.label}
                    </Label>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Strategic Fit:</span>
                <Badge variant="outline" className={cn(
                  editorialScore >= 7 ? 'bg-green-500/20 text-green-700 dark:text-green-300' :
                  editorialScore >= 4 ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                  'bg-muted text-muted-foreground'
                )}>
                  {editorialScore}/10
                </Badge>
                <span className="text-xs">(solo orientativo)</span>
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
            </div>
          )}
          
          {/* ============ STEP 4: RESUMEN ============ */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-4">
                <h4 className="font-medium text-lg">Resumen de la keyword</h4>
                
                {/* Basic info */}
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <span className="text-muted-foreground">Keyword:</span>
                  <span className="font-medium">{step1.keyword}</span>
                  
                  <span className="text-muted-foreground">Marketplace:</span>
                  <span className="flex items-center gap-2">
                    <span>{selectedMarketplace?.flag}</span>
                    <span>{selectedMarketplace?.name}</span>
                  </span>
                  
                  <span className="text-muted-foreground">Propósito:</span>
                  <span>{KEYWORD_PURPOSE_OPTIONS.find(o => o.value === step1.purpose)?.label}</span>
                  
                  <span className="text-muted-foreground">Estado:</span>
                  <Badge variant="outline" className={KEYWORD_STATUS_OPTIONS.find(o => o.value === status)?.color}>
                    {KEYWORD_STATUS_OPTIONS.find(o => o.value === status)?.label}
                  </Badge>
                </div>
                
                <div className="h-px bg-border" />
                
                {/* Market data */}
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <span className="text-muted-foreground">Volumen búsqueda:</span>
                  <span>{step2.searchVolume.toLocaleString()}</span>
                  
                  <span className="text-muted-foreground">Competidores:</span>
                  <span>{step2.competitors.toLocaleString()}</span>
                  
                  <span className="text-muted-foreground">Precio medio:</span>
                  <span>${step2.price.toFixed(2)}</span>
                  
                  <span className="text-muted-foreground">Regalías:</span>
                  <span>${step2.royalties.toFixed(2)}</span>
                </div>
                
                <div className="h-px bg-border" />
                
                {/* Score */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-muted-foreground">Market Score:</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'text-3xl font-bold',
                      previewScore.total >= 70 ? 'text-green-600 dark:text-green-400' :
                      previewScore.total >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    )}>
                      {previewScore.total}
                    </span>
                    <div className="flex flex-col gap-1">
                      <Badge className={cn(
                        previewScore.total >= 70 ? 'bg-green-500/20 text-green-700 dark:text-green-300' :
                        previewScore.total >= 40 ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                        'bg-red-500/20 text-red-700 dark:text-red-300'
                      )}>
                        {scoreInfo.label}
                      </Badge>
                      {!isDataComplete && (
                        <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/50">
                          Incompleta
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {editorialScore > 0 && (
                  <>
                    <div className="h-px bg-border" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Strategic Fit (editorial):</span>
                      <Badge variant="outline">{editorialScore}/10</Badge>
                    </div>
                  </>
                )}
              </div>
              
              {step3.notes && (
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <span className="text-muted-foreground">Notas: </span>
                  <span>{step3.notes}</span>
                </div>
              )}
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
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            
            {currentStep < 4 ? (
              <Button 
                onClick={handleNext} 
                disabled={currentStep === 1 && !canProceedStep1}
              >
                {currentStep === 3 && step1.purpose === 'ads' ? 'Saltar' : 'Siguiente'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleComplete} className="bg-primary">
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
