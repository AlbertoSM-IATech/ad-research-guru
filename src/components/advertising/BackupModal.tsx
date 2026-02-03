import { useState, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import {
  HardDriveDownload,
  HardDriveUpload,
  Download,
  Upload,
  FileJson,
  FileArchive,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import type {
  Keyword,
  TargetASIN,
  AdvertisingCategory,
  BookInfo,
  CampaignPlan,
  BookEconomy,
} from '@/types/advertising';
import { getAdResearchStorageKey, DEFAULT_BOOK_ECONOMY } from '@/hooks/useLocalPersistence';

// Backup metadata structure
interface BackupMetadata {
  exportVersion: string;
  exportedAt: string;
  app: string;
  storageVersion: number;
  storageKey: string;
  includes: {
    persistedState: boolean;
    marketScoreOverrides: boolean;
    uiPrefs: boolean;
    keywordsCsv: boolean;
  };
}

// State structure in backup
interface BackupState {
  persistedState: {
    version: number;
    selectedMarketplace: string;
    activeTab: 'keywords' | 'asins' | 'categories';
    bookInfo: BookInfo;
    bookEconomy: BookEconomy;
    keywordsByMarket: Record<string, Keyword[]>;
    asinsByMarket: Record<string, TargetASIN[]>;
    categoriesByMarket: Record<string, AdvertisingCategory[]>;
    campaignPlansByMarket: Record<string, CampaignPlan[]>;
    showInsights: boolean;
    updatedAt: string;
  };
  marketScoreOverrides?: Record<string, unknown>;
  uiPrefs?: Record<string, unknown>;
}

// Summary for display
export interface BackupSummary {
  markets: number;
  keywords: number;
  asins: number;
  categories: number;
  campaignPlans: number;
  hasMarketScoreOverrides: boolean;
  hasUiPrefs: boolean;
  selectedMarketplace: string;
  activeTab: string;
  hasBookEconomy: boolean;
}

// Props for the modal
interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Current state for export
  bookId?: string;
  selectedMarketplace: string;
  activeTab: 'keywords' | 'asins' | 'categories';
  bookInfo: BookInfo;
  bookEconomy: BookEconomy;
  keywordsByMarket: Record<string, Keyword[]>;
  asinsByMarket: Record<string, TargetASIN[]>;
  categoriesByMarket: Record<string, AdvertisingCategory[]>;
  campaignPlansByMarket: Record<string, CampaignPlan[]>;
  showInsights: boolean;
  // Restore handlers
  onRestore: (data: {
    selectedMarketplace: string;
    activeTab: 'keywords' | 'asins' | 'categories';
    bookInfo: BookInfo;
    bookEconomy: BookEconomy;
    keywordsByMarket: Record<string, Keyword[]>;
    asinsByMarket: Record<string, TargetASIN[]>;
    categoriesByMarket: Record<string, AdvertisingCategory[]>;
    campaignPlansByMarket: Record<string, CampaignPlan[]>;
    showInsights: boolean;
  }, mode: 'replace' | 'merge', options: { restoreOverrides: boolean; restoreUiPrefs: boolean }) => void;
}

// Deserialize dates from JSON
const deserializeDates = <T,>(data: T): T => {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data)) {
      return new Date(data) as unknown as T;
    }
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => deserializeDates(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = deserializeDates(value);
    }
    return result as T;
  }
  return data;
};

// Serialize dates for export
const serializeDates = <T,>(data: T): T => {
  return JSON.parse(JSON.stringify(data, (_, value) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }));
};

