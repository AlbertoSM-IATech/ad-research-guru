import { useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { parseAllRows } from '@/lib/amazon-ads/row-parser';
import { getMissingRequired } from '@/lib/amazon-ads/column-mapper';
import type { UploadedFile, WizardConfig, ValidationResult } from '@/types/amazon-ads';

interface Step4ValidationProps {
  files: UploadedFile[];
  config: WizardConfig;
  validationResult: ValidationResult | null;
  onValidationResult: (result: ValidationResult) => void;
}

export const Step4Validation = ({
  files,
  config,
  validationResult,
  onValidationResult,
}: Step4ValidationProps) => {
  useEffect(() => {
    const readyFiles = files.filter(f => f.status === 'ready' && f.mappings);
    const blockingErrors: string[] = [];
    const warnings: string[] = [];
    let validRows = 0;
    let rejectedRows = 0;
    const campaignNames = new Set<string>();
    const adgroupNames = new Set<string>();
    const targetNames = new Set<string>();
    const searchTerms = new Set<string>();

    for (const file of readyFiles) {
      if (!file.mappings || !file.previewRows) continue;

      // Check missing required fields
      const missing = getMissingRequired(file.mappings.filter(m => m.internalField !== '_skip'));
      if (missing.length > 0) {
        const names = missing.map(m => m.internalField).join(', ');
        blockingErrors.push(`${file.file.name}: Faltan columnas requeridas: ${names}`);
      }

      // Check if any rows exist
      if (!file.previewRows || file.previewRows.length === 0) {
        blockingErrors.push(`${file.file.name}: El archivo está vacío o no se pudo leer`);
        continue;
      }

      // Parse all rows for validation
      const activeMappings = file.mappings.filter(m => m.internalField !== '_skip');
      const parsed = parseAllRows(file.previewRows, activeMappings);

      for (const row of parsed) {
        if (row.errors.length > 0) {
          rejectedRows++;
        } else {
          validRows++;
        }
        for (const w of row.warnings) {
          if (!warnings.includes(w)) warnings.push(w);
        }
        if (row.campaignName) campaignNames.add(row.campaignName);
        if (row.adGroupName) adgroupNames.add(row.adGroupName);
        if (row.targetText) targetNames.add(row.targetText);
        if (row.searchTerm) searchTerms.add(row.searchTerm);
      }

      // Store parsed rows for import step
      file.parsedRows = parsed;
    }

    // Warnings for missing optional fields
    const allMappedFields = new Set(readyFiles.flatMap(f => (f.mappings ?? []).map(m => m.internalField)));
    if (!allMappedFields.has('sales') && !allMappedFields.has('orders')) {
      warnings.push('Sin ventas/pedidos: no se podrá calcular ACOS ni conversión.');
    }
    if (!allMappedFields.has('date')) {
      warnings.push('Sin columna de fecha: se importarán como datos agregados sin desglose diario.');
    }
    if (!allMappedFields.has('campaignId') && !allMappedFields.has('adGroupId')) {
      warnings.push('Sin IDs de campaña/grupo: se usarán nombres. Riesgo de duplicados si los nombres cambian.');
    }

    onValidationResult({
      isValid: blockingErrors.length === 0 && validRows > 0,
      blockingErrors,
      warnings,
      validRows,
      rejectedRows,
      campaignsDetected: campaignNames.size,
      adgroupsDetected: adgroupNames.size,
      targetsDetected: targetNames.size,
      searchTermsDetected: searchTerms.size,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!validationResult) return null;

  return (
    <div className="space-y-4">
      {/* Blocking errors */}
      {validationResult.blockingErrors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Errores bloqueantes</span>
          </div>
          {validationResult.blockingErrors.map((e, i) => (
            <p key={i} className="text-xs text-destructive/80 ml-6">{e}</p>
          ))}
        </div>
      )}

      {/* Warnings */}
      {validationResult.warnings.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Avisos</span>
          </div>
          {validationResult.warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-600/80 ml-6">{w}</p>
          ))}
        </div>
      )}

      {/* Success summary */}
      {validationResult.isValid && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Listo para importar</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">{validationResult.validRows}</p>
          <p className="text-xs text-muted-foreground">Filas válidas</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">{validationResult.rejectedRows}</p>
          <p className="text-xs text-muted-foreground">Filas descartadas</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <p className="text-lg font-semibold">{validationResult.campaignsDetected}</p>
          <p className="text-xs text-muted-foreground">Campañas</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold">{validationResult.adgroupsDetected}</p>
          <p className="text-xs text-muted-foreground">Grupos</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold">{validationResult.targetsDetected}</p>
          <p className="text-xs text-muted-foreground">Targets</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold">{validationResult.searchTermsDetected}</p>
          <p className="text-xs text-muted-foreground">Search terms</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Info className="h-3 w-3" />
        Si faltan ventas/pedidos, algunas métricas como ACOS no se pueden calcular.
      </p>
    </div>
  );
};
