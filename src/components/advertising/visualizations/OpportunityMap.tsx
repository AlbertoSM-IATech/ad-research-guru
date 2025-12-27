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
import { TrendingUp, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
      marketScore: k.marketScore,
    }));
  }, [keywords]);

  // Keywords de alta oportunidad ordenadas por volumen
  const highOpportunityKeywords = useMemo(() => {
    return data
      .filter(d => d.x < compThresholds.low)
      .sort((a, b) => b.y - a.y)
      .slice(0, 15);
  }, [data, compThresholds.low]);

  const maxCompetitors = Math.max(...data.map(d => d.x), compThresholds.high * 1.2);
  const maxVolume = Math.max(...data.map(d => d.y), 1000);

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
    <div className="h-full flex gap-3">
      {/* Gráfico principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 50 }}>
              <ReferenceArea x1={0} x2={compThresholds.low} fill="hsl(142, 76%, 36%)" fillOpacity={0.1} />
              <ReferenceArea x1={compThresholds.low} x2={compThresholds.medium} fill="hsl(45, 93%, 47%)" fillOpacity={0.1} />
              <ReferenceArea x1={compThresholds.medium} x2={compThresholds.high} fill="hsl(24, 94%, 59%)" fillOpacity={0.1} />
              <ReferenceArea x1={compThresholds.high} x2={maxCompetitors} fill="hsl(0, 84%, 60%)" fillOpacity={0.1} />
              
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
        
        {/* Leyenda */}
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

      {/* Panel lateral: Mejores oportunidades */}
      <div className="w-56 flex-shrink-0 border-l border-border pl-3 flex flex-col">
        <div className="flex items-center gap-2 pb-2 border-b border-border mb-2">
          <Sparkles className="h-4 w-4 text-green-500" />
          <h4 className="text-sm font-medium text-foreground">Mejores Oportunidades</h4>
        </div>
        
        {highOpportunityKeywords.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs text-center p-2">
            No hay keywords con menos de {compThresholds.low.toLocaleString()} competidores
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-1.5 pr-2">
              {highOpportunityKeywords.map((kw, idx) => (
                <div
                  key={kw.keyword}
                  className="p-2 rounded-md bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-green-600 dark:text-green-400 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate" title={kw.keyword}>
                        {kw.keyword}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          {kw.y.toLocaleString()}
                        </div>
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                          {kw.x.toLocaleString()} comp.
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        <div className="pt-2 mt-2 border-t border-border text-center">
          <p className="text-[10px] text-muted-foreground">
            Top 15 por volumen con &lt;{compThresholds.low.toLocaleString()} competidores
          </p>
        </div>
      </div>
    </div>
  );
};
