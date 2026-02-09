import { useState, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, AlertTriangle, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { readSheetRows } from '@/lib/amazon-ads/sheet-detector';
import { autoMapColumns } from '@/lib/amazon-ads/column-mapper';
import { COLUMN_ALIASES } from '@/lib/amazon-ads/column-aliases';
import type { UploadedFile, ColumnMapping, ConfidenceLevel } from '@/types/amazon-ads';

interface Step3MappingProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
}

const confidenceBadge = (c: ConfidenceLevel) => {
  const map = {
    high: { label: 'Alta', variant: 'default' as const },
    medium: { label: 'Media', variant: 'secondary' as const },
    low: { label: 'Baja', variant: 'destructive' as const },
  };
  const { label, variant } = map[c];
  return <Badge variant={variant} className="text-xs">{label}</Badge>;
};

export const Step3Mapping = ({ files, onFilesChange }: Step3MappingProps) => {
  const [showMappingEditor, setShowMappingEditor] = useState(false);

  // Handle sheet selection change for a file
  const handleSheetChange = useCallback(async (fileId: string, sheetName: string) => {
    const updated = await Promise.all(files.map(async f => {
      if (f.id !== fileId) return f;
      const sheet = f.sheets?.find(s => s.name === sheetName);
      if (!sheet) return f;

      // Re-read preview rows
      try {
        const buffer = await f.file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const previewRows = readSheetRows(workbook, sheetName, 20);
        return {
          ...f,
          selectedSheet: sheetName,
          mappings: sheet.mappings,
          previewRows,
        };
      } catch {
        return { ...f, selectedSheet: sheetName, mappings: sheet.mappings };
      }
    }));
    onFilesChange(updated);
  }, [files, onFilesChange]);

  // Handle manual mapping change
  const handleMappingChange = (fileId: string, fileColumn: string, newInternalField: string) => {
    onFilesChange(files.map(f => {
      if (f.id !== fileId || !f.mappings) return f;
      return {
        ...f,
        mappings: f.mappings.map(m =>
          m.fileColumn === fileColumn ? { ...m, internalField: newInternalField, confidence: 'high' as ConfidenceLevel } : m
        ),
      };
    }));
  };

  const readyFiles = files.filter(f => f.status === 'ready');

  return (
    <div className="space-y-4">
      {readyFiles.map(f => (
        <div key={f.id} className="space-y-3 border rounded-lg p-3">
          <p className="text-sm font-medium">{f.file.name}</p>

          {/* Sheet selector (if multiple) */}
          {f.sheets && f.sheets.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Pestaña a importar</label>
              <Select value={f.selectedSheet} onValueChange={v => handleSheetChange(f.id, v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {f.sheets.map(s => (
                    <SelectItem key={s.name} value={s.name}>
                      <span className="flex items-center gap-2">
                        {s.name}
                        <span className="text-muted-foreground">({s.rowCount} filas)</span>
                        {confidenceBadge(s.confidence)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Column mappings summary */}
          {f.mappings && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {f.mappings.length} columnas detectadas
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setShowMappingEditor(!showMappingEditor)}
                >
                  <Edit className="h-3 w-3" />
                  Editar mapeo
                  {showMappingEditor ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </div>

              {/* Mapping chips */}
              <div className="flex flex-wrap gap-1.5">
                {f.mappings.map(m => (
                  <div key={m.fileColumn} className="flex items-center gap-1 text-xs bg-muted/50 rounded px-2 py-1">
                    {m.confidence === 'high' ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-yellow-600" />
                    )}
                    <span className="text-muted-foreground">{m.fileColumn}</span>
                    <span>→</span>
                    <span className="font-medium">{m.internalField}</span>
                  </div>
                ))}
              </div>

              {/* Mapping editor */}
              {showMappingEditor && (
                <div className="border rounded-lg overflow-hidden mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Columna archivo</TableHead>
                        <TableHead className="text-xs">Campo interno</TableHead>
                        <TableHead className="text-xs w-20">Confianza</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {f.mappings.map(m => (
                        <TableRow key={m.fileColumn}>
                          <TableCell className="text-xs py-1.5">{m.fileColumn}</TableCell>
                          <TableCell className="py-1.5">
                            <Select
                              value={m.internalField}
                              onValueChange={v => handleMappingChange(f.id, m.fileColumn, v)}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COLUMN_ALIASES.map(a => (
                                  <SelectItem key={a.internalField} value={a.internalField}>
                                    {a.internalField}
                                  </SelectItem>
                                ))}
                                <SelectItem value="_skip">— Ignorar —</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="py-1.5">{confidenceBadge(m.confidence)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* Preview table */}
          {f.previewRows && f.previewRows.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Vista previa (primeras {Math.min(f.previewRows.length, 20)} filas)
              </p>
              <div className="border rounded-lg overflow-x-auto max-h-52">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(f.previewRows[0]).slice(0, 8).map(h => (
                        <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {f.previewRows.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {Object.values(row).slice(0, 8).map((val, j) => (
                          <TableCell key={j} className="text-xs py-1 whitespace-nowrap max-w-[150px] truncate">
                            {String(val ?? '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      ))}

      {readyFiles.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No hay archivos listos para mapear. Vuelve al paso anterior para subir archivos.
        </p>
      )}
    </div>
  );
};
