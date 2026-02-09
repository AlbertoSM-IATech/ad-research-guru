import { CheckCircle, BarChart3, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AmazonAdsImportResult } from '@/types/amazon-ads';

interface Step7SummaryProps {
  result: AmazonAdsImportResult;
  onViewDashboard: () => void;
}

export const Step7Summary = ({ result, onViewDashboard }: Step7SummaryProps) => {
  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-3">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
        <div>
          <p className="text-lg font-semibold">Importación completada</p>
          <p className="text-sm text-muted-foreground mt-1">
            {result.rowsImported} filas procesadas · {result.appliedKeywordUpdates} keywords actualizadas
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{result.matched.length}</p>
          <p className="text-xs text-muted-foreground">Keywords matched</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">{result.unmatched.length}</p>
          <p className="text-xs text-muted-foreground">Sin coincidencia</p>
        </div>
      </div>

      {result.rowsRejected > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-yellow-600 mb-1">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">{result.rowsRejected} filas descartadas</span>
          </div>
          {result.rejectsSample.slice(0, 3).map((r, i) => (
            <p key={i} className="text-xs text-yellow-600/80 ml-6">
              Fila {r.rowIndex}: {r.reason}
            </p>
          ))}
        </div>
      )}

      <div className="flex justify-center pt-2">
        <Button onClick={onViewDashboard} className="gap-2">
          <BarChart3 className="h-4 w-4" />
          Ver dashboard
        </Button>
      </div>
    </div>
  );
};
