import { Info, DollarSign, Star, TrendingUp, Users, Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type BookInfo, type BookEconomy, type Keyword, getCurrencySymbol } from '@/types/advertising';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { calcularGastoAcumulado, calcularVentasAcumuladas, calcularAcosActualPorcentaje, calcularConversionPorcentaje, formatearPorcentaje, formatearMoneda } from '@/lib/acosEquilibrio';
import { getKeywordMarketScore } from '@/lib/keyword-sorting';
import { getMarketScoreInfo } from '@/lib/market-score';

interface BookInfoPanelProps {
  bookInfo: BookInfo;
  onChange: (bookInfo: BookInfo) => void;
  bookEconomy?: BookEconomy;
  onBookEconomyChange?: (economy: BookEconomy) => void;
  keywords?: Keyword[];
  marketplaceId?: string;
}

export const BookInfoPanel = ({ 
  bookInfo, 
  onChange,
  bookEconomy,
  onBookEconomyChange,
  keywords = [],
  marketplaceId = 'us'
}: BookInfoPanelProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const cs = getCurrencySymbol(marketplaceId);

  // Get main keyword by ID
  const mainKeyword = useMemo(() => {
    if (!bookInfo.mainKeywordId) return null;
    return keywords.find(k => k.id === bookInfo.mainKeywordId) || null;
  }, [keywords, bookInfo.mainKeywordId]);

  // Calculate ACOS equilibrio
  const acosEquilibrio = bookEconomy && bookEconomy.precioLibro > 0
    ? (bookEconomy.regaliasPorVenta / bookEconomy.precioLibro) * 100
    : null;

  // Calculate main keyword metrics
  const mainKeywordMetrics = useMemo(() => {
    if (!mainKeyword || !bookEconomy) return null;
    
    const ads = mainKeyword.adsData;
    const score = getKeywordMarketScore(mainKeyword);
    const scoreInfo = getMarketScoreInfo(score);
    const gastoCalculado = calcularGastoAcumulado(ads?.clicks, ads?.cpcActual);
    const ventasCalculadas = calcularVentasAcumuladas(ads?.pedidos, bookEconomy.precioLibro);
    const acosActual = calcularAcosActualPorcentaje(gastoCalculado ?? undefined, ventasCalculadas ?? undefined);
    const conversion = calcularConversionPorcentaje(ads?.pedidos, ads?.clicks);
    
    return {
      score,
      scoreInfo,
      searchVolume: mainKeyword.searchVolume || 0,
      competitors: mainKeyword.competitors || 0,
      clicks: ads?.clicks,
      cpc: ads?.cpcActual,
      pedidos: ads?.pedidos,
      gasto: gastoCalculado,
      ventas: ventasCalculadas,
      acosActual,
      conversion
    };
  }, [mainKeyword, bookEconomy]);

  const handlePrecioChange = (value: string) => {
    if (!onBookEconomyChange || !bookEconomy) return;
    const numValue = parseFloat(value) || 0;
    onBookEconomyChange({
      ...bookEconomy,
      precioLibro: Math.max(0, numValue),
    });
  };

  const handleRegaliasChange = (value: string) => {
    if (!onBookEconomyChange || !bookEconomy) return;
    const numValue = parseFloat(value) || 0;
    onBookEconomyChange({
      ...bookEconomy,
      regaliasPorVenta: Math.max(0, numValue),
    });
  };

  return (
    <div data-tour="book-info" className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="font-heading font-semibold text-lg">Información</h3>
              <p className="text-sm text-muted-foreground">
                {mainKeyword ? mainKeyword.keyword : 'Selecciona una KW principal en la tabla (★)'}
              </p>
            </div>
          </div>
          <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-6 pb-6 space-y-5 border-t border-border/50 pt-4">
            
            {/* KW Principal con todos los datos */}
            {mainKeyword && mainKeywordMetrics ? (
              <div className="p-4 bg-amber-500/5 rounded-lg border border-amber-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    KW Principal
                  </Label>
                  <Badge className={cn('text-xs', mainKeywordMetrics.scoreInfo.bgColor, mainKeywordMetrics.scoreInfo.color)}>
                    Score: {mainKeywordMetrics.score}
                  </Badge>
                </div>
                
                <div className="font-semibold text-lg mb-3">{mainKeyword.keyword}</div>
                
                {/* Datos de mercado */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div className="p-2 bg-background/50 rounded border border-border/50">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Volumen
                    </div>
                    <div className="font-mono font-medium">{mainKeywordMetrics.searchVolume.toLocaleString()}</div>
                  </div>
                  <div className="p-2 bg-background/50 rounded border border-border/50">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Competidores
                    </div>
                    <div className={cn(
                      "font-mono font-medium",
                      mainKeywordMetrics.competitors < 3000 ? "text-green-600 dark:text-green-400" : ""
                    )}>
                      {mainKeywordMetrics.competitors.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2 bg-background/50 rounded border border-border/50">
                    <div className="text-xs text-muted-foreground">Clicks</div>
                    <div className="font-mono font-medium">{mainKeywordMetrics.clicks ?? '—'}</div>
                  </div>
                  <div className="p-2 bg-background/50 rounded border border-border/50">
                    <div className="text-xs text-muted-foreground">CPC</div>
                    <div className="font-mono font-medium">{mainKeywordMetrics.cpc !== undefined ? `${cs}${mainKeywordMetrics.cpc.toFixed(2)}` : '—'}</div>
                  </div>
                </div>
                
                {/* Métricas de Ads */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2 bg-background/50 rounded border border-border/50">
                    <div className="text-xs text-muted-foreground">Pedidos</div>
                    <div className="font-mono font-medium">{mainKeywordMetrics.pedidos ?? '—'}</div>
                  </div>
                  <div className="p-2 bg-background/50 rounded border border-border/50">
                    <div className="text-xs text-muted-foreground">Gasto</div>
                    <div className="font-mono font-medium text-muted-foreground">{formatearMoneda(mainKeywordMetrics.gasto, cs)}</div>
                  </div>
                  <div className="p-2 bg-background/50 rounded border border-border/50">
                    <div className="text-xs text-muted-foreground">Ventas</div>
                    <div className="font-mono font-medium text-muted-foreground">{formatearMoneda(mainKeywordMetrics.ventas, cs)}</div>
                  </div>
                  <div className="p-2 bg-background/50 rounded border border-border/50">
                    <div className="text-xs text-muted-foreground">ACOS Actual</div>
                    <div className={cn(
                      "font-mono font-medium",
                      mainKeywordMetrics.acosActual !== null && acosEquilibrio !== null
                        ? mainKeywordMetrics.acosActual <= acosEquilibrio
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                        : 'text-muted-foreground'
                    )}>
                      {formatearPorcentaje(mainKeywordMetrics.acosActual)}
                    </div>
                  </div>
                </div>
                
                {/* Conversión destacada */}
                <div className="mt-3 p-2 bg-primary/5 rounded border border-primary/20 flex items-center justify-between">
                  <span className="text-sm font-medium">Conversión</span>
                  <span className="font-mono font-semibold text-primary">
                    {formatearPorcentaje(mainKeywordMetrics.conversion)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-muted/30 rounded-lg border border-dashed border-border text-center">
                <Star className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Haz clic en ★ en la tabla para designar una keyword como principal
                </p>
              </div>
            )}

            {/* Economía del libro (integrada) */}
            {bookEconomy && onBookEconomyChange && (
              <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Economía del Libro
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p>Se usa para calcular el ACOS de equilibrio y beneficios en la gestión de Ads.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {/* Precio del libro */}
                  <div className="space-y-1">
                    <Label htmlFor="precioLibro" className="text-xs text-muted-foreground">
                      Precio (sin IVA)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        id="precioLibro"
                        type="number"
                        min={0}
                        step={0.01}
                        value={bookEconomy.precioLibro || ''}
                        onChange={(e) => handlePrecioChange(e.target.value)}
                        placeholder="0.00"
                        className="pl-6 h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Regalías netas */}
                  <div className="space-y-1">
                    <Label htmlFor="regaliasPorVenta" className="text-xs text-muted-foreground">
                      Regalías netas
                    </Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        id="regaliasPorVenta"
                        type="number"
                        min={0}
                        step={0.01}
                        value={bookEconomy.regaliasPorVenta || ''}
                        onChange={(e) => handleRegaliasChange(e.target.value)}
                        placeholder="0.00"
                        className="pl-6 h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* ACOS Equilibrio Preview */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      ACOS PE
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Punto de equilibrio: si el ACOS actual supera este valor, pierdes dinero.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <div className="h-8 px-2.5 flex items-center rounded-md border border-border bg-background/50">
                      <span className={acosEquilibrio !== null ? 'font-mono font-semibold text-primary text-sm' : 'text-muted-foreground text-sm'}>
                        {acosEquilibrio !== null ? `${acosEquilibrio.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
