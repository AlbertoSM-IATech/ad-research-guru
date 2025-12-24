import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, ArrowRight, Save, Trash2, Plus, Settings } from 'lucide-react';
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
import { ImportHelpTooltip } from './ImportHelpTooltip';
import { type Keyword, type ImportMappingTemplate, normalizeText, calculateRelevance, classifyIntent, type BookInfo } from '@/types/advertising';
import { useToast } from '@/hooks/use-toast';

interface AdvancedImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (keywords: Array<Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  marketplaceId: string;
  bookInfo?: BookInfo;
  existingKeywords?: string[];
}

interface ParsedRow {
  originalData: Record<string, string>;
  mappedData: Partial<Keyword>;
  isValid: boolean;
  isDuplicate: boolean;
}

const INTERNAL_FIELDS = [
  { value: 'keyword', label: 'Keyword', required: true },
  { value: 'searchVolume', label: 'Volumen de Búsqueda', required: false },
  { value: 'competitionLevel', label: 'Competencia', required: false },
  { value: 'notes', label: 'Notas', required: false },
  { value: 'ignore', label: '— Ignorar —', required: false },
];

const PRESET_TEMPLATES: ImportMappingTemplate[] = [
  {
    id: 'helium10',
    name: 'Helium 10',
    source: 'Helium10',
    mappings: {
      'Keyword': 'keyword',
      'Search Volume': 'searchVolume',
      'Competing Products': 'competitionLevel',
    },
    createdAt: new Date(),
  },
  {
    id: 'publisher-rocket',
    name: 'Publisher Rocket',
    source: 'Publisher Rocket',
    mappings: {
      'Keyword Phrase': 'keyword',
      'Est. Amazon Searches': 'searchVolume',
      'Competition Score': 'competitionLevel',
    },
    createdAt: new Date(),
  },
];

const STORAGE_KEY = 'publify-import-templates';

