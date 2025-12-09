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
import type { Keyword } from '@/types/advertising';

interface TopKeywordsProps {
  keywords: Keyword[];
}

export const TopKeywords = ({ keywords }: TopKeywordsProps) => {
  const data = useMemo(() => {
    return [...keywords]
      .sort((a, b) => b.searchVolume - a.searchVolume)
      .slice(0, 10)
      .map(k => ({
        name: k.keyword.length > 20 ? k.keyword.slice(0, 17) + '...' : k.keyword,
        fullName: k.keyword,
        volume: k.searchVolume,
        competitionLevel: k.competitionLevel,
      }));
  }, [keywords]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Sin datos disponibles</p>
          <p className="text-xs mt-1">Añade keywords para ver el ranking</p>
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
                    <p>Volumen: <span className="text-foreground font-medium">{data.volume.toLocaleString()}</span></p>
                    <p>Competidores: <span className="text-foreground font-medium">{data.competitionLevel === 'low' ? 'Baja' : data.competitionLevel === 'medium' ? 'Media' : 'Alta'}</span></p>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="volume" radius={[0, 4, 4, 0]} maxBarSize={25}>
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={`hsl(217, 91%, ${60 - index * 3}%)`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
