import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Filter, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
import { type Keyword, type TargetASIN, type AdvertisingCategory, RELEVANCE_LEVELS, KEYWORD_STATES, INTENT_TYPES } from '@/types/advertising';
import { useToast } from '@/hooks/use-toast';

interface AdvancedExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  keywords: Keyword[];
  asins: TargetASIN[];
  categories: AdvertisingCategory[];
  marketplaceId: string;
}

type ExportFormat = 'csv' | 'excel';
type ExportType = 'keywords' | 'asins' | 'categories' | 'all';

interface ExportFilters {
  state: string;
  relevance: string;
  competition: string;
  intent: string;
}

const KEYWORD_COLUMNS = [
  { id: 'keyword', label: 'Keyword', checked: true },
  { id: 'searchVolume', label: 'Volumen', checked: true },
  { id: 'competitionLevel', label: 'Competencia', checked: true },
  { id: 'relevance', label: 'Relevancia', checked: true },
  { id: 'intent', label: 'Intención', checked: true },
  { id: 'state', label: 'Estado', checked: true },
  { id: 'campaignTypes', label: 'Tipos de Campaña', checked: true },
  { id: 'notes', label: 'Notas', checked: true },
  { id: 'estimatedBudget', label: 'Presupuesto Est.', checked: false },
  { id: 'updatedAt', label: 'Última actualización', checked: true },
];

const ASIN_COLUMNS = [
  { id: 'asin', label: 'ASIN', checked: true },
  { id: 'title', label: 'Título', checked: true },
  { id: 'bsr', label: 'BSR', checked: true },
  { id: 'threatScore', label: 'Puntuación Amenaza', checked: true },
  { id: 'sharedKeywords', label: 'Keywords Compartidas', checked: true },
  { id: 'campaignTypes', label: 'Tipos de Campaña', checked: true },
  { id: 'amazonUrl', label: 'URL Amazon', checked: true },
  { id: 'notes', label: 'Notas', checked: true },
  { id: 'updatedAt', label: 'Última actualización', checked: true },
];

const CATEGORY_COLUMNS = [
  { id: 'name', label: 'Nombre', checked: true },
  { id: 'amazonId', label: 'ID Amazon', checked: true },
  { id: 'campaignTypes', label: 'Tipos de Campaña', checked: true },
  { id: 'notes', label: 'Notas', checked: true },
  { id: 'updatedAt', label: 'Última actualización', checked: true },
];

