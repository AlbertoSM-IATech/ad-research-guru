import { DollarSign, Star, TrendingUp, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { type BookInfo, type BookEconomy, type Keyword } from '@/types/advertising';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { calcularGastoAcumulado, calcularVentasAcumuladas, calcularAcosActualPorcentaje, formatearPorcentaje } from '@/lib/acosEquilibrio';
import { getKeywordMarketScore } from '@/lib/keyword-sorting';
import { getMarketScoreInfo } from '@/lib/market-score';

interface BookInfoPanelCompactProps {
  bookInfo: BookInfo;
  onChange: (bookInfo: BookInfo) => void;
  bookEconomy?: BookEconomy;
  onBookEconomyChange?: (economy: BookEconomy) => void;
  keywords?: Keyword[];
}

export const BookInfoPanelCompact = ({ 
  bookInfo, 
  onChange,
  bookEconomy,
  onBookEconomyChange,
  keywords = []
}: BookInfoPanelCompactProps) => {
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
    <div data-tour="book-info" className="rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 px-4 py-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {/* KW Principal */}
        <div className="flex items-center gap-2 min-w-0">
          <Star className={cn("w-3.5 h-3.5 shrink-0", mainKeyword ? "text-amber-500 fill-amber-500" : "text-muted-foreground")} />
          {mainKeyword && mainKeywordMetrics ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-medium text-xs truncate max-w-[140px]" title={mainKeyword.keyword}>
                {mainKeyword.keyword}
              </span>
              <Badge className={cn('text-[9px] px-1 py-0 h-4', mainKeywordMetrics.scoreInfo.bgColor, mainKeywordMetrics.scoreInfo.color)}>
                {mainKeywordMetrics.score}
              </Badge>
              <span className="hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <TrendingUp className="w-2.5 h-2.5" />
                {mainKeywordMetrics.searchVolume.toLocaleString()}
              </span>
              <span className="hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Users className="w-2.5 h-2.5" />
                {mainKeywordMetrics.competitors.toLocaleString()}
              </span>
              {mainKeywordMetrics.acosActual !== null && (
                <span className={cn(
                  "text-[10px] font-mono",
                  acosEquilibrio !== null && mainKeywordMetrics.acosActual <= acosEquilibrio
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                )}>
                  ACOS: {formatearPorcentaje(mainKeywordMetrics.acosActual)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground italic">★ para seleccionar KW</span>
          )}
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-border" />

        {/* Economía del Libro - Ultra compact */}
        {bookEconomy && onBookEconomyChange && (
          <div className="flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-primary shrink-0" />
            {/* Precio */}
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] text-muted-foreground">PVP</span>
              <div className="relative w-12">
                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">$</span>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={bookEconomy.precioLibro || ''}
                  onChange={(e) => handlePrecioChange(e.target.value)}
                  placeholder="0"
                  className="pl-3 h-5 text-[10px] w-full"
                />
              </div>
            </div>
            {/* Regalías */}
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] text-muted-foreground">Reg</span>
              <div className="relative w-12">
                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">$</span>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={bookEconomy.regaliasPorVenta || ''}
                  onChange={(e) => handleRegaliasChange(e.target.value)}
                  placeholder="0"
                  className="pl-3 h-5 text-[10px] w-full"
                />
              </div>
            </div>
            {/* ACOS PE */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-background/50 border border-border cursor-help">
                    <span className="text-[9px] text-muted-foreground">PE</span>
                    <span className={cn(
                      "font-mono text-[10px] font-semibold",
                      acosEquilibrio !== null ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {acosEquilibrio !== null ? `${acosEquilibrio.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  Punto de equilibrio: si ACOS supera este valor, pierdes dinero.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
};
