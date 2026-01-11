import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { History, TrendingUp, TrendingDown, Plus, Trash2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdsData, AdsHistoryEntry, BookEconomy } from '@/types/advertising';
import { 
  calcularGastoAcumulado, 
  calcularVentasAcumuladas, 
  calcularAcosActualPorcentaje,
  formatearPorcentaje,
  formatearMoneda
} from '@/lib/acosEquilibrio';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AdsHistoryPanelProps {
  keyword: string;
  adsData: AdsData | undefined;
  bookEconomy: BookEconomy;
  isOpen: boolean;
  onClose: () => void;
  onAdsDataChange: (adsData: AdsData) => void;
}

export const AdsHistoryPanel = ({
  keyword,
  adsData,
  bookEconomy,
  isOpen,
  onClose,
  onAdsDataChange,
}: AdsHistoryPanelProps) => {
  const history = adsData?.history ?? [];

  // Add current snapshot to history
  const handleAddSnapshot = () => {
    if (!adsData) return;

    const gasto = calcularGastoAcumulado(adsData.clicks, adsData.cpcActual) ?? 0;
    const ventas = calcularVentasAcumuladas(adsData.pedidos, bookEconomy.precioLibro) ?? 0;
    const acosActual = calcularAcosActualPorcentaje(gasto, ventas);
    const beneficio = ventas - gasto;

    const newEntry: AdsHistoryEntry = {
      id: `ads-history-${Date.now()}`,
      timestamp: new Date(),
      clicks: adsData.clicks ?? 0,
      cpcActual: adsData.cpcActual ?? 0,
      pedidos: adsData.pedidos ?? 0,
      gasto,
      ventas,
      acosActual,
      beneficio,
    };

    const updatedHistory = [...history, newEntry];
    onAdsDataChange({
      ...adsData,
      history: updatedHistory,
    });
  };

  // Delete a snapshot
  const handleDeleteSnapshot = (id: string) => {
    if (!adsData) return;
    const updatedHistory = history.filter(h => h.id !== id);
    onAdsDataChange({
      ...adsData,
      history: updatedHistory,
    });
  };

  // Chart data
  const chartData = useMemo(() => {
    return history.map(entry => ({
      date: format(new Date(entry.timestamp), 'dd/MM', { locale: es }),
      clicks: entry.clicks,
      pedidos: entry.pedidos,
      acos: entry.acosActual ?? 0,
      beneficio: entry.beneficio ?? 0,
    }));
  }, [history]);

  // Calculate trends
  const trends = useMemo(() => {
    if (history.length < 2) return null;
    const first = history[0];
    const last = history[history.length - 1];
    
    return {
      clicksDelta: last.clicks - first.clicks,
      pedidosDelta: last.pedidos - first.pedidos,
      acosDelta: (last.acosActual ?? 0) - (first.acosActual ?? 0),
      beneficioDelta: (last.beneficio ?? 0) - (first.beneficio ?? 0),
    };
  }, [history]);

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="flex flex-row items-center justify-between pr-8">
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de ADS
          </SheetTitle>
          <Button onClick={handleAddSnapshot} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Guardar snapshot
          </Button>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* Current keyword */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-sm text-muted-foreground">Keyword</p>
            <p className="font-medium">{keyword}</p>
          </div>

          {/* Trends summary */}
          {trends && (
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-border bg-background">
                <p className="text-xs text-muted-foreground">Δ Clicks</p>
                <p className={cn("text-lg font-bold", trends.clicksDelta >= 0 ? "text-blue-600" : "text-muted-foreground")}>
                  {trends.clicksDelta >= 0 ? '+' : ''}{trends.clicksDelta}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-background">
                <p className="text-xs text-muted-foreground">Δ Pedidos</p>
                <p className={cn("text-lg font-bold", trends.pedidosDelta >= 0 ? "text-green-600" : "text-muted-foreground")}>
                  {trends.pedidosDelta >= 0 ? '+' : ''}{trends.pedidosDelta}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-background">
                <p className="text-xs text-muted-foreground">Δ ACOS</p>
                <div className="flex items-center gap-1">
                  {trends.acosDelta <= 0 ? (
                    <TrendingDown className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-red-500" />
                  )}
                  <p className={cn("text-lg font-bold", trends.acosDelta <= 0 ? "text-green-600" : "text-red-600")}>
                    {trends.acosDelta >= 0 ? '+' : ''}{trends.acosDelta.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border bg-background">
                <p className="text-xs text-muted-foreground">Δ Beneficio</p>
                <p className={cn("text-lg font-bold", trends.beneficioDelta >= 0 ? "text-green-600" : "text-red-600")}>
                  {trends.beneficioDelta >= 0 ? '+' : ''}{formatearMoneda(trends.beneficioDelta)}
                </p>
              </div>
            </div>
          )}

          <Separator />

          {/* Chart */}
          {chartData.length >= 2 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Evolución
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis yAxisId="left" className="text-xs" />
                    <YAxis yAxisId="right" orientation="right" className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }} 
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="clicks" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Clicks"
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="pedidos" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      name="Pedidos"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="acos" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      name="ACOS %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <Separator />

          {/* History table */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Snapshots ({history.length})
            </h3>

            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No hay snapshots guardados.</p>
                <p className="text-xs mt-1">Haz clic en "Guardar snapshot" para registrar el estado actual.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-24">Fecha</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">CPC</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Gasto</TableHead>
                      <TableHead className="text-right">Ventas</TableHead>
                      <TableHead className="text-right">ACOS</TableHead>
                      <TableHead className="text-right">Beneficio</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...history].reverse().map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs">
                          {format(new Date(entry.timestamp), 'dd/MM/yy HH:mm', { locale: es })}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{entry.clicks}</TableCell>
                        <TableCell className="text-right tabular-nums">${entry.cpcActual.toFixed(2)}</TableCell>
                        <TableCell className="text-right tabular-nums">{entry.pedidos}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatearMoneda(entry.gasto)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatearMoneda(entry.ventas)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={cn(
                            entry.acosActual !== null 
                              ? entry.acosActual <= 30 
                                ? 'text-green-600' 
                                : 'text-red-600'
                              : 'text-muted-foreground'
                          )}>
                            {formatearPorcentaje(entry.acosActual)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={cn(
                            entry.beneficio !== null 
                              ? entry.beneficio >= 0 
                                ? 'text-green-600' 
                                : 'text-red-600'
                              : 'text-muted-foreground'
                          )}>
                            {formatearMoneda(entry.beneficio)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteSnapshot(entry.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
