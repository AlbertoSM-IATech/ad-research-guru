import { useState, useEffect, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertTriangle,
  ChevronDown,
  Save,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from 'lucide-react';
import {
  type MarketData,
  type StrategicData,
  type PriceBucket,
  type RoyaltiesBucket,
  type HighReviewCountBucket,
  getDefaultMarketData,
  getDefaultStrategicData,
  calculateMarketScore,
  getMarketScoreInfo,
  getMarketScoreBreakdown,
  PRICE_BUCKET_OPTIONS,
  ROYALTIES_BUCKET_OPTIONS,
  HIGH_REVIEW_OPTIONS,
  MARKET_SCORE_LEVELS,
} from '@/lib/market-score';
import type { Keyword } from '@/types/advertising';
import { cn } from '@/lib/utils';

interface KeywordValidationDrawerProps {
  keyword: Keyword | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (keywordId: string, marketData: MarketData, strategicData: StrategicData, newScore: number) => void;
}

export const KeywordValidationDrawer = ({
  keyword,
  isOpen,
  onClose,
  onSave,
}: KeywordValidationDrawerProps) => {
  const [marketData, setMarketData] = useState<MarketData>(getDefaultMarketData());
  const [strategicData, setStrategicData] = useState<StrategicData>(getDefaultStrategicData());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['market', 'strategic']));

  // Load existing data or defaults
  useEffect(() => {
    if (keyword) {
      // Load marketData from keyword, or derive from legacy fields
      if (keyword.marketData) {
        setMarketData(keyword.marketData);
      } else {
        // Derive from legacy fields
        const competitorsFromNote = keyword.competitionNote 
          ? parseInt(keyword.competitionNote.replace(/[^\d]/g, '')) 
          : null;
        
        const competitors = competitorsFromNote || 
          (keyword.competitionLevel === 'low' ? 500 : 
           keyword.competitionLevel === 'high' ? 15000 : 3000);
        
        setMarketData({
          searchVolume: keyword.searchVolume || 0,
          competitors,
          brandPresent: false,
          priceBucket: '9.99-14.99',
          royaltiesBucket: '2-3.99',
          highReviewCountBucket: 'none',
        });
      }
      
      // Load strategicData
      setStrategicData(keyword.strategicData || getDefaultStrategicData());
    } else {
      setMarketData(getDefaultMarketData());
      setStrategicData(getDefaultStrategicData());
    }
  }, [keyword]);

  // Calculate score
  const calculatedScore = useMemo(() => calculateMarketScore(marketData), [marketData]);
  const scoreInfo = useMemo(() => getMarketScoreInfo(calculatedScore), [calculatedScore]);
  const scoreBreakdown = useMemo(() => getMarketScoreBreakdown(marketData), [marketData]);

  const handleMarketDataChange = <K extends keyof MarketData>(field: K, value: MarketData[K]) => {
    setMarketData(prev => ({ ...prev, [field]: value }));
  };

  const handleStrategicDataChange = <K extends keyof StrategicData>(field: K, value: StrategicData[K]) => {
    setStrategicData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!keyword) return;
    onSave(keyword.id, marketData, strategicData, calculatedScore);
    onClose();
  };

  const handleReset = () => {
    if (keyword) {
      setMarketData({
        searchVolume: keyword.searchVolume || 0,
        competitors: keyword.competitionNote 
          ? parseInt(keyword.competitionNote.replace(/[^\d]/g, '')) || 3000
          : 3000,
        brandPresent: false,
        priceBucket: '9.99-14.99',
        royaltiesBucket: '2-3.99',
        highReviewCountBucket: 'none',
      });
    } else {
      setMarketData(getDefaultMarketData());
    }
    setStrategicData(getDefaultStrategicData());
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  if (!keyword) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Market Score
          </SheetTitle>
          <SheetDescription className="text-base font-medium text-foreground">
            "{keyword.keyword}"
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            {/* Score Summary */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Market Score</span>
                <div className={cn(
                  'px-4 py-2 rounded-full font-bold text-xl',
                  scoreInfo.bgColor,
                  scoreInfo.color
                )}>
                  {calculatedScore}/100
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Nivel</span>
                <Badge variant="outline" className={cn('font-semibold', scoreInfo.bgColor, scoreInfo.color)}>
                  {scoreInfo.label}
                </Badge>
              </div>

              {/* Score Breakdown */}
              <div className="pt-3 border-t border-border space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Desglose de puntuación:</p>
                {scoreBreakdown.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}: {item.value}</span>
                    <span className={cn(
                      'font-medium flex items-center gap-1',
                      item.points > 0 ? 'text-green-600' : item.points < 0 ? 'text-red-600' : 'text-muted-foreground'
                    )}>
                      {item.points > 0 && <TrendingUp className="w-3 h-3" />}
                      {item.points < 0 && <TrendingDown className="w-3 h-3" />}
                      {item.points === 0 && <Minus className="w-3 h-3" />}
                      {item.points > 0 && '+'}{item.points}/{item.maxPoints}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Market Data Section */}
            <Collapsible open={expandedSections.has('market')} onOpenChange={() => toggleSection('market')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Datos de Mercado
                </h4>
                <ChevronDown className={cn('w-4 h-4 transition-transform', expandedSections.has('market') && 'rotate-180')} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                {/* Search Volume */}
                <div className="space-y-2">
                  <Label className="text-sm">Volumen de búsqueda</Label>
                  <Input
                    type="number"
                    value={marketData.searchVolume}
                    onChange={(e) => handleMarketDataChange('searchVolume', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Peso: 30% • ≤50: 0pts, 51-100: 10pts, 101-600: 20pts, &gt;600: 30pts
                  </p>
                </div>

                {/* Competitors */}
                <div className="space-y-2">
                  <Label className="text-sm">Competidores (Resultados Amazon)</Label>
                  <Input
                    type="number"
                    value={marketData.competitors}
                    onChange={(e) => handleMarketDataChange('competitors', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Peso: 25% • &lt;1K: 25pts, 1-4K: 18pts, 4-10K: 8pts, &gt;10K: 0pts
                  </p>
                </div>

                {/* Brand Present */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">¿Hay marca dominante?</Label>
                    <p className="text-xs text-muted-foreground">
                      Peso: 10% • Sin marca: +10pts
                    </p>
                  </div>
                  <Switch
                    checked={marketData.brandPresent}
                    onCheckedChange={(checked) => handleMarketDataChange('brandPresent', checked)}
                  />
                </div>

                {/* Price Bucket */}
                <div className="space-y-2">
                  <Label className="text-sm">Rango de precio</Label>
                  <Select
                    value={marketData.priceBucket}
                    onValueChange={(value) => handleMarketDataChange('priceBucket', value as PriceBucket)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_BUCKET_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Peso: 15% • &lt;$9.99: 0pts, $9.99-14.99: 7pts, $15-19.99: 12pts, ≥$20: 15pts
                  </p>
                </div>

                {/* Royalties Bucket */}
                <div className="space-y-2">
                  <Label className="text-sm">Rango de regalías</Label>
                  <Select
                    value={marketData.royaltiesBucket}
                    onValueChange={(value) => handleMarketDataChange('royaltiesBucket', value as RoyaltiesBucket)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ROYALTIES_BUCKET_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Peso: 15% • &lt;$1.99: 0pts, $2-3.99: 5pts, $4-5.99: 10pts, ≥$6: 15pts
                  </p>
                </div>

                {/* High Review Count */}
                <div className="space-y-2">
                  <Label className="text-sm">Libros con +200 reviews</Label>
                  <Select
                    value={marketData.highReviewCountBucket}
                    onValueChange={(value) => handleMarketDataChange('highReviewCountBucket', value as HighReviewCountBucket)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {HIGH_REVIEW_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label} - {opt.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Penalización: Ninguno: 0pts, Pocos: -2pts, Muchos: -5pts
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Strategic Section - NO afecta Market Score */}
            <Collapsible open={expandedSections.has('strategic')} onOpenChange={() => toggleSection('strategic')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  📝 Notas Estratégicas
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground">
                    No afecta score
                  </Badge>
                </h4>
                <ChevronDown className={cn('w-4 h-4 transition-transform', expandedSections.has('strategic') && 'rotate-180')} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                {/* Strategic Fit Score */}
                <div className="space-y-4">
                  <Label className="text-sm">Encaje estratégico (0-5)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[strategicData.strategicFitScore]}
                      onValueChange={([value]) => handleStrategicDataChange('strategicFitScore', value)}
                      max={5}
                      step={1}
                      className="flex-1"
                    />
                    <Badge variant="outline" className="w-8 justify-center">
                      {strategicData.strategicFitScore}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Capacidad de competir, diferenciación, interés personal
                  </p>
                </div>

                {/* Strategic Notes */}
                <div className="space-y-2">
                  <Label className="text-sm">Notas estratégicas</Label>
                  <Textarea
                    value={strategicData.strategicNotes}
                    onChange={(e) => handleStrategicDataChange('strategicNotes', e.target.value)}
                    placeholder="Notas sobre viabilidad, diferenciación, estrategia..."
                    rows={4}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex-shrink-0 pt-4 border-t border-border flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1">
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} className="gap-1">
              <Save className="w-4 h-4" />
              Guardar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