export const AdvancedImportModal = ({
  isOpen,
  onClose,
  onImport,
  marketplaceId,
  bookInfo,
  existingKeywords = [],
}: AdvancedImportModalProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'input' | 'mapping' | 'preview'>('input');
  const [rawText, setRawText] = useState('');
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [templates, setTemplates] = useState<ImportMappingTemplate[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return [...PRESET_TEMPLATES, ...JSON.parse(saved)];
      } catch {
        return PRESET_TEMPLATES;
      }
    }
    return PRESET_TEMPLATES;
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [autoClassify, setAutoClassify] = useState(true);

  const detectDelimiter = (text: string): string => {
    const firstLine = text.split('\n')[0] || '';
    if (firstLine.includes('\t')) return '\t';
    if (firstLine.includes(';')) return ';';
    return ',';
  };

  const parseHeaders = useCallback(() => {
    if (!rawText.trim()) return;
    
    const lines = rawText.trim().split('\n');
    const delimiter = detectDelimiter(rawText);
    const firstLine = lines[0] || '';
    
    // Detect if first line looks like headers
    const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
    
    // Check if headers look like data (all numeric or look like keywords)
    const looksLikeData = headers.every(h => !isNaN(Number(h))) || 
                          (headers.length === 1 && !headers[0].includes(' '));
    
    if (looksLikeData) {
      // No headers, treat as single column
      setDetectedHeaders(['Column 1']);
      setColumnMappings({ 'Column 1': 'keyword' });
    } else {
      setDetectedHeaders(headers);
      // Auto-detect mappings based on common header names
      const autoMappings: Record<string, string> = {};
      headers.forEach(header => {
        const lower = header.toLowerCase();
        if (lower.includes('keyword') || lower.includes('palabra') || lower.includes('phrase')) {
          autoMappings[header] = 'keyword';
        } else if (lower.includes('volume') || lower.includes('search') || lower.includes('búsqueda')) {
          autoMappings[header] = 'searchVolume';
        } else if (lower.includes('competition') || lower.includes('compet')) {
          autoMappings[header] = 'competitionLevel';
        } else if (lower.includes('note') || lower.includes('nota')) {
          autoMappings[header] = 'notes';
        } else {
          autoMappings[header] = 'ignore';
        }
      });
      setColumnMappings(autoMappings);
    }
    
    setStep('mapping');
  }, [rawText]);

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setColumnMappings(prev => {
        const newMappings = { ...prev };
        Object.entries(template.mappings).forEach(([external, internal]) => {
          // Find matching header (case-insensitive)
          const matchingHeader = detectedHeaders.find(h => 
            h.toLowerCase() === external.toLowerCase()
          );
          if (matchingHeader) {
            newMappings[matchingHeader] = internal;
          }
        });
        return newMappings;
      });
      setSelectedTemplate(templateId);
    }
  };

  const saveAsTemplate = () => {
    if (!newTemplateName.trim()) {
      toast({ title: 'Error', description: 'Introduce un nombre para la plantilla', variant: 'destructive' });
      return;
    }
    
    const newTemplate: ImportMappingTemplate = {
      id: `custom-${Date.now()}`,
      name: newTemplateName,
      source: 'Custom',
      mappings: { ...columnMappings },
      createdAt: new Date(),
    };
    
    const customTemplates = templates.filter(t => !PRESET_TEMPLATES.find(p => p.id === t.id));
    const updatedCustom = [...customTemplates, newTemplate];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustom));
    
    setTemplates([...PRESET_TEMPLATES, ...updatedCustom]);
    setNewTemplateName('');
    toast({ title: 'Plantilla guardada', description: `"${newTemplateName}" se ha guardado correctamente` });
  };

  const deleteTemplate = (templateId: string) => {
    if (PRESET_TEMPLATES.find(t => t.id === templateId)) return;
    
    const customTemplates = templates.filter(t => 
      !PRESET_TEMPLATES.find(p => p.id === t.id) && t.id !== templateId
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customTemplates));
    setTemplates([...PRESET_TEMPLATES, ...customTemplates]);
    toast({ title: 'Plantilla eliminada' });
  };

  const processData = useCallback(() => {
    const lines = rawText.trim().split('\n');
    const delimiter = detectDelimiter(rawText);
    const hasHeaders = detectedHeaders.length > 0 && detectedHeaders[0] !== 'Column 1';
    const dataLines = hasHeaders ? lines.slice(1) : lines;
    
    const existingSet = new Set(existingKeywords.map(k => normalizeText(k)));
    
    const rows: ParsedRow[] = dataLines
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
        const originalData: Record<string, string> = {};
        const mappedData: Partial<Keyword> = {};
        
        detectedHeaders.forEach((header, idx) => {
          originalData[header] = values[idx] || '';
          const mapping = columnMappings[header];
          
          if (mapping && mapping !== 'ignore' && values[idx]) {
            if (mapping === 'keyword') {
              mappedData.keyword = values[idx];
            } else if (mapping === 'searchVolume') {
              mappedData.searchVolume = parseInt(values[idx].replace(/[^0-9]/g, '')) || 0;
            } else if (mapping === 'competitionLevel') {
              const val = values[idx].toLowerCase();
              if (val.includes('low') || val.includes('baj') || parseInt(val) < 30) {
                mappedData.competitionLevel = 'low';
              } else if (val.includes('high') || val.includes('alt') || parseInt(val) > 70) {
                mappedData.competitionLevel = 'high';
              } else {
                mappedData.competitionLevel = 'medium';
              }
            } else if (mapping === 'notes') {
              mappedData.notes = values[idx];
            }
          }
        });

        // Auto-classify if enabled
        if (autoClassify && mappedData.keyword && bookInfo) {
          mappedData.relevance = calculateRelevance(mappedData.keyword, bookInfo);
          mappedData.intent = classifyIntent(mappedData.keyword);
        }
        
        const isValid = !!mappedData.keyword && mappedData.keyword.trim().length > 0;
        const isDuplicate = mappedData.keyword ? existingSet.has(normalizeText(mappedData.keyword)) : false;
        
        return { originalData, mappedData, isValid, isDuplicate };
      });
    
    setParsedRows(rows);
    setStep('preview');
  }, [rawText, detectedHeaders, columnMappings, existingKeywords, autoClassify, bookInfo]);

  const handleImport = () => {
    const toImport = parsedRows
      .filter(r => r.isValid && (!skipDuplicates || !r.isDuplicate))
      .map(r => ({
        keyword: r.mappedData.keyword!,
        searchVolume: r.mappedData.searchVolume || 0,
        competitionLevel: r.mappedData.competitionLevel || 'medium' as const,
        notes: r.mappedData.notes || '',
        relevance: r.mappedData.relevance,
        intent: r.mappedData.intent,
        state: 'pending' as const,
        campaignTypes: ['SP' as const],
        marketplaceId,
        history: [],
      }));
    
    onImport(toImport);
    toast({ title: `${toImport.length} keywords importadas` });
    handleClose();
  };

  const handleClose = () => {
    setStep('input');
    setRawText('');
    setDetectedHeaders([]);
    setColumnMappings({});
    setParsedRows([]);
    setSelectedTemplate('');
    onClose();
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const duplicateCount = parsedRows.filter(r => r.isDuplicate).length;
  const toImportCount = parsedRows.filter(r => r.isValid && (!skipDuplicates || !r.isDuplicate)).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importación Avanzada de Keywords
            <ImportHelpTooltip type="keywords" />
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={step === 'input' ? 'default' : 'outline'}>1. Datos</Badge>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <Badge variant={step === 'mapping' ? 'default' : 'outline'}>2. Mapeo</Badge>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <Badge variant={step === 'preview' ? 'default' : 'outline'}>3. Vista Previa</Badge>
        </div>

        <div className="py-4">
          {/* Step 1: Input */}
          {step === 'input' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Pega tus datos CSV o de herramientas externas</Label>
                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Keyword,Search Volume,Competition\nmindfulness para principiantes,3400,Low\nmeditación diaria,1600,Medium`}
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Soporta datos de Helium 10, Publisher Rocket, y otros formatos CSV.
                </p>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <Checkbox
                  id="auto-classify-adv"
                  checked={autoClassify}
                  onCheckedChange={(checked) => setAutoClassify(checked === true)}
                />
                <label htmlFor="auto-classify-adv" className="text-sm cursor-pointer">
                  Clasificar automáticamente relevancia e intención según info del libro
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs mb-1 block">Plantilla</Label>
                  <Select value={selectedTemplate} onValueChange={applyTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar plantilla..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4" />
                            {t.name}
                            {t.source !== 'Custom' && (
                              <Badge variant="outline" className="text-xs">{t.source}</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end gap-2">
                  <div>
                    <Label className="text-xs mb-1 block">Guardar configuración</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder="Nombre de plantilla..."
                        className="w-40 h-9"
                      />
                      <Button size="sm" variant="outline" onClick={saveAsTemplate}>
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Mapeo de columnas</Label>
                <div className="grid gap-3">
                  {detectedHeaders.map((header) => (
                    <div key={header} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <Badge variant="outline" className="font-mono">{header}</Badge>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <Select
                        value={columnMappings[header] || 'ignore'}
                        onValueChange={(v) => setColumnMappings(prev => ({ ...prev, [header]: v }))}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {INTERNAL_FIELDS.map(field => (
                            <SelectItem key={field.value} value={field.value}>
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
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                  {validCount} válidas
                </Badge>
                {duplicateCount > 0 && (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                    {duplicateCount} duplicadas
                  </Badge>
                )}
              </div>

              {duplicateCount > 0 && (
                <div className="flex items-center space-x-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <Checkbox
                    id="skip-dup-adv"
                    checked={skipDuplicates}
                    onCheckedChange={(checked) => setSkipDuplicates(checked === true)}
                  />
                  <label htmlFor="skip-dup-adv" className="text-sm cursor-pointer">
                    Ignorar keywords duplicadas ({duplicateCount})
                  </label>
                </div>
              )}

              <ScrollArea className="h-[300px] border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Keyword</th>
                      <th className="text-left p-2 font-medium w-24">Volumen</th>
                      <th className="text-left p-2 font-medium w-24">Comp.</th>
                      <th className="text-left p-2 font-medium w-24">Relev.</th>
                      <th className="text-left p-2 font-medium w-20">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => (
                      <tr 
                        key={idx}
                        className={`border-t border-border ${
                          !row.isValid ? 'bg-red-500/5 opacity-50' :
                          row.isDuplicate ? 'bg-yellow-500/5' : ''
                        }`}
                      >
                        <td className="p-2 font-medium">{row.mappedData.keyword || '—'}</td>
                        <td className="p-2">{row.mappedData.searchVolume?.toLocaleString() || '—'}</td>
                        <td className="p-2">{row.mappedData.competitionLevel || '—'}</td>
                        <td className="p-2">{row.mappedData.relevance || '—'}</td>
                        <td className="p-2">
                          {!row.isValid ? (
                            <Badge variant="outline" className="bg-red-500/10 text-red-600 text-xs">Inválida</Badge>
                          ) : row.isDuplicate ? (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 text-xs">Dup.</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 text-xs">OK</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step !== 'input' && (
            <Button variant="outline" onClick={() => setStep(step === 'preview' ? 'mapping' : 'input')}>
              Atrás
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          
          {step === 'input' && (
            <Button onClick={parseHeaders} disabled={!rawText.trim()} className="gap-2">
              Continuar
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
          
          {step === 'mapping' && (
            <Button 
              onClick={processData} 
              disabled={!Object.values(columnMappings).includes('keyword')}
              className="gap-2"
            >
              Procesar
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
          
          {step === 'preview' && (
            <Button onClick={handleImport} disabled={toImportCount === 0} className="gap-2">
              <Plus className="w-4 h-4" />
              Importar {toImportCount} Keywords
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
