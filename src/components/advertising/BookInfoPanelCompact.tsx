import { Book, DollarSign, ChevronDown, ChevronUp, Star, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { type BookInfo, type BookEconomy, type Keyword, getCurrencySymbol } from '@/types/advertising';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { calcularGastoAcumulado, calcularVentasAcumuladas, calcularAcosActualPorcentaje, formatearPorcentaje } from '@/lib/acosEquilibrio';
import { getKeywordMarketScore } from '@/lib/keyword-sorting';
import { getMarketScoreInfo } from '@/lib/market-score';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
interface BookInfoPanelCompactProps {
  bookInfo: BookInfo;
  onChange: (bookInfo: BookInfo) => void;
  bookEconomy?: BookEconomy;
  onBookEconomyChange?: (economy: BookEconomy) => void;
  keywords?: Keyword[];
  marketplaceId?: string;
}
export const BookInfoPanelCompact = ({
  bookInfo,
  onChange,
  bookEconomy,
  onBookEconomyChange,
  keywords = [],
  marketplaceId = 'us'
}: BookInfoPanelCompactProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const cs = getCurrencySymbol(marketplaceId);

  // Get main keyword by ID
  const mainKeyword = useMemo(() => {
    if (!bookInfo.mainKeywordId) return null;
    return keywords.find(k => k.id === bookInfo.mainKeywordId) || null;
  }, [keywords, bookInfo.mainKeywordId]);

  // Calculate ACOS equilibrio
  const acosEquilibrio = bookEconomy && bookEconomy.precioLibro > 0 ? bookEconomy.regaliasPorVenta / bookEconomy.precioLibro * 100 : null;

  // Calculate main keyword metrics
  const mainKeywordMetrics = useMemo(() => {
    if (!mainKeyword || !bookEconomy) return null;
    const ads = mainKeyword.adsData;
    const score = getKeywordMarketScore(mainKeyword);
    const scoreInfo = getMarketScoreInfo(score);
    const gastoCalculado = calcularGastoAcumulado(ads?.clicks, ads?.cpcActual);
    const ventasCalculadas = calcularVentasAcumuladas(ads?.pedidos, bookEconomy.precioLibro);
    const acosActual = calcularAcosActualPorcentaje(gastoCalculado ?? undefined, ventasCalculadas ?? undefined);
    return {
      score,
      scoreInfo,
      searchVolume: mainKeyword.searchVolume || 0,
      competitors: mainKeyword.competitors || 0,
      acosActual
    };
  }, [mainKeyword, bookEconomy]);
  const handlePrecioChange = (value: string) => {
    if (!onBookEconomyChange || !bookEconomy) return;
    const numValue = parseFloat(value) || 0;
    onBookEconomyChange({
      ...bookEconomy,
      precioLibro: Math.max(0, numValue)
    });
  };
  const handleRegaliasChange = (value: string) => {
    if (!onBookEconomyChange || !bookEconomy) return;
    const numValue = parseFloat(value) || 0;
    onBookEconomyChange({
      ...bookEconomy,
      regaliasPorVenta: Math.max(0, numValue)
    });
  };
  return <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div data-tour="book-info" className={cn("flex items-center justify-between rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 px-4 py-2 cursor-pointer hover:bg-primary/10 transition-colors", isOpen && "rounded-b-none")}>
          {/* Left side: Summary */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {/* KW Principal */}
            <div className="flex items-center gap-2 min-w-0">
              <Star className={cn("w-4 h-4 shrink-0", mainKeyword ? "text-amber-500 fill-amber-500" : "text-muted-foreground")} />
              {mainKeyword && mainKeywordMetrics ? <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm truncate max-w-[500px]" title={mainKeyword.keyword}>
                    {mainKeyword.keyword}
                  </span>
                  <Badge className={cn('text-xs px-1.5 py-0', mainKeywordMetrics.scoreInfo.bgColor, mainKeywordMetrics.scoreInfo.color)}>
                    {mainKeywordMetrics.score}
                  </Badge>
                  <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="w-3 h-3" />
                    {mainKeywordMetrics.searchVolume.toLocaleString()}
                  </span>
                  <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    {mainKeywordMetrics.competitors.toLocaleString()}
                  </span>
                  {mainKeywordMetrics.acosActual !== null && <span className={cn("text-xs font-mono", acosEquilibrio !== null && mainKeywordMetrics.acosActual <= acosEquilibrio ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                      ACOS: {formatearPorcentaje(mainKeywordMetrics.acosActual)}
                    </span>}
                </div> : <span className="text-xs text-muted-foreground italic">★ para seleccionar KW principal</span>}
            </div>

            {/* Separator */}
            <div className="h-5 w-px bg-border" />

            {/* Economía del Libro - Summary */}
            {bookEconomy && <div className="flex items-center gap-3">
                <DollarSign className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm">
                  <span className="text-muted-foreground">PVP:</span> {cs}{bookEconomy.precioLibro.toFixed(2)}
                </span>
                <span className="text-sm">
                  <span className="text-muted-foreground">Regalía:</span> {cs}{bookEconomy.regaliasPorVenta.toFixed(2)}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 cursor-help">
                        ACOS PE: {acosEquilibrio !== null ? `${acosEquilibrio.toFixed(1)}%` : '—'}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      Punto de equilibrio: si ACOS supera este valor, pierdes dinero.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>}
          </div>

          {/* Right side: expand indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {isOpen ? 'Cerrar' : 'Editar'}
            </span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border border-t-0 border-primary/20 rounded-b-lg bg-background/50 p-4 space-y-4">
          {/* Expanded details - two columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column: Main Keyword Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                Keyword Principal
              </h4>
              
              {mainKeyword && mainKeywordMetrics ? <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <p className="font-medium">{mainKeyword.keyword}</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block">Volumen</span>
                      <span className="font-medium">{mainKeywordMetrics.searchVolume.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Competencia</span>
                      <span className="font-medium">{mainKeywordMetrics.competitors.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Market Score</span>
                      <Badge className={cn('text-xs', mainKeywordMetrics.scoreInfo.bgColor, mainKeywordMetrics.scoreInfo.color)}>
                        {mainKeywordMetrics.score}/100
                      </Badge>
                    </div>
                  </div>
                </div> : <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
                  <p className="text-sm text-muted-foreground">
                    Haz clic en la ★ de una keyword para establecerla como principal
                  </p>
                </div>}

              {/* Book Info fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Título del libro</label>
                  <Input value={bookInfo.title || ''} onChange={e => onChange({
                  ...bookInfo,
                  title: e.target.value
                })} placeholder="Mi libro..." className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Subtítulo</label>
                  <Input value={bookInfo.subtitle || ''} onChange={e => onChange({
                  ...bookInfo,
                  subtitle: e.target.value
                })} placeholder="Subtítulo..." className="h-8 text-sm" />
                </div>
              </div>
            </div>

            {/* Right column: Book Economy */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Economía del Libro
              </h4>
              
              {bookEconomy && onBookEconomyChange && <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Precio (PVP)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{cs}</span>
                      <Input type="number" min={0} step={0.01} value={bookEconomy.precioLibro || ''} onChange={e => handlePrecioChange(e.target.value)} placeholder="0.00" className="pl-7 h-8 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Regalías por venta</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{cs}</span>
                      <Input type="number" min={0} step={0.01} value={bookEconomy.regaliasPorVenta || ''} onChange={e => handleRegaliasChange(e.target.value)} placeholder="0.00" className="pl-7 h-8 text-sm" />
                    </div>
                  </div>
                  <div className="col-span-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">ACOS Punto de Equilibrio</span>
                        <span className="text-xl font-bold text-primary">
                          {acosEquilibrio !== null ? `${acosEquilibrio.toFixed(1)}%` : '—'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        <p>ACOS &lt; PE = Beneficio</p>
                        <p>ACOS &gt; PE = Pérdida</p>
                      </div>
                    </div>
                  </div>
                </div>}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>;
};