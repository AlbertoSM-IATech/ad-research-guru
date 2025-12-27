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
  ReferenceArea,
  Label,
} from 'recharts';
import type { Keyword, CampaignType } from '@/types/advertising';
import { getMarketScoreConfig } from '@/lib/market-score-config';

interface OpportunityMapProps {
  keywords: Keyword[];
  marketplaceId?: string;
}

const CAMPAIGN_COLORS: Record<CampaignType, string> = {
  SP: 'hsl(217, 91%, 60%)',
  SB: 'hsl(24, 94%, 59%)',
  SBV: 'hsl(142, 76%, 36%)',
  SD: 'hsl(280, 65%, 60%)',
};

export const OpportunityMap = ({ keywords, marketplaceId }: OpportunityMapProps) => {
  const config = getMarketScoreConfig(marketplaceId);
  const { competitors: compThresholds } = config.thresholds;

  const data = useMemo(() => {
    return keywords.map(k => ({
      keyword: k.keyword,
      x: k.competitors || 0,
      y: k.searchVolume,
      competitionLevel: k.competitionLevel,
      campaignType: k.campaignTypes[0] || 'SP',
    }));
  }, [keywords]);

  const maxCompetitors = Math.max(...data.map(d => d.x), compThresholds.high * 1.2);
  const maxVolume = Math.max(...data.map(d => d.y), 1000);

  // Determinar zona de oportunidad basada en scoring
  const getOpportunityLevel = (competitors: number): 'high' | 'medium' | 'low' | 'none' => {
    if (competitors < compThresholds.low) return 'high';
    if (competitors < compThresholds.medium) return 'medium';
    if (competitors < compThresholds.high) return 'low';
    return 'none';
  };

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
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 60 }}>
            {/* Zonas de oportunidad como fondo */}
            <ReferenceArea
              x1={0}
              x2={compThresholds.low}
              fill="hsl(142, 76%, 36%)"
              fillOpacity={0.1}
            />
            <ReferenceArea
              x1={compThresholds.low}
              x2={compThresholds.medium}
              fill="hsl(45, 93%, 47%)"
              fillOpacity={0.1}
            />
            <ReferenceArea
              x1={compThresholds.medium}
              x2={compThresholds.high}
              fill="hsl(24, 94%, 59%)"
              fillOpacity={0.1}
            />
            <ReferenceArea
              x1={compThresholds.high}
              x2={maxCompetitors}
              fill="hsl(0, 84%, 60%)"
              fillOpacity={0.1}
            />
            
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              type="number"
              dataKey="x"
              name="Competidores"
              domain={[0, maxCompetitors]}
              tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toString()}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            >
              <Label value="Nº Competidores →" offset={-10} position="insideBottom" fill="hsl(var(--muted-foreground))" fontSize={11} />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              name="Volumen"
              domain={[0, maxVolume * 1.1]}
              tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toString()}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            >
              <Label value="Volumen ↑" angle={-90} position="insideLeft" fill="hsl(var(--muted-foreground))" fontSize={11} />
            </YAxis>
            
            {/* Líneas de referencia para umbrales */}
            <ReferenceLine x={compThresholds.low} stroke="hsl(142, 76%, 36%)" strokeDasharray="5 5" opacity={0.6} />
            <ReferenceLine x={compThresholds.medium} stroke="hsl(45, 93%, 47%)" strokeDasharray="5 5" opacity={0.6} />
            <ReferenceLine x={compThresholds.high} stroke="hsl(0, 84%, 60%)" strokeDasharray="5 5" opacity={0.6} />
            
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  const opportunity = getOpportunityLevel(d.x);
                  const opportunityLabels = {
                    high: { text: 'Alta oportunidad', color: 'text-green-600 dark:text-green-400' },
                    medium: { text: 'Oportunidad media', color: 'text-yellow-600 dark:text-yellow-400' },
                    low: { text: 'Baja oportunidad', color: 'text-orange-600 dark:text-orange-400' },
                    none: { text: 'Saturado', color: 'text-red-600 dark:text-red-400' },
                  };
                  const oppInfo = opportunityLabels[opportunity];
                  
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-medium text-sm text-foreground">{d.keyword}</p>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <p>Volumen: <span className="text-foreground font-medium">{d.y.toLocaleString()}</span></p>
                        <p>Competidores: <span className="text-foreground font-medium">{d.x.toLocaleString()}</span></p>
                        <p>Campaña: <span className="text-foreground font-medium">{d.campaignType}</span></p>
                        <p className={`font-medium ${oppInfo.color}`}>{oppInfo.text}</p>
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
      </div>
      
      {/* Leyenda de zonas de oportunidad */}
      <div className="flex flex-wrap gap-3 justify-center pt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500/30 border border-green-500" />
          <span className="text-muted-foreground">&lt;{compThresholds.low.toLocaleString()} Alta</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-yellow-500/30 border border-yellow-500" />
          <span className="text-muted-foreground">{compThresholds.low.toLocaleString()}-{compThresholds.medium.toLocaleString()} Media</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-500/30 border border-orange-500" />
          <span className="text-muted-foreground">{compThresholds.medium.toLocaleString()}-{compThresholds.high.toLocaleString()} Baja</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500/30 border border-red-500" />
          <span className="text-muted-foreground">&gt;{compThresholds.high.toLocaleString()} Saturado</span>
        </div>
      </div>
    </div>
  );
};
