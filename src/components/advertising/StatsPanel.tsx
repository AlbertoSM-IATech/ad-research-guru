import { TrendingUp, Target, FolderOpen, Search, BarChart3 } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';
import type { Keyword, TargetASIN, AdvertisingCategory } from '@/types/advertising';
interface StatsPanelProps {
  keywords: Keyword[];
  asins: TargetASIN[];
  categories: AdvertisingCategory[];
}
export const StatsPanel = ({
  keywords,
  asins,
  categories
}: StatsPanelProps) => {
  const totalKeywords = keywords.length;
  const highVolumeKeywords = keywords.filter(k => k.searchVolume > 1000).length;
  const lowCompetitionKeywords = keywords.filter(k => k.competitionLevel === 'low').length;
  const totalASINs = asins.length;
  const totalCategories = categories.length;
  const topVolumeKeyword = keywords.length > 0 ? keywords.reduce((prev, current) => prev.searchVolume > current.searchVolume ? prev : current) : null;
  const stats = [{
    icon: Search,
    label: 'Total Keywords',
    value: totalKeywords,
    tooltip: 'Número total de palabras clave registradas para este mercado'
  }, {
    icon: TrendingUp,
    label: 'Alto Volumen',
    value: highVolumeKeywords,
    tooltip: 'Keywords con más de 1,000 búsquedas mensuales'
  }, {
    icon: BarChart3,
    label: 'Baja Competencia',
    value: lowCompetitionKeywords,
    tooltip: 'Keywords con competencia baja - oportunidades económicas'
  }, {
    icon: Target,
    label: 'ASIN Objetivo',
    value: totalASINs,
    tooltip: 'Productos de la competencia o propios para orientar anuncios'
  }, {
    icon: FolderOpen,
    label: 'Categorías',
    value: totalCategories,
    tooltip: 'Categorías publicitarias configuradas'
  }];
  return <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="font-heading font-semibold text-lg">Panel de Análisis Rápido</h3>
        <InfoTooltip content="Resumen de métricas clave de tu investigación publicitaria en este mercado" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map(stat => <div key={stat.label} className="stat-card">
            <div className="flex items-start justify-between mb-2">
              <stat.icon className="w-5 h-5 text-primary" />
              <InfoTooltip content={stat.tooltip} side="left" />
            </div>
            <p className="text-2xl font-heading font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>)}
      </div>

      {topVolumeKeyword && (
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Keyword con mayor volumen:</p>
          <p className="font-medium text-foreground">{topVolumeKeyword.keyword}</p>
          <p className="text-sm text-muted-foreground">
            {topVolumeKeyword.searchVolume.toLocaleString()} búsquedas/mes
          </p>
        </div>
      )}
    </div>;
};