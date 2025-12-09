import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { Keyword, CampaignType } from '@/types/advertising';

interface CampaignTypeDistributionProps {
  keywords: Keyword[];
}

const CAMPAIGN_INFO: Record<CampaignType, { name: string; color: string; description: string }> = {
  SP: { name: 'Sponsored Products', color: 'hsl(217, 91%, 60%)', description: 'Anuncios de productos individuales en resultados de búsqueda' },
  SB: { name: 'Sponsored Brands', color: 'hsl(24, 94%, 59%)', description: 'Banners con logo y múltiples productos' },
  SBV: { name: 'Sponsored Brands Video', color: 'hsl(142, 76%, 36%)', description: 'Anuncios en formato de video' },
  SD: { name: 'Sponsored Display', color: 'hsl(280, 65%, 60%)', description: 'Anuncios dentro y fuera de Amazon' },
};

export const CampaignTypeDistribution = ({ keywords }: CampaignTypeDistributionProps) => {
  const data = useMemo(() => {
    const counts: Record<CampaignType, number> = { SP: 0, SB: 0, SBV: 0, SD: 0 };

    keywords.forEach(k => {
      k.campaignTypes.forEach(type => {
        counts[type]++;
      });
    });

    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({
        name: CAMPAIGN_INFO[type as CampaignType].name,
        shortName: type,
        value: count,
        color: CAMPAIGN_INFO[type as CampaignType].color,
        description: CAMPAIGN_INFO[type as CampaignType].description,
      }));
  }, [keywords]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Sin datos disponibles</p>
          <p className="text-xs mt-1">Añade keywords con tipos de campaña</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          label={({ shortName, percent }) => `${shortName} ${(percent * 100).toFixed(0)}%`}
          labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg max-w-xs">
                  <p className="font-medium text-sm text-foreground">{data.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{data.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Uso: <span className="text-foreground font-medium">{data.value} keywords</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend
          formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
          wrapperStyle={{ fontSize: 11 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};
