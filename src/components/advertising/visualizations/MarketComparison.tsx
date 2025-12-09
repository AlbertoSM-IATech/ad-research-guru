import { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { Keyword, TargetASIN, AdvertisingCategory } from '@/types/advertising';
import { MARKETPLACES } from '@/types/advertising';

interface MarketComparisonProps {
  keywordsByMarket: Record<string, Keyword[]>;
  asinsByMarket: Record<string, TargetASIN[]>;
  categoriesByMarket: Record<string, AdvertisingCategory[]>;
}

const MARKET_COLORS = ['hsl(217, 91%, 60%)', 'hsl(24, 94%, 59%)', 'hsl(142, 76%, 36%)', 'hsl(280, 65%, 60%)'];

export const MarketComparison = ({ keywordsByMarket, asinsByMarket, categoriesByMarket }: MarketComparisonProps) => {
  const activeMarkets = useMemo(() => {
    return Object.keys(keywordsByMarket).filter(
      m => (keywordsByMarket[m]?.length || 0) > 0 ||
           (asinsByMarket[m]?.length || 0) > 0 ||
           (categoriesByMarket[m]?.length || 0) > 0
    ).slice(0, 4);
  }, [keywordsByMarket, asinsByMarket, categoriesByMarket]);

  const data = useMemo(() => {
    if (activeMarkets.length === 0) return [];

    const maxKeywords = Math.max(...Object.values(keywordsByMarket).map(k => k?.length || 0), 1);
    const maxASINs = Math.max(...Object.values(asinsByMarket).map(a => a?.length || 0), 1);
    const maxCategories = Math.max(...Object.values(categoriesByMarket).map(c => c?.length || 0), 1);
    const maxVolume = Math.max(...Object.values(keywordsByMarket).flatMap(k => k?.map(kw => kw.searchVolume) || [0]), 1);

    const metrics = [
      { metric: 'Keywords', key: 'keywords' },
      { metric: 'ASIN', key: 'asins' },
      { metric: 'Categorías', key: 'categories' },
      { metric: 'Vol. Total', key: 'volume' },
      { metric: 'Comp. Media', key: 'competition' },
    ];

    return metrics.map(m => {
      const result: Record<string, any> = { metric: m.metric };
      activeMarkets.forEach(market => {
        const keywords = keywordsByMarket[market] || [];
        const asins = asinsByMarket[market] || [];
        const categories = categoriesByMarket[market] || [];

        if (m.key === 'keywords') {
          result[market] = (keywords.length / maxKeywords) * 100;
        } else if (m.key === 'asins') {
          result[market] = (asins.length / maxASINs) * 100;
        } else if (m.key === 'categories') {
          result[market] = (categories.length / maxCategories) * 100;
        } else if (m.key === 'volume') {
          const totalVolume = keywords.reduce((sum, k) => sum + k.searchVolume, 0);
          result[market] = (totalVolume / maxVolume) * 100;
        } else if (m.key === 'competition') {
          const competitionValues: Record<string, number> = { low: 25, medium: 50, high: 75 };
          const avgComp = keywords.length > 0
            ? keywords.reduce((sum, k) => sum + (competitionValues[k.competitionLevel] || 50), 0) / keywords.length
            : 0;
          result[market] = avgComp;
        }
      });
      return result;
    });
  }, [activeMarkets, keywordsByMarket, asinsByMarket, categoriesByMarket]);

  if (activeMarkets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Sin datos de mercados</p>
          <p className="text-xs mt-1">Añade datos en varios mercados para comparar</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
        />
        {activeMarkets.map((market, index) => {
          const marketInfo = MARKETPLACES.find(m => m.id === market);
          return (
            <Radar
              key={market}
              name={marketInfo?.name || market}
              dataKey={market}
              stroke={MARKET_COLORS[index]}
              fill={MARKET_COLORS[index]}
              fillOpacity={0.2}
            />
          );
        })}
        <Legend
          wrapperStyle={{ fontSize: 11 }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                  <p className="font-medium text-sm text-foreground">{payload[0].payload.metric}</p>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {payload.map((p: any, i: number) => (
                      <p key={i}>
                        {p.name}: <span className="text-foreground font-medium">{Math.round(p.value)}%</span>
                      </p>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};
