import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, DollarSign } from 'lucide-react';
import type { BookEconomy } from '@/types/advertising';

interface BookEconomyPanelProps {
  bookEconomy: BookEconomy;
  onBookEconomyChange: (economy: BookEconomy) => void;
}

export const BookEconomyPanel = ({
  bookEconomy,
  onBookEconomyChange,
}: BookEconomyPanelProps) => {
  const handlePrecioChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    onBookEconomyChange({
      ...bookEconomy,
      precioLibro: Math.max(0, numValue),
    });
  };

  const handleRegaliasChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    onBookEconomyChange({
      ...bookEconomy,
      regaliasPorVenta: Math.max(0, numValue),
    });
  };

  // Calculate ACOS equilibrio for preview
  const acosEquilibrio = bookEconomy.precioLibro > 0
    ? (bookEconomy.regaliasPorVenta / bookEconomy.precioLibro) * 100
    : null;

  return (
    <Card className="border-border/50 bg-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Economía del libro
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p>Se usa para calcular el ACOS de equilibrio y beneficios en la gestión de Ads.</p>
                <p className="mt-1 text-muted-foreground">No afecta al Market Score.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-end">
          {/* Precio del libro */}
          <div className="space-y-1.5">
            <Label htmlFor="precioLibro" className="text-xs text-muted-foreground">
              Precio del libro (sin IVA)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="precioLibro"
                type="number"
                min={0}
                step={0.01}
                value={bookEconomy.precioLibro || ''}
                onChange={(e) => handlePrecioChange(e.target.value)}
                placeholder="0.00"
                className="pl-7 h-9"
              />
            </div>
          </div>

          {/* Regalías netas */}
          <div className="space-y-1.5">
            <Label htmlFor="regaliasPorVenta" className="text-xs text-muted-foreground">
              Regalías netas por venta
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="regaliasPorVenta"
                type="number"
                min={0}
                step={0.01}
                value={bookEconomy.regaliasPorVenta || ''}
                onChange={(e) => handleRegaliasChange(e.target.value)}
                placeholder="0.00"
                className="pl-7 h-9"
              />
            </div>
          </div>

          {/* ACOS Equilibrio Preview */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              ACOS Equilibrio (PE)
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
            <div className="h-9 px-3 flex items-center rounded-md border border-border bg-background/50">
              <span className={acosEquilibrio !== null ? 'font-mono font-medium text-primary' : 'text-muted-foreground'}>
                {acosEquilibrio !== null ? `${acosEquilibrio.toFixed(1)}%` : '—'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