export const BackupModal = ({
  isOpen,
  onClose,
  bookId,
  selectedMarketplace,
  activeTab,
  bookInfo,
  bookEconomy,
  keywordsByMarket,
  asinsByMarket,
  categoriesByMarket,
  campaignPlansByMarket,
  showInsights,
  onRestore,
}: BackupModalProps) => {
  const [activeBackupTab, setActiveBackupTab] = useState<'create' | 'restore'>('create');
  const [showHelp, setShowHelp] = useState(true);
  
  // Create backup options
  const [includeKeywordsCsv, setIncludeKeywordsCsv] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Restore state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [validationMessage, setValidationMessage] = useState('');
  const [parsedData, setParsedData] = useState<BackupState | null>(null);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [restoreOverrides, setRestoreOverrides] = useState(true);
  const [restoreUiPrefs, setRestoreUiPrefs] = useState(false);
  const [isLegacyJson, setIsLegacyJson] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset restore state
  const resetRestoreState = () => {
    setSelectedFile(null);
    setValidationStatus('idle');
    setValidationMessage('');
    setParsedData(null);
    setSummary(null);
    setRestoreMode('merge');
    setRestoreOverrides(true);
    setRestoreUiPrefs(false);
    setIsLegacyJson(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle close
  const handleClose = () => {
    resetRestoreState();
    setIsExporting(false);
    onClose();
  };

  // ============ EXPORT (CREATE BACKUP) ============
  const handleCreateBackup = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const storageKey = getAdResearchStorageKey(bookId);
      
      // Get market score overrides from localStorage
      const marketScoreOverridesRaw = localStorage.getItem('ad-research:market-score-config:v2');
      const marketScoreOverrides = marketScoreOverridesRaw ? JSON.parse(marketScoreOverridesRaw) : null;
      
      // Get UI prefs from localStorage (all keys starting with ad-research:keywords-ui:)
      const uiPrefs: Record<string, unknown> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('ad-research:keywords-ui:')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              uiPrefs[key] = JSON.parse(raw);
            } catch {
              uiPrefs[key] = raw;
            }
          }
        }
      }
      
      // Build metadata
      const metadata: BackupMetadata = {
        exportVersion: '1.0',
        exportedAt: new Date().toISOString(),
        app: 'ad-research-guru',
        storageVersion: 2,
        storageKey,
        includes: {
          persistedState: true,
          marketScoreOverrides: !!marketScoreOverrides,
          uiPrefs: Object.keys(uiPrefs).length > 0,
          keywordsCsv: includeKeywordsCsv,
        },
      };
      
      // Build state
      const state: BackupState = {
        persistedState: {
          version: 2,
          selectedMarketplace,
          activeTab,
          bookInfo: serializeDates(bookInfo),
          bookEconomy,
          keywordsByMarket: serializeDates(keywordsByMarket),
          asinsByMarket: serializeDates(asinsByMarket),
          categoriesByMarket: serializeDates(categoriesByMarket),
          campaignPlansByMarket: serializeDates(campaignPlansByMarket),
          showInsights,
          updatedAt: new Date().toISOString(),
        },
        marketScoreOverrides: marketScoreOverrides ?? undefined,
        uiPrefs: Object.keys(uiPrefs).length > 0 ? uiPrefs : undefined,
      };
      
      // Add files to ZIP
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));
      zip.file('state.json', JSON.stringify(state, null, 2));
      
      // Optionally add keywords CSV
      if (includeKeywordsCsv) {
        const allKeywords = Object.values(keywordsByMarket).flat();
        if (allKeywords.length > 0) {
          const csvHeaders = ['keyword', 'marketplace', 'searchVolume', 'competitors', 'marketScore', 'status', 'notes'];
          const csvRows = allKeywords.map(k => [
            `"${k.keyword.replace(/"/g, '""')}"`,
            k.marketplaceId,
            k.searchVolume || 0,
            k.competitors || 0,
            k.marketScore || 0,
            k.status || 'pending',
            `"${(k.notes || '').replace(/"/g, '""')}"`,
          ].join(','));
          const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
          zip.file('keywords.csv', csvContent);
        }
      }
      
      // Generate and download
      const blob = await zip.generateAsync({ type: 'blob' });
      const date = new Date().toISOString().split('T')[0];
      const filename = `ad-research-backup-v1-${date}.zip`;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Backup creado');
      toast.info('Guárdalo en Drive/Dropbox antes de cambios grandes.', { duration: 5000 });
    } catch (error) {
      console.error('Backup export error:', error);
      toast.error('Error al crear backup');
    }
    setIsExporting(false);
  };

  // ============ IMPORT (RESTORE BACKUP) ============
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationStatus('idle');
    setValidationMessage('');
    setParsedData(null);
    setSummary(null);
    setIsLegacyJson(false);

    const extension = file.name.split('.').pop()?.toLowerCase();
    
    try {
      if (extension === 'zip') {
        // Parse ZIP file
        const zip = await JSZip.loadAsync(file);
        
        // Check for required files
        const metadataFile = zip.file('metadata.json');
        const stateFile = zip.file('state.json');
        
        if (!stateFile) {
          setValidationStatus('invalid');
          setValidationMessage('El ZIP no contiene state.json');
          return;
        }
        
        const stateContent = await stateFile.async('string');
        const state = JSON.parse(stateContent) as BackupState;
        
        if (!state.persistedState) {
          setValidationStatus('invalid');
          setValidationMessage('El backup no contiene datos válidos');
          return;
        }
        
        // Calculate summary
        const ps = state.persistedState;
        const keywordCount = Object.values(ps.keywordsByMarket || {}).flat().length;
        const asinCount = Object.values(ps.asinsByMarket || {}).flat().length;
        const categoryCount = Object.values(ps.categoriesByMarket || {}).flat().length;
        const planCount = Object.values(ps.campaignPlansByMarket || {}).flat().length;
        const marketCount = new Set([
          ...Object.keys(ps.keywordsByMarket || {}),
          ...Object.keys(ps.asinsByMarket || {}),
          ...Object.keys(ps.categoriesByMarket || {}),
        ]).size;
        
        setSummary({
          markets: marketCount,
          keywords: keywordCount,
          asins: asinCount,
          categories: categoryCount,
          campaignPlans: planCount,
          hasMarketScoreOverrides: !!state.marketScoreOverrides,
          hasUiPrefs: !!state.uiPrefs && Object.keys(state.uiPrefs).length > 0,
          selectedMarketplace: ps.selectedMarketplace,
          activeTab: ps.activeTab,
          hasBookEconomy: !!(ps.bookEconomy && (ps.bookEconomy.precioLibro > 0 || ps.bookEconomy.regaliasPorVenta > 0)),
        });
        
        setParsedData(state);
        setValidationStatus('valid');
        setValidationMessage('Backup ZIP válido');
        
      } else if (extension === 'json') {
        // Parse legacy JSON file
        const text = await file.text();
        const json = JSON.parse(text);
        
        // Check for legacy v2 format
        if (json.version === 2 && json.data) {
          setIsLegacyJson(true);
          
          const data = json.data;
          const keywordCount = Object.values(data.keywordsByMarket || {}).flat().length;
          const asinCount = Object.values(data.asinsByMarket || {}).flat().length;
          const categoryCount = Object.values(data.categoriesByMarket || {}).flat().length;
          const planCount = Object.values(data.campaignPlansByMarket || {}).flat().length;
          const marketCount = new Set([
            ...Object.keys(data.keywordsByMarket || {}),
            ...Object.keys(data.asinsByMarket || {}),
            ...Object.keys(data.categoriesByMarket || {}),
          ]).size;
          
          setSummary({
            markets: marketCount,
            keywords: keywordCount,
            asins: asinCount,
            categories: categoryCount,
            campaignPlans: planCount,
            hasMarketScoreOverrides: false,
            hasUiPrefs: false,
            selectedMarketplace: data.selectedMarketplace,
            activeTab: data.activeTab,
            hasBookEconomy: !!(data.bookEconomy && (data.bookEconomy.precioLibro > 0 || data.bookEconomy.regaliasPorVenta > 0)),
          });
          
          // Convert to new format
          const state: BackupState = {
            persistedState: {
              version: 2,
              selectedMarketplace: data.selectedMarketplace,
              activeTab: data.activeTab,
              bookInfo: data.bookInfo,
              bookEconomy: data.bookEconomy || DEFAULT_BOOK_ECONOMY,
              keywordsByMarket: data.keywordsByMarket,
              asinsByMarket: data.asinsByMarket,
              categoriesByMarket: data.categoriesByMarket,
              campaignPlansByMarket: data.campaignPlansByMarket,
              showInsights: data.showInsights || false,
              updatedAt: json.exportedAt || new Date().toISOString(),
            },
          };
          
          setParsedData(state);
          setValidationStatus('valid');
          setValidationMessage('Backup JSON (legacy v2) válido');
        } else {
          setValidationStatus('invalid');
          setValidationMessage(`Formato JSON no soportado (versión: ${json.version || 'desconocida'})`);
        }
      } else {
        setValidationStatus('invalid');
        setValidationMessage('Formato de archivo no soportado. Usa .zip o .json');
      }
    } catch (error) {
      console.error('Parse error:', error);
      setValidationStatus('invalid');
      setValidationMessage('Error al leer el archivo');
    }
  };

  const handleRestore = useCallback(() => {
    if (!parsedData || !summary) return;
    setIsRestoring(true);
    
    try {
      const ps = deserializeDates(parsedData.persistedState);
      
      onRestore({
        selectedMarketplace: ps.selectedMarketplace,
        activeTab: ps.activeTab,
        bookInfo: ps.bookInfo,
        bookEconomy: ps.bookEconomy || DEFAULT_BOOK_ECONOMY,
        keywordsByMarket: ps.keywordsByMarket,
        asinsByMarket: ps.asinsByMarket,
        categoriesByMarket: ps.categoriesByMarket,
        campaignPlansByMarket: ps.campaignPlansByMarket,
        showInsights: ps.showInsights,
      }, restoreMode, {
        restoreOverrides: restoreOverrides && !!parsedData.marketScoreOverrides,
        restoreUiPrefs: restoreUiPrefs && !!parsedData.uiPrefs,
      });
      
      // Restore localStorage items if requested
      if (restoreOverrides && parsedData.marketScoreOverrides) {
        localStorage.setItem('ad-research:market-score-config:v2', JSON.stringify(parsedData.marketScoreOverrides));
      }
      
      if (restoreUiPrefs && parsedData.uiPrefs) {
        Object.entries(parsedData.uiPrefs).forEach(([key, value]) => {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        });
      }
      
      toast.success('Backup restaurado correctamente');
      handleClose();
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Error al restaurar backup');
    }
    setIsRestoring(false);
  }, [parsedData, summary, restoreMode, restoreOverrides, restoreUiPrefs, onRestore]);

  const marketplaceLabels: Record<string, string> = {
    us: 'Estados Unidos',
    uk: 'Reino Unido',
    de: 'Alemania',
    es: 'España',
    fr: 'Francia',
    it: 'Italia',
    ca: 'Canadá',
    au: 'Australia',
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDriveDownload className="h-5 w-5" />
            Backup
          </DialogTitle>
          <DialogDescription>
            Crea o restaura una copia de seguridad completa de todos tus datos.
          </DialogDescription>
        </DialogHeader>

        {/* Help Section */}
        <Collapsible open={showHelp} onOpenChange={setShowHelp}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Cómo usarlo (2 minutos)
              </span>
              {showHelp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="bg-muted/50 rounded-lg p-4 mt-2 text-sm space-y-4">
              <div>
                <p className="font-medium text-foreground mb-1">📦 Crear backup (exportar)</p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-0.5 ml-2">
                  <li>Pulsa "Descargar backup (.zip)"</li>
                  <li>Se descargará un archivo ZIP con todos tus datos actuales</li>
                  <li>Guárdalo en un lugar seguro (Drive/Dropbox/disco externo)</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-1 ml-2">💡 Haz 1 backup semanal o antes de cambios grandes.</p>
              </div>
              
              <Separator />
              
              <div>
                <p className="font-medium text-foreground mb-1">🔄 Restaurar backup (importar)</p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-0.5 ml-2">
                  <li>Sube tu archivo .zip (recomendado) o .json (legacy)</li>
                  <li>Revisa la vista previa (cuántos mercados, keywords, ASINs, etc.)</li>
                  <li>Elige el modo de restauración:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li><strong>Fusionar</strong>: Mantiene tus datos y añade/actualiza lo del backup</li>
                      <li><strong>Reemplazar todo</strong>: Borra todo y restaura exactamente el backup</li>
                    </ul>
                  </li>
                </ol>
              </div>
              
              <Separator />
              
              <div>
                <p className="font-medium text-foreground mb-1">📋 Qué incluye el backup</p>
                <p className="text-muted-foreground ml-2">
                  Keywords, ASINs, categorías, economía del libro, configuración y criterios por mercado. 
                  No está pensado para trabajar en Excel: es una copia de seguridad completa.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Tabs value={activeBackupTab} onValueChange={(v) => setActiveBackupTab(v as 'create' | 'restore')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="gap-2">
              <Download className="w-4 h-4" />
              Crear backup
            </TabsTrigger>
            <TabsTrigger value="restore" className="gap-2">
              <Upload className="w-4 h-4" />
              Restaurar backup
            </TabsTrigger>
          </TabsList>

          {/* Create Tab */}
          <TabsContent value="create" className="flex-1 overflow-y-auto mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Descarga un ZIP con todos los datos actuales. Úsalo como copia de seguridad.
            </p>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-csv"
                checked={includeKeywordsCsv}
                onCheckedChange={(checked) => setIncludeKeywordsCsv(!!checked)}
              />
              <Label htmlFor="include-csv" className="text-sm cursor-pointer">
                Incluir CSV de keywords (solo lectura)
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Solo para revisar fuera. La restauración usa el ZIP.
            </p>
            
            <Button 
              onClick={handleCreateBackup} 
              disabled={isExporting}
              className="w-full gap-2"
            >
              <FileArchive className="w-4 h-4" />
              {isExporting ? 'Creando...' : 'Descargar backup (.zip)'}
            </Button>
          </TabsContent>

          {/* Restore Tab */}
          <TabsContent value="restore" className="flex-1 overflow-y-auto mt-4 space-y-4">
            {/* File selector */}
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <FileJson className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              {selectedFile ? (
                <p className="text-sm font-medium">{selectedFile.name}</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Haz clic para seleccionar un archivo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Soporta .zip (recomendado) y .json (legacy)
                  </p>
                </>
              )}
            </div>

            {/* Validation status */}
            {validationStatus === 'invalid' && (
              <div className="flex items-start gap-2 p-3 rounded-md text-sm bg-destructive/10 text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{validationMessage}</span>
              </div>
            )}

            {/* Legacy warning */}
            {isLegacyJson && validationStatus === 'valid' && (
              <div className="flex items-start gap-2 p-3 rounded-md text-sm bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Backup JSON legacy detectado. Importando en modo compatibilidad.</span>
              </div>
            )}

            {/* Summary */}
            {validationStatus === 'valid' && summary && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-md text-sm bg-green-500/10 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{validationMessage}</span>
                </div>
                
                <div className="bg-muted/50 rounded-md p-3 text-sm">
                  <p className="font-medium mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Resumen del backup
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>Mercados: <span className="text-foreground font-medium">{summary.markets}</span></div>
                    <div>Keywords: <span className="text-foreground font-medium">{summary.keywords}</span></div>
                    <div>ASINs: <span className="text-foreground font-medium">{summary.asins}</span></div>
                    <div>Categorías: <span className="text-foreground font-medium">{summary.categories}</span></div>
                    <div>Planes: <span className="text-foreground font-medium">{summary.campaignPlans}</span></div>
                    <div>Economía: <Badge variant={summary.hasBookEconomy ? 'default' : 'secondary'} className="text-xs">{summary.hasBookEconomy ? 'Sí' : 'No'}</Badge></div>
                    {summary.hasMarketScoreOverrides && (
                      <div className="col-span-2">
                        <Badge variant="outline" className="text-xs">+ Criterios por mercado</Badge>
                      </div>
                    )}
                    {summary.hasUiPrefs && (
                      <div className="col-span-2">
                        <Badge variant="outline" className="text-xs">+ Preferencias UI</Badge>
                      </div>
                    )}
                    <div className="col-span-2 pt-1 border-t border-border mt-1">
                      Marketplace: <span className="text-foreground font-medium">{marketplaceLabels[summary.selectedMarketplace] || summary.selectedMarketplace}</span>
                    </div>
                  </div>
                </div>

                {/* Restore mode */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Modo de restauración</Label>
                  <RadioGroup value={restoreMode} onValueChange={(v) => setRestoreMode(v as 'merge' | 'replace')}>
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem value="merge" id="merge" className="mt-1" />
                      <Label htmlFor="merge" className="cursor-pointer">
                        <span className="font-medium">Fusionar (recomendado)</span>
                        <p className="text-xs text-muted-foreground">Mantiene tus datos actuales y añade/actualiza lo del backup sin duplicar.</p>
                      </Label>
                    </div>
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem value="replace" id="replace" className="mt-1" />
                      <Label htmlFor="replace" className="cursor-pointer">
                        <span className="font-medium text-destructive">Reemplazar todo (peligroso)</span>
                        <p className="text-xs text-muted-foreground">Borra tus datos actuales y restaura exactamente lo que hay en el backup.</p>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Replace warning */}
                {restoreMode === 'replace' && (
                  <div className="flex items-start gap-2 p-3 rounded-md text-sm bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Esta acción no se puede deshacer. Asegúrate de tener un backup reciente de tu estado actual.</span>
                  </div>
                )}

                {/* Additional options */}
                {(summary.hasMarketScoreOverrides || summary.hasUiPrefs) && (
                  <div className="space-y-2">
                    {summary.hasMarketScoreOverrides && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="restore-overrides"
                          checked={restoreOverrides}
                          onCheckedChange={(checked) => setRestoreOverrides(!!checked)}
                        />
                        <Label htmlFor="restore-overrides" className="text-sm cursor-pointer">
                          Restaurar criterios por mercado
                        </Label>
                      </div>
                    )}
                    {summary.hasUiPrefs && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="restore-ui"
                          checked={restoreUiPrefs}
                          onCheckedChange={(checked) => setRestoreUiPrefs(!!checked)}
                        />
                        <Label htmlFor="restore-ui" className="text-sm cursor-pointer">
                          Restaurar preferencias UI
                        </Label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>
            Cerrar
          </Button>
          {activeBackupTab === 'restore' && validationStatus === 'valid' && (
            <Button onClick={handleRestore} disabled={isRestoring}>
              {isRestoring ? 'Restaurando...' : 'Restaurar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
