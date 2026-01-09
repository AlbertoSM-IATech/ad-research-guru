import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Keyword, TargetASIN, BookEconomy } from '@/types/advertising';
import { calcularGastoAcumulado, calcularVentasAcumuladas, calcularAcosActualPorcentaje, calcularAcosSiguienteClickPorcentaje, calcularConversionPorcentaje, formatearPorcentaje, formatearMoneda } from '@/lib/acosEquilibrio';
import { getMarketScoreInfo } from '@/lib/market-score';

interface KeywordComparisonPanelProps {
  items: (Keyword | TargetASIN)[];
  type: 'keyword' | 'asin';
  isOpen: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  bookEconomy: BookEconomy;
}

const isKeyword = (item: Keyword | TargetASIN): item is Keyword => {
  return 'keyword' in item;
};

const ComparisonRow = ({ 
  label, 
  values, 
  format = 'text',
  higherIsBetter = true 
}: { 
  label: string; 
  values: (string | number | null | undefined)[];
  format?: 'text' | 'number' | 'currency' | 'percent' | 'score';
  higherIsBetter?: boolean;
}) => {
  const numericValues = values.map(v => typeof v === 'number' ? v : null);
  const validValues = numericValues.filter((v): v is number => v !== null);
  const maxValue = validValues.length > 0 ? Math.max(...validValues) : null;
  const minValue = validValues.length > 0 ? Math.min(...validValues) : null;
  
  const formatValue = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '—';
    if (format === 'currency') return formatearMoneda(typeof value === 'number' ? value : parseFloat(String(value)));
    if (format === 'percent') return formatearPorcentaje(typeof value === 'number' ? value : parseFloat(String(value)));
    if (format === 'number') return typeof value === 'number' ? value.toLocaleString() : String(value);
    if (format === 'score') return `${value}/100`;
    return String(value);
  };

  const getCellStyle = (value: string | number | null | undefined): string => {
    if (typeof value !== 'number' || maxValue === null || minValue === null || maxValue === minValue) {
      return '';
    }
    const isBest = higherIsBetter ? value === maxValue : value === minValue;
    const isWorst = higherIsBetter ? value === minValue : value === maxValue;
    if (isBest) return 'text-green-600 dark:text-green-400 font-semibold';
    if (isWorst) return 'text-red-600 dark:text-red-400';
    return '';
  };

  return (
    <div className="grid grid-cols-3 gap-4 py-2 items-center">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      {values.map((value, index) => (
        <div key={index} className={cn("text-sm tabular-nums text-center", getCellStyle(value))}>
          {formatValue(value)}
        </div>
      ))}
    </div>
  );
};

const DifferenceIndicator = ({ diff, format = 'number' }: { diff: number | null; format?: 'number' | 'percent' | 'currency' }) => {
  if (diff === null) return <Minus className="w-4 h-4 text-muted-foreground" />;
  
  const formatDiff = () => {
    const sign = diff > 0 ? '+' : '';
    if (format === 'percent') return `${sign}${diff.toFixed(1)}%`;
    if (format === 'currency') return `${sign}$${diff.toFixed(2)}`;
    return `${sign}${diff.toLocaleString()}`;
  };

  if (diff > 0) {
    return (
      <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
        <TrendingUp className="w-3 h-3" />
        {formatDiff()}
      </div>
    );
  }
  if (diff < 0) {
    return (
      <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs">
        <TrendingDown className="w-3 h-3" />
        {formatDiff()}
      </div>
    );
  }
  return <Minus className="w-4 h-4 text-muted-foreground" />;
};

