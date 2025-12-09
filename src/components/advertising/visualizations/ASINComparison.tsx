import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { Keyword, TargetASIN } from '@/types/advertising';

interface ASINComparisonProps {
  asins: TargetASIN[];
  keywords: Keyword[];
}

export const ASINComparison = ({ asins, keywords }: ASINComparisonProps) => {
  const data = useMemo(() => {
    // For each ASIN, count related keywords (simplified - just showing ASIN data)
    return asins.slice(0, 10).map((asin, index) => ({
      name: asin.asin.length > 12 ? asin.asin.slice(0, 10) + '...' : asin.asin,
      fullName: asin.asin,
      campaigns: asin.campaignTypes.length,
      hasNotes: asin.notes ? 1 : 0,
      // Simulated metrics
      relatedKeywords: Math.floor(Math.random() * 20) + 1,
    }));
  }, [asins, keywords]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Sin ASIN objetivo</p>
          <p className="text-xs mt-1">Añade ASIN para visualizar comparativas</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
          width={75}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                  <p className="font-medium text-sm text-foreground">{data.fullName}</p>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p>Campañas: <span className="text-foreground font-medium">{data.campaigns}</span></p>
                    <p>Keywords relacionadas: <span className="text-foreground font-medium">{data.relatedKeywords}</span></p>
                    <p>Tiene notas: <span className="text-foreground font-medium">{data.hasNotes ? 'Sí' : 'No'}</span></p>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="campaigns" name="Tipos de campaña" radius={[0, 4, 4, 0]} maxBarSize={25}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={`hsl(280, 65%, ${55 + index * 3}%)`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
