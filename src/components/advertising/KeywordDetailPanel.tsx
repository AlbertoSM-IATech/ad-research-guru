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
import { Info, Save, RotateCcw } from 'lucide-react';
import type { Keyword } from '@/types/advertising';
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

interface KeywordDetailPanelProps {
  keyword: Keyword | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (keywordId: string, updates: Partial<Keyword>) => void;
}

export const KeywordDetailPanel = ({ 
  keyword, 
  isOpen, 
  onClose, 
  onSave 
}: KeywordDetailPanelProps) => {
  // Market Data state
  const [searchVolume, setSearchVolume] = useState(0);
  const [competitors, setCompetitors] = useState(0);
  const [price, setPrice] = useState(9.99);
  const [royalties, setRoyalties] = useState(2.00);
  const [brandRisk, setBrandRisk] = useState<BrandRisk>('low');
  const [trafficSource, setTrafficSource] = useState<TrafficSource>('amazon');
  
  // Editorial Data state
  const [canCreate, setCanCreate] = useState<boolean | null>(null);
  const [canDoBetter, setCanDoBetter] = useState<boolean | null>(null);
  const [canDifferentiate, setCanDifferentiate] = useState<boolean | null>(null);
  const [fitsStrategy, setFitsStrategy] = useState<boolean | null>(null);
  const [editorialNotes, setEditorialNotes] = useState('');
  
  // Status
  const [status, setStatus] = useState<KeywordStatus>('pending');
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
      
      // Editorial data
      const ed = keyword.editorialData ?? getDefaultEditorialData();
      setCanCreate(ed.checklist.canCreate);
      setCanDoBetter(ed.checklist.canDoBetter);
      setCanDifferentiate(ed.checklist.canDifferentiate);
      setFitsStrategy(ed.checklist.fitsStrategy);
      setEditorialNotes(ed.notes);
      
      // Status & notes
      setStatus(keyword.status || 'pending');
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

  const scoreBreakdown = useMemo(() => calculateMarketScore(marketData), [marketData]);
  const scoreInfo = useMemo(() => getMarketScoreInfo(scoreBreakdown.total), [scoreBreakdown.total]);

  // Calculate Editorial Score
  const editorialData: EditorialData = useMemo(() => ({
    checklist: { canCreate, canDoBetter, canDifferentiate, fitsStrategy },
    notes: editorialNotes,
  }), [canCreate, canDoBetter, canDifferentiate, fitsStrategy, editorialNotes]);

  const editorialScore = useMemo(() => calculateEditorialScore(editorialData), [editorialData]);

  // Save handler
  const handleSave = () => {
    if (!keyword) return;
    
    const updates: Partial<Keyword> = {
      searchVolume,
      competitors,
      price,
      royalties,
      marketScore: scoreBreakdown.total,
      marketData,
      editorialData,
      editorialScore,
      status,
      notes,
    };
    
    onSave(keyword.id, updates);
    onClose();
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
    
    const ed = keyword.editorialData ?? getDefaultEditorialData();
    setCanCreate(ed.checklist.canCreate);
    setCanDoBetter(ed.checklist.canDoBetter);
    setCanDifferentiate(ed.checklist.canDifferentiate);
    setFitsStrategy(ed.checklist.fitsStrategy);
    setEditorialNotes(ed.notes);
    
    setStatus(keyword.status || 'pending');
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
                <Label htmlFor="volume">Volumen de búsqueda</Label>
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
                <Label htmlFor="competitors">Competidores (resultados)</Label>
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
                <Label htmlFor="price">Precio ($)</Label>
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
                <Label htmlFor="royalties">Regalías ($)</Label>
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
              <Label>Brand Risk</Label>
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
              <Label>Fuente de tráfico</Label>
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

          {/* ========== SECCIÓN 3: EVALUACIÓN EDITORIAL ========== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Evaluación Editorial
              </h3>
              <Badge variant="outline" className="text-sm">
                {editorialScore}/4
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Esta sección NO afecta el Market Score. Es contexto para decisión editorial.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <span className="text-sm">¿Puedo crear este libro?</span>
                <div className="flex gap-2">
                  <Button
                    variant={canCreate === true ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCanCreate(canCreate === true ? null : true)}
                  >
                    Sí
                  </Button>
                  <Button
                    variant={canCreate === false ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setCanCreate(canCreate === false ? null : false)}
                  >
                    No
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <span className="text-sm">¿Puedo hacerlo mejor?</span>
                <div className="flex gap-2">
                  <Button
                    variant={canDoBetter === true ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCanDoBetter(canDoBetter === true ? null : true)}
                  >
                    Sí
                  </Button>
                  <Button
                    variant={canDoBetter === false ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setCanDoBetter(canDoBetter === false ? null : false)}
                  >
                    No
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <span className="text-sm">¿Puedo diferenciarlo?</span>
                <div className="flex gap-2">
                  <Button
                    variant={canDifferentiate === true ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCanDifferentiate(canDifferentiate === true ? null : true)}
                  >
                    Sí
                  </Button>
                  <Button
                    variant={canDifferentiate === false ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setCanDifferentiate(canDifferentiate === false ? null : false)}
                  >
                    No
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <span className="text-sm">¿Encaja con mi estrategia editorial?</span>
                <div className="flex gap-2">
                  <Button
                    variant={fitsStrategy === true ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFitsStrategy(fitsStrategy === true ? null : true)}
                  >
                    Sí
                  </Button>
                  <Button
                    variant={fitsStrategy === false ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setFitsStrategy(fitsStrategy === false ? null : false)}
                  >
                    No
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* ========== SECCIÓN 4: NOTAS & ESTADO ========== */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Estado y Notas
            </h3>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as KeywordStatus)}>
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
