import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { Keyword } from '@/types/advertising';

interface TemporalEvolutionProps {
  keywords: Keyword[];
}

export const TemporalEvolution = ({ keywords }: TemporalEvolutionProps) => {
  // Generate simulated historical data for demonstration
  const data = useMemo(() => {
    if (keywords.length === 0) return [];

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const currentTotalVolume = keywords.reduce((sum, k) => sum + k.searchVolume, 0);

    // Simulate growth pattern
    return months.map((month, index) => {
      const factor = 0.7 + (index * 0.06); // Growing trend
      const randomVariation = 0.9 + Math.random() * 0.2;
      return {
        month,
        volume: Math.round(currentTotalVolume * factor * randomVariation),
        keywords: Math.round(keywords.length * (0.5 + index * 0.1)),
      };
    });
  }, [keywords]);

  if (keywords.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Datos históricos no disponibles</p>
          <p className="text-xs mt-1">La evolución temporal requiere datos históricos</p>
          <p className="text-xs mt-2 text-primary">Estructura lista para integración futura</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-2 px-2">
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
          📊 Datos simulados para demostración
        </span>
      </div>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="month"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-medium text-sm text-foreground">{label}</p>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <p>Volumen total: <span className="text-foreground font-medium">{payload[0]?.value?.toLocaleString()}</span></p>
                        <p>Keywords: <span className="text-foreground font-medium">{payload[1]?.value}</span></p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="volume"
              name="Volumen"
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={2}
              dot={{ fill: 'hsl(217, 91%, 60%)', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="keywords"
              name="Keywords"
              stroke="hsl(24, 94%, 59%)"
              strokeWidth={2}
              dot={{ fill: 'hsl(24, 94%, 59%)', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
