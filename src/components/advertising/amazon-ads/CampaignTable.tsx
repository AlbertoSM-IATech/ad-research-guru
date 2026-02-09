import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ArrowUpDown } from 'lucide-react';
import { formatMetric } from '@/lib/amazon-ads/metrics-calculator';
import type { ThresholdConfig } from '@/types/amazon-ads';
import type { DerivedMetrics } from '@/lib/amazon-ads/metrics-calculator';

interface CampaignRow {
  key: string;
  name: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  units: number;
  ctr: number | null;
  cpc: number | null;
  cvr: number | null;
  acos: number | null;
  roas: number | null;
}

interface CampaignTableProps {
  campaigns: CampaignRow[];
  thresholds: ThresholdConfig;
  currencySymbol: string;
}

type SortKey = 'name' | 'spend' | 'sales' | 'acos' | 'ctr' | 'cpc' | 'orders' | 'impressions' | 'clicks';

function getSemaphore(row: CampaignRow, thresholds: ThresholdConfig): 'green' | 'yellow' | 'red' | 'gray' {
  if (row.sales === 0 && row.orders === 0) {
    return row.spend > thresholds.minSpendForRules ? 'red' : 'gray';
  }
  if (row.acos === null) return 'gray';
  const acosPercent = row.acos * 100;
  if (acosPercent <= thresholds.acosTarget) return 'green';
  if (acosPercent <= thresholds.acosTarget * 1.5) return 'yellow';
  return 'red';
}

const SEMAPHORE_COLORS = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  gray: 'bg-muted-foreground/30',
};

export const CampaignTable = ({ campaigns, thresholds, currencySymbol }: CampaignTableProps) => {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    let result = campaigns;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return result;
  }, [campaigns, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <TableHead
      className="text-xs cursor-pointer hover:text-foreground whitespace-nowrap"
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortKey === field && <ArrowUpDown className="h-3 w-3" />}
      </span>
    </TableHead>
  );

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar campaña..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>

      <div className="border rounded-lg overflow-x-auto max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-6"></TableHead>
              <SortHeader label="Campaña" field="name" />
              <SortHeader label="Impr." field="impressions" />
              <SortHeader label="Clicks" field="clicks" />
              <SortHeader label="Gasto" field="spend" />
              <SortHeader label="Ventas" field="sales" />
              <SortHeader label="Pedidos" field="orders" />
              <SortHeader label="ACOS" field="acos" />
              <SortHeader label="CTR" field="ctr" />
              <SortHeader label="CPC" field="cpc" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(c => {
              const sem = getSemaphore(c, thresholds);
              return (
                <TableRow key={c.key}>
                  <TableCell className="py-1.5 px-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${SEMAPHORE_COLORS[sem]}`} />
                  </TableCell>
                  <TableCell className="text-xs py-1.5 font-medium max-w-[200px] truncate">{c.name}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right">{formatMetric(c.impressions, 'number')}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right">{formatMetric(c.clicks, 'number')}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right">{currencySymbol}{c.spend.toFixed(2)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right">{currencySymbol}{c.sales.toFixed(2)}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right">{c.orders}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right">{formatMetric(c.acos, 'percent')}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right">{formatMetric(c.ctr, 'percent')}</TableCell>
                  <TableCell className="text-xs py-1.5 text-right">{c.cpc !== null ? `${currencySymbol}${c.cpc.toFixed(2)}` : 'N/A'}</TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
                  No se encontraron campañas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Estas sugerencias se basan en reglas objetivas con los datos importados. Ajusta los umbrales según tu estrategia.
      </p>
    </div>
  );
};
