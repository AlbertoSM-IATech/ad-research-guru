import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Label,
} from 'recharts';
import type { Keyword, CampaignType } from '@/types/advertising';

interface OpportunityMapProps {
  keywords: Keyword[];
}

const CAMPAIGN_COLORS: Record<CampaignType, string> = {
  SP: 'hsl(217, 91%, 60%)',   // Blue
  SB: 'hsl(24, 94%, 59%)',    // Coral
  SBV: 'hsl(142, 76%, 36%)',  // Green
  SD: 'hsl(280, 65%, 60%)',   // Purple
};

export const OpportunityMap = ({ keywords }: OpportunityMapProps) => {
  const data = useMemo(() => {
    const competitionValues: Record<string, number> = { low: 25, medium: 50, high: 75 };
    return keywords.map(k => ({
      keyword: k.keyword,
      x: competitionValues[k.competitionLevel] || 50,
      y: k.searchVolume,
      competitionLevel: k.competitionLevel,
      campaignType: k.campaignTypes[0] || 'SP',
    }));
  }, [keywords]);

  const maxVolume = Math.max(...data.map(d => d.y), 1000);
  const avgCompetition = data.length > 0 ? data.reduce((sum, d) => sum + d.x, 0) / data.length : 50;
  const avgVolume = data.length > 0 ? data.reduce((sum, d) => sum + d.y, 0) / data.length : 500;

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Sin datos disponibles</p>
          <p className="text-xs mt-1">Añade keywords para visualizar el mapa de oportunidades</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
        <XAxis
          type="number"
          dataKey="x"
          name="Competencia"
          domain={[0, 100]}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        >
          <Label value="Competencia →" offset={-10} position="insideBottom" fill="hsl(var(--muted-foreground))" fontSize={11} />
        </XAxis>
        <YAxis
          type="number"
          dataKey="y"
          name="Volumen"
          domain={[0, maxVolume * 1.1]}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        >
          <Label value="Volumen ↑" angle={-90} position="insideLeft" fill="hsl(var(--muted-foreground))" fontSize={11} />
        </YAxis>
        <ReferenceLine x={avgCompetition} stroke="hsl(var(--primary))" strokeDasharray="5 5" opacity={0.6} />
        <ReferenceLine y={avgVolume} stroke="hsl(var(--primary))" strokeDasharray="5 5" opacity={0.6} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                  <p className="font-medium text-sm text-foreground">{data.keyword}</p>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p>Volumen: <span className="text-foreground font-medium">{data.y.toLocaleString()}</span></p>
                    <p>Competencia: <span className="text-foreground font-medium">{data.x}%</span></p>
                    <p>Campaña: <span className="text-foreground font-medium">{data.campaignType}</span></p>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Scatter name="Keywords" data={data} fill="hsl(var(--primary))">
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={CAMPAIGN_COLORS[entry.campaignType as CampaignType]}
              opacity={0.8}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
};
