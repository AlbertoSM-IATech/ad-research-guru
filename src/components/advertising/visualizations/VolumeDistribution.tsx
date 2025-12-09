import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Keyword } from '@/types/advertising';

interface VolumeDistributionProps {
  keywords: Keyword[];
}

export const VolumeDistribution = ({ keywords }: VolumeDistributionProps) => {
  const data = useMemo(() => {
    if (keywords.length === 0) return [];

    const ranges = [
      { min: 0, max: 100, label: '0-100' },
      { min: 101, max: 500, label: '101-500' },
      { min: 501, max: 1000, label: '501-1K' },
      { min: 1001, max: 5000, label: '1K-5K' },
      { min: 5001, max: 10000, label: '5K-10K' },
      { min: 10001, max: Infinity, label: '10K+' },
    ];

    return ranges.map(range => ({
      name: range.label,
      count: keywords.filter(k => k.searchVolume >= range.min && k.searchVolume <= range.max).length,
    }));
  }, [keywords]);

  if (data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Sin datos disponibles</p>
          <p className="text-xs mt-1">Añade keywords para visualizar la distribución</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
        <XAxis
          dataKey="name"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                  <p className="font-medium text-sm text-foreground">Rango: {payload[0].payload.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Keywords: <span className="text-foreground font-medium">{payload[0].value}</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar
          dataKey="count"
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
          maxBarSize={50}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
