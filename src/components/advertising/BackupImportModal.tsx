import { useState, useRef } from 'react';
import { Upload, FileJson, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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

interface BackupImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: BackupData['data']) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setValidationStatus('idle');
    setValidationMessage('');
    setParsedData(null);
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

    try {
      const text = await file.text();
      const json = JSON.parse(text) as BackupData;

      // Validate structure
      if (json.version !== 1) {
        setValidationStatus('invalid');
        setValidationMessage(`Versión no soportada: ${json.version}. Se requiere versión 1.`);
        return;
      }

      if (!json.data) {
        setValidationStatus('invalid');
        setValidationMessage('El backup no contiene datos válidos.');
        return;
      }

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

      // Count items for summary
      const keywordCount = Object.values(json.data.keywordsByMarket || {}).flat().length;
      const asinCount = Object.values(json.data.asinsByMarket || {}).flat().length;
      const categoryCount = Object.values(json.data.categoriesByMarket || {}).flat().length;
      const marketCount = new Set([
        ...Object.keys(json.data.keywordsByMarket || {}),
        ...Object.keys(json.data.asinsByMarket || {}),
        ...Object.keys(json.data.categoriesByMarket || {}),
      ]).size;

      setValidationStatus('valid');
      setValidationMessage(
        `${keywordCount} keywords, ${asinCount} ASINs, ${categoryCount} categorías en ${marketCount} mercado(s)`
      );
      setParsedData(json);
    } catch (err) {
      setValidationStatus('invalid');
      setValidationMessage('Error al leer el archivo JSON.');
    }
  };

  const handleImport = () => {
    if (!parsedData) return;

    // Deserialize dates before importing
    const deserializedData = deserializeDates(parsedData.data);
    onImport(deserializedData);
    toast.success('Backup importado');
    resetState();
    onClose();
  };

  const handleClose = () => {
    resetState();
    onClose();
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

          {validationStatus !== 'idle' && (
            <div 
              className={`flex items-start gap-2 p-3 rounded-md text-sm ${
                validationStatus === 'valid' 
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {validationStatus === 'valid' ? (
                <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span>{validationMessage}</span>
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