export const KeywordComparisonPanel = ({
  items,
  type,
  isOpen,
  onClose,
  onRemove,
  bookEconomy
}: KeywordComparisonPanelProps) => {
  if (items.length !== 2) return null;

  const item1 = items[0];
  const item2 = items[1];

  // Calculate ADS metrics for keywords
  const getKeywordMetrics = (item: Keyword | TargetASIN) => {
    if (!isKeyword(item)) return null;
    const ads = item.adsData;
    const gasto = calcularGastoAcumulado(ads?.clicks, ads?.cpcActual);
    const ventas = calcularVentasAcumuladas(ads?.pedidos, bookEconomy.precioLibro);
    const acosActual = calcularAcosActualPorcentaje(gasto ?? undefined, ventas ?? undefined);
    const acosSiguiente = calcularAcosSiguienteClickPorcentaje(gasto ?? undefined, ads?.cpcActual, ventas ?? undefined, bookEconomy.precioLibro);
    const conversion = calcularConversionPorcentaje(ads?.pedidos, ads?.clicks);
    const beneficio = gasto !== null && ventas !== null ? ventas - gasto : null;
    return { gasto, ventas, acosActual, acosSiguiente, conversion, beneficio };
  };

  const metrics1 = isKeyword(item1) ? getKeywordMetrics(item1) : null;
  const metrics2 = isKeyword(item2) ? getKeywordMetrics(item2) : null;

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="pr-8">
          <SheetTitle className="flex items-center gap-2">
            Comparación {type === 'keyword' ? 'de Keywords' : 'de ASINs'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Items Header */}
          <div className="grid grid-cols-3 gap-4">
            <div />
            {items.map((item, index) => (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {index === 0 ? 'A' : 'B'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(item.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-sm font-medium truncate">
                  {isKeyword(item) ? item.keyword : item.asin}
                </p>
                {isKeyword(item) && (
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs", getMarketScoreInfo(item.marketScore).bgColor, getMarketScoreInfo(item.marketScore).color)}>
                      {item.marketScore}/100
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Separator />

          {/* Market Data Section (Keywords only) */}
          {isKeyword(item1) && isKeyword(item2) && (
            <>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Datos de Mercado
                </h3>
                <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                  <ComparisonRow 
                    label="Market Score" 
                    values={[item1.marketScore, item2.marketScore]} 
                    format="score"
                  />
                  <ComparisonRow 
                    label="Volumen" 
                    values={[item1.searchVolume, item2.searchVolume]} 
                    format="number"
                  />
                  <ComparisonRow 
                    label="Competidores" 
                    values={[item1.competitors, item2.competitors]} 
                    format="number"
                    higherIsBetter={false}
                  />
                  <ComparisonRow 
                    label="Precio medio ($)" 
                    values={[item1.price, item2.price]} 
                    format="currency"
                  />
                  <ComparisonRow 
                    label="Regalías ($)" 
                    values={[item1.royalties, item2.royalties]} 
                    format="currency"
                  />
                </div>

                {/* Difference Summary */}
                <div className="flex items-center justify-center gap-6 py-3">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground">Δ Score</span>
                    <DifferenceIndicator diff={item1.marketScore - item2.marketScore} format="number" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground">Δ Volumen</span>
                    <DifferenceIndicator diff={(item1.searchVolume || 0) - (item2.searchVolume || 0)} format="number" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground">Δ Competidores</span>
                    <DifferenceIndicator diff={(item1.competitors || 0) - (item2.competitors || 0)} format="number" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* ADS Data Section */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Datos de ADS
                </h3>
                <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                  <ComparisonRow 
                    label="Clicks" 
                    values={[item1.adsData?.clicks, item2.adsData?.clicks]} 
                    format="number"
                  />
                  <ComparisonRow 
                    label="CPC ($)" 
                    values={[item1.adsData?.cpcActual, item2.adsData?.cpcActual]} 
                    format="currency"
                    higherIsBetter={false}
                  />
                  <ComparisonRow 
                    label="Pedidos" 
                    values={[item1.adsData?.pedidos, item2.adsData?.pedidos]} 
                    format="number"
                  />
                  <ComparisonRow 
                    label="Gasto ($)" 
                    values={[metrics1?.gasto, metrics2?.gasto]} 
                    format="currency"
                    higherIsBetter={false}
                  />
                  <ComparisonRow 
                    label="Ventas ($)" 
                    values={[metrics1?.ventas, metrics2?.ventas]} 
                    format="currency"
                  />
                  <ComparisonRow 
                    label="ACOS Actual (%)" 
                    values={[metrics1?.acosActual, metrics2?.acosActual]} 
                    format="percent"
                    higherIsBetter={false}
                  />
                  <ComparisonRow 
                    label="ACOS Sig. (%)" 
                    values={[metrics1?.acosSiguiente, metrics2?.acosSiguiente]} 
                    format="percent"
                    higherIsBetter={false}
                  />
                  <ComparisonRow 
                    label="Conversión (%)" 
                    values={[metrics1?.conversion, metrics2?.conversion]} 
                    format="percent"
                  />
                  <ComparisonRow 
                    label="Beneficio ($)" 
                    values={[metrics1?.beneficio, metrics2?.beneficio]} 
                    format="currency"
                  />
                </div>

                {/* Difference Summary for ADS */}
                {(metrics1?.beneficio !== null || metrics2?.beneficio !== null) && (
                  <div className="flex items-center justify-center gap-6 py-3">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs text-muted-foreground">Δ Beneficio</span>
                      <DifferenceIndicator 
                        diff={(metrics1?.beneficio ?? 0) - (metrics2?.beneficio ?? 0)} 
                        format="currency" 
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs text-muted-foreground">Δ ACOS</span>
                      <DifferenceIndicator 
                        diff={metrics1?.acosActual !== null && metrics2?.acosActual !== null 
                          ? (metrics1?.acosActual ?? 0) - (metrics2?.acosActual ?? 0) 
                          : null} 
                        format="percent" 
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs text-muted-foreground">Δ Conversión</span>
                      <DifferenceIndicator 
                        diff={metrics1?.conversion !== null && metrics2?.conversion !== null 
                          ? (metrics1?.conversion ?? 0) - (metrics2?.conversion ?? 0) 
                          : null} 
                        format="percent" 
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ASINs Comparison */}
          {!isKeyword(item1) && !isKeyword(item2) && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Análisis Competitivo
              </h3>
              <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                <ComparisonRow 
                  label="BSR" 
                  values={[item1.bsr, item2.bsr]} 
                  format="number"
                  higherIsBetter={false}
                />
                <ComparisonRow 
                  label="Threat Score" 
                  values={[item1.threatScore, item2.threatScore]} 
                  format="score"
                  higherIsBetter={false}
                />
                <ComparisonRow 
                  label="Keywords compartidas" 
                  values={[item1.sharedKeywords, item2.sharedKeywords]} 
                  format="number"
                />
                <ComparisonRow 
                  label="Título" 
                  values={[item1.title || '—', item2.title || '—']} 
                  format="text"
                />
              </div>
            </div>
          )}

          {/* Recommendation */}
          {isKeyword(item1) && isKeyword(item2) && (
            <>
              <Separator />
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-2">Recomendación</h4>
                {(() => {
                  const score1 = item1.marketScore + (metrics1?.beneficio ?? 0) / 10;
                  const score2 = item2.marketScore + (metrics2?.beneficio ?? 0) / 10;
                  const winner = score1 >= score2 ? 'A' : 'B';
                  const winnerKeyword = score1 >= score2 ? item1.keyword : item2.keyword;
                  return (
                    <p className="text-sm text-muted-foreground">
                      Basándose en Market Score y rentabilidad, la keyword <strong className="text-primary">{winner}: "{winnerKeyword}"</strong> muestra mejor potencial global.
                    </p>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
