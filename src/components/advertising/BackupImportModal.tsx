import { useState, useRef } from 'react';
import { Upload, FileJson, AlertTriangle, CheckCircle, Info, HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  type Keyword, 
  type TargetASIN, 
  type AdvertisingCategory, 
  type BookInfo,
  type CampaignPlan,
} from '@/types/advertising';

interface BackupData {
  version: number;
  exportedAt: string;
  storageKey: string;
  data: {
    selectedMarketplace: string;
    activeTab: 'keywords' | 'asins' | 'categories';
    bookInfo: BookInfo;
    keywordsByMarket: Record<string, Keyword[]>;
    asinsByMarket: Record<string, TargetASIN[]>;
    categoriesByMarket: Record<string, AdvertisingCategory[]>;
    campaignPlansByMarket: Record<string, CampaignPlan[]>;
    showInsights?: boolean;
  };
}

export interface BackupSummary {
  markets: number;
  keywords: number;
  asins: number;
  categories: number;
  selectedMarketplace: string;
  activeTab: string;
}

interface BackupImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: BackupData['data'], summary: BackupSummary) => void;
}

// Deserialize ISO date strings back to Date objects
const deserializeDates = <T,>(data: T): T => {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    // Check if it's an ISO date string
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

export const BackupImportModal = ({ isOpen, onClose, onImport }: BackupImportModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [validationMessage, setValidationMessage] = useState('');
  const [parsedData, setParsedData] = useState<BackupData | null>(null);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setValidationStatus('idle');
    setValidationMessage('');
    setParsedData(null);
    setSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationStatus('idle');
    setValidationMessage('');
    setParsedData(null);
    setSummary(null);

    let json: BackupData;
    try {
      const text = await file.text();
      json = JSON.parse(text) as BackupData;
    } catch {
      setValidationStatus('invalid');
      setValidationMessage('El archivo no es un JSON válido');
      return;
    }

    // Validate version
    if (json.version !== 1) {
      setValidationStatus('invalid');
      setValidationMessage(`Versión no soportada: ${json.version} (se requiere v1)`);
      return;
    }

    // Validate data exists
    if (!json.data) {
      setValidationStatus('invalid');
      setValidationMessage('El backup no contiene datos válidos');
      return;
    }

    // Validate required keys
    const requiredKeys = [
      'selectedMarketplace',
      'activeTab',
      'bookInfo',
      'keywordsByMarket',
      'asinsByMarket',
      'categoriesByMarket',
      'campaignPlansByMarket'
    ];

    const missingKeys = requiredKeys.filter(key => !(key in json.data));
    if (missingKeys.length > 0) {
      setValidationStatus('invalid');
      setValidationMessage(`Faltan campos requeridos: ${missingKeys.join(', ')}`);
      return;
    }

    // Calculate summary
    const keywordCount = Object.values(json.data.keywordsByMarket || {}).flat().length;
    const asinCount = Object.values(json.data.asinsByMarket || {}).flat().length;
    const categoryCount = Object.values(json.data.categoriesByMarket || {}).flat().length;
    const marketCount = new Set([
      ...Object.keys(json.data.keywordsByMarket || {}),
      ...Object.keys(json.data.asinsByMarket || {}),
      ...Object.keys(json.data.categoriesByMarket || {}),
    ]).size;

    const backupSummary: BackupSummary = {
      markets: marketCount,
      keywords: keywordCount,
      asins: asinCount,
      categories: categoryCount,
      selectedMarketplace: json.data.selectedMarketplace,
      activeTab: json.data.activeTab,
    };

    setValidationStatus('valid');
    setValidationMessage('Backup válido');
    setSummary(backupSummary);
    setParsedData(json);
  };

  const handleImport = () => {
    if (!parsedData || !summary) return;

    // Deserialize dates before importing
    const deserializedData = deserializeDates(parsedData.data);
    onImport(deserializedData, summary);
    resetState();
    onClose();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

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

  const tabLabels: Record<string, string> = {
    keywords: 'Keywords',
    asins: 'ASINs',
    categories: 'Categorías',
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar backup
          </DialogTitle>
          <DialogDescription>
            Selecciona un archivo de backup JSON exportado previamente. Esto reemplazará todos los datos actuales.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File selector */}
          <div 
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <FileJson className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            {selectedFile ? (
              <p className="text-sm font-medium">{selectedFile.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Haz clic para seleccionar un archivo .json
              </p>
            )}
          </div>

          {/* Help section */}
          <Collapsible open={showHelp} onOpenChange={setShowHelp}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
                <HelpCircle className="h-4 w-4" />
                Cómo probarlo rápido
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="bg-muted/50 rounded-md p-3 mt-2 text-sm space-y-1">
                <p className="font-medium mb-2">3 pasos para verificar:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Exporta backup desde el menú ⋯ → "Exportar backup completo"</li>
                  <li>Borra los datos o haz cambios (menú ⋯ → "Restablecer datos")</li>
                  <li>Importa el backup y verifica que vuelve todo</li>
                </ol>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Validation status */}
          {validationStatus === 'invalid' && (
            <div className="flex items-start gap-2 p-3 rounded-md text-sm bg-destructive/10 text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{validationMessage}</span>
            </div>
          )}

          {/* Success summary */}
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
                  <div className="col-span-2 pt-1 border-t border-border mt-1">
                    Marketplace: <span className="text-foreground font-medium">{marketplaceLabels[summary.selectedMarketplace] || summary.selectedMarketplace}</span>
                  </div>
                  <div className="col-span-2">
                    Tab activo: <span className="text-foreground font-medium">{tabLabels[summary.activeTab] || summary.activeTab}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={validationStatus !== 'valid'}
          >
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
