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
  Settings,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Keyword, BookInfo, IntentType } from '@/types/advertising';
import { INTENT_TYPES, classifyIntent, MARKETPLACES } from '@/types/advertising';
import {
  KEYWORD_PURPOSE_OPTIONS,
  KEYWORD_STATUS_OPTIONS,
  TRAFFIC_SOURCE_OPTIONS,
  MARKET_STRUCTURE_CHECKS,
  CATALOG_SIGNALS_CHECKS,
  EDITORIAL_CHECKS,
  calculateMarketScore,
  getMarketScoreInfo,
  type KeywordPurpose,
  type KeywordStatus,
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
import { MarketConfigModal } from './MarketConfigModal';
import { cn } from '@/lib/utils';

// ============ TOOLTIPS ============
const FIELD_TOOLTIPS = {
  searchVolume: 'Búsquedas mensuales estimadas en Amazon. Afecta demanda y potencial de Ads.',
  competitors: 'Resultados en Amazon para esta keyword. Menos suele ser mejor.',
  price: 'Precio medio observado en los top resultados. Se usa para estimar margen y viabilidad. <9.99 penaliza.',
  royalties: 'Regalías estimadas por venta. A mayor regalía, más margen para invertir en Ads.',
  trafficSource: 'Fuente principal del tráfico. Penaliza si depende de marca personal/rrss.',
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
  onComplete: (keyword: Keyword) => void;
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
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configVersion, setConfigVersion] = useState(0);
  
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
      selfContained: step2.selfContained ?? false,
      amazonSuggestion: step2.amazonSuggestion ?? false,
      booksSellingWell: step2.booksSellingWell ?? false,
      indieAuthorsSelling: step2.indieAuthorsSelling ?? false,
      topMatchesIntent: step2.topMatchesIntent ?? false,
      variantsPotential: step2.variantsPotential ?? false,
    };
    const catalogSignals = {
      hasBooksOver200Reviews: step2.hasBooksOver200Reviews ?? false,
      hasProfitableBooks: step2.hasProfitableBooks ?? false,
      hasBooksUnder100Reviews: step2.hasBooksUnder100Reviews ?? false,
    };
    return calculateMarketScore({
      searchVolume: step2.searchVolume,
      competitors: step2.competitors,
      price: step2.price,
      royalties: step2.royalties,
      trafficSource: step2.trafficSource,
    }, marketplaceId, marketStructure, catalogSignals);
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
  }, [marketplaceId, configVersion]);
  
  const scoreInfo = getMarketScoreInfo(previewScore.total);
  const isDataComplete = isMarketDataComplete(step2);
  const canProceedStep1 = step1.keyword.trim().length > 0 && !hasDuplicate;
  
  const selectedMarketplace = MARKETPLACES.find(m => m.id === marketplaceId);
  
  // Count editorial checks (5 checks)
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
    if (hasDuplicate) return;
    
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
                      Esta keyword ya existe en este marketplace.
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
                      <SelectValue placeholder="Auto-detectar..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {INTENT_TYPES.map((intent) => (
                        <SelectItem key={intent.value} value={intent.value}>
                          <span>{intent.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {detectedIntent && !step1.intent && (
                    <p className="text-xs text-muted-foreground">
                      Auto-detectada: {INTENT_TYPES.find(i => i.value === detectedIntent)?.label}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Marketplace</Label>
                  <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                    <span>{selectedMarketplace?.flag}</span>
                    <span className="text-sm">{selectedMarketplace?.name}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* ============ STEP 2: DATOS DE MERCADO ============ */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{getStep2Title(step1.purpose)}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfigModalOpen(true)}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Configurar mercado
                </Button>
              </div>
              
              {/* Config warning */}
              {marketplaceConfigStatus.usingDefaults && (
                <Alert className="border-amber-500/30 bg-amber-500/10">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
                    {marketplaceConfigStatus.needsConfig 
                      ? 'Este marketplace no tiene configuración. El Market Score usa valores por defecto.'
                      : 'Usando configuración base. Personaliza los valores ideales para tu estrategia.'}
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
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={opt.color}>
                            {opt.label}
                          </Badge>
                          {opt.penalty !== 0 && (
                            <span className="text-xs text-muted-foreground">({opt.penalty})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Estructura del Mercado (12 pts) - 6 checks x 2pts */}
              <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    Estructura del Mercado
                    <FieldTooltip content="Señales de estructura del mercado. Aporta hasta 12 puntos al Market Score (6 checks × 2pts)." />
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {previewScore.marketStructure.points}/{previewScore.marketStructure.max} pts
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {MARKET_STRUCTURE_CHECKS.map((check) => (
                    <div key={check.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={check.id}
                          checked={step2[check.id as keyof WizardStep2Data] === true}
                          onCheckedChange={(checked) => setStep2({ ...step2, [check.id]: checked === true })}
                        />
                        <Label htmlFor={check.id} className="text-xs cursor-pointer">
                          {check.label}
                        </Label>
                      </div>
                      <span className="text-[10px] text-green-600 dark:text-green-400">+{check.points}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Señales de Catálogo (12 pts) */}
              <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    Señales de Catálogo
                    <FieldTooltip content="Señales sobre el catálogo existente. Aporta hasta 12 puntos al Market Score." />
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {previewScore.catalogSignals.points}/{previewScore.catalogSignals.max} pts
                  </span>
                </div>
                
                <div className="space-y-2">
                  {CATALOG_SIGNALS_CHECKS.map((check) => (
                    <div key={check.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={check.id}
                          checked={step2[check.id as keyof WizardStep2Data] === true}
                          onCheckedChange={(checked) => setStep2({ ...step2, [check.id]: checked === true })}
                        />
                        <Label htmlFor={check.id} className="text-xs cursor-pointer">
                          {check.label}
                        </Label>
                      </div>
                      <span className="text-[10px] text-green-600 dark:text-green-400">+{check.points}</span>
                    </div>
                  ))}
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
                  <div key={check.id} className="flex items-center space-x-3 p-2 rounded bg-muted/30">
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
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={step3.notes}
                  onChange={(e) => setStep3({ ...step3, notes: e.target.value })}
                  placeholder="Observaciones para decisión editorial..."
                  rows={4}
                />
              </div>
            </div>
          )}
          
          {/* ============ STEP 4: RESUMEN ============ */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Resumen</h3>
              
              {/* A: Viabilidad de Mercado */}
              <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                <h4 className="font-medium">Viabilidad de Mercado</h4>
                
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{step1.keyword}</span>
                  <Badge variant="outline">{selectedMarketplace?.name}</Badge>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Progress value={previewScore.total} className="h-3" />
                  </div>
                  <Badge className={cn(
                    'text-lg px-3',
                    previewScore.total >= 70 ? 'bg-green-500/20 text-green-700 dark:text-green-300' :
                    previewScore.total >= 40 ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                    'bg-red-500/20 text-red-700 dark:text-red-300'
                  )}>
                    {previewScore.total}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Volumen:</span>
                    <span>{step2.searchVolume.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Competidores:</span>
                    <span>{step2.competitors.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Precio:</span>
                    <span>${step2.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Regalías:</span>
                    <span>${step2.royalties.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estructura:</span>
                    <span>{previewScore.marketStructure.points}/{previewScore.marketStructure.max} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Catálogo:</span>
                    <span>{previewScore.catalogSignals.points}/{previewScore.catalogSignals.max} pts</span>
                  </div>
                </div>
              </div>
              
              {/* B: Contexto Editorial (if exists) */}
              {editorialScore > 0 && (
                <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                  <h4 className="font-medium">Contexto Editorial</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{editorialScore}/5 checks</Badge>
                    <span className="text-xs text-muted-foreground italic">
                      (No afecta al Market Score)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {EDITORIAL_CHECKS.filter(c => editorialChecks[c.id]).map(check => (
                      <Badge key={check.id} variant="secondary" className="text-xs">
                        ✓ {check.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Metadata */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{KEYWORD_PURPOSE_OPTIONS.find(p => p.value === step1.purpose)?.label}</Badge>
                <Badge variant="outline" className={KEYWORD_STATUS_OPTIONS.find(s => s.value === status)?.color}>
                  {KEYWORD_STATUS_OPTIONS.find(s => s.value === status)?.label}
                </Badge>
                {step1.intent && (
                  <Badge variant="outline">
                    {INTENT_TYPES.find(i => i.value === step1.intent)?.label}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Atrás
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            {currentStep < 4 ? (
              <Button onClick={handleNext} disabled={currentStep === 1 && !canProceedStep1} className="gap-2">
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={hasDuplicate} className="gap-2">
                <Check className="w-4 h-4" />
                Crear Keyword
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
      
      {/* Market Config Modal */}
      <MarketConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        currentMarketplace={marketplaceId}
        onConfigChange={() => setConfigVersion(v => v + 1)}
      />
    </Dialog>
  );
}