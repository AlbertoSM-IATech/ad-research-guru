import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  Crosshair,
  BarChart3,
  Target,
  TrendingUp,
  Globe,
  Cloud,
  PieChart,
  LineChart,
  Package,
  RotateCcw,
  Settings2,
  Eye,
  EyeOff,
  ChevronDown,
} from 'lucide-react';
import { InfoTooltip } from '../InfoTooltip';

import { ChartCard } from './ChartCard';
import { OpportunityMap } from './OpportunityMap';
import { VolumeDistribution } from './VolumeDistribution';
import { CompetitionDistribution } from './CompetitionDistribution';
import { TopKeywords } from './TopKeywords';
import { OpportunityRanking } from './OpportunityRanking';
import { MarketComparison } from './MarketComparison';
import { WordCloud } from './WordCloud';
import { CampaignTypeDistribution } from './CampaignTypeDistribution';
import { TemporalEvolution } from './TemporalEvolution';
import { ASINComparison } from './ASINComparison';
import { MarketScoreHistogram } from './MarketScoreHistogram';

import type { Keyword, TargetASIN, AdvertisingCategory } from '@/types/advertising';

interface ChartConfig {
  id: string;
  title: string;
  description: string;
  tooltip: string;
  icon: React.ReactNode;
  visible: boolean;
  size: 'normal' | 'compact' | 'expanded';
}

const DEFAULT_CHARTS: ChartConfig[] = [
  {
    id: 'opportunity-map',
    title: 'Mapa de Oportunidades',
    description: 'Volumen vs Competencia por keyword',
    tooltip: 'Cuadrante superior izquierdo = oportunidades (alto volumen, baja competencia). El color indica el tipo de campaña principal.',
    icon: <Crosshair className="w-5 h-5" />,
    visible: true,
    size: 'expanded',
  },
  {
    id: 'top-keywords',
    title: 'Top 10 Keywords',
    description: 'Palabras con mayor volumen',
    tooltip: 'Las 10 keywords con mayor volumen de búsqueda en este mercado. Estas son las más demandadas pero también las más competidas.',
    icon: <TrendingUp className="w-5 h-5" />,
    visible: true,
    size: 'normal',
  },
  {
    id: 'opportunity-ranking',
    title: 'Ranking de Oportunidad',
    description: 'Mejor relación volumen/competencia',
    tooltip: 'Puntuación = Volumen ÷ Competencia. Mayor puntuación indica keywords con alta demanda y baja competencia (oportunidades doradas).',
    icon: <TrendingUp className="w-5 h-5" />,
    visible: true,
    size: 'normal',
  },
  {
    id: 'market-score-histogram',
    title: 'Distribución Market Score',
    description: 'Histograma de scores 0-100',
    tooltip: 'Muestra cuántas keywords hay en cada rango de Market Score. Verde (≥70), Amarillo (40-69), Rojo (<40).',
    icon: <BarChart3 className="w-5 h-5" />,
    visible: true,
    size: 'normal',
  },
  {
    id: 'market-comparison',
    title: 'Comparador de Mercados',
    description: 'Análisis radar multi-mercado',
    tooltip: 'Compara métricas clave entre los mercados con datos: número de keywords, ASINs, categorías, volumen total y competencia media.',
    icon: <Globe className="w-5 h-5" />,
    visible: true,
    size: 'normal',
  },
];

const STORAGE_KEY = 'publify-visualizations-config';

interface VisualizationsTabProps {
  keywords: Keyword[];
  asins: TargetASIN[];
  categories: AdvertisingCategory[];
  keywordsByMarket: Record<string, Keyword[]>;
  asinsByMarket: Record<string, TargetASIN[]>;
  categoriesByMarket: Record<string, AdvertisingCategory[]>;
}

