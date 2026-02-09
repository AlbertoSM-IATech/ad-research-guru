import { AlertTriangle, TrendingUp, Ban, Search, MousePointerClick, Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Recommendation, RecommendationType } from '@/types/amazon-ads';

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
}

const TYPE_CONFIG: Record<RecommendationType, { icon: React.ElementType; color: string; label: string }> = {
  'click-leak': { icon: MousePointerClick, color: 'text-red-500', label: 'Fuga de clics' },
  'spend-no-return': { icon: AlertTriangle, color: 'text-red-500', label: 'Gasto sin retorno' },
  'scale-candidate': { icon: TrendingUp, color: 'text-green-600', label: 'Candidato a escalar' },
  'negative-search-term': { icon: Ban, color: 'text-yellow-600', label: 'Search term negativo' },
  'winner-search-term': { icon: Search, color: 'text-green-600', label: 'Search term ganador' },
  'low-ctr': { icon: MousePointerClick, color: 'text-yellow-600', label: 'CTR bajo' },
};

const SEVERITY_BADGE: Record<string, 'destructive' | 'secondary' | 'default'> = {
  high: 'destructive',
  medium: 'secondary',
  low: 'default',
};

export const RecommendationsPanel = ({ recommendations }: RecommendationsPanelProps) => {
  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No hay recomendaciones por ahora.</p>
        <p className="text-xs text-muted-foreground mt-1">Importa más datos o ajusta los umbrales para obtener sugerencias.</p>
      </div>
    );
  }

  // Group by type
  const grouped = new Map<RecommendationType, Recommendation[]>();
  for (const r of recommendations) {
    if (!grouped.has(r.type)) grouped.set(r.type, []);
    grouped.get(r.type)!.push(r);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Estas sugerencias se basan en reglas objetivas con los datos importados. Ajusta los umbrales según tu estrategia.
      </p>

      {Array.from(grouped.entries()).map(([type, recs]) => {
        const config = TYPE_CONFIG[type];
        const Icon = config.icon;
        return (
          <div key={type} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${config.color}`} />
              <span className="text-sm font-medium">{config.label}</span>
              <Badge variant="secondary" className="text-xs">{recs.length}</Badge>
            </div>
            <div className="space-y-1.5 ml-6">
              {recs.slice(0, 5).map(r => (
                <Card key={r.id} className="p-0">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{r.entityName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {r.actions.map((a, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{a}</Badge>
                          ))}
                        </div>
                      </div>
                      <Badge variant={SEVERITY_BADGE[r.severity]} className="text-xs shrink-0">
                        {r.severity === 'high' ? 'Alta' : r.severity === 'medium' ? 'Media' : 'Baja'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {recs.length > 5 && (
                <p className="text-xs text-muted-foreground">...y {recs.length - 5} más</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
