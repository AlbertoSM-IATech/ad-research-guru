import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, DollarSign, Target, MousePointerClick, ShoppingBag, Calculator, Percent, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Keyword, BookEconomy } from '@/types/advertising';
import { calcularGastoAcumulado, calcularVentasAcumuladas, calcularAcosActualPorcentaje, calcularAcosEquilibrioPorcentaje, calcularBeneficioAhora, calcularConversionPorcentaje, formatearPorcentaje, formatearMoneda } from '@/lib/acosEquilibrio';
interface AdsDashboardProps {
  keywords: Keyword[];
  bookEconomy: BookEconomy;
}
interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  tooltip?: string;
  className?: string;
  valueClassName?: string;
}
function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  tooltip,
  className,
  valueClassName
}: MetricCardProps) {
  return <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {title}
              </span>
              {tooltip && <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      {tooltip}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>}
            </div>
            <div className={cn("text-2xl font-bold", valueClassName)}>
              {value}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend && trendValue && <div className={cn("flex items-center gap-1 text-xs font-medium", trend === 'up' ? 'text-green-600 dark:text-green-400' : trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
                {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
                {trendValue}
              </div>}
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>;
}
export function AdsDashboard({
  keywords,
  bookEconomy
}: AdsDashboardProps) {
  // Calculate aggregated metrics
  const metrics = useMemo(() => {
    let totalClicks = 0;
    let totalPedidos = 0;
    let totalGasto = 0;
    let totalVentas = 0;
    let keywordsWithAdsData = 0;
    let profitableKeywords = 0;
    let losingKeywords = 0;
    keywords.forEach(k => {
      if (k.adsData) {
        const ads = k.adsData;
        const clicks = ads.clicks ?? 0;
        const pedidos = ads.pedidos ?? 0;
        const cpc = ads.cpcActual ?? 0;
        
        // Only count keywords that have actual ads data (clicks, cpc, or pedidos > 0)
        const hasAdsData = clicks > 0 || pedidos > 0 || cpc > 0;
        
        if (hasAdsData) {
          keywordsWithAdsData++;
          totalClicks += clicks;
          totalPedidos += pedidos;
          const gasto = calcularGastoAcumulado(clicks, cpc) ?? 0;
          const ventas = calcularVentasAcumuladas(pedidos, bookEconomy.precioLibro) ?? 0;
          totalGasto += gasto;
          totalVentas += ventas;
          const beneficio = ventas - gasto;
          if (beneficio >= 0) {
            profitableKeywords++;
          } else {
            losingKeywords++;
          }
        }
      }
    });
    const totalBeneficio = totalVentas - totalGasto;
    const avgConversion = totalClicks > 0 ? totalPedidos / totalClicks * 100 : 0;
    const acosTotal = totalVentas > 0 ? totalGasto / totalVentas * 100 : null;
    const acosEquilibrio = calcularAcosEquilibrioPorcentaje(bookEconomy.precioLibro, bookEconomy.regaliasPorVenta);
    return {
      totalClicks,
      totalPedidos,
      totalGasto,
      totalVentas,
      totalBeneficio,
      avgConversion,
      acosTotal,
      acosEquilibrio,
      keywordsWithAdsData,
      profitableKeywords,
      losingKeywords
    };
  }, [keywords, bookEconomy]);
  const acosVsEquilibrio = useMemo(() => {
    if (metrics.acosTotal === null || metrics.acosEquilibrio === null) return null;
    return metrics.acosTotal <= metrics.acosEquilibrio ? 'profitable' : 'losing';
  }, [metrics]);
  if (keywords.length === 0) {
    return <Card className="p-8 text-center text-muted-foreground">
        <p>No hay keywords para mostrar métricas.</p>
      </Card>;
  }
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Dashboard de Rendimiento</h3>
          <p className="text-sm text-muted-foreground">
            Resumen de métricas de Ads para {keywords.length} keywords
          </p>
        </div>
        <Badge variant="outline" className="gap-2 bg-primary text-black">
          <Calculator className="w-3 h-3" />
          ACOS PE: {formatearPorcentaje(metrics.acosEquilibrio)}
        </Badge>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Gasto Total" value={formatearMoneda(metrics.totalGasto)} subtitle={`${metrics.keywordsWithAdsData} keywords con datos`} icon={<DollarSign className="w-5 h-5 text-muted-foreground" />} tooltip="Suma de todos los gastos de Ads en las keywords" />
        
        <MetricCard title="Ventas Totales" value={formatearMoneda(metrics.totalVentas)} subtitle={`${metrics.totalPedidos} pedidos`} icon={<ShoppingBag className="w-5 h-5 text-muted-foreground" />} tooltip="Ingresos totales por ventas atribuidas a Ads" />
        
        <MetricCard title="Beneficio" value={formatearMoneda(metrics.totalBeneficio)} subtitle={metrics.totalBeneficio >= 0 ? "Rentable" : "En pérdidas"} icon={metrics.totalBeneficio >= 0 ? <TrendingUp className="w-5 h-5 text-green-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />} valueClassName={cn(metrics.totalBeneficio >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")} tooltip="Ventas totales menos gasto total" />
        
        <MetricCard title="ACOS Total" value={formatearPorcentaje(metrics.acosTotal)} subtitle={acosVsEquilibrio === 'profitable' ? "Por debajo del PE ✓" : acosVsEquilibrio === 'losing' ? "Por encima del PE ⚠" : "—"} icon={<Target className="w-5 h-5 text-muted-foreground" />} valueClassName={cn(acosVsEquilibrio === 'profitable' ? "text-green-600 dark:text-green-400" : acosVsEquilibrio === 'losing' ? "text-amber-600 dark:text-amber-400" : "")} tooltip="Advertising Cost of Sales global. Compara con el ACOS de punto de equilibrio." />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Clicks Totales" value={metrics.totalClicks.toLocaleString()} icon={<MousePointerClick className="w-5 h-5 text-muted-foreground" />} tooltip="Suma de todos los clicks de Ads" />
        
        <MetricCard title="Conversión Media" value={`${metrics.avgConversion.toFixed(1)}%`} icon={<Percent className="w-5 h-5 text-muted-foreground" />} tooltip="Porcentaje de clicks que resultan en pedido" />
        
        <MetricCard title="KW Rentables" value={metrics.profitableKeywords.toString()} subtitle={`${(metrics.profitableKeywords / Math.max(metrics.keywordsWithAdsData, 1) * 100).toFixed(0)}% del total`} icon={<CheckCircle2 className="w-5 h-5 text-green-500" />} valueClassName="text-green-600 dark:text-green-400" tooltip="Keywords con beneficio positivo" />
        
        <MetricCard title="KW En pérdidas" value={metrics.losingKeywords.toString()} subtitle={`${(metrics.losingKeywords / Math.max(metrics.keywordsWithAdsData, 1) * 100).toFixed(0)}% del total`} icon={<XCircle className="w-5 h-5 text-red-500" />} valueClassName="text-red-600 dark:text-red-400" tooltip="Keywords con beneficio negativo" />
      </div>

      {/* Rentability Distribution */}
      {metrics.keywordsWithAdsData > 0 && <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Distribución de Rentabilidad
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Proporción de keywords rentables vs en pérdidas
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-600 dark:text-green-400">
                {metrics.profitableKeywords} rentables
              </span>
              <span className="text-red-600 dark:text-red-400">
                {metrics.losingKeywords} en pérdidas
              </span>
            </div>
            <div className="flex gap-1 h-4 rounded-full overflow-hidden">
              <div className="bg-green-500 transition-all" style={{
            width: `${metrics.profitableKeywords / metrics.keywordsWithAdsData * 100}%`
          }} />
              <div className="bg-red-500 transition-all" style={{
            width: `${metrics.losingKeywords / metrics.keywordsWithAdsData * 100}%`
          }} />
            </div>
          </CardContent>
        </Card>}

      {/* No Data Alert */}
      {metrics.keywordsWithAdsData === 0 && <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-300">
                Sin datos de Ads
              </p>
              <p className="text-sm text-muted-foreground">
                Añade clicks, CPC y pedidos a tus keywords para ver métricas aquí.
              </p>
            </div>
          </CardContent>
        </Card>}
    </div>;
}