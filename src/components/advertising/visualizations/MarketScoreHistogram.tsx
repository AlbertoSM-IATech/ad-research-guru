import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Keyword } from '@/types/advertising';
import { getKeywordMarketScore } from '@/lib/keyword-sorting';

interface MarketScoreHistogramProps {
  keywords: Keyword[];
  marketplaceId?: string;
}

interface BinData {
  range: string;
  count: number;
  color: string;
  min: number;
  max: number;
}

const BINS = [
  { min: 0, max: 9, label: '0-9' },
  { min: 10, max: 19, label: '10-19' },
  { min: 20, max: 29, label: '20-29' },
  { min: 30, max: 39, label: '30-39' },
  { min: 40, max: 49, label: '40-49' },
  { min: 50, max: 59, label: '50-59' },
  { min: 60, max: 69, label: '60-69' },
  { min: 70, max: 79, label: '70-79' },
  { min: 80, max: 89, label: '80-89' },
  { min: 90, max: 100, label: '90-100' },
];

function getScoreColor(min: number): string {
  if (min >= 70) return 'hsl(142, 76%, 36%)'; // Green
  if (min >= 40) return 'hsl(45, 93%, 47%)';  // Yellow
  return 'hsl(0, 84%, 60%)';                   // Red
}

export function MarketScoreHistogram({ keywords, marketplaceId }: MarketScoreHistogramProps) {
  const data = useMemo<BinData[]>(() => {
    // Initialize bins
    const binCounts: Record<string, number> = {};
    BINS.forEach(bin => {
      binCounts[bin.label] = 0;
    });
    
    // Count keywords in each bin
    keywords.forEach(kw => {
      const score = getKeywordMarketScore(kw);
      for (const bin of BINS) {
        if (score >= bin.min && score <= bin.max) {
          binCounts[bin.label]++;
          break;
        }
      }
    });
    
    // Build result
    return BINS.map(bin => ({
      range: bin.label,
      count: binCounts[bin.label],
      color: getScoreColor(bin.min),
      min: bin.min,
      max: bin.max,
    }));
  }, [keywords]);
  
  const stats = useMemo(() => {
    const excellent = keywords.filter(k => getKeywordMarketScore(k) >= 70).length;
    const good = keywords.filter(k => {
      const score = getKeywordMarketScore(k);
      return score >= 40 && score < 70;
    }).length;
    const poor = keywords.filter(k => getKeywordMarketScore(k) < 40).length;
    
    return { excellent, good, poor };
  }, [keywords]);

  if (keywords.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No hay keywords para mostrar
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Excelente (≥70): {stats.excellent}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span>Regular (40-69): {stats.good}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Bajo (&lt;40): {stats.poor}</span>
        </div>
      </div>
      
      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <XAxis 
              dataKey="range" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis 
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const item = payload[0].payload as BinData;
                return (
                  <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-lg">
                    <p className="font-medium">Rango: {item.range}</p>
                    <p className="text-muted-foreground">{item.count} keywords</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
