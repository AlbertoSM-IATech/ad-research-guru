import { useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { detectSheets, readSheetRows } from '@/lib/amazon-ads/sheet-detector';
import { autoMapColumns } from '@/lib/amazon-ads/column-mapper';
import type { UploadedFile } from '@/types/amazon-ads';

interface Step2UploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
}

const ACCEPTED = '.xlsx,.xls,.csv';

export const Step2Upload = ({ files, onFilesChange }: Step2UploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const analyzeFile = useCallback(async (uploadedFile: UploadedFile): Promise<UploadedFile> => {
    const file = uploadedFile.file;
    const isCSV = file.name.toLowerCase().endsWith('.csv');

    try {
      if (isCSV) {
        // Parse CSV — handle BOM and auto-detect delimiter (; or , or \t)
        let text = await file.text();
        // Strip UTF-8 BOM if present
        if (text.charCodeAt(0) === 0xFEFF) {
          text = text.slice(1);
        }
        // Auto-detect delimiter from first line
        const firstLine = text.split('\n')[0] ?? '';
        const semiCount = (firstLine.match(/;/g) ?? []).length;
        const commaCount = (firstLine.match(/,/g) ?? []).length;
        const tabCount = (firstLine.match(/\t/g) ?? []).length;
        let delimiter = ',';
        if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
        else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

        const result = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter });
        const headers = result.meta.fields ?? [];
        const mappings = autoMapColumns(headers);
        const allRows = result.data as Record<string, unknown>[];
        const previewRows = allRows.slice(0, 20);

        return {
          ...uploadedFile,
          status: 'ready',
          sheets: [{ name: file.name, rowCount: allRows.length, headers, confidence: mappings.length >= 3 ? 'high' : 'medium', mappings }],
          selectedSheet: file.name,
          mappings,
          previewRows,
          allRawRows: allRows,
        };
      } else {
        // Parse Excel
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheets = detectSheets(workbook);

        if (sheets.length === 0) {
          return { ...uploadedFile, status: 'error', error: 'No se encontraron pestañas válidas' };
        }

        const bestSheet = sheets[0];
        const allRows = readSheetRows(workbook, bestSheet.name);
        const previewRows = allRows.slice(0, 20);

        return {
          ...uploadedFile,
          status: 'ready',
          sheets,
          selectedSheet: bestSheet.name,
          mappings: bestSheet.mappings,
          previewRows,
          allRawRows: allRows,
        };
      }
    } catch (e) {
      return { ...uploadedFile, status: 'error', error: 'Error al leer el archivo' };
    }
  }, []);

  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map(f => ({
      file: f,
      id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      status: 'analyzing' as const,
    }));

    const updated = [...files, ...newFiles];
    onFilesChange(updated);

    // Analyze each file
    const analyzed = await Promise.all(newFiles.map(f => analyzeFile(f)));
    
    onFilesChange([
      ...files,
      ...analyzed,
    ]);
  }, [files, onFilesChange, analyzeFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = (id: string) => {
    onFilesChange(files.filter(f => f.id !== id));
  };

  const statusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending': return <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />;
      case 'analyzing': return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'ready': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Arrastra archivos aquí o haz clic para seleccionar</p>
        <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls, .csv — Puedes subir varios archivos</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(f => (
            <div key={f.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              {statusIcon(f.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {f.status === 'analyzing' && 'Analizando...'}
                  {f.status === 'ready' && `${f.sheets?.length ?? 0} pestaña(s) · ${f.mappings?.length ?? 0} columnas mapeadas`}
                  {f.status === 'error' && f.error}
                  {f.status === 'pending' && 'Pendiente'}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFile(f.id)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        Descárgalos desde la consola de Amazon Ads (Bulk operations / informes) y súbelos aquí. Si tu archivo tiene varias pestañas, te dejaremos escoger en el siguiente paso.
      </p>
    </div>
  );
};
