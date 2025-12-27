import { useState, useEffect, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
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
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Info, Save, RotateCcw, Sparkles } from 'lucide-react';
import type { Keyword } from '@/types/advertising';
import { getAutoStatusFromScore } from '@/lib/keyword-builder';
import {
  type MarketData,
  type EditorialData,
  type BrandRisk,
  type TrafficSource,
  type KeywordStatus,
  calculateMarketScore,
  calculateEditorialScore,
  getDefaultMarketData,
  getDefaultEditorialData,
  getMarketScoreInfo,
  BRAND_RISK_OPTIONS,
  TRAFFIC_SOURCE_OPTIONS,
  KEYWORD_STATUS_OPTIONS,
} from '@/lib/market-score';

// Editorial checks aligned with wizard
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

interface KeywordDetailPanelProps {
  keyword: Keyword | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (keywordId: string, updates: Partial<Keyword>) => void;
  marketplaceId?: string;
}

export const KeywordDetailPanel = ({ 
  keyword, 
  isOpen, 
  onClose, 
  onSave,
  marketplaceId = 'us',
}: KeywordDetailPanelProps) => {
  // Market Data state
  const [searchVolume, setSearchVolume] = useState(0);
  const [competitors, setCompetitors] = useState(0);
  const [price, setPrice] = useState(9.99);
  const [royalties, setRoyalties] = useState(2.00);
  const [brandRisk, setBrandRisk] = useState<BrandRisk>('low');
  const [trafficSource, setTrafficSource] = useState<TrafficSource>('amazon');
  
  // Market Structure state (15 pts block)
  const [hasProfitableBooks, setHasProfitableBooks] = useState(false);
  const [hasBooksOver200Reviews, setHasBooksOver200Reviews] = useState(false);
  const [hasBooksUnder100Reviews, setHasBooksUnder100Reviews] = useState(false);
  
  // Editorial Data state (10 checks aligned with wizard)
  const [editorialChecks, setEditorialChecks] = useState<Record<string, boolean>>({});
  const [editorialNotes, setEditorialNotes] = useState('');
  const [status, setStatus] = useState<KeywordStatus>('pending');
  const [statusManuallySet, setStatusManuallySet] = useState(false);
  const [notes, setNotes] = useState('');

  // Load keyword data when opening
  useEffect(() => {
    if (keyword && isOpen) {
      // Market data
      const md = keyword.marketData ?? getDefaultMarketData();
      setSearchVolume(keyword.searchVolume || md.searchVolume);
      setCompetitors(keyword.competitors || md.competitors);
      setPrice(keyword.price || md.price);
      setRoyalties(keyword.royalties || md.royalties);
      setBrandRisk(md.brandRisk);
      setTrafficSource(md.trafficSource);
      
      // Market Structure data
      const ms = keyword.marketStructure;
      setHasProfitableBooks(ms?.hasProfitableBooks ?? false);
      setHasBooksOver200Reviews(ms?.hasBooksOver200Reviews ?? false);
      setHasBooksUnder100Reviews(ms?.hasBooksUnder100Reviews ?? false);
      
      // Editorial data - load from keyword editorialScore or build from checklist
      const ed = keyword.editorialData ?? getDefaultEditorialData();
      // Convert legacy checklist to editorial checks format
      const checks: Record<string, boolean> = {};
      if (ed.checklist.canCreate === true) checks.canProduce = true;
      if (ed.checklist.canDoBetter === true) checks.canDoBetter = true;
      if (ed.checklist.canDifferentiate === true) checks.canDifferentiate = true;
      if (ed.checklist.fitsStrategy === true) checks.hasInterest = true;
      setEditorialChecks(checks);
      setEditorialNotes(ed.notes);
      
      // Status & notes
      setStatus(keyword.status || 'pending');
      setStatusManuallySet(keyword.statusManuallySet || false);
      setNotes(keyword.notes || '');
    }
  }, [keyword, isOpen]);

  // Calculate Market Score
  const marketData: MarketData = useMemo(() => ({
    searchVolume,
    competitors,
    price,
    royalties,
    brandRisk,
    trafficSource,
  }), [searchVolume, competitors, price, royalties, brandRisk, trafficSource]);

  // Market Structure for scoring
  const marketStructure = useMemo(() => ({
    hasProfitableBooks,
    hasBooksOver200Reviews,
    hasBooksUnder100Reviews,
  }), [hasProfitableBooks, hasBooksOver200Reviews, hasBooksUnder100Reviews]);

  const scoreBreakdown = useMemo(() => calculateMarketScore(marketData, marketplaceId, marketStructure), [marketData, marketplaceId, marketStructure]);
  const scoreInfo = useMemo(() => getMarketScoreInfo(scoreBreakdown.total), [scoreBreakdown.total]);

  // Calculate Editorial Score from checks
  const editorialData: EditorialData = useMemo(() => ({
    checklist: { 
      canCreate: editorialChecks.canProduce ?? null, 
      canDoBetter: editorialChecks.canDoBetter ?? null, 
      canDifferentiate: editorialChecks.canDifferentiate ?? null, 
      fitsStrategy: editorialChecks.hasInterest ?? null 
    },
    notes: editorialNotes,
  }), [editorialChecks, editorialNotes]);

  const editorialScore = useMemo(() => Object.values(editorialChecks).filter(Boolean).length, [editorialChecks]);

  // Auto-update status based on score if not manually set
  const autoStatus = useMemo(() => getAutoStatusFromScore(scoreBreakdown.total), [scoreBreakdown.total]);

  // Save handler
  const handleSave = () => {
    if (!keyword) return;
    
    // Determine final status: if manually set, keep it; otherwise use auto
    const finalStatus = statusManuallySet ? status : autoStatus;
    
    const updates: Partial<Keyword> = {
      searchVolume,
      competitors,
      price,
      royalties,
      marketScore: scoreBreakdown.total,
      marketData,
      marketStructure,
      editorialData,
      editorialScore,
      status: finalStatus,
      statusManuallySet,
      notes,
    };
    
    onSave(keyword.id, updates);
    onClose();
  };

  // Handle manual status change
  const handleStatusChange = (newStatus: KeywordStatus) => {
    setStatus(newStatus);
    setStatusManuallySet(true);
  };

  // Reset status to auto mode
  const handleResetToAutoStatus = () => {
    setStatusManuallySet(false);
    setStatus(autoStatus);
  };

  // Reset handler
  const handleReset = () => {
    if (!keyword) return;
    const md = keyword.marketData ?? getDefaultMarketData();
    setSearchVolume(keyword.searchVolume || md.searchVolume);
    setCompetitors(keyword.competitors || md.competitors);
    setPrice(keyword.price || md.price);
    setRoyalties(keyword.royalties || md.royalties);
    setBrandRisk(md.brandRisk);
    setTrafficSource(md.trafficSource);
    
    // Reset market structure
    const ms = keyword.marketStructure;
    setHasProfitableBooks(ms?.hasProfitableBooks ?? false);
    setHasBooksOver200Reviews(ms?.hasBooksOver200Reviews ?? false);
    setHasBooksUnder100Reviews(ms?.hasBooksUnder100Reviews ?? false);
    
    const ed = keyword.editorialData ?? getDefaultEditorialData();
    const checks: Record<string, boolean> = {};
    if (ed.checklist.canCreate === true) checks.canProduce = true;
    if (ed.checklist.canDoBetter === true) checks.canDoBetter = true;
    if (ed.checklist.canDifferentiate === true) checks.canDifferentiate = true;
    if (ed.checklist.fitsStrategy === true) checks.hasInterest = true;
    setEditorialChecks(checks);
    setEditorialNotes(ed.notes);
    
    setStatus(keyword.status || 'pending');
    setStatusManuallySet(keyword.statusManuallySet || false);
    setNotes(keyword.notes || '');
  };

  if (!keyword) return null;

  const getScoreBarColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-blue-500';
    if (score >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold truncate">
            {keyword.keyword}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* ========== SECCIÓN 1: MARKET SCORE ========== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Market Score
              </h3>
              <Badge className={cn('text-lg px-3 py-1', scoreInfo.bgColor, scoreInfo.color)}>
                {scoreBreakdown.total}
              </Badge>
            </div>
            
            {/* Score Bar */}
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn('h-full transition-all duration-300', getScoreBarColor(scoreBreakdown.total))}
                  style={{ width: `${scoreBreakdown.total}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span className={scoreInfo.color}>{scoreInfo.label}</span>
                <span>100</span>
              </div>
            </div>

            {/* Score Breakdown Tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                    <Info className="w-4 h-4" />
                    Ver desglose del score
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs p-4 space-y-2">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Volumen</span>
                      <span className="font-mono">{scoreBreakdown.volume.points}/{scoreBreakdown.volume.max}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Competidores</span>
                      <span className="font-mono">{scoreBreakdown.competitors.points}/{scoreBreakdown.competitors.max}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Precio</span>
                      <span className="font-mono">{scoreBreakdown.price.points}/{scoreBreakdown.price.max}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Regalías</span>
                      <span className="font-mono">{scoreBreakdown.royalties.points}/{scoreBreakdown.royalties.max}</span>
                    </div>
                    <div className="flex justify-between text-primary">
                      <span>Estructura mercado</span>
                      <span className="font-mono">{scoreBreakdown.marketStructure.points}/{scoreBreakdown.marketStructure.max}</span>
                    </div>
                    {scoreBreakdown.penalties.points !== 0 && (
                      <div className="flex justify-between text-red-500">
                        <span>Penalizaciones</span>
                        <span className="font-mono">{scoreBreakdown.penalties.points}</span>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Separator />

          {/* ========== SECCIÓN 2: DATOS DE MERCADO ========== */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Datos de Mercado
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Volumen */}
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="volume">Volumen de búsqueda</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        Búsquedas mensuales estimadas en Amazon. Mayor volumen = más demanda potencial.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="volume"
                  type="number"
                  min={0}
                  value={searchVolume}
                  onChange={(e) => setSearchVolume(Number(e.target.value))}
                />
              </div>
              
              {/* Competidores */}
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="competitors">Competidores (resultados)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        Número de resultados en Amazon para esta keyword. Menos competidores = mejor oportunidad.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="competitors"
                  type="number"
                  min={0}
                  value={competitors}
                  onChange={(e) => setCompetitors(Number(e.target.value))}
                />
              </div>
              
              {/* Precio */}
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="price">Precio medio ($)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        Precio medio observado en los top resultados de la competencia. Precios &lt;9.99$ penalizan el score.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
              </div>
              
              {/* Regalías */}
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="royalties">Regalías medias ($)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        Regalías medias aproximadas de la competencia. Mayor regalía = más margen para invertir en Ads.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="royalties"
                  type="number"
                  min={0}
                  step={0.01}
                  value={royalties}
                  onChange={(e) => setRoyalties(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Brand Risk */}
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label>Brand Risk</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      Riesgo de marca registrada o propiedad intelectual. Un riesgo alto penaliza el Market Score.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select value={brandRisk} onValueChange={(v) => setBrandRisk(v as BrandRisk)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRAND_RISK_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className={opt.color}>{opt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Traffic Source */}
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label>Fuente de tráfico</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      Si el tráfico depende de marca personal/RRSS, suele implicar competencia dura y puede penalizar el score.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select value={trafficSource} onValueChange={(v) => setTrafficSource(v as TrafficSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRAFFIC_SOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className={opt.color}>{opt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* ========== SECCIÓN 3: ESTRUCTURA DEL MERCADO (15 pts) ========== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                Estructura del Mercado
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      Señales de estructura del mercado. Aporta hasta 15 puntos al Market Score total.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h3>
              <Badge variant="outline" className="text-sm">
                {scoreBreakdown.marketStructure.points}/{scoreBreakdown.marketStructure.max}
              </Badge>
            </div>

            <div className="space-y-3">
              {/* Libros rentables */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="profitableBooks"
                    checked={hasProfitableBooks}
                    onCheckedChange={(checked) => setHasProfitableBooks(checked === true)}
                  />
                  <div className="flex items-center gap-1">
                    <label htmlFor="profitableBooks" className="text-sm cursor-pointer">
                      📚 Libros rentables (≥3)
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          Confirma que el nicho genera ingresos reales de forma consistente.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <Badge variant={hasProfitableBooks ? 'default' : 'secondary'} className="text-xs">
                  +6 pts
                </Badge>
              </div>

              {/* Libros +200 reviews */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="booksOver200"
                    checked={hasBooksOver200Reviews}
                    onCheckedChange={(checked) => setHasBooksOver200Reviews(checked === true)}
                  />
                  <div className="flex items-center gap-1">
                    <label htmlFor="booksOver200" className="text-sm cursor-pointer">
                      ⭐ Libros con +200 reviews
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          Indica interés y demanda sostenida del mercado.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <Badge variant={hasBooksOver200Reviews ? 'default' : 'secondary'} className="text-xs">
                  +5 pts
                </Badge>
              </div>

              {/* Libros -100 reviews */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="booksUnder100"
                    checked={hasBooksUnder100Reviews}
                    onCheckedChange={(checked) => setHasBooksUnder100Reviews(checked === true)}
                  />
                  <div className="flex items-center gap-1">
                    <label htmlFor="booksUnder100" className="text-sm cursor-pointer">
                      🌱 Libros con -100 reviews
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          Señal de facilidad de entrada sin marca fuerte.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <Badge variant={hasBooksUnder100Reviews ? 'default' : 'secondary'} className="text-xs">
                  +4 pts
                </Badge>
              </div>
            </div>
          </div>

          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Contexto Editorial
              </h3>
              <Badge variant="outline" className="text-sm">
                {editorialScore}/10
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Esta sección NO afecta el Market Score. Sirve para decisión editorial/estrategia.
            </p>

            <div className="space-y-2">
              {EDITORIAL_CHECKS.map((check) => (
                <div key={check.id} className="flex items-center space-x-3 p-2 rounded-lg bg-muted/30">
                  <Checkbox
                    id={`detail-${check.id}`}
                    checked={editorialChecks[check.id] === true}
                    onCheckedChange={(checked) =>
                      setEditorialChecks({ ...editorialChecks, [check.id]: checked === true })
                    }
                  />
                  <label htmlFor={`detail-${check.id}`} className="cursor-pointer text-sm flex-1">
                    {check.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* ========== SECCIÓN 4: NOTAS & ESTADO ========== */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Estado y Notas
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Estado</Label>
                {statusManuallySet && (
                  <Button variant="ghost" size="sm" onClick={handleResetToAutoStatus} className="h-6 text-xs gap-1">
                    <Sparkles className="w-3 h-3" />
                    Auto ({autoStatus === 'valid' ? 'Válida' : autoStatus === 'pending' ? 'Pendiente' : 'Descartada'})
                  </Button>
                )}
              </div>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KEYWORD_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className={opt.color}>{opt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!statusManuallySet && (
                <p className="text-xs text-muted-foreground">
                  Estado automático según Market Score
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Añade notas sobre esta keyword..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Resetear
          </Button>
          <Button onClick={handleSave} className="flex-1 gap-2">
            <Save className="w-4 h-4" />
            Guardar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
