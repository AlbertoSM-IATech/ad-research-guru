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
import { getMarketScoreConfig, loadUserConfigOverrides, MARKET_SCORE_CONFIG_BY_MARKETPLACE } from '@/lib/market-score-config';
import { cn } from '@/lib/utils';

// ============ TOOLTIPS ============
const FIELD_TOOLTIPS = {
  searchVolume: 'Búsquedas mensuales estimadas en Amazon. Afecta demanda y potencial de Ads.',
  competitors: 'Resultados en Amazon para esta keyword. Menos suele ser mejor.',
  price: 'Precio medio observado en los top resultados. Se usa para estimar margen y viabilidad. <9.99 penaliza.',
  royalties: 'Regalías estimadas por venta. A mayor regalía, más margen para invertir en Ads.',
  brandRisk: 'Riesgo de marca registrada/propiedad intelectual. Penaliza el score si es alto.',
  trafficSource: 'Si el tráfico depende de marca personal/rrss, suele implicar competencia dura; puede penalizar.',
  purpose: 'Para qué usarás la keyword: decidir libros, campañas de Ads, o ambas.',
  intent: 'Sirve para clasificar la keyword (estrategia). No afecta al Market Score. Ej: compra vs informativa.',
  status: 'Estado de validación: Pendiente = por revisar, Válida = confirmada, Descartada = no usar.',
};

// Tooltips específicos por propósito
const PURPOSE_TOOLTIPS: Record<string, string> = {
  editorial: 'Para decidir si merece crear uno o varios libros y entender el nicho.',
  ads: 'Para gestionar keywords como base de Ads (presupuesto, test, descarte).',
  both: 'Para usar la keyword tanto para decisión editorial como para Ads.',
};

// Títulos de paso adaptados por propósito
function getStep2Title(purpose: string): string {
  switch (purpose) {
    case 'ads': return 'Datos de mercado (para Ads y viabilidad)';
    case 'editorial': return 'Datos de mercado (validación del nicho)';
    default: return 'Datos de mercado (base común)';
  }
}

function getStep3Title(purpose: string): string {
  switch (purpose) {
    case 'ads': return 'Contexto (opcional)';
    case 'editorial': return 'Contexto editorial (recomendado)';
    default: return 'Contexto editorial + Ads (separado del score)';
  }
}

// ============ EDITORIAL CHECKLIST ============
// ONLY editorial checks that do NOT affect Market Score
// The 6 market structure checks are in Step 2, not here
const EDITORIAL_CHECKS = [
  { id: 'canProduce', label: 'Puedo producir este tipo de libro' },
  { id: 'canDoBetter', label: 'Puedo hacerlo mejor o más útil' },
  { id: 'canDifferentiate', label: 'Puedo diferenciarlo claramente' },
  { id: 'hasInterest', label: 'Tengo interés en el tema (opcional)' },
];

// Generate unique ID
function generateKeywordId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Normalize keyword text
function normalizeKeyword(keyword: string): string {
  return keyword.trim().replace(/\s+/g, ' ');
}

