// ============================================================
// KeywordAdsLinkPanel — Amazon Ads metrics & link management
// ============================================================

import { useState, useMemo } from 'react';
import { Cloud, CloudOff, Link2, Unlink, Search, Check, AlertTriangle, TrendingUp, DollarSign, MousePointerClick, Eye, ShoppingCart, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ImportedAdsMetrics, MatchSuggestion } from '@/types/amazon-ads';
import { formatMetric } from '@/lib/amazon-ads/metrics-calculator';

interface KeywordAdsLinkPanelProps {
  keywordId: string;
  keywordText: string;
  linkedTargetKeys: string[];
  importedMetrics: ImportedAdsMetrics | null;
  matchSuggestions: MatchSuggestion[];
  availableTargets: Array<{
    key: string;
    text: string;
    campaignName: string;
    campaignKey: string;
  }>;
  onLink: (targetKeys: string[]) => void;
  onUnlink: () => void;
  isExpanded?: boolean;
}

export const KeywordAdsLinkPanel = ({
  keywordId,
  keywordText,
  linkedTargetKeys,
  importedMetrics,
  matchSuggestions,
  availableTargets,
  onLink,
  onUnlink,
  isExpanded = true,
}: KeywordAdsLinkPanelProps) => {
  const [searchTarget, setSearchTarget] = useState('');
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  const isLinked = linkedTargetKeys.length > 0;

  // Filter suggestions for this keyword
  const kwSuggestions = useMemo(
    () => matchSuggestions.filter(s => s.keywordId === keywordId),
    [matchSuggestions, keywordId],
  );

  // Filter available targets by search
  const filteredTargets = useMemo(() => {
    if (!searchTarget.trim()) return availableTargets.slice(0, 20);
    const q = searchTarget.toLowerCase();
    return availableTargets
      .filter(t => t.text.toLowerCase().includes(q) || t.campaignName.toLowerCase().includes(q))
      .slice(0, 20);
  }, [availableTargets, searchTarget]);

  // Linked target names
  const linkedTargetNames = useMemo(() => {
    const keySet = new Set(linkedTargetKeys);
    return availableTargets.filter(t => keySet.has(t.key));
  }, [linkedTargetKeys, availableTargets]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Amazon Ads (Importados)
          </h3>
        </div>
        {isLinked && (
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
            <Link2 className="w-3 h-3 mr-1" />
            Enlazada
          </Badge>
        )}
      </div>

      {/* ---- Linked state: show metrics ---- */}
      {isLinked && importedMetrics ? (
        <div className="space-y-3">
          {/* Metrics grid */}
          <div className={cn('grid gap-3', isExpanded ? 'grid-cols-3' : 'grid-cols-2')}>
            <MetricCard icon={Eye} label="Impresiones" value={formatMetric(importedMetrics.impressions, 'number')} />
            <MetricCard icon={MousePointerClick} label="Clicks" value={formatMetric(importedMetrics.clicks, 'number')} />
            <MetricCard icon={DollarSign} label="Gasto" value={`$${formatMetric(importedMetrics.spend, 'currency')}`} />
            <MetricCard icon={ShoppingCart} label="Ventas" value={`$${formatMetric(importedMetrics.sales, 'currency')}`} />
            <MetricCard icon={Package} label="Pedidos" value={formatMetric(importedMetrics.orders, 'number')} />
            <MetricCard icon={TrendingUp} label="ACOS" value={formatMetric(importedMetrics.acos, 'percent')} highlight={importedMetrics.acos !== null && importedMetrics.acos > 0.5} />
          </div>

          {/* Secondary metrics */}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>CTR: {formatMetric(importedMetrics.ctr, 'percent')}</span>
            <span>·</span>
            <span>CPC: ${formatMetric(importedMetrics.cpc, 'currency')}</span>
            <span>·</span>
            <span>CVR: {formatMetric(importedMetrics.cvr, 'percent')}</span>
            <span>·</span>
            <span>ROAS: {importedMetrics.roas !== null ? importedMetrics.roas.toFixed(2) : 'N/A'}</span>
          </div>

          {/* Date range */}
          <div className="text-xs text-muted-foreground">
            Periodo: {importedMetrics.dateRange.from} → {importedMetrics.dateRange.to}
          </div>

          {/* Linked targets */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Targets enlazados:</Label>
            <div className="flex flex-wrap gap-1">
              {linkedTargetNames.map(t => (
                <Badge key={t.key} variant="secondary" className="text-xs">
                  {t.text}
                  <span className="text-muted-foreground ml-1">({t.campaignName})</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Unlink */}
          <Button variant="outline" size="sm" onClick={onUnlink} className="gap-2 text-xs">
            <Unlink className="w-3 h-3" />
            Desvincular
          </Button>
        </div>
      ) : isLinked && !importedMetrics ? (
        /* Linked but no metrics found */
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-300">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs">Enlazada pero sin métricas. Los targets pueden no tener datos diarios importados.</span>
        </div>
      ) : (
        /* ---- Not linked: show suggestions or manual picker ---- */
        <div className="space-y-3">
          {kwSuggestions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Se encontraron coincidencias automáticas:
              </p>
              {kwSuggestions.map(s => (
                <div
                  key={s.targetKey}
                  className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{s.targetText}</span>
                    <span className="text-xs text-muted-foreground">{s.campaignName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        s.confidence === 'exact'
                          ? 'bg-green-500/10 text-green-600 border-green-500/30'
                          : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
                      )}
                    >
                      {s.confidence === 'exact' ? 'Exacto' : 'Parcial'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onLink([s.targetKey])}
                      className="h-7 w-7 p-0"
                    >
                      <Check className="w-4 h-4 text-green-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border">
              <CloudOff className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                No se encontraron coincidencias automáticas.
              </span>
            </div>
          )}

          {/* Manual target picker */}
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTargetPicker(!showTargetPicker)}
              className="gap-2 text-xs w-full"
            >
              <Search className="w-3 h-3" />
              {showTargetPicker ? 'Cerrar buscador' : 'Enlazar manualmente'}
            </Button>

            {showTargetPicker && (
              <div className="space-y-2 p-3 rounded-lg border bg-muted/20">
                <Input
                  placeholder="Buscar target o campaña..."
                  value={searchTarget}
                  onChange={e => setSearchTarget(e.target.value)}
                  className="h-8 text-xs"
                />
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {filteredTargets.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      {availableTargets.length === 0
                        ? 'No hay datos importados aún.'
                        : 'Sin resultados.'}
                    </p>
                  ) : (
                    filteredTargets.map(t => (
                      <div
                        key={t.key}
                        className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          onLink([t.key]);
                          setShowTargetPicker(false);
                          setSearchTarget('');
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium truncate block">{t.text}</span>
                          <span className="text-xs text-muted-foreground">{t.campaignName}</span>
                        </div>
                        <Link2 className="w-3 h-3 text-muted-foreground" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ---- Small metric card ----
function MetricCard({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      'p-2 rounded-lg border text-center',
      highlight ? 'bg-red-500/10 border-red-500/20' : 'bg-muted/30',
    )}>
      <Icon className={cn('w-3.5 h-3.5 mx-auto mb-1', highlight ? 'text-red-500' : 'text-muted-foreground')} />
      <div className={cn('text-sm font-semibold', highlight && 'text-red-600')}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
