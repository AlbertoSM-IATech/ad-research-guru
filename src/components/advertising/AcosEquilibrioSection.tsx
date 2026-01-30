import { useState, useEffect, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Info, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Target, Calculator, MousePointerClick, ShoppingBag, Plus, History, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { AdsData, AdsFase, BookEconomy, AdsHistoryEntry } from '@/types/advertising';
import { ADS_FASE_OPTIONS } from '@/types/advertising';
import { CampaignSelect } from './CampaignSelect';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { calcularAcosEquilibrioPorcentaje, calcularGastoAcumulado, calcularVentasAcumuladas, calcularAcosActualPorcentaje, calcularAcosSiguienteClickPorcentaje, calcularConversionPorcentaje, calcularBeneficioAhora, calcularBeneficioSiguienteClick, calcularGuiasFase, determinarAcosBadge, obtenerDatosFaltantes, formatearPorcentaje, formatearMoneda } from '@/lib/acosEquilibrio';
interface AcosEquilibrioSectionProps {
  adsData: AdsData | undefined;
  bookEconomy: BookEconomy;
  onAdsDataChange: (adsData: AdsData) => void;
  isExpanded?: boolean;
  campaigns?: string[];
  onAddCampaign?: (name: string) => void;
}
export const AcosEquilibrioSection = ({
  adsData,
  bookEconomy,
  onAdsDataChange,
  isExpanded = false,
  campaigns = [],
  onAddCampaign
}: AcosEquilibrioSectionProps) => {
  const {
    toast
  } = useToast();

  // Local state for RELLENAR inputs (only clicks, cpcActual, pedidos, faseActual)
  const [clicks, setClicks] = useState<string>('');
  const [cpcActual, setCpcActual] = useState<string>('');
  const [pedidos, setPedidos] = useState<string>('');
  const [faseActual, setFaseActual] = useState<AdsFase | undefined>(undefined);
  const [campaignName, setCampaignName] = useState<string>('');
  const [guiaLanzamiento, setGuiaLanzamiento] = useState<string>('');
  const [guiaDominio, setGuiaDominio] = useState<string>('');
  const [guiaBeneficio, setGuiaBeneficio] = useState<string>('');

  // Load data from adsData prop
  useEffect(() => {
    if (adsData) {
      setClicks(adsData.clicks?.toString() ?? '');
      setCpcActual(adsData.cpcActual?.toString() ?? '');
      setPedidos(adsData.pedidos?.toString() ?? '');
      setFaseActual(adsData.faseActual);
      setCampaignName(adsData.campaignName ?? '');
      setGuiaLanzamiento(adsData.guiaLanzamiento?.toString() ?? '');
      setGuiaDominio(adsData.guiaDominio?.toString() ?? '');
      setGuiaBeneficio(adsData.guiaBeneficio?.toString() ?? '');
    }
  }, [adsData]);

  // Update parent when values change
  const updateAdsData = (field: keyof AdsData, value: number | undefined | AdsFase | string) => {
    const baseAds = (adsData ?? {}) as AdsData;
    const newAdsData: AdsData = {
      ...baseAds,
      [field]: value
    };
    onAdsDataChange(newAdsData);
  };
  const handleNumberChange = (field: keyof AdsData, value: string, setter: (v: string) => void) => {
    setter(value);
    if (value === '') {
      updateAdsData(field, undefined);
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        // Auto-click rule: when increasing pedidos, also increase clicks by the same delta.
        if (field === 'pedidos') {
          const prevPedidos = adsData?.pedidos ?? 0;
          const prevClicks = adsData?.clicks ?? 0;
          const delta = numValue - prevPedidos;
          if (delta > 0) {
            const nextClicks = Math.max(prevClicks + delta, numValue);
            setClicks(String(nextClicks));
            const baseAds = (adsData ?? {}) as AdsData;
            const newAdsData: AdsData = {
              ...baseAds,
              clicks: nextClicks,
              pedidos: numValue
            };
            onAdsDataChange(newAdsData);
            return;
          }

          // If pedidos was decreased/edited downward, keep existing clicks but enforce clicks >= pedidos
          if (prevClicks < numValue) {
            setClicks(String(numValue));
            const baseAds = (adsData ?? {}) as AdsData;
            onAdsDataChange({
              ...baseAds,
              clicks: numValue,
              pedidos: numValue
            });
            return;
          }
        }
        updateAdsData(field, numValue);
      }
    }
  };

  // Auto-calculated values
  const gastoCalculado = useMemo(() => calcularGastoAcumulado(adsData?.clicks, adsData?.cpcActual), [adsData?.clicks, adsData?.cpcActual]);
  const ventasCalculadas = useMemo(() => calcularVentasAcumuladas(adsData?.pedidos, bookEconomy.precioLibro), [adsData?.pedidos, bookEconomy.precioLibro]);

  // ACOS Calculations
  const acosEquilibrio = useMemo(() => calcularAcosEquilibrioPorcentaje(bookEconomy.precioLibro, bookEconomy.regaliasPorVenta), [bookEconomy]);
  const acosActual = useMemo(() => calcularAcosActualPorcentaje(gastoCalculado ?? undefined, ventasCalculadas ?? undefined), [gastoCalculado, ventasCalculadas]);

  // Auto-alert when ACOS actual exceeds the book break-even (PE)
  const prevAbovePeRef = useRef<boolean>(false);
  useEffect(() => {
    const abovePe = acosEquilibrio !== null && acosActual !== null && acosActual > acosEquilibrio;
    if (abovePe && !prevAbovePeRef.current) {
      toast({
        title: 'ACOS por encima del PE',
        description: `ACOS actual ${formatearPorcentaje(acosActual)} > PE ${formatearPorcentaje(acosEquilibrio)}.`
      });
    }
    prevAbovePeRef.current = abovePe;
  }, [acosActual, acosEquilibrio, toast]);
  const acosSiguiente = useMemo(() => calcularAcosSiguienteClickPorcentaje(gastoCalculado ?? undefined, adsData?.cpcActual, ventasCalculadas ?? undefined, bookEconomy.precioLibro), [gastoCalculado, adsData?.cpcActual, ventasCalculadas, bookEconomy.precioLibro]);
  const conversion = useMemo(() => calcularConversionPorcentaje(adsData?.pedidos, adsData?.clicks), [adsData?.pedidos, adsData?.clicks]);

  // Beneficio = Ventas - Gasto (corrected)
  const beneficioAhora = useMemo(() => calcularBeneficioAhora(ventasCalculadas ?? undefined, gastoCalculado ?? undefined), [ventasCalculadas, gastoCalculado]);
  const beneficioSiguiente = useMemo(() => calcularBeneficioSiguienteClick(adsData?.pedidos, bookEconomy.precioLibro, gastoCalculado ?? undefined, adsData?.cpcActual), [adsData?.pedidos, bookEconomy.precioLibro, gastoCalculado, adsData?.cpcActual]);
  const guiasPrecalculadas = useMemo(() => calcularGuiasFase(acosEquilibrio), [acosEquilibrio]);
  const badgeType = useMemo(() => determinarAcosBadge(acosEquilibrio, acosActual, acosSiguiente), [acosEquilibrio, acosActual, acosSiguiente]);
  const datosFaltantes = useMemo(() => obtenerDatosFaltantes(bookEconomy.precioLibro, bookEconomy.regaliasPorVenta, adsData?.clicks, adsData?.cpcActual, adsData?.pedidos), [bookEconomy, adsData]);

  // Precalculate guides when ACOS equilibrio is available
  useEffect(() => {
    if (acosEquilibrio !== null && !guiaLanzamiento && !guiaDominio && !guiaBeneficio) {
      if (guiasPrecalculadas.lanzamiento !== null) {
        setGuiaLanzamiento(guiasPrecalculadas.lanzamiento.toFixed(1));
        updateAdsData('guiaLanzamiento', guiasPrecalculadas.lanzamiento);
      }
      if (guiasPrecalculadas.dominio !== null) {
        setGuiaDominio(guiasPrecalculadas.dominio.toFixed(1));
        updateAdsData('guiaDominio', guiasPrecalculadas.dominio);
      }
      if (guiasPrecalculadas.beneficio !== null) {
        setGuiaBeneficio(guiasPrecalculadas.beneficio.toFixed(1));
        updateAdsData('guiaBeneficio', guiasPrecalculadas.beneficio);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acosEquilibrio]);
  const getBadgeContent = () => {
    switch (badgeType) {
      case 'bajo-pe':
        return {
          icon: <CheckCircle2 className="w-4 h-4" />,
          label: 'Bajo PE',
          description: 'ACOS actual por debajo del punto de equilibrio',
          className: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30'
        };
      case 'recuperable':
        return {
          icon: <TrendingUp className="w-4 h-4" />,
          label: 'Recuperable con 1 compra',
          description: 'El siguiente click con venta volvería al equilibrio',
          className: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
        };
      case 'en-perdida':
        return {
          icon: <TrendingDown className="w-4 h-4" />,
          label: 'En pérdida',
          description: 'Ni con 1 compra se alcanzaría el equilibrio',
          className: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30'
        };
      default:
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          label: 'Sin datos',
          description: `Falta: ${datosFaltantes.join(', ')}`,
          className: 'bg-muted text-muted-foreground border-border'
        };
    }
  };
  const badge = getBadgeContent();
  return <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Target className="w-4 h-4" />
            ACOS & Equilibrio
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Simula si esta keyword podría volver al punto de equilibrio si el siguiente click termina en compra.
        </p>
      </div>

      {/* Badge informativo */}
      <div className={cn("flex items-center gap-2 p-3 rounded-lg border", badge.className)}>
        {badge.icon}
        <div className="flex-1">
          <p className="text-sm font-medium">{badge.label}</p>
          <p className="text-xs opacity-80">{badge.description}</p>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
        <span className="text-xs text-muted-foreground font-medium">Acciones rápidas:</span>
        <Button variant="outline" size="sm" onClick={() => {
        const prevClicks = adsData?.clicks ?? 0;
        const newClicks = prevClicks + 1;
        setClicks(String(newClicks));
        updateAdsData('clicks', newClicks);
      }} className="h-7 gap-1.5 text-xs bg-primary">
          <MousePointerClick className="w-3 h-3" />
          +1 Click
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
        const prevCpc = adsData?.cpcActual ?? 0;
        const newCpc = Math.round((prevCpc + 0.01) * 100) / 100;
        setCpcActual(String(newCpc));
        updateAdsData('cpcActual', newCpc);
      }} className="h-7 gap-1.5 text-xs bg-primary">
          <TrendingUp className="w-3 h-3" />
          +0.01 CPC
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
        const prevPedidos = adsData?.pedidos ?? 0;
        const prevClicks = adsData?.clicks ?? 0;
        const newPedidos = prevPedidos + 1;
        const newClicks = Math.max(prevClicks + 1, newPedidos);
        setPedidos(String(newPedidos));
        setClicks(String(newClicks));
        const baseAds = (adsData ?? {}) as AdsData;
        onAdsDataChange({
          ...baseAds,
          pedidos: newPedidos,
          clicks: newClicks
        });
      }} className="h-7 gap-1.5 text-xs bg-primary">
          <ShoppingBag className="w-3 h-3" />
          +1 Pedido
        </Button>
      </div>

      {/* BLOQUE 1: RELLENAR */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
          <Info className="w-3.5 h-3.5" />
          Rellenar
        </h4>
        
        <div className={cn("grid gap-4", isExpanded ? "grid-cols-2 lg:grid-cols-5" : "grid-cols-2")}>
          {/* Campaña */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              Campaña
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>Nombre de la campaña de Amazon Ads donde se usa esta keyword.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <CampaignSelect value={campaignName} onChange={value => {
            setCampaignName(value);
            updateAdsData('campaignName', value);
          }} campaigns={campaigns} onAddCampaign={onAddCampaign} placeholder="Seleccionar..." className="h-9" />
          </div>
          
          {/* Clicks */}
          <div className="space-y-1.5">
            <Label htmlFor="ads-clicks" className="text-xs flex items-center gap-1">
              Clicks (acumulados)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>Clicks acumulados (dato manual) para calcular la conversión.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input id="ads-clicks" type="number" min={0} step={1} value={clicks} onChange={e => handleNumberChange('clicks', e.target.value, setClicks)} placeholder="0" className="h-9" />
          </div>

          {/* CPC Actual */}
          <div className="space-y-1.5">
            <Label htmlFor="ads-cpc" className="text-xs flex items-center gap-1">
              CPC (actual)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>CPC actual manual (Amazon Ads); se usa para simular el coste del siguiente click.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input id="ads-cpc" type="number" min={0} step={0.01} value={cpcActual} onChange={e => handleNumberChange('cpcActual', e.target.value, setCpcActual)} placeholder="0.00" className="h-9 pl-7" />
            </div>
          </div>

          {/* Pedidos */}
          <div className="space-y-1.5">
            <Label htmlFor="ads-pedidos" className="text-xs flex items-center gap-1">
              Pedidos (acumulados)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>Pedidos atribuibles acumulados (dato manual).</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input id="ads-pedidos" type="number" min={0} step={1} value={pedidos} onChange={e => handleNumberChange('pedidos', e.target.value, setPedidos)} placeholder="0" className="h-9" />
          </div>

          {/* Fase Actual */}
          <div className="space-y-1.5">
            <Label className="text-xs">Fase actual</Label>
            <Select value={faseActual ?? ''} onValueChange={value => {
            const fase = value as AdsFase;
            setFaseActual(fase);
            updateAdsData('faseActual', fase);
          }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {ADS_FASE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Guías de fase (colapsable) */}
      {acosEquilibrio !== null && <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Guías de fase (orientativas)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Guías orientativas basadas en ACOS de equilibrio. Puedes editarlas.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Lanzamiento</Label>
              <div className="relative">
                <Input type="number" min={0} step={0.1} value={guiaLanzamiento} onChange={e => handleNumberChange('guiaLanzamiento', e.target.value, setGuiaLanzamiento)} className="h-7 text-xs pr-6" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Dominio</Label>
              <div className="relative">
                <Input type="number" min={0} step={0.1} value={guiaDominio} onChange={e => handleNumberChange('guiaDominio', e.target.value, setGuiaDominio)} className="h-7 text-xs pr-6" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Beneficio</Label>
              <div className="relative">
                <Input type="number" min={0} step={0.1} value={guiaBeneficio} onChange={e => handleNumberChange('guiaBeneficio', e.target.value, setGuiaBeneficio)} className="h-7 text-xs pr-6" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
              </div>
            </div>
          </div>
        </div>}

      {/* BLOQUE 2: RESULTADOS */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
          <Calculator className="w-3.5 h-3.5" />
          Resultados (auto-calculados)
        </h4>
        
        <div className={cn("grid gap-3", isExpanded ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2")}>
          {/* Gasto Acumulado (auto-calculado) */}
          <div className="p-3 rounded-lg border border-border bg-background space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
              Gasto Acumulado
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-2.5 h-2.5 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>Clicks × CPC</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <p className="text-lg font-bold text-foreground">
              {formatearMoneda(gastoCalculado)}
            </p>
            {gastoCalculado !== null && <p className="text-[10px] text-muted-foreground">
                = {adsData?.clicks ?? 0} × ${adsData?.cpcActual?.toFixed(2) ?? '0.00'}
              </p>}
          </div>

          {/* Ventas Acumuladas (auto-calculado) */}
          <div className="p-3 rounded-lg border border-border bg-background space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
              Ventas Acumuladas
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-2.5 h-2.5 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>Pedidos × PVP</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <p className="text-lg font-bold text-foreground">
              {formatearMoneda(ventasCalculadas)}
            </p>
            {ventasCalculadas !== null && <p className="text-[10px] text-muted-foreground">
                = {adsData?.pedidos ?? 0} × ${bookEconomy.precioLibro?.toFixed(2) ?? '0.00'}
              </p>}
          </div>

          {/* Beneficio Ahora */}
          <div className="p-3 rounded-lg border border-border bg-background space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
              Beneficio Ahora
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-2.5 h-2.5 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>Ventas - Gasto</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <p className={cn("text-lg font-bold", beneficioAhora !== null ? beneficioAhora >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
              {formatearMoneda(beneficioAhora)}
            </p>
          </div>

          {/* Beneficio Siguiente Click */}
          <div className="p-3 rounded-lg border border-border bg-background space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
              Beneficio Sig. Click
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-2.5 h-2.5 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>(Pedidos+1)×PVP - (Gasto+CPC)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <p className={cn("text-lg font-bold", beneficioSiguiente !== null ? beneficioSiguiente >= 0 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
              {formatearMoneda(beneficioSiguiente)}
            </p>
          </div>

          {/* ACOS Equilibrio */}
          <div className="p-3 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">ACOS Equilibrio (PE)</Label>
            <p className="text-xl font-bold text-primary">
              {formatearPorcentaje(acosEquilibrio)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Desde Economía del libro
            </p>
          </div>

          {/* ACOS Actual */}
          <div className="p-3 rounded-lg border border-border bg-background space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">ACOS Actual</Label>
            <p className={cn("text-lg font-bold", acosActual !== null && acosEquilibrio !== null ? acosActual <= acosEquilibrio ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
              {formatearPorcentaje(acosActual)}
            </p>
            {acosActual !== null && <p className="text-[10px] text-muted-foreground">
                Gasto / Ventas
              </p>}
          </div>

          {/* ACOS Siguiente Click - ÉNFASIS */}
          <div className="p-3 rounded-lg border-2 border-amber-500/30 bg-amber-500/5 space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">ACOS Sig. Click ⭐</Label>
            <p className={cn("text-xl font-bold", acosSiguiente !== null && acosEquilibrio !== null ? acosSiguiente <= acosEquilibrio ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
              {formatearPorcentaje(acosSiguiente)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Si 1 click = 1 venta
            </p>
          </div>

          {/* Conversión - ÉNFASIS */}
          <div className="p-3 rounded-lg border-2 border-blue-500/30 bg-blue-500/5 space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">Conversión ⭐</Label>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatearPorcentaje(conversion)}
            </p>
            {conversion !== null && <p className="text-[10px] text-muted-foreground">
                Pedidos / Clicks
              </p>}
          </div>
        </div>
      </div>

      {/* Warning si faltan datos de economía */}
      {(bookEconomy.precioLibro <= 0 || bookEconomy.regaliasPorVenta <= 0) && <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
            Configura el precio y regalías del libro en el panel "Economía del libro" para calcular el ACOS de equilibrio.
          </AlertDescription>
        </Alert>}

      {/* HISTORIAL DE MÉTRICAS ADS */}
      <AdsHistorySection adsData={adsData} bookEconomy={bookEconomy} onAdsDataChange={onAdsDataChange} acosEquilibrio={acosEquilibrio} isExpanded={isExpanded} />
    </div>;
};

// ============ ADS HISTORY SECTION (integrated) ============
interface AdsHistorySectionProps {
  adsData: AdsData | undefined;
  bookEconomy: BookEconomy;
  onAdsDataChange: (adsData: AdsData) => void;
  acosEquilibrio: number | null;
  isExpanded?: boolean;
}
const AdsHistorySection = ({
  adsData,
  bookEconomy,
  onAdsDataChange,
  acosEquilibrio,
  isExpanded = false
}: AdsHistorySectionProps) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const history = adsData?.history ?? [];

  // Add current snapshot to history
  const handleAddSnapshot = () => {
    if (!adsData) return;
    const gasto = calcularGastoAcumulado(adsData.clicks, adsData.cpcActual) ?? 0;
    const ventas = calcularVentasAcumuladas(adsData.pedidos, bookEconomy.precioLibro) ?? 0;
    const acosActual = calcularAcosActualPorcentaje(gasto, ventas);
    const beneficio = ventas - gasto;

    // Check if there's already a snapshot today
    const today = new Date().toDateString();
    const existingTodayIndex = history.findIndex(h => new Date(h.timestamp).toDateString() === today);
    const newEntry: AdsHistoryEntry = {
      id: `ads-history-${Date.now()}`,
      timestamp: new Date(),
      clicks: adsData.clicks ?? 0,
      cpcActual: adsData.cpcActual ?? 0,
      pedidos: adsData.pedidos ?? 0,
      gasto,
      ventas,
      acosActual,
      beneficio
    };
    let updatedHistory: AdsHistoryEntry[];
    if (existingTodayIndex >= 0) {
      // Update existing today's snapshot
      updatedHistory = [...history];
      updatedHistory[existingTodayIndex] = {
        ...newEntry,
        id: history[existingTodayIndex].id
      };
    } else {
      // Add new snapshot
      updatedHistory = [...history, newEntry];
    }
    onAdsDataChange({
      ...adsData,
      history: updatedHistory
    });
  };

  // Delete a snapshot
  const handleDeleteSnapshot = (id: string) => {
    if (!adsData) return;
    const updatedHistory = history.filter(h => h.id !== id);
    onAdsDataChange({
      ...adsData,
      history: updatedHistory
    });
  };

  // Filter history by range
  const filteredHistory = useMemo(() => {
    const now = new Date();
    const cutoffDays = selectedRange === '7d' ? 7 : selectedRange === '30d' ? 30 : selectedRange === '90d' ? 90 : Infinity;
    const cutoffDate = new Date(now.getTime() - cutoffDays * 24 * 60 * 60 * 1000);
    return history.filter(h => new Date(h.timestamp) >= cutoffDate);
  }, [history, selectedRange]);

  // Chart data
  const chartData = useMemo(() => {
    return filteredHistory.map(entry => ({
      date: format(new Date(entry.timestamp), 'dd/MM', {
        locale: es
      }),
      clicks: entry.clicks,
      pedidos: entry.pedidos,
      acos: entry.acosActual ?? 0
    }));
  }, [filteredHistory]);

  // Calculate trends
  const trends = useMemo(() => {
    if (filteredHistory.length < 2) return null;
    const first = filteredHistory[0];
    const last = filteredHistory[filteredHistory.length - 1];
    return {
      clicksDelta: last.clicks - first.clicks,
      pedidosDelta: last.pedidos - first.pedidos,
      acosDelta: (last.acosActual ?? 0) - (first.acosActual ?? 0)
    };
  }, [filteredHistory]);
  return <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="gap-2 p-0 h-auto hover:bg-transparent">
              <History className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Historial de Métricas
              </h4>
              <Badge variant="outline" className="text-xs">
                {history.length} snapshots
              </Badge>
              {isHistoryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <Button onClick={handleAddSnapshot} size="sm" variant="outline" className="gap-2 h-7 text-xs bg-primary">
            <Plus className="w-3 h-3" />
            Guardar snapshot
          </Button>
        </div>

        <CollapsibleContent className="space-y-4">
          {/* Range selector */}
          <div className="flex items-center gap-2">
            {(['7d', '30d', '90d', 'all'] as const).map(range => <Button key={range} variant={selectedRange === range ? 'default' : 'outline'} size="sm" onClick={() => setSelectedRange(range)} className="h-7 text-xs">
                {range === 'all' ? 'Todo' : range}
              </Button>)}
          </div>

          {/* Trends summary */}
          {trends && <div className="grid grid-cols-3 gap-3">
              <div className="p-2 rounded-lg border border-border bg-muted/30">
                <p className="text-[10px] text-muted-foreground uppercase">Δ Clicks</p>
                <p className={cn("text-sm font-bold", trends.clicksDelta >= 0 ? "text-blue-600" : "text-muted-foreground")}>
                  {trends.clicksDelta >= 0 ? '+' : ''}{trends.clicksDelta}
                </p>
              </div>
              <div className="p-2 rounded-lg border border-border bg-muted/30">
                <p className="text-[10px] text-muted-foreground uppercase">Δ Pedidos</p>
                <p className={cn("text-sm font-bold", trends.pedidosDelta >= 0 ? "text-green-600" : "text-muted-foreground")}>
                  {trends.pedidosDelta >= 0 ? '+' : ''}{trends.pedidosDelta}
                </p>
              </div>
              <div className="p-2 rounded-lg border border-border bg-muted/30">
                <p className="text-[10px] text-muted-foreground uppercase">Δ ACOS</p>
                <div className="flex items-center gap-1">
                  {trends.acosDelta <= 0 ? <TrendingDown className="w-3 h-3 text-green-500" /> : <TrendingUp className="w-3 h-3 text-red-500" />}
                  <p className={cn("text-sm font-bold", trends.acosDelta <= 0 ? "text-green-600" : "text-red-600")}>
                    {trends.acosDelta >= 0 ? '+' : ''}{trends.acosDelta.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>}

          {/* Chart */}
          {chartData.length >= 2 && <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-[10px]" tick={{
                fontSize: 10
              }} />
                  <YAxis yAxisId="left" className="text-[10px]" tick={{
                fontSize: 10
              }} />
                  <YAxis yAxisId="right" orientation="right" className="text-[10px]" tick={{
                fontSize: 10
              }} />
                  <RechartsTooltip contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }} />
                  {acosEquilibrio !== null && <ReferenceLine yAxisId="right" y={acosEquilibrio} stroke="hsl(var(--primary))" strokeDasharray="5 5" label={{
                value: 'PE',
                position: 'right',
                fontSize: 10
              }} />}
                  <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="hsl(217.2 91.2% 59.8%)" strokeWidth={2} dot={false} name="Clicks" />
                  <Line yAxisId="left" type="monotone" dataKey="pedidos" stroke="#22c55e" strokeWidth={2} dot={false} name="Pedidos" />
                  <Line yAxisId="right" type="monotone" dataKey="acos" stroke="#f59e0b" strokeWidth={2} dot={false} name="ACOS %" />
                </LineChart>
              </ResponsiveContainer>
            </div>}

          {/* History table (compact) */}
          {filteredHistory.length > 0 ? <div className="rounded-lg border border-border overflow-hidden max-h-40 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Fecha</th>
                    <th className="text-right p-2 font-medium">Clicks</th>
                    <th className="text-right p-2 font-medium">Pedidos</th>
                    <th className="text-right p-2 font-medium">ACOS</th>
                    <th className="w-8 p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...filteredHistory].reverse().slice(0, 10).map(entry => <tr key={entry.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-2 text-muted-foreground">
                        {format(new Date(entry.timestamp), 'dd/MM/yy', {
                    locale: es
                  })}
                      </td>
                      <td className="p-2 text-right tabular-nums">{entry.clicks}</td>
                      <td className="p-2 text-right tabular-nums">{entry.pedidos}</td>
                      <td className={cn("p-2 text-right tabular-nums", entry.acosActual !== null && acosEquilibrio !== null ? entry.acosActual <= acosEquilibrio ? 'text-green-600' : 'text-red-600' : 'text-muted-foreground')}>
                        {formatearPorcentaje(entry.acosActual)}
                      </td>
                      <td className="p-2">
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteSnapshot(entry.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div> : <div className="text-center py-6 text-sm text-muted-foreground">
              <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No hay snapshots guardados.</p>
              <p className="text-xs mt-1">Haz clic en "Guardar snapshot" para registrar el estado actual.</p>
            </div>}
        </CollapsibleContent>
      </div>
    </Collapsible>;
};