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

interface OpportunityRankingProps {
  keywords: Keyword[];
}

// Convert competition level to numeric value for calculations
const getCompetitionValue = (level: CompetitionLevel): number => {
  const values: Record<CompetitionLevel, number> = {
    low: 25,
    medium: 50,
    high: 75,
  };
  return values[level] || 50;
};

const getCompetitionLabel = (level: CompetitionLevel): string => {
  const labels: Record<CompetitionLevel, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
  };
  return labels[level] || level;
};

export const OpportunityRanking = ({ keywords }: OpportunityRankingProps) => {
  const data = useMemo(() => {
    return [...keywords]
      .map(k => {
        const competitionValue = getCompetitionValue(k.competitionLevel);
        return {
          name: k.keyword.length > 18 ? k.keyword.slice(0, 15) + '...' : k.keyword,
          fullName: k.keyword,
          score: competitionValue > 0 ? Math.round((k.searchVolume / competitionValue) * 10) / 10 : k.searchVolume,
          volume: k.searchVolume,
          competitionLevel: k.competitionLevel,
          competitionLabel: getCompetitionLabel(k.competitionLevel),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [keywords]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Sin datos disponibles</p>
          <p className="text-xs mt-1">Añade keywords para ver las oportunidades</p>
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
                    <p>Puntuación: <span className="text-foreground font-medium">{data.score}</span></p>
                    <p className="text-xs opacity-70">(Volumen ÷ Competidores)</p>
                    <p>Volumen: <span className="text-foreground font-medium">{data.volume.toLocaleString()}</span></p>
                    <p>Competidores: <span className="text-foreground font-medium">{data.competitionLabel}</span></p>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={25}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={`hsl(142, 76%, ${36 + index * 2}%)`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
