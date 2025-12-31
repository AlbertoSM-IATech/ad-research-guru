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
import { cn } from '@/lib/utils';
import { Info, Save, RotateCcw, Sparkles } from 'lucide-react';
import type { Keyword } from '@/types/advertising';
import { getAutoStatusFromScore } from '@/lib/keyword-builder';
import {
  type MarketData,
  type MarketStructure,
  type CatalogSignals,
  type EditorialData,
  type TrafficSource,
  type KeywordStatus,
  type BooksOver200ReviewsRange,
  calculateMarketScore,
  calculateEditorialScore,
  getDefaultMarketData,
  getDefaultEditorialData,
  getDefaultMarketStructure,
  getDefaultCatalogSignals,
  getMarketScoreInfo,
  getBooksOver200ReviewsPoints,
  TRAFFIC_SOURCE_OPTIONS,
  KEYWORD_STATUS_OPTIONS,
  MARKET_STRUCTURE_CHECKS,
  CATALOG_SIGNALS_CHECKS,
  EDITORIAL_CHECKS,
  BOOKS_OVER_200_REVIEWS_OPTIONS,
  BOOKS_OVER_200_REVIEWS_FIELD,
} from '@/lib/market-score';

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
  const [trafficSource, setTrafficSource] = useState<TrafficSource>('amazon');
  
  // Market Structure state (12 pts block - 6 checks x 2pts)
  const [marketStructureChecks, setMarketStructureChecks] = useState<MarketStructure>(getDefaultMarketStructure());
  
  // Catalog Signals state (12 pts block)
  const [catalogSignalsChecks, setCatalogSignalsChecks] = useState<CatalogSignals>(getDefaultCatalogSignals());
  
  // Editorial Data state (5 checks - do NOT affect Market Score)
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
      setTrafficSource(md.trafficSource);
      
      // Market Structure data (6 checks)
      const ms = keyword.marketStructure ?? getDefaultMarketStructure();
      setMarketStructureChecks({
        selfContained: ms.selfContained ?? false,
        amazonSuggestion: ms.amazonSuggestion ?? false,
        booksSellingWell: ms.booksSellingWell ?? false,
        indieAuthorsSelling: ms.indieAuthorsSelling ?? false,
        topMatchesIntent: ms.topMatchesIntent ?? false,
        variantsPotential: ms.variantsPotential ?? false,
      });
      
      // Catalog Signals data
      const cs = keyword.catalogSignals ?? getDefaultCatalogSignals();
      setCatalogSignalsChecks({
        booksOver200ReviewsRange: cs.booksOver200ReviewsRange ?? null,
        hasProfitableBooks: cs.hasProfitableBooks ?? false,
        hasBooksUnder100Reviews: cs.hasBooksUnder100Reviews ?? false,
      });
      
      // Editorial data - load from keyword editorialData
      const ed = keyword.editorialData ?? getDefaultEditorialData();
      const checks: Record<string, boolean> = {};
      if (ed.checklist.makesSenseAsBook === true) checks.makesSenseAsBook = true;
      if (ed.checklist.canCreateThisBook === true) checks.canCreateThisBook = true;
      if (ed.checklist.canDoItBetter === true) checks.canDoItBetter = true;
      if (ed.checklist.canDifferentiate === true) checks.canDifferentiate = true;
      if (ed.checklist.personalInterest === true) checks.personalInterest = true;
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
    trafficSource,
  }), [searchVolume, competitors, price, royalties, trafficSource]);

  const scoreBreakdown = useMemo(() => 
    calculateMarketScore(marketData, marketplaceId, marketStructureChecks, catalogSignalsChecks), 
    [marketData, marketplaceId, marketStructureChecks, catalogSignalsChecks]
  );
  const scoreInfo = useMemo(() => getMarketScoreInfo(scoreBreakdown.total), [scoreBreakdown.total]);

  // Calculate Editorial Score from checks
  const editorialData: EditorialData = useMemo(() => ({
    checklist: { 
      makesSenseAsBook: editorialChecks.makesSenseAsBook ?? null, 
      canCreateThisBook: editorialChecks.canCreateThisBook ?? null,
      canDoItBetter: editorialChecks.canDoItBetter ?? null, 
      canDifferentiate: editorialChecks.canDifferentiate ?? null, 
      personalInterest: editorialChecks.personalInterest ?? null 
    },
    notes: editorialNotes,
  }), [editorialChecks, editorialNotes]);

  const editorialScore = useMemo(() => calculateEditorialScore(editorialData), [editorialData]);

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
      marketStructure: marketStructureChecks,
      catalogSignals: catalogSignalsChecks,
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
    setTrafficSource(md.trafficSource);
    
    // Reset market structure
    const ms = keyword.marketStructure ?? getDefaultMarketStructure();
    setMarketStructureChecks({
      selfContained: ms.selfContained ?? false,
      amazonSuggestion: ms.amazonSuggestion ?? false,
      booksSellingWell: ms.booksSellingWell ?? false,
      indieAuthorsSelling: ms.indieAuthorsSelling ?? false,
      topMatchesIntent: ms.topMatchesIntent ?? false,
      variantsPotential: ms.variantsPotential ?? false,
    });
    
    // Reset catalog signals
    const cs = keyword.catalogSignals ?? getDefaultCatalogSignals();
    setCatalogSignalsChecks({
      booksOver200ReviewsRange: cs.booksOver200ReviewsRange ?? null,
      hasProfitableBooks: cs.hasProfitableBooks ?? false,
      hasBooksUnder100Reviews: cs.hasBooksUnder100Reviews ?? false,
    });
    
    const ed = keyword.editorialData ?? getDefaultEditorialData();
    const checks: Record<string, boolean> = {};
    if (ed.checklist.makesSenseAsBook === true) checks.makesSenseAsBook = true;
    if (ed.checklist.canCreateThisBook === true) checks.canCreateThisBook = true;
    if (ed.checklist.canDoItBetter === true) checks.canDoItBetter = true;
    if (ed.checklist.canDifferentiate === true) checks.canDifferentiate = true;
    if (ed.checklist.personalInterest === true) checks.personalInterest = true;
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
                    <div className="flex justify-between text-primary">
                      <span>Señales catálogo</span>
                      <span className="font-mono">{scoreBreakdown.catalogSignals.points}/{scoreBreakdown.catalogSignals.max}</span>
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
                        Precio medio observado en los top resultados de la competencia.
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
                        Regalías medias aproximadas de la competencia.
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
            
            {/* Fuente de tráfico */}
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label>Fuente de tráfico</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      La fuente principal del tráfico de esta keyword. Afecta las penalizaciones del Market Score.
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
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={opt.color}>{opt.label}</Badge>
                        {opt.penalty !== 0 && (
                          <span className="text-xs text-muted-foreground">({opt.penalty})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* ========== SECCIÓN 3: ESTRUCTURA DEL MERCADO (12 pts) ========== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Estructura del Mercado
              </h3>
              <Badge variant="outline" className="text-primary">
                {scoreBreakdown.marketStructure.points}/{scoreBreakdown.marketStructure.max} pts
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {MARKET_STRUCTURE_CHECKS.map((check) => (
                <div key={check.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={check.id}
                      checked={marketStructureChecks[check.id as keyof MarketStructure] ?? false}
                      onCheckedChange={(checked) => setMarketStructureChecks({
                        ...marketStructureChecks,
                        [check.id]: checked === true,
                      })}
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Label htmlFor={check.id} className="text-xs cursor-pointer">
                            {check.label}
                          </Label>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          {check.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className="text-[10px] text-green-600 dark:text-green-400">+{check.points}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* ========== SECCIÓN 4: SEÑALES DE CATÁLOGO (12 pts) ========== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Señales de Catálogo
              </h3>
              <Badge variant="outline" className="text-primary">
                {scoreBreakdown.catalogSignals.points}/{scoreBreakdown.catalogSignals.max} pts
              </Badge>
            </div>
            
            <div className="space-y-3">
              {/* Campo especial: Libros +200 reviews (rango) */}
              <div className="p-3 rounded bg-muted/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">{BOOKS_OVER_200_REVIEWS_FIELD.label}</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        {BOOKS_OVER_200_REVIEWS_FIELD.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Select
                    value={catalogSignalsChecks.booksOver200ReviewsRange ?? ''}
                    onValueChange={(value) => setCatalogSignalsChecks({
                      ...catalogSignalsChecks,
                      booksOver200ReviewsRange: (value || null) as BooksOver200ReviewsRange,
                    })}
                  >
                    <SelectTrigger className="w-40 h-8 text-sm">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {BOOKS_OVER_200_REVIEWS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-green-600 dark:text-green-400">
                    +{getBooksOver200ReviewsPoints(catalogSignalsChecks.booksOver200ReviewsRange ?? null)} / {BOOKS_OVER_200_REVIEWS_FIELD.maxPoints} pts
                  </span>
                </div>
              </div>
              
              {/* Checks booleanos restantes */}
              {CATALOG_SIGNALS_CHECKS.map((check) => (
                <div key={check.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={check.id}
                      checked={(catalogSignalsChecks[check.id as keyof CatalogSignals] as boolean) ?? false}
                      onCheckedChange={(checked) => setCatalogSignalsChecks({
                        ...catalogSignalsChecks,
                        [check.id]: checked === true,
                      })}
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Label htmlFor={check.id} className="text-sm cursor-pointer">
                            {check.label}
                          </Label>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          {check.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className="text-xs text-green-600 dark:text-green-400">+{check.points}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* ========== SECCIÓN 5: CONTEXTO EDITORIAL ========== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Contexto Editorial
              </h3>
              <Badge variant="outline" className="text-muted-foreground">
                {editorialScore}/5 checks
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground italic">
              Esta información NO afecta al Market Score. Sirve solo para decisiones editoriales.
            </p>
            
            <div className="space-y-2">
              {EDITORIAL_CHECKS.map((check) => (
                <div key={check.id} className="flex items-center space-x-3 p-2 rounded bg-muted/30">
                  <Checkbox
                    id={check.id}
                    checked={editorialChecks[check.id] === true}
                    onCheckedChange={(checked) => setEditorialChecks({
                      ...editorialChecks,
                      [check.id]: checked === true,
                    })}
                  />
                  <Label htmlFor={check.id} className="cursor-pointer text-sm">
                    {check.label}
                  </Label>
                </div>
              ))}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editorialNotes">Notas editoriales</Label>
              <Textarea
                id="editorialNotes"
                value={editorialNotes}
                onChange={(e) => setEditorialNotes(e.target.value)}
                placeholder="Observaciones para decisión editorial..."
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* ========== SECCIÓN 6: NOTAS Y ESTADO ========== */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Notas y Estado
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notas generales</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales sobre esta keyword..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Estado</Label>
                {statusManuallySet && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetToAutoStatus}
                    className="text-xs text-muted-foreground gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Volver a automático
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
                      <Badge variant="outline" className={opt.color}>{opt.label}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {statusManuallySet 
                  ? 'Estado establecido manualmente.' 
                  : `Estado automático basado en Market Score (${autoStatus}).`}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Restablecer
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Guardar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};