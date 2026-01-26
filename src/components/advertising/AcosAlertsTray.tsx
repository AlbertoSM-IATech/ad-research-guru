import { AlertTriangle, TrendingDown, Filter, ArrowUpDown, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import { type Keyword, type BookEconomy } from '@/types/advertising';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { calcularGastoAcumulado, calcularVentasAcumuladas, calcularAcosActualPorcentaje, formatearPorcentaje, formatearMoneda } from '@/lib/acosEquilibrio';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AcosAlertsTrayProps {
  keywords: Keyword[];
  bookEconomy?: BookEconomy;
  campaigns: string[];
  onKeywordClick?: (keyword: Keyword) => void;
}

type SortOption = 'priority' | 'acos-desc' | 'loss-desc' | 'keyword';

interface KeywordWithMetrics extends Keyword {
  acosActual: number | null;
  acosEquilibrio: number | null;
  gasto: number | null;
  ventas: number | null;
  loss: number | null;
  priority: number;
}

export const AcosAlertsTray = ({ 
  keywords, 
  bookEconomy,
  campaigns,
  onKeywordClick
}: AcosAlertsTrayProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('priority');

  // Calculate ACOS equilibrio
  const acosEquilibrio = bookEconomy && bookEconomy.precioLibro > 0
    ? (bookEconomy.regaliasPorVenta / bookEconomy.precioLibro) * 100
    : null;

  // Get keywords with ACOS > equilibrio
  const alertKeywords = useMemo((): KeywordWithMetrics[] => {
    if (acosEquilibrio === null) return [];

    return keywords
      .map(kw => {
        const ads = kw.adsData;
        const gasto = calcularGastoAcumulado(ads?.clicks, ads?.cpcActual);
        const ventas = calcularVentasAcumuladas(ads?.pedidos, bookEconomy?.precioLibro);
        const acosActual = calcularAcosActualPorcentaje(gasto ?? undefined, ventas ?? undefined);
        
        // Calculate loss (negative benefit)
        const loss = gasto !== null && ventas !== null ? gasto - ventas : null;
        
        // Priority: higher ACOS difference = higher priority
        const acosDiff = acosActual !== null ? acosActual - acosEquilibrio : 0;
        const priority = Math.max(0, acosDiff) * (loss !== null && loss > 0 ? loss : 1);

        return {
          ...kw,
          acosActual,
          acosEquilibrio,
          gasto,
          ventas,
          loss: loss !== null && loss > 0 ? loss : null,
          priority
        };
      })
      .filter(kw => kw.acosActual !== null && kw.acosActual > acosEquilibrio);
  }, [keywords, bookEconomy, acosEquilibrio]);

  // Filter by campaign
  const filteredKeywords = useMemo(() => {
    if (campaignFilter === 'all') return alertKeywords;
    return alertKeywords.filter(kw => kw.adsData?.campaignName === campaignFilter);
  }, [alertKeywords, campaignFilter]);

  // Sort keywords
  const sortedKeywords = useMemo(() => {
    const sorted = [...filteredKeywords];
    switch (sortBy) {
      case 'priority':
        return sorted.sort((a, b) => b.priority - a.priority);
      case 'acos-desc':
        return sorted.sort((a, b) => (b.acosActual ?? 0) - (a.acosActual ?? 0));
      case 'loss-desc':
        return sorted.sort((a, b) => (b.loss ?? 0) - (a.loss ?? 0));
      case 'keyword':
        return sorted.sort((a, b) => a.keyword.localeCompare(b.keyword));
      default:
        return sorted;
    }
  }, [filteredKeywords, sortBy]);

  // Get unique campaigns from alert keywords
  const alertCampaigns = useMemo(() => {
    const uniqueCampaigns = new Set(alertKeywords.map(kw => kw.adsData?.campaignName).filter(Boolean));
    return Array.from(uniqueCampaigns) as string[];
  }, [alertKeywords]);

  if (acosEquilibrio === null) return null;
  if (alertKeywords.length === 0) return null;

  const totalLoss = alertKeywords.reduce((sum, kw) => sum + (kw.loss ?? 0), 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className={cn(
          "flex items-center justify-between px-4 py-2 rounded-lg border cursor-pointer transition-colors",
          "bg-red-500/10 border-red-500/30 hover:bg-red-500/15",
          isOpen && "rounded-b-none"
        )}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="font-medium text-sm">
              {alertKeywords.length} keyword{alertKeywords.length !== 1 ? 's' : ''} con ACOS sobre equilibrio
            </span>
            {totalLoss > 0 && (
              <Badge variant="destructive" className="text-xs">
                <TrendingDown className="w-3 h-3 mr-1" />
                -{formatearMoneda(totalLoss)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-background">
              PE: {acosEquilibrio.toFixed(1)}%
            </Badge>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border border-t-0 border-red-500/30 rounded-b-lg bg-background/50 p-3 space-y-3">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                <SelectTrigger className="h-7 text-xs w-[140px]">
                  <SelectValue placeholder="Campaña" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las campañas</SelectItem>
                  {alertCampaigns.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="h-7 text-xs w-[130px]">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Prioridad</SelectItem>
                  <SelectItem value="acos-desc">ACOS (mayor)</SelectItem>
                  <SelectItem value="loss-desc">Pérdida (mayor)</SelectItem>
                  <SelectItem value="keyword">Alfabético</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {campaignFilter !== 'all' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => setCampaignFilter('all')}
              >
                <X className="w-3 h-3 mr-1" />
                Limpiar filtro
              </Button>
            )}
          </div>

          {/* Keywords List */}
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {sortedKeywords.map(kw => (
              <div 
                key={kw.id}
                className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors group"
                onClick={() => onKeywordClick?.(kw)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="text-sm truncate max-w-[200px]" title={kw.keyword}>
                    {kw.keyword}
                  </span>
                  {kw.adsData?.campaignName && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                      {kw.adsData.campaignName}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-red-600 dark:text-red-400 font-mono">
                    ACOS: {formatearPorcentaje(kw.acosActual)}
                  </span>
                  <span className="text-muted-foreground">
                    vs {formatearPorcentaje(kw.acosEquilibrio)}
                  </span>
                  {kw.loss !== null && kw.loss > 0 && (
                    <span className="text-red-600 dark:text-red-400 font-mono font-medium">
                      -{formatearMoneda(kw.loss)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {sortedKeywords.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No hay keywords en esta campaña con ACOS sobre equilibrio
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
