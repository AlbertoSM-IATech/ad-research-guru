import { useMemo, useState, useCallback } from 'react';
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
import { TrendingUp, Sparkles, Copy, Check, Maximize2, X, Filter } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
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

type OpportunityLevel = 'high' | 'medium' | 'low' | 'saturated';

const SEGMENT_CONFIG: Record<OpportunityLevel, { label: string; color: string; bgColor: string; borderColor: string }> = {
  high: { label: 'Alta oportunidad', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  medium: { label: 'Oportunidad media', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
  low: { label: 'Baja oportunidad', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  saturated: { label: 'Saturado', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
};

export const OpportunityMap = ({ keywords, marketplaceId }: OpportunityMapProps) => {
  const config = getMarketScoreConfig(marketplaceId);
  const { competitors: compThresholds } = config.thresholds;

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSegment, setActiveSegment] = useState<OpportunityLevel | 'all'>('all');
  const [visibleSegments, setVisibleSegments] = useState<Set<OpportunityLevel>>(
    new Set(['high', 'medium', 'low', 'saturated'])
  );
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);

  const getOpportunityLevel = useCallback((competitors: number): OpportunityLevel => {
    if (competitors < compThresholds.low) return 'high';
    if (competitors < compThresholds.medium) return 'medium';
    if (competitors < compThresholds.high) return 'low';
    return 'saturated';
  }, [compThresholds]);

  const data = useMemo(() => {
    return keywords.map(k => ({
      keyword: k.keyword,
      x: k.competitors || 0,
      y: k.searchVolume,
      competitionLevel: k.competitionLevel,
      campaignType: k.campaignTypes[0] || 'SP',
      marketScore: k.marketScore,
      segment: getOpportunityLevel(k.competitors || 0),
    }));
  }, [keywords, getOpportunityLevel]);

  // Filtrar datos según segmentos visibles
  const filteredData = useMemo(() => {
    return data.filter(d => visibleSegments.has(d.segment));
  }, [data, visibleSegments]);

  // Keywords agrupadas por segmento
  const keywordsBySegment = useMemo(() => {
    const grouped: Record<OpportunityLevel, typeof data> = {
      high: [],
      medium: [],
      low: [],
      saturated: [],
    };
    
    data.forEach(d => {
      grouped[d.segment].push(d);
    });
    
    // Ordenar cada grupo por volumen descendente
    Object.keys(grouped).forEach(key => {
      grouped[key as OpportunityLevel].sort((a, b) => b.y - a.y);
    });
    
    return grouped;
  }, [data]);

  const maxCompetitors = Math.max(...data.map(d => d.x), compThresholds.high * 1.2);
  const maxVolume = Math.max(...data.map(d => d.y), 1000);

  const handleCopyKeyword = useCallback((keyword: string) => {
    navigator.clipboard.writeText(keyword);
    setCopiedKeyword(keyword);
    toast.success('Keyword copiada');
    setTimeout(() => setCopiedKeyword(null), 2000);
  }, []);

  const handleCopyAllSegment = useCallback((segment: OpportunityLevel) => {
    const keywordsToCopy = keywordsBySegment[segment].map(k => k.keyword).join('\n');
    navigator.clipboard.writeText(keywordsToCopy);
    toast.success(`${keywordsBySegment[segment].length} keywords copiadas`);
  }, [keywordsBySegment]);

  const toggleSegmentVisibility = useCallback((segment: OpportunityLevel) => {
    setVisibleSegments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(segment)) {
        newSet.delete(segment);
      } else {
        newSet.add(segment);
      }
      return newSet;
    });
  }, []);

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

  const renderChart = (height: string = "100%") => (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 50 }}>
        {visibleSegments.has('high') && (
          <ReferenceArea x1={0} x2={compThresholds.low} fill="hsl(142, 76%, 36%)" fillOpacity={0.1} />
        )}
        {visibleSegments.has('medium') && (
          <ReferenceArea x1={compThresholds.low} x2={compThresholds.medium} fill="hsl(45, 93%, 47%)" fillOpacity={0.1} />
        )}
        {visibleSegments.has('low') && (
          <ReferenceArea x1={compThresholds.medium} x2={compThresholds.high} fill="hsl(24, 94%, 59%)" fillOpacity={0.1} />
        )}
        {visibleSegments.has('saturated') && (
          <ReferenceArea x1={compThresholds.high} x2={maxCompetitors} fill="hsl(0, 84%, 60%)" fillOpacity={0.1} />
        )}
        
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
              const segmentInfo = SEGMENT_CONFIG[d.segment as OpportunityLevel];
              
              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                  <p className="font-medium text-sm text-foreground">{d.keyword}</p>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p>Volumen: <span className="text-foreground font-medium">{d.y.toLocaleString()}</span></p>
                    <p>Competidores: <span className="text-foreground font-medium">{d.x.toLocaleString()}</span></p>
                    <p>Campaña: <span className="text-foreground font-medium">{d.campaignType}</span></p>
                    <p className={`font-medium ${segmentInfo.color}`}>{segmentInfo.label}</p>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Scatter name="Keywords" data={filteredData} fill="hsl(var(--primary))">
          {filteredData.map((entry, index) => (
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

  const renderSegmentList = (segment: OpportunityLevel) => {
    const segmentKeywords = keywordsBySegment[segment];
    const segmentInfo = SEGMENT_CONFIG[segment];
    
    if (segmentKeywords.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-xs text-center p-2">
          No hay keywords en este segmento
        </div>
      );
    }
    
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{segmentKeywords.length} keywords</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => handleCopyAllSegment(segment)}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copiar todas
          </Button>
        </div>
        <ScrollArea className="h-[200px]">
          <div className="space-y-1 pr-2">
            {segmentKeywords.map((kw, idx) => (
              <div
                key={kw.keyword}
                className={`p-2 rounded-md ${segmentInfo.bgColor} border ${segmentInfo.borderColor} hover:opacity-80 transition-opacity group`}
              >
                <div className="flex items-start gap-2">
                  <span className={`text-xs font-bold ${segmentInfo.color} mt-0.5 w-5 flex-shrink-0`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-medium text-foreground truncate flex-1" title={kw.keyword}>
                        {kw.keyword}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleCopyKeyword(kw.keyword)}
                      >
                        {copiedKeyword === kw.keyword ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
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
      </div>
    );
  };

  const renderLegendFilters = () => (
    <div className="flex flex-wrap gap-2 justify-center">
      {(Object.keys(SEGMENT_CONFIG) as OpportunityLevel[]).map(segment => {
        const info = SEGMENT_CONFIG[segment];
        const count = keywordsBySegment[segment].length;
        const isVisible = visibleSegments.has(segment);
        
        return (
          <button
            key={segment}
            onClick={() => toggleSegmentVisibility(segment)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all ${
              isVisible ? info.bgColor + ' ' + info.borderColor + ' border' : 'bg-muted/50 border border-transparent opacity-50'
            }`}
          >
            <Checkbox checked={isVisible} className="h-3 w-3" />
            <span className={isVisible ? info.color : 'text-muted-foreground'}>
              {info.label} ({count})
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="h-full flex gap-3">
        {/* Gráfico principal */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Filtrar segmentos:</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setIsExpanded(true)}
            >
              <Maximize2 className="h-3 w-3 mr-1" />
              Ampliar vista
            </Button>
          </div>
          
          {renderLegendFilters()}
          
          <div className="flex-1 mt-2">
            {renderChart()}
          </div>
        </div>

        {/* Panel lateral: Listados por segmento */}
        <div className="w-64 flex-shrink-0 border-l border-border pl-3 flex flex-col">
          <div className="flex items-center gap-2 pb-2 border-b border-border mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-medium text-foreground">Keywords por Segmento</h4>
          </div>
          
          <Tabs value={activeSegment} onValueChange={(v) => setActiveSegment(v as OpportunityLevel | 'all')} className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-4 h-7 mb-2">
              <TabsTrigger value="high" className="text-[10px] px-1 data-[state=active]:bg-green-500/20">
                Alta
              </TabsTrigger>
              <TabsTrigger value="medium" className="text-[10px] px-1 data-[state=active]:bg-yellow-500/20">
                Media
              </TabsTrigger>
              <TabsTrigger value="low" className="text-[10px] px-1 data-[state=active]:bg-orange-500/20">
                Baja
              </TabsTrigger>
              <TabsTrigger value="saturated" className="text-[10px] px-1 data-[state=active]:bg-red-500/20">
                Sat.
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value="high" className="h-full m-0">
                {renderSegmentList('high')}
              </TabsContent>
              <TabsContent value="medium" className="h-full m-0">
                {renderSegmentList('medium')}
              </TabsContent>
              <TabsContent value="low" className="h-full m-0">
                {renderSegmentList('low')}
              </TabsContent>
              <TabsContent value="saturated" className="h-full m-0">
                {renderSegmentList('saturated')}
              </TabsContent>
            </div>
          </Tabs>
          
          <div className="pt-2 mt-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground text-center">
              Umbrales: &lt;{compThresholds.low.toLocaleString()} | {compThresholds.medium.toLocaleString()} | {compThresholds.high.toLocaleString()}+
            </p>
          </div>
        </div>
      </div>

      {/* Modal de vista ampliada */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Mapa de Oportunidades - Vista Ampliada</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex gap-4 min-h-0">
            {/* Gráfico ampliado */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="mb-3">
                {renderLegendFilters()}
              </div>
              <div className="flex-1">
                {renderChart()}
              </div>
            </div>
            
            {/* Panel lateral ampliado */}
            <div className="w-80 flex-shrink-0 border-l border-border pl-4 flex flex-col">
              <div className="flex items-center gap-2 pb-2 border-b border-border mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-medium text-foreground">Keywords por Segmento</h4>
              </div>
              
              <Tabs value={activeSegment} onValueChange={(v) => setActiveSegment(v as OpportunityLevel | 'all')} className="flex-1 flex flex-col">
                <TabsList className="grid grid-cols-4 h-8 mb-3">
                  <TabsTrigger value="high" className="text-xs data-[state=active]:bg-green-500/20">
                    Alta ({keywordsBySegment.high.length})
                  </TabsTrigger>
                  <TabsTrigger value="medium" className="text-xs data-[state=active]:bg-yellow-500/20">
                    Media ({keywordsBySegment.medium.length})
                  </TabsTrigger>
                  <TabsTrigger value="low" className="text-xs data-[state=active]:bg-orange-500/20">
                    Baja ({keywordsBySegment.low.length})
                  </TabsTrigger>
                  <TabsTrigger value="saturated" className="text-xs data-[state=active]:bg-red-500/20">
                    Sat. ({keywordsBySegment.saturated.length})
                  </TabsTrigger>
                </TabsList>
                
                <div className="flex-1 overflow-hidden">
                  <TabsContent value="high" className="h-full m-0">
                    <ScrollArea className="h-full">
                      {renderSegmentList('high')}
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="medium" className="h-full m-0">
                    <ScrollArea className="h-full">
                      {renderSegmentList('medium')}
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="low" className="h-full m-0">
                    <ScrollArea className="h-full">
                      {renderSegmentList('low')}
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="saturated" className="h-full m-0">
                    <ScrollArea className="h-full">
                      {renderSegmentList('saturated')}
                    </ScrollArea>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
