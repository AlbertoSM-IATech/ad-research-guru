import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { AdsHistoryEntry } from '@/types/advertising';

interface AcosSparklineProps {
  history?: AdsHistoryEntry[];
  acosEquilibrio: number | null;
  className?: string;
}

export const AcosSparkline = ({ history, acosEquilibrio, className }: AcosSparklineProps) => {
  // Get last 7 entries with valid ACOS
  const data = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    const validEntries = history
      .filter(h => h.acosActual !== null && h.acosActual !== undefined)
      .slice(-7)
      .map((h, i) => ({
        index: i,
        acos: h.acosActual,
        date: new Date(h.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
      }));
    
    return validEntries;
  }, [history]);

  // Calculate trend
  const trend = useMemo(() => {
    if (data.length < 2) return 'neutral';
    const first = data[0].acos ?? 0;
    const last = data[data.length - 1].acos ?? 0;
    const diff = last - first;
    if (Math.abs(diff) < 2) return 'neutral';
    return diff > 0 ? 'up' : 'down';
  }, [data]);

  if (data.length < 2) {
    return (
      <span className="text-xs text-muted-foreground">—</span>
    );
  }

  const trendIcon = trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→';
  const trendColor = trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-green-500' : 'text-muted-foreground';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 cursor-help ${className}`}>
            <div className="w-12 h-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                  {acosEquilibrio !== null && (
                    <ReferenceLine 
                      y={acosEquilibrio} 
                      stroke="hsl(var(--primary))" 
                      strokeDasharray="2 2" 
                      strokeWidth={1}
                    />
                  )}
                  <Line 
                    type="monotone" 
                    dataKey="acos" 
                    stroke={trend === 'up' ? 'hsl(0 84% 60%)' : trend === 'down' ? 'hsl(142 76% 36%)' : 'hsl(var(--muted-foreground))'}
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <span className={`text-xs font-medium ${trendColor}`}>{trendIcon}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <p className="font-medium text-xs mb-1">Tendencia ACOS (últimos 7 días)</p>
          <div className="text-xs text-muted-foreground space-y-0.5">
            {data.map((d, i) => (
              <div key={i} className="flex justify-between gap-3">
                <span>{d.date}</span>
                <span className="tabular-nums">{d.acos?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
          {acosEquilibrio !== null && (
            <p className="text-xs mt-1 pt-1 border-t border-border">
              Línea punteada = PE ({acosEquilibrio.toFixed(1)}%)
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
