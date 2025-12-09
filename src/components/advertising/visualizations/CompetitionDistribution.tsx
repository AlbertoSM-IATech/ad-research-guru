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
import type { Keyword, CompetitionLevel } from '@/types/advertising';

interface CompetitionDistributionProps {
  keywords: Keyword[];
}

const COMPETITION_COLORS: Record<CompetitionLevel, string> = {
  low: 'hsl(142, 76%, 36%)',    // Green
  medium: 'hsl(24, 94%, 59%)',  // Coral
  high: 'hsl(0, 84%, 60%)',     // Red
};

const COMPETITION_LABELS: Record<CompetitionLevel, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

export const CompetitionDistribution = ({ keywords }: CompetitionDistributionProps) => {
  const data = useMemo(() => {
    if (keywords.length === 0) return [];

    const levels: CompetitionLevel[] = ['low', 'medium', 'high'];

    return levels.map(level => ({
      name: COMPETITION_LABELS[level],
      count: keywords.filter(k => k.competitionLevel === level).length,
      color: COMPETITION_COLORS[level],
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
                  <p className="font-medium text-sm text-foreground">Competidores: {payload[0].payload.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Keywords: <span className="text-foreground font-medium">{payload[0].value}</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={80}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