export const VisualizationsTab = ({
  keywords,
  asins,
  categories,
  keywordsByMarket,
  asinsByMarket,
  categoriesByMarket,
}: VisualizationsTabProps) => {
  const [charts, setCharts] = useState<ChartConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all charts exist
        return DEFAULT_CHARTS.map(defaultChart => {
          const savedChart = parsed.find((c: ChartConfig) => c.id === defaultChart.id);
          return savedChart ? { ...defaultChart, ...savedChart, icon: defaultChart.icon } : defaultChart;
        });
      } catch {
        return DEFAULT_CHARTS;
      }
    }
    return DEFAULT_CHARTS;
  });

  const [globalSize, setGlobalSize] = useState<'normal' | 'compact' | 'expanded'>('normal');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Save to localStorage
  useEffect(() => {
    const toSave = charts.map(({ icon, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [charts]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCharts(items => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const toggleVisibility = useCallback((id: string) => {
    setCharts(items =>
      items.map(item => (item.id === id ? { ...item, visible: !item.visible } : item))
    );
  }, []);

  const setChartSize = useCallback((id: string, size: 'normal' | 'compact' | 'expanded') => {
    setCharts(items =>
      items.map(item => (item.id === id ? { ...item, size } : item))
    );
  }, []);

  const showAll = useCallback(() => {
    setCharts(items => items.map(item => ({ ...item, visible: true })));
  }, []);

  const hideAll = useCallback(() => {
    setCharts(items => items.map(item => ({ ...item, visible: false })));
  }, []);

  const resetOrder = useCallback(() => {
    setCharts(DEFAULT_CHARTS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const applyGlobalSize = useCallback(() => {
    setCharts(items => items.map(item => ({ ...item, size: globalSize })));
  }, [globalSize]);

  const visibleCount = useMemo(() => charts.filter(c => c.visible).length, [charts]);

  const renderChart = useCallback((chartId: string) => {
    switch (chartId) {
      case 'opportunity-map':
        return <OpportunityMap keywords={keywords} />;
      case 'volume-distribution':
        return <VolumeDistribution keywords={keywords} />;
      case 'competition-distribution':
        return <CompetitionDistribution keywords={keywords} />;
      case 'top-keywords':
        return <TopKeywords keywords={keywords} />;
      case 'opportunity-ranking':
        return <OpportunityRanking keywords={keywords} />;
      case 'market-comparison':
        return (
          <MarketComparison
            keywordsByMarket={keywordsByMarket}
            asinsByMarket={asinsByMarket}
            categoriesByMarket={categoriesByMarket}
          />
        );
      case 'word-cloud':
        return <WordCloud keywords={keywords} />;
      case 'campaign-distribution':
        return <CampaignTypeDistribution keywords={keywords} />;
      case 'temporal-evolution':
        return <TemporalEvolution keywords={keywords} />;
      case 'asin-comparison':
        return <ASINComparison asins={asins} keywords={keywords} />;
      case 'market-score-histogram':
        return <MarketScoreHistogram keywords={keywords} />;
      default:
        return null;
    }
  }, [keywords, asins, keywordsByMarket, asinsByMarket, categoriesByMarket]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-1">
        <span className="text-xs text-muted-foreground">
          {visibleCount} de {charts.length} gráficas visibles
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
                <Eye className="w-3.5 h-3.5" />
                Visibilidad
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
              <DropdownMenuItem onClick={showAll}>
                <Eye className="w-4 h-4 mr-2" />
                Mostrar todas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={hideAll}>
                <EyeOff className="w-4 h-4 mr-2" />
                Ocultar todas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {charts.map(chart => (
                <DropdownMenuCheckboxItem
                  key={chart.id}
                  checked={chart.visible}
                  onCheckedChange={() => toggleVisibility(chart.id)}
                >
                  {chart.title}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground">Tamaño:</Label>
            <Select value={globalSize} onValueChange={(v) => setGlobalSize(v as any)}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="compact">Compacto</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="expanded">Expandido</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={applyGlobalSize} className="h-8 px-2 text-xs">
              Aplicar
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={resetOrder} className="gap-1.5 h-8 text-xs">
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer
          </Button>
        </div>
      </div>

      {/* Charts Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={charts.map(c => c.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {charts.map(chart => (
              <ChartCard
                key={chart.id}
                id={chart.id}
                title={chart.title}
                description={chart.description}
                tooltip={chart.tooltip}
                icon={chart.icon}
                isVisible={chart.visible}
                size={chart.size}
                onToggleVisibility={() => toggleVisibility(chart.id)}
                onSizeChange={(size) => setChartSize(chart.id, size)}
              >
                {renderChart(chart.id)}
              </ChartCard>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {visibleCount === 0 && (
        <Card className="bg-muted/20 border-dashed">
          <CardContent className="py-8 text-center">
            <EyeOff className="w-8 h-8 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No hay gráficas visibles</p>
            <Button variant="outline" size="sm" onClick={showAll} className="mt-4">
              Mostrar todas
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
