import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { type Keyword, type BookEconomy } from '@/types/advertising';
import { calcularGastoAcumulado, calcularVentasAcumuladas, calcularAcosActualPorcentaje, calcularConversionPorcentaje } from '@/lib/acosEquilibrio';
import { getKeywordMarketScore } from '@/lib/keyword-sorting';

interface KeywordExportCSVProps {
  keywords: Keyword[];
  bookEconomy: BookEconomy;
  selectedIds?: Set<string>;
}

export const KeywordExportCSV = ({ keywords, bookEconomy, selectedIds }: KeywordExportCSVProps) => {
  const handleExport = () => {
    const keywordsToExport = selectedIds && selectedIds.size > 0
      ? keywords.filter(k => selectedIds.has(k.id))
      : keywords;

    const acosEquilibrio = bookEconomy.precioLibro > 0 && bookEconomy.regaliasPorVenta > 0
      ? (bookEconomy.regaliasPorVenta / bookEconomy.precioLibro) * 100
      : null;

    // CSV Headers
    const headers = [
      'Keyword',
      'Volumen',
      'Competidores',
      'Market Score',
      'Estado',
      'Propósito',
      'Clicks',
      'CPC',
      'Pedidos',
      'Gasto',
      'Ventas',
      'ACOS Actual',
      'ACOS Equilibrio',
      'Conversión',
      'Beneficio',
      'Notas'
    ];

    // CSV Rows
    const rows = keywordsToExport.map(kw => {
      const ads = kw.adsData;
      const gasto = calcularGastoAcumulado(ads?.clicks, ads?.cpcActual);
      const ventas = calcularVentasAcumuladas(ads?.pedidos, bookEconomy.precioLibro);
      const acosActual = calcularAcosActualPorcentaje(gasto ?? undefined, ventas ?? undefined);
      const conversion = calcularConversionPorcentaje(ads?.pedidos, ads?.clicks);
      const beneficio = gasto !== null && ventas !== null ? ventas - gasto : null;
      const score = getKeywordMarketScore(kw);

      return [
        `"${kw.keyword.replace(/"/g, '""')}"`,
        kw.searchVolume || 0,
        kw.competitors || 0,
        score,
        kw.status || 'pending',
        kw.purpose || 'both',
        ads?.clicks ?? '',
        ads?.cpcActual ?? '',
        ads?.pedidos ?? '',
        gasto !== null ? gasto.toFixed(2) : '',
        ventas !== null ? ventas.toFixed(2) : '',
        acosActual !== null ? acosActual.toFixed(1) : '',
        acosEquilibrio !== null ? acosEquilibrio.toFixed(1) : '',
        conversion !== null ? conversion.toFixed(1) : '',
        beneficio !== null ? beneficio.toFixed(2) : '',
        `"${(kw.notes || '').replace(/"/g, '""')}"`
      ];
    });

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `keywords-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
      <Download className="w-4 h-4" />
      Exportar CSV
      {selectedIds && selectedIds.size > 0 && ` (${selectedIds.size})`}
    </Button>
  );
};