export const AdvancedExportModal = ({
  isOpen,
  onClose,
  keywords,
  asins,
  categories,
  marketplaceId,
}: AdvancedExportModalProps) => {
  const { toast } = useToast();
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [exportType, setExportType] = useState<ExportType>('keywords');
  const [keywordColumns, setKeywordColumns] = useState(KEYWORD_COLUMNS);
  const [asinColumns, setAsinColumns] = useState(ASIN_COLUMNS);
  const [categoryColumns, setCategoryColumns] = useState(CATEGORY_COLUMNS);
  const [filters, setFilters] = useState<ExportFilters>({
    state: 'all',
    relevance: 'all',
    competition: 'all',
    intent: 'all',
  });

  const toggleColumn = (type: 'keywords' | 'asins' | 'categories', columnId: string) => {
    const setter = type === 'keywords' ? setKeywordColumns : type === 'asins' ? setAsinColumns : setCategoryColumns;
    const columns = type === 'keywords' ? keywordColumns : type === 'asins' ? asinColumns : categoryColumns;
    
    setter(columns.map(col => 
      col.id === columnId ? { ...col, checked: !col.checked } : col
    ));
  };

  const getFilteredKeywords = () => {
    return keywords.filter(k => {
      if (filters.state !== 'all' && k.state !== filters.state) return false;
      if (filters.relevance !== 'all' && k.relevance !== filters.relevance) return false;
      if (filters.competition !== 'all' && k.competitionLevel !== filters.competition) return false;
      if (filters.intent !== 'all' && k.intent !== filters.intent) return false;
      return true;
    });
  };

  const formatValue = (value: any, columnId: string): string => {
    if (value === undefined || value === null) return '';
    
    if (columnId === 'campaignTypes' && Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (columnId === 'updatedAt' || columnId === 'createdAt') {
      return new Date(value).toLocaleDateString('es-ES');
    }
    
    if (columnId === 'state') {
      const state = KEYWORD_STATES.find(s => s.value === value);
      return state ? state.label : value;
    }
    
    if (columnId === 'relevance') {
      const rel = RELEVANCE_LEVELS.find(r => r.value === value);
      return rel ? rel.label : value;
    }
    
    if (columnId === 'intent') {
      const intent = INTENT_TYPES.find(i => i.value === value);
      return intent ? intent.label : value;
    }
    
    if (columnId === 'competitionLevel') {
      switch (value) {
        case 'low': return 'Baja';
        case 'medium': return 'Media';
        case 'high': return 'Alta';
        default: return value;
      }
    }
    
    return String(value);
  };

  const generateCSV = (data: any[], columns: typeof KEYWORD_COLUMNS): string => {
    const activeColumns = columns.filter(c => c.checked);
    const header = activeColumns.map(c => c.label).join(',');
    const rows = data.map(item => 
      activeColumns.map(col => {
        const value = formatValue(item[col.id], col.id);
        // Escape commas and quotes
        if (value.includes(',') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );
    return [header, ...rows].join('\n');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob(['\ufeff' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/vnd.ms-excel';
    const extension = format === 'csv' ? 'csv' : 'xls';

    if (exportType === 'keywords' || exportType === 'all') {
      const filteredKeywords = getFilteredKeywords();
      const csv = generateCSV(filteredKeywords, keywordColumns);
      downloadFile(csv, `keywords_${marketplaceId}_${timestamp}.${extension}`, mimeType);
    }

    if (exportType === 'asins' || exportType === 'all') {
      const csv = generateCSV(asins, asinColumns);
      downloadFile(csv, `asins_${marketplaceId}_${timestamp}.${extension}`, mimeType);
    }

    if (exportType === 'categories' || exportType === 'all') {
      const csv = generateCSV(categories, categoryColumns);
      downloadFile(csv, `categories_${marketplaceId}_${timestamp}.${extension}`, mimeType);
    }

    toast({
      title: 'Exportación completada',
      description: `Archivo(s) ${extension.toUpperCase()} descargado(s) correctamente`,
    });
    onClose();
  };

  const filteredCount = getFilteredKeywords().length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Download className="w-5 h-5" />
            Exportar datos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format & Type Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      CSV
                    </div>
                  </SelectItem>
                  <SelectItem value="excel">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      Excel
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Exportar</Label>
              <Select value={exportType} onValueChange={(v) => setExportType(v as ExportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="keywords">Solo Keywords ({keywords.length})</SelectItem>
                  <SelectItem value="asins">Solo ASINs ({asins.length})</SelectItem>
                  <SelectItem value="categories">Solo Categorías ({categories.length})</SelectItem>
                  <SelectItem value="all">Todo (archivos separados)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filters for Keywords */}
          {(exportType === 'keywords' || exportType === 'all') && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  <Label className="font-medium">Filtros para Keywords</Label>
                  <Badge variant="outline" className="ml-auto">
                    {filteredCount} de {keywords.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Estado</Label>
                    <Select value={filters.state} onValueChange={(v) => setFilters(f => ({ ...f, state: v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="all">Todos</SelectItem>
                        {KEYWORD_STATES.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Relevancia</Label>
                    <Select value={filters.relevance} onValueChange={(v) => setFilters(f => ({ ...f, relevance: v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="all">Todas</SelectItem>
                        {RELEVANCE_LEVELS.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.icon} {r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Competencia</Label>
                    <Select value={filters.competition} onValueChange={(v) => setFilters(f => ({ ...f, competition: v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="low">Baja</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Intención</Label>
                    <Select value={filters.intent} onValueChange={(v) => setFilters(f => ({ ...f, intent: v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="all">Todas</SelectItem>
                        {INTENT_TYPES.map(i => (
                          <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Column Selection */}
          <div className="space-y-3">
            <Label className="font-medium">Columnas a incluir</Label>
            
            {(exportType === 'keywords' || exportType === 'all') && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Keywords:</p>
                <div className="flex flex-wrap gap-2">
                  {keywordColumns.map(col => (
                    <label
                      key={col.id}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs cursor-pointer transition-colors ${
                        col.checked 
                          ? 'bg-primary/10 border-primary/30 text-primary' 
                          : 'bg-muted/30 border-border text-muted-foreground'
                      }`}
                    >
                      <Checkbox
                        checked={col.checked}
                        onCheckedChange={() => toggleColumn('keywords', col.id)}
                        className="w-3 h-3"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {(exportType === 'asins' || exportType === 'all') && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">ASINs:</p>
                <div className="flex flex-wrap gap-2">
                  {asinColumns.map(col => (
                    <label
                      key={col.id}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs cursor-pointer transition-colors ${
                        col.checked 
                          ? 'bg-primary/10 border-primary/30 text-primary' 
                          : 'bg-muted/30 border-border text-muted-foreground'
                      }`}
                    >
                      <Checkbox
                        checked={col.checked}
                        onCheckedChange={() => toggleColumn('asins', col.id)}
                        className="w-3 h-3"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {(exportType === 'categories' || exportType === 'all') && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Categorías:</p>
                <div className="flex flex-wrap gap-2">
                  {categoryColumns.map(col => (
                    <label
                      key={col.id}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs cursor-pointer transition-colors ${
                        col.checked 
                          ? 'bg-primary/10 border-primary/30 text-primary' 
                          : 'bg-muted/30 border-border text-muted-foreground'
                      }`}
                    >
                      <Checkbox
                        checked={col.checked}
                        onCheckedChange={() => toggleColumn('categories', col.id)}
                        className="w-3 h-3"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
