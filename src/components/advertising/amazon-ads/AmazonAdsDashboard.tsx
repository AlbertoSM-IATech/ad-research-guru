import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings2, Trash2, TrendingUp, TrendingDown, DollarSign, MousePointerClick, Eye, ShoppingCart } from 'lucide-react';
import { aggregateMetrics, formatMetric } from '@/lib/amazon-ads/metrics-calculator';
import { generateRecommendations } from '@/lib/amazon-ads/recommendations';
import { CampaignTable } from './CampaignTable';
import { RecommendationsPanel } from './RecommendationsPanel';
import { ThresholdConfig } from './ThresholdConfig';
import type { AmazonAdsStore, ThresholdConfig as ThresholdConfigType, AdsDailyMetrics } from '@/types/amazon-ads';
import { DEFAULT_THRESHOLDS } from '@/types/amazon-ads';

interface AmazonAdsDashboardProps {
  store: AmazonAdsStore;
  entityNames: Map<string, string>;
  getThresholds: (marketplace: string) => ThresholdConfigType;
  setThresholds: (marketplace: string, config: ThresholdConfigType) => void;
  onClear: () => void;
}

export const AmazonAdsDashboard = ({
  store,
  entityNames,
  getThresholds,
  setThresholds,
  onClear,
}: AmazonAdsDashboardProps) => {
  const [showThresholds, setShowThresholds] = useState(false);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'recommendations'>('campaigns');

  const marketplace = store.batches[0]?.marketplace ?? 'ES';
  const currency = store.batches[0]?.currency ?? 'EUR';
  const thresholds = getThresholds(marketplace);

  // Global aggregation
  const global = useMemo(() => aggregateMetrics(store.dailyMetrics), [store.dailyMetrics]);

  // Recommendations
  const recommendations = useMemo(() =>
    generateRecommendations(store.dailyMetrics, thresholds, entityNames),
    [store.dailyMetrics, thresholds, entityNames]
  );

  // Campaign-level metrics
  const campaignMetrics = useMemo(() => {
    const groups = new Map<string, AdsDailyMetrics[]>();
    for (const m of store.dailyMetrics) {
      if (m.entityType === 'campaign') {
        if (!groups.has(m.entityKey)) groups.set(m.entityKey, []);
        groups.get(m.entityKey)!.push(m);
      }
    }
    return Array.from(groups.entries()).map(([key, records]) => ({
      key,
      name: entityNames.get(key) ?? key,
      ...aggregateMetrics(records),
    }));
  }, [store.dailyMetrics, entityNames]);

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Datos Amazon Ads</h3>
          <p className="text-xs text-muted-foreground">
            {store.batches.length} importación(es) · {store.dailyMetrics.length} registros
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowThresholds(true)}>
            <Settings2 className="h-3 w-3" />
            Umbrales
          </Button>
          <Button variant="outline" size="sm" className="gap-1 h-7 text-xs text-destructive hover:text-destructive" onClick={onClear}>
            <Trash2 className="h-3 w-3" />
            Borrar datos
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <DollarSign className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{currencySymbol}{global.spend.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Gasto total</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <ShoppingCart className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{currencySymbol}{global.sales.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Ventas</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <TrendingDown className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{formatMetric(global.acos, 'percent')}</p>
            <p className="text-xs text-muted-foreground">ACOS</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <MousePointerClick className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{formatMetric(global.ctr, 'percent')}</p>
            <p className="text-xs text-muted-foreground">CTR</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <DollarSign className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{global.cpc !== null ? `${currencySymbol}${global.cpc.toFixed(2)}` : 'N/A'}</p>
            <p className="text-xs text-muted-foreground">CPC medio</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <Eye className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{campaignMetrics.length}</p>
            <p className="text-xs text-muted-foreground">Campañas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-1">
        <button
          className={`text-sm px-3 py-1.5 rounded-t transition-colors ${activeTab === 'campaigns' ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('campaigns')}
        >
          Campañas ({campaignMetrics.length})
        </button>
        <button
          className={`text-sm px-3 py-1.5 rounded-t transition-colors flex items-center gap-1 ${activeTab === 'recommendations' ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('recommendations')}
        >
          Qué haría ahora
          {recommendations.length > 0 && (
            <Badge variant="destructive" className="text-xs h-5 px-1.5">{recommendations.length}</Badge>
          )}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'campaigns' && (
        <CampaignTable
          campaigns={campaignMetrics}
          thresholds={thresholds}
          currencySymbol={currencySymbol}
        />
      )}
      {activeTab === 'recommendations' && (
        <RecommendationsPanel recommendations={recommendations} />
      )}

      {/* Threshold config modal */}
      <ThresholdConfig
        isOpen={showThresholds}
        onClose={() => setShowThresholds(false)}
        thresholds={thresholds}
        marketplace={marketplace}
        onSave={(config) => {
          setThresholds(marketplace, config);
          setShowThresholds(false);
        }}
      />
    </div>
  );
};