interface NewKeywordWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (keyword: Keyword) => void; // Now returns complete Keyword with id
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
    const normalized = normalizeKeyword(step1.keyword);
    if (!normalized) return undefined;
    return findDuplicateKeyword(normalized, marketplaceId, existingKeywords);
  }, [step1.keyword, marketplaceId, existingKeywords]);
  
  // Block advancing if duplicate exists
  const hasDuplicate = !!duplicateKeyword;
  
  const detectedIntent = useMemo(() => {
    if (!step1.keyword.trim()) return undefined;
    return classifyIntent(step1.keyword);
  }, [step1.keyword]);
  
  const previewScore = useMemo(() => {
    const marketStructure = {
      understandable: step2.understandable ?? false,
      amazonSuggested: step2.amazonSuggested ?? false,
      profitableBooks: step2.profitableBooks ?? false,
      indieAuthors: step2.indieAuthors ?? false,
      intentMatch: step2.intentMatch ?? false,
      variants: step2.variants ?? false,
    };
    return calculateMarketScore({
      searchVolume: step2.searchVolume,
      competitors: step2.competitors,
      price: step2.price,
      royalties: step2.royalties,
      brandRisk: step2.brandRisk,
      trafficSource: step2.trafficSource,
    }, marketplaceId, marketStructure);
  }, [step2, marketplaceId]);
  
  // Get current market config for BONUS UX subtitle
  const marketConfig = useMemo(() => getMarketScoreConfig(marketplaceId), [marketplaceId]);
  
  // Check if marketplace has user config or base config
  const marketplaceConfigStatus = useMemo(() => {
    const userOverrides = loadUserConfigOverrides();
    const hasUserConfig = !!userOverrides[marketplaceId];
    const hasBaseConfig = !!MARKET_SCORE_CONFIG_BY_MARKETPLACE[marketplaceId];
    return {
      isConfigured: hasUserConfig,
      hasBaseConfig,
      needsConfig: !hasUserConfig && !hasBaseConfig,
      usingDefaults: !hasUserConfig,
    };
  }, [marketplaceId]);
  
  const scoreInfo = getMarketScoreInfo(previewScore.total);
  const isDataComplete = isMarketDataComplete(step2);
  const canProceedStep1 = step1.keyword.trim().length > 0 && !hasDuplicate;
  
  const selectedMarketplace = MARKETPLACES.find(m => m.id === marketplaceId);
  
  // Count editorial checks (now 4 checks)
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
    // Don't allow completion if duplicate exists
    if (hasDuplicate) return;
    
    // Normalize keyword before building
    const normalizedStep1 = {
      ...step1,
      keyword: normalizeKeyword(step1.keyword),
      intent: step1.intent ?? detectedIntent,
    };
    
    const keywordData = buildNewKeywordFromWizard({
      step1: normalizedStep1,
      step2,
      step3: {
        editorialChecks,
        notes: step3.notes,
      },
      bookInfo,
    });
    
    // Generate ID and build complete keyword with timestamps
    const now = new Date();
    const completeKeyword: Keyword = {
      ...keywordData,
      id: generateKeywordId(),
      status: status,
      createdAt: now,
      updatedAt: now,
    };
    
    onComplete(completeKeyword);
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
                  onChange={(e) => setStep1({ ...step1, keyword: normalizeKeyword(e.target.value) })}
                  placeholder="Introduce la keyword..."
                  autoFocus
                  className={hasDuplicate ? 'border-destructive' : ''}
                />
              </div>
              
              {duplicateKeyword && (
                <Alert className="border-destructive/50 bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-destructive dark:text-destructive">
                      Esta keyword ya existe en este marketplace. No puedes crearla de nuevo.
                    </span>
                    {onOpenExistingKeyword && (
                      <Button variant="outline" size="sm" onClick={handleOpenExisting} className="ml-2 shrink-0">
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
                    <FieldTooltip content={PURPOSE_TOOLTIPS[step1.purpose] || FIELD_TOOLTIPS.purpose} />
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
              
              {/* Warning banner if marketplace not configured */}
              {marketplaceConfigStatus.usingDefaults && (
                <Alert className="border-amber-500/50 bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
                    <strong>⚠️ Antes de validar keywords en este mercado</strong>, define tus <strong>VALORES IDEALES</strong> en Configuración. 
                    Sin eso, el scoring no estará adaptado a tu mercado y los resultados serán poco fiables.
                    {marketplaceConfigStatus.hasBaseConfig ? (
                      <span className="block text-xs mt-1 text-amber-600 dark:text-amber-400">
                        Actualmente usando defaults base para {selectedMarketplace?.name}.
                      </span>
                    ) : (
                      <span className="block text-xs mt-1 text-amber-600 dark:text-amber-400">
                        Este mercado no tiene configuración base. Usando valores de España como referencia.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          {/* ============ STEP 2: DATOS DE MERCADO ============ */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">{getStep2Title(step1.purpose)}</h3>
              <p className="text-xs text-muted-foreground -mt-4">
                Criterios actuales ({selectedMarketplace?.name || marketplaceId.toUpperCase()}): 
                ideal volumen {marketConfig.idealVolume.toLocaleString()}, 
                ideal competidores {marketConfig.idealCompetitors.toLocaleString()}, 
                precio {marketConfig.idealPrice}$, 
                regalías {marketConfig.idealRoyalties}$
              </p>
              
              {/* Warning banner if marketplace not configured - Step 2 */}
              {marketplaceConfigStatus.usingDefaults && (
                <Alert className="border-amber-500/50 bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
                    <strong>⚠️ Configura primero tus valores ideales</strong> para obtener un scoring adaptado a este mercado.
                    {!marketplaceConfigStatus.isConfigured && (
                      <span className="block text-xs mt-1 text-amber-600 dark:text-amber-400">
                        Los valores mostrados arriba son valores por defecto. El Market Score no estará personalizado hasta que configures el mercado.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
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
              
              {/* Estructura del Mercado (12 pts) - 6 checks x 2pts */}
              <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    Estructura del Mercado
                    <FieldTooltip content="Señales de estructura del mercado. Aporta hasta 12 puntos al Market Score (6 checks × 2pts)." />
                  </h4>
                  <span className="text-xs text-muted-foreground">Máx +12 pts</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="understandable"
                        checked={step2.understandable === true}
                        onCheckedChange={(checked) => setStep2({ ...step2, understandable: checked === true })}
                      />
                      <Label htmlFor="understandable" className="text-xs cursor-pointer">
                        Se entiende por sí sola
                      </Label>
                    </div>
                    <span className="text-[10px] text-green-600 dark:text-green-400">+2</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="amazonSuggested"
                        checked={step2.amazonSuggested === true}
                        onCheckedChange={(checked) => setStep2({ ...step2, amazonSuggested: checked === true })}
                      />
                      <Label htmlFor="amazonSuggested" className="text-xs cursor-pointer">
                        Sugerencia Amazon
                      </Label>
                    </div>
                    <span className="text-[10px] text-green-600 dark:text-green-400">+2</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="profitableBooks"
                        checked={step2.profitableBooks === true}
                        onCheckedChange={(checked) => setStep2({ ...step2, profitableBooks: checked === true })}
                      />
                      <Label htmlFor="profitableBooks" className="text-xs cursor-pointer">
                        ≥3 libros vendiendo
                      </Label>
                    </div>
                    <span className="text-[10px] text-green-600 dark:text-green-400">+2</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="indieAuthors"
                        checked={step2.indieAuthors === true}
                        onCheckedChange={(checked) => setStep2({ ...step2, indieAuthors: checked === true })}
                      />
                      <Label htmlFor="indieAuthors" className="text-xs cursor-pointer">
                        Autores indie vendiendo
                      </Label>
                    </div>
                    <span className="text-[10px] text-green-600 dark:text-green-400">+2</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="intentMatch"
                        checked={step2.intentMatch === true}
                        onCheckedChange={(checked) => setStep2({ ...step2, intentMatch: checked === true })}
                      />
                      <Label htmlFor="intentMatch" className="text-xs cursor-pointer">
                        Top refleja intención
                      </Label>
                    </div>
                    <span className="text-[10px] text-green-600 dark:text-green-400">+2</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="variants"
                        checked={step2.variants === true}
                        onCheckedChange={(checked) => setStep2({ ...step2, variants: checked === true })}
                      />
                      <Label htmlFor="variants" className="text-xs cursor-pointer">
                        Variantes con potencial
                      </Label>
                    </div>
                    <span className="text-[10px] text-green-600 dark:text-green-400">+2</span>
                  </div>
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
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{getStep3Title(step1.purpose)}</h3>
                {step1.purpose === 'ads' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentStep(4)}
                    className="text-xs"
                  >
                    Crear sin contexto →
                  </Button>
                )}
              </div>
              
              <Alert className="border-blue-500/30 bg-blue-500/10">
                <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-700 dark:text-blue-300">
                  Esto NO afecta al Market Score. Sirve para decisión editorial/estrategia.
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
                <span>Editorial Fit:</span>
                <Badge variant="outline" className={cn(
                  editorialScore >= 3 ? 'bg-green-500/20 text-green-700 dark:text-green-300' :
                  editorialScore >= 2 ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                  'bg-muted text-muted-foreground'
                )}>
                  {editorialScore}/4
                </Badge>
                <span className="text-xs">(solo orientativo, no afecta al Market Score)</span>
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
              {/* Bloque A: Viabilidad de mercado (Market Score) - siempre visible */}
              <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-4">
                <h4 className="font-medium text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Viabilidad de mercado (Market Score)
                </h4>
                
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
                
                {previewScore.penalties.points < 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠ {previewScore.penalties.label}
                  </p>
                )}
              </div>
              
              {/* Bloque B: Contexto editorial (opcional) - solo si hay datos */}
              {(editorialScore > 0 || step3.notes) ? (
                <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-4">
                  <h4 className="font-medium text-lg flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-blue-500" />
                    Contexto editorial (opcional)
                  </h4>
                  
                  {editorialScore > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Strategic Fit:</span>
                      <Badge variant="outline" className={cn(
                        editorialScore >= 7 ? 'bg-green-500/20 text-green-700 dark:text-green-300' :
                        editorialScore >= 4 ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {editorialScore}/10
                      </Badge>
                    </div>
                  )}
                  
                  {editorialScore > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Checks marcados:</span>{' '}
                      {EDITORIAL_CHECKS.filter(c => editorialChecks[c.id]).map(c => c.label).join(', ') || 'Ninguno'}
                    </div>
                  )}
                  
                  {step3.notes && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Notas: </span>
                      <span>{step3.notes}</span>
                    </div>
                  )}
                </div>
              ) : step1.purpose === 'ads' ? (
                <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Contexto editorial no completado (correcto para Ads).
                </div>
              ) : null}
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
              <div className="flex flex-col items-end gap-1">
                <Button 
                  onClick={handleNext} 
                  disabled={currentStep === 1 && !canProceedStep1}
                >
                  {currentStep === 3 && step1.purpose === 'ads' && editorialScore === 0 
                    ? 'Saltar' 
                    : 'Siguiente'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                {currentStep === 2 && step1.purpose === 'ads' && (
                  <span className="text-xs text-muted-foreground">
                    El paso "Contexto" es opcional para Ads.
                  </span>
                )}
              </div>
            ) : (
              <Button 
                onClick={handleComplete} 
                className="bg-primary"
                disabled={hasDuplicate}
              >
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
