import { useState, useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, ArrowRight, Save, FileUp, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { type Keyword, normalizeText } from '@/types/advertising';
import { createKeywordDefaults } from '@/lib/keyword-helpers';
import { useToast } from '@/hooks/use-toast';
import { 
  parseDelimitedText, 
  parseFile, 
  type ParsedTable 
} from '@/lib/import/parsers';
import {
  IMPORT_TEMPLATES,
  IMPORTABLE_FIELDS,
  detectTemplate,
  autoMapHeaders,
  parseNumericValue,
  deriveCompetitionLevel,
  type ImportSource,
  type ImportableFieldKey,
} from '@/lib/import/templates';

interface AdvancedImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (keywords: Array<Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  marketplaceId: string;
  existingKeywords?: Keyword[];
}

interface ParsedRow {
  originalData: Record<string, string>;
  mappedData: {
    keyword?: string;
    searchVolume?: number;
    competitors?: number;
    titleDensity?: number;
    cpc?: number;
    notes?: string;
  };
  isValid: boolean;
  isDuplicate: boolean;
  existingKeyword?: Keyword; // For merge updates
}

type ImportMethod = 'file' | 'paste';

export const AdvancedImportModal = ({
  isOpen,
  onClose,
  onImport,
  marketplaceId,
  existingKeywords = [],
}: AdvancedImportModalProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Step management
  const [step, setStep] = useState<'source' | 'mapping'>('source');
  
  // Source selection
  const [importSource, setImportSource] = useState<ImportSource>('helium10');
  const [importMethod, setImportMethod] = useState<ImportMethod>('file');
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Parsed data
  const [parsedTable, setParsedTable] = useState<ParsedTable | null>(null);
  const [columnMappings, setColumnMappings] = useState<Record<string, ImportableFieldKey | 'ignore'>>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  
  // Options
  const [skipDuplicates, setSkipDuplicates] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(true);

  // Normalize existing keywords for lookup
  const existingKeywordMap = new Map(
    existingKeywords.map(k => [normalizeText(k.keyword), k])
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const processSource = useCallback(async () => {
    setIsLoading(true);
    try {
      let table: ParsedTable;
      
      if (importMethod === 'file' && selectedFile) {
        table = await parseFile(selectedFile);
      } else if (importMethod === 'paste' && rawText.trim()) {
        table = parseDelimitedText(rawText);
      } else {
        toast({ 
          title: 'Error', 
          description: 'Selecciona un archivo o pega contenido', 
          variant: 'destructive' 
        });
        setIsLoading(false);
        return;
      }

      if (table.headers.length === 0) {
        toast({ 
          title: 'Error', 
          description: 'No se detectaron columnas en los datos', 
          variant: 'destructive' 
        });
        setIsLoading(false);
        return;
      }

      setParsedTable(table);
      
      // Auto-detect template if custom, otherwise use selected
      const detectedTemplate = importSource === 'custom' 
        ? detectTemplate(table.headers)
        : importSource;
      
      // Auto-map headers
      const autoMappings = autoMapHeaders(table.headers, detectedTemplate);
      setColumnMappings(autoMappings);
      
      // Process rows with initial mappings
      processRows(table, autoMappings);
      setStep('mapping');
      
    } catch (error) {
      console.error('Parse error:', error);
      toast({ 
        title: 'Error al procesar', 
        description: error instanceof Error ? error.message : 'Error desconocido', 
        variant: 'destructive' 
      });
    }
    setIsLoading(false);
  }, [importMethod, selectedFile, rawText, importSource, toast]);

  const processRows = useCallback((
    table: ParsedTable, 
    mappings: Record<string, ImportableFieldKey | 'ignore'>
  ) => {
    const rows: ParsedRow[] = table.rows.map(row => {
      const mappedData: ParsedRow['mappedData'] = {};
      
      Object.entries(mappings).forEach(([header, field]) => {
        if (field === 'ignore') return;
        
        const rawValue = row[header];
        if (!rawValue) return;
        
        switch (field) {
          case 'keyword':
            mappedData.keyword = rawValue.trim();
            break;
          case 'searchVolume':
            mappedData.searchVolume = parseNumericValue(rawValue);
            break;
          case 'competitors':
            mappedData.competitors = parseNumericValue(rawValue);
            break;
          case 'titleDensity':
            mappedData.titleDensity = parseNumericValue(rawValue);
            break;
          case 'cpc':
            mappedData.cpc = parseNumericValue(rawValue);
            break;
          case 'notes':
            mappedData.notes = rawValue.trim();
            break;
        }
      });

      const normalizedKw = mappedData.keyword ? normalizeText(mappedData.keyword) : '';
      const existingKw = normalizedKw ? existingKeywordMap.get(normalizedKw) : undefined;
      
      return {
        originalData: row,
        mappedData,
        isValid: !!mappedData.keyword && mappedData.keyword.trim().length > 0,
        isDuplicate: !!existingKw,
        existingKeyword: existingKw,
      };
    });
    
    setParsedRows(rows);
  }, [existingKeywordMap]);

  const handleMappingChange = (header: string, field: ImportableFieldKey | 'ignore') => {
    const newMappings = { ...columnMappings, [header]: field };
    setColumnMappings(newMappings);
    
    if (parsedTable) {
      processRows(parsedTable, newMappings);
    }
  };

  const handleImport = () => {
    const results = {
      added: 0,
      updated: 0,
      skipped: 0,
    };

    const toImport: Array<Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'>> = [];

    parsedRows.forEach(row => {
      if (!row.isValid) {
        results.skipped++;
        return;
      }

      if (row.isDuplicate) {
        if (skipDuplicates && !updateExisting) {
          results.skipped++;
          return;
        }
        
        if (updateExisting && row.existingKeyword) {
          // Create merged keyword preserving existing adsData and history
          const existing = row.existingKeyword;
          const competitionLevel = row.mappedData.competitors 
            ? deriveCompetitionLevel(row.mappedData.competitors)
            : existing.competitionLevel;
          
          toImport.push({
            ...createKeywordDefaults({
              keyword: row.mappedData.keyword!,
              marketplaceId,
              searchVolume: row.mappedData.searchVolume ?? existing.searchVolume,
              competitors: row.mappedData.competitors ?? existing.competitors,
              competitionLevel,
              notes: row.mappedData.notes || existing.notes,
              state: existing.state,
              adsData: existing.adsData, // Preserve ads data
              history: existing.history, // Preserve history
            }),
            // Preserve other existing fields
            status: existing.status,
            purpose: existing.purpose,
            campaignTypes: existing.campaignTypes,
          });
          results.updated++;
          return;
        }
      }

      // New keyword
      const competitionLevel = row.mappedData.competitors 
        ? deriveCompetitionLevel(row.mappedData.competitors)
        : 'medium';

      toImport.push(createKeywordDefaults({
        keyword: row.mappedData.keyword!,
        marketplaceId,
        searchVolume: row.mappedData.searchVolume ?? 0,
        competitors: row.mappedData.competitors ?? 0,
        competitionLevel,
        notes: row.mappedData.notes || '',
        state: 'pending',
      }));
      results.added++;
    });

    onImport(toImport);
    
    toast({ 
      title: 'Importación completada',
      description: `Añadidas: ${results.added} | Actualizadas: ${results.updated} | Omitidas: ${results.skipped}`,
    });
    
    handleClose();
  };

  const handleClose = () => {
    setStep('source');
    setRawText('');
    setSelectedFile(null);
    setParsedTable(null);
    setColumnMappings({});
    setParsedRows([]);
    setImportSource('helium10');
    setImportMethod('file');
    onClose();
  };

  // Stats
  const validCount = parsedRows.filter(r => r.isValid).length;
  const duplicateCount = parsedRows.filter(r => r.isDuplicate).length;
  const newCount = parsedRows.filter(r => r.isValid && !r.isDuplicate).length;
  const hasKeywordMapping = Object.values(columnMappings).includes('keyword');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importar Keywords
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-sm py-2">
          <Badge variant={step === 'source' ? 'default' : 'outline'} className="gap-1">
            <span className="font-bold">1</span> Fuente
          </Badge>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <Badge variant={step === 'mapping' ? 'default' : 'outline'} className="gap-1">
            <span className="font-bold">2</span> Mapeo y Vista Previa
          </Badge>
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto py-4">
          {/* Step 1: Source Selection */}
          {step === 'source' && (
            <div className="space-y-6">
              {/* Tool Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Herramienta de origen</Label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(IMPORT_TEMPLATES).map(([id, template]) => (
                    <button
                      key={id}
                      onClick={() => setImportSource(id as ImportSource)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        importSource === id 
                          ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-sm">{template.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {template.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Import Method */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Método de importación</Label>
                <Tabs value={importMethod} onValueChange={(v) => setImportMethod(v as ImportMethod)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="file" className="gap-2">
                      <FileUp className="w-4 h-4" />
                      Subir archivo
                    </TabsTrigger>
                    <TabsTrigger value="paste" className="gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      Pegar contenido
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="file" className="mt-4">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                    >
                      <FileUp className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                      <p className="font-medium">
                        {selectedFile ? selectedFile.name : 'Haz clic para seleccionar archivo'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Soporta .csv, .tsv, .txt, .xlsx, .xls
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.tsv,.txt,.xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="paste" className="mt-4">
                    <Textarea
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder={`Pega aquí el contenido CSV de ${IMPORT_TEMPLATES[importSource].name}...

Ejemplo:
Keyword Phrase,Search Volume,Competing Products
meditación para principiantes,3400,2500
mindfulness diario,1200,800`}
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}

          {/* Step 2: Mapping & Preview */}
          {step === 'mapping' && parsedTable && (
            <div className="space-y-6">
              {/* Stats Bar */}
              <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Badge variant="outline" className="gap-1">
                  <FileSpreadsheet className="w-3 h-3" />
                  {parsedTable.rawRowCount} filas
                </Badge>
                <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-600 border-green-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  {validCount} válidas
                </Badge>
                {duplicateCount > 0 && (
                  <Badge variant="outline" className="gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                    <AlertCircle className="w-3 h-3" />
                    {duplicateCount} existentes
                  </Badge>
                )}
                <Badge variant="outline" className="gap-1 bg-blue-500/10 text-blue-600 border-blue-500/30">
                  {newCount} nuevas
                </Badge>
              </div>

              {/* Column Mapping */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Mapeo de columnas</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Ajusta qué columna del archivo corresponde a cada campo interno. 
                        "Competidores" se usará como número de resultados de Amazon.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {!hasKeywordMapping && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4" />
                    Debes mapear al menos la columna "Keyword"
                  </div>
                )}

                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {parsedTable.headers.map((header) => (
                    <div key={header} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <Badge variant="outline" className="font-mono text-xs truncate max-w-full">
                          {header}
                        </Badge>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Select
                        value={columnMappings[header] || 'ignore'}
                        onValueChange={(v) => handleMappingChange(header, v as ImportableFieldKey | 'ignore')}
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="ignore">— Ignorar —</SelectItem>
                          {IMPORTABLE_FIELDS.map(field => (
                            <SelectItem key={field.key} value={field.key}>
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Duplicate Handling Options */}
              {duplicateCount > 0 && (
                <div className="space-y-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <Label className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    {duplicateCount} keywords ya existen
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="update-existing"
                        checked={updateExisting}
                        onCheckedChange={(checked) => setUpdateExisting(checked === true)}
                      />
                      <label htmlFor="update-existing" className="text-sm cursor-pointer">
                        Actualizar datos de keywords existentes (sin borrar adsData/historial)
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="skip-duplicates"
                        checked={skipDuplicates}
                        onCheckedChange={(checked) => setSkipDuplicates(checked === true)}
                        disabled={updateExisting}
                      />
                      <label htmlFor="skip-duplicates" className={`text-sm cursor-pointer ${updateExisting ? 'text-muted-foreground' : ''}`}>
                        Ignorar duplicados completamente
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Preview */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Vista previa (primeras 10 filas)</Label>
                <ScrollArea className="h-[200px] border border-border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium w-10">Estado</th>
                        <th className="text-left p-2 font-medium">Keyword</th>
                        <th className="text-right p-2 font-medium w-24">Volumen</th>
                        <th className="text-right p-2 font-medium w-24">Compet.</th>
                        <th className="text-left p-2 font-medium w-32">Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className={`border-t border-border ${!row.isValid ? 'opacity-50' : ''}`}>
                          <td className="p-2">
                            {!row.isValid ? (
                              <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600">
                                Inválida
                              </Badge>
                            ) : row.isDuplicate ? (
                              <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600">
                                Existe
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">
                                Nueva
                              </Badge>
                            )}
                          </td>
                          <td className="p-2 font-medium truncate max-w-[200px]">
                            {row.mappedData.keyword || '—'}
                          </td>
                          <td className="p-2 text-right tabular-nums">
                            {row.mappedData.searchVolume?.toLocaleString() || '—'}
                          </td>
                          <td className="p-2 text-right tabular-nums">
                            {row.mappedData.competitors?.toLocaleString() || '—'}
                          </td>
                          <td className="p-2 text-muted-foreground truncate max-w-[120px]">
                            {row.mappedData.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="gap-2 pt-4">
          {step === 'source' ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={processSource}
                disabled={isLoading || (importMethod === 'file' && !selectedFile) || (importMethod === 'paste' && !rawText.trim())}
              >
                {isLoading ? 'Procesando...' : 'Continuar'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('source')}>
                Atrás
              </Button>
              <Button 
                onClick={handleImport}
                disabled={!hasKeywordMapping || validCount === 0}
              >
                Importar {validCount} keywords
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
