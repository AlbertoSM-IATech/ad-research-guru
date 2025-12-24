import { useState } from 'react';
import { History, TrendingUp, TrendingDown, Minus, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { type Keyword, type HistoryEntry, RELEVANCE_LEVELS, KEYWORD_STATES } from '@/types/advertising';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface KeywordHistoryModalProps {
  keyword: Keyword;
  isOpen: boolean;
  onClose: () => void;
}

const getFieldLabel = (field: HistoryEntry['field']): string => {
  switch (field) {
    case 'searchVolume': return 'Volumen de búsqueda';
    case 'state': return 'Estado';
    case 'relevance': return 'Relevancia';
    case 'competitionLevel': return 'Competencia';
    case 'notes': return 'Notas';
    default: return field;
  }
};

const getValueLabel = (field: HistoryEntry['field'], value: string | number | undefined): string => {
  if (value === undefined || value === null || value === '') return '—';
  
  if (field === 'state') {
    const state = KEYWORD_STATES.find(s => s.value === value);
    return state ? `${state.icon} ${state.label}` : String(value);
  }
  
  if (field === 'relevance') {
    const rel = RELEVANCE_LEVELS.find(r => r.value === value);
    return rel ? `${rel.icon} ${rel.label}` : String(value);
  }
  
  if (field === 'competitionLevel') {
    switch (value) {
      case 'low': return 'Baja';
      case 'medium': return 'Media';
      case 'high': return 'Alta';
      default: return String(value);
    }
  }
  
  if (field === 'searchVolume') {
    return Number(value).toLocaleString();
  }
  
  return String(value);
};

const getChangeIcon = (field: HistoryEntry['field'], oldValue: any, newValue: any) => {
  if (field === 'searchVolume') {
    const oldNum = Number(oldValue) || 0;
    const newNum = Number(newValue) || 0;
    if (newNum > oldNum) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (newNum < oldNum) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  }
  return <ArrowRight className="w-4 h-4 text-muted-foreground" />;
};

export const KeywordHistoryModal = ({ keyword, isOpen, onClose }: KeywordHistoryModalProps) => {
  const history = keyword.history || [];
  
  // Prepare chart data for volume history
  const volumeHistory = history
    .filter(h => h.field === 'searchVolume')
    .map(h => ({
      date: format(new Date(h.timestamp), 'dd/MM', { locale: es }),
      fullDate: format(new Date(h.timestamp), 'dd MMM yyyy', { locale: es }),
      volume: Number(h.newValue) || 0,
    }));
  
  // Add current value
  if (volumeHistory.length > 0) {
    volumeHistory.push({
      date: 'Actual',
      fullDate: format(new Date(), 'dd MMM yyyy', { locale: es }),
      volume: keyword.searchVolume,
    });
  }

  // Check for significant changes (>30%)
  const hasAlert = volumeHistory.length >= 2 && (() => {
    const prev = volumeHistory[volumeHistory.length - 2].volume;
    const curr = volumeHistory[volumeHistory.length - 1].volume;
    if (prev === 0) return curr > 0;
    const change = Math.abs((curr - prev) / prev) * 100;
    return change >= 30;
  })();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial de "{keyword.keyword}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Alert Banner */}
          {hasAlert && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <TrendingUp className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                <strong>Cambio significativo detectado:</strong> El volumen ha variado más del 30% en la última actualización.
              </p>
            </div>
          )}

          {/* Volume Chart */}
          {volumeHistory.length > 1 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Evolución del volumen
              </h4>
              <div className="h-[180px] bg-muted/20 rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={volumeHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickFormatter={(value) => value.toLocaleString()}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ''}
                      formatter={(value: number) => [value.toLocaleString(), 'Volumen']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="volume" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <Separator />

          {/* History Timeline */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Historial de cambios
            </h4>
            
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No hay cambios registrados para esta keyword.</p>
                <p className="text-xs mt-1">Los cambios se registrarán automáticamente cuando actualices el volumen, estado o relevancia.</p>
              </div>
            ) : (
              <ScrollArea className="h-[250px]">
                <div className="space-y-3 pr-4">
                  {history
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-border transition-colors"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {getChangeIcon(entry.field, entry.oldValue, entry.newValue)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {getFieldLabel(entry.field)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.timestamp), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground line-through">
                              {getValueLabel(entry.field, entry.oldValue)}
                            </span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span className="font-medium text-foreground">
                              {getValueLabel(entry.field, entry.newValue)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Current State Summary */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <h5 className="font-medium text-sm mb-3">Estado actual</h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">Volumen</span>
                <span className="font-medium">{keyword.searchVolume.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Competencia</span>
                <span className="font-medium">{getValueLabel('competitionLevel', keyword.competitionLevel)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Relevancia</span>
                <span className="font-medium">{getValueLabel('relevance', keyword.relevance)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Estado</span>
                <span className="font-medium">{getValueLabel('state', keyword.state)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
