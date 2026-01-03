import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdsData, AdsFase, BookEconomy } from '@/types/advertising';
import { ADS_FASE_OPTIONS } from '@/types/advertising';
import {
  calcularAcosEquilibrioPorcentaje,
  calcularAcosActualPorcentaje,
  calcularAcosSiguienteClickPorcentaje,
  calcularConversionPorcentaje,
  calcularBeneficioAhora,
  calcularBeneficioSiguienteClick,
  calcularGuiasFase,
  determinarAcosBadge,
  obtenerDatosFaltantes,
  formatearPorcentaje,
  formatearMoneda,
} from '@/lib/acosEquilibrio';

interface AcosEquilibrioSectionProps {
  adsData: AdsData | undefined;
  bookEconomy: BookEconomy;
  onAdsDataChange: (adsData: AdsData) => void;
  isExpanded?: boolean;
}

export const AcosEquilibrioSection = ({
  adsData,
  bookEconomy,
  onAdsDataChange,
  isExpanded = false,
}: AcosEquilibrioSectionProps) => {
  // Local state for inputs
  const [clicks, setClicks] = useState<string>('');
  const [gasto, setGasto] = useState<string>('');
  const [cpcActual, setCpcActual] = useState<string>('');
  const [pedidos, setPedidos] = useState<string>('');
  const [ventas, setVentas] = useState<string>('');
  const [faseActual, setFaseActual] = useState<AdsFase | undefined>(undefined);
  const [guiaLanzamiento, setGuiaLanzamiento] = useState<string>('');
  const [guiaDominio, setGuiaDominio] = useState<string>('');
  const [guiaBeneficio, setGuiaBeneficio] = useState<string>('');

  // Load data from adsData prop
  useEffect(() => {
    if (adsData) {
      setClicks(adsData.clicks?.toString() ?? '');
      setGasto(adsData.gasto?.toString() ?? '');
      setCpcActual(adsData.cpcActual?.toString() ?? '');
      setPedidos(adsData.pedidos?.toString() ?? '');
      setVentas(adsData.ventas?.toString() ?? '');
      setFaseActual(adsData.faseActual);
      setGuiaLanzamiento(adsData.guiaLanzamiento?.toString() ?? '');
      setGuiaDominio(adsData.guiaDominio?.toString() ?? '');
      setGuiaBeneficio(adsData.guiaBeneficio?.toString() ?? '');
    }
  }, [adsData]);

  // Update parent when values change
  const updateAdsData = (field: keyof AdsData, value: number | undefined | AdsFase) => {
    const newAdsData: AdsData = {
      ...adsData,
      [field]: value,
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
        updateAdsData(field, numValue);
      }
    }
  };

  // Calculations
  const acosEquilibrio = useMemo(() => 
    calcularAcosEquilibrioPorcentaje(bookEconomy.precioLibro, bookEconomy.regaliasPorVenta),
    [bookEconomy]
  );

  const acosActual = useMemo(() => 
    calcularAcosActualPorcentaje(adsData?.gasto, adsData?.ventas),
    [adsData?.gasto, adsData?.ventas]
  );

  const acosSiguiente = useMemo(() => 
    calcularAcosSiguienteClickPorcentaje(
      adsData?.gasto, 
      adsData?.cpcActual, 
      adsData?.ventas, 
      bookEconomy.precioLibro
    ),
    [adsData?.gasto, adsData?.cpcActual, adsData?.ventas, bookEconomy.precioLibro]
  );

  const conversion = useMemo(() => 
    calcularConversionPorcentaje(adsData?.pedidos, adsData?.clicks),
    [adsData?.pedidos, adsData?.clicks]
  );

  const beneficioAhora = useMemo(() => 
    calcularBeneficioAhora(bookEconomy.regaliasPorVenta, adsData?.pedidos, adsData?.gasto),
    [bookEconomy.regaliasPorVenta, adsData?.pedidos, adsData?.gasto]
  );

  const beneficioSiguiente = useMemo(() => 
    calcularBeneficioSiguienteClick(
      bookEconomy.regaliasPorVenta, 
      adsData?.pedidos, 
      adsData?.gasto, 
      adsData?.cpcActual
    ),
    [bookEconomy.regaliasPorVenta, adsData?.pedidos, adsData?.gasto, adsData?.cpcActual]
  );

  const guiasPrecalculadas = useMemo(() => calcularGuiasFase(acosEquilibrio), [acosEquilibrio]);

  const badgeType = useMemo(() => 
    determinarAcosBadge(acosEquilibrio, acosActual, acosSiguiente),
    [acosEquilibrio, acosActual, acosSiguiente]
  );

  const datosFaltantes = useMemo(() => 
    obtenerDatosFaltantes(
      bookEconomy.precioLibro, 
      bookEconomy.regaliasPorVenta, 
      adsData?.gasto, 
      adsData?.ventas, 
      adsData?.cpcActual
    ),
    [bookEconomy, adsData]
  );

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
          className: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
        };
      case 'recuperable':
        return {
          icon: <TrendingUp className="w-4 h-4" />,
          label: 'Recuperable con 1 compra',
          description: 'El siguiente click con venta volvería al equilibrio',
          className: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
        };
      case 'en-perdida':
        return {
          icon: <TrendingDown className="w-4 h-4" />,
          label: 'En pérdida',
          description: 'Ni con 1 compra se alcanzaría el equilibrio',
          className: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
        };
      default:
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          label: 'Sin datos',
          description: `Falta: ${datosFaltantes.join(', ')}`,
          className: 'bg-muted text-muted-foreground border-border',
        };
    }
  };

  const badge = getBadgeContent();

  return (
    <div className="space-y-6">
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
      <div className={cn(
        "flex items-center gap-2 p-3 rounded-lg border",
        badge.className
      )}>
        {badge.icon}
        <div className="flex-1">
          <p className="text-sm font-medium">{badge.label}</p>
          <p className="text-xs opacity-80">{badge.description}</p>
        </div>
      </div>

      {/* Inputs Grid */}
      <div className={cn(
        "grid gap-4",
        isExpanded ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2"
      )}>
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
          <Input
            id="ads-clicks"
            type="number"
            min={0}
            step={1}
            value={clicks}
            onChange={(e) => handleNumberChange('clicks', e.target.value, setClicks)}
            placeholder="0"
            className="h-9"
          />
        </div>

        {/* Gasto */}
        <div className="space-y-1.5">
          <Label htmlFor="ads-gasto" className="text-xs flex items-center gap-1">
            Gasto (acumulado)
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>Gasto acumulado de la keyword (dato manual).</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              id="ads-gasto"
              type="number"
              min={0}
              step={0.01}
              value={gasto}
              onChange={(e) => handleNumberChange('gasto', e.target.value, setGasto)}
              placeholder="0.00"
              className="h-9 pl-7"
            />
          </div>
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
            <Input
              id="ads-cpc"
              type="number"
              min={0}
              step={0.01}
              value={cpcActual}
              onChange={(e) => handleNumberChange('cpcActual', e.target.value, setCpcActual)}
              placeholder="0.00"
              className="h-9 pl-7"
            />
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
          <Input
            id="ads-pedidos"
            type="number"
            min={0}
            step={1}
            value={pedidos}
            onChange={(e) => handleNumberChange('pedidos', e.target.value, setPedidos)}
            placeholder="0"
            className="h-9"
          />
        </div>

        {/* Ventas */}
        <div className="space-y-1.5">
          <Label htmlFor="ads-ventas" className="text-xs flex items-center gap-1">
            Ventas (acumuladas)
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>Ventas atribuibles acumuladas (dato manual).</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              id="ads-ventas"
              type="number"
              min={0}
              step={0.01}
              value={ventas}
              onChange={(e) => handleNumberChange('ventas', e.target.value, setVentas)}
              placeholder="0.00"
              className="h-9 pl-7"
            />
          </div>
        </div>

        {/* Fase Actual */}
        <div className="space-y-1.5">
          <Label className="text-xs">Fase actual</Label>
          <Select
            value={faseActual ?? ''}
            onValueChange={(value) => {
              const fase = value as AdsFase;
              setFaseActual(fase);
              updateAdsData('faseActual', fase);
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {ADS_FASE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Guías de fase (colapsable) */}
      {acosEquilibrio !== null && (
        <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-3">
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
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={guiaLanzamiento}
                  onChange={(e) => handleNumberChange('guiaLanzamiento', e.target.value, setGuiaLanzamiento)}
                  className="h-7 text-xs pr-6"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Dominio</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={guiaDominio}
                  onChange={(e) => handleNumberChange('guiaDominio', e.target.value, setGuiaDominio)}
                  className="h-7 text-xs pr-6"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Beneficio</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={guiaBeneficio}
                  onChange={(e) => handleNumberChange('guiaBeneficio', e.target.value, setGuiaBeneficio)}
                  className="h-7 text-xs pr-6"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resultados */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase">Resultados</h4>
        
        <div className={cn(
          "grid gap-3",
          isExpanded ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2"
        )}>
          {/* ACOS Equilibrio */}
          <div className="p-3 rounded-lg border border-border bg-background space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">ACOS Equilibrio (PE)</Label>
            <p className="text-lg font-bold text-primary">
              {formatearPorcentaje(acosEquilibrio)}
            </p>
          </div>

          {/* ACOS Actual */}
          <div className="p-3 rounded-lg border border-border bg-background space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">ACOS Actual</Label>
            <p className={cn(
              "text-lg font-bold",
              acosActual !== null && acosEquilibrio !== null
                ? acosActual <= acosEquilibrio
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            )}>
              {formatearPorcentaje(acosActual)}
            </p>
          </div>

          {/* ACOS Siguiente Click */}
          <div className="p-3 rounded-lg border border-border bg-background space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">ACOS Sig. Click</Label>
            <p className={cn(
              "text-lg font-bold",
              acosSiguiente !== null && acosEquilibrio !== null
                ? acosSiguiente <= acosEquilibrio
                  ? "text-green-600 dark:text-green-400"
                  : "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
            )}>
              {formatearPorcentaje(acosSiguiente)}
            </p>
          </div>

          {/* Conversión */}
          <div className="p-3 rounded-lg border border-border bg-background space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">Conversión</Label>
            <p className="text-lg font-bold text-foreground">
              {formatearPorcentaje(conversion)}
            </p>
          </div>

          {/* Beneficio Ahora */}
          <div className="p-3 rounded-lg border border-border bg-background space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">Beneficio Ahora</Label>
            <p className={cn(
              "text-lg font-bold",
              beneficioAhora !== null
                ? beneficioAhora >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            )}>
              {formatearMoneda(beneficioAhora)}
            </p>
          </div>

          {/* Beneficio Siguiente Click */}
          <div className="p-3 rounded-lg border border-border bg-background space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">Beneficio Sig. Click</Label>
            <p className={cn(
              "text-lg font-bold",
              beneficioSiguiente !== null
                ? beneficioSiguiente >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
            )}>
              {formatearMoneda(beneficioSiguiente)}
            </p>
          </div>
        </div>
      </div>

      {/* Warning si faltan datos de economía */}
      {(bookEconomy.precioLibro <= 0 || bookEconomy.regaliasPorVenta <= 0) && (
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
            Configura el precio y regalías del libro en el panel "Economía del libro" para calcular el ACOS de equilibrio.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
