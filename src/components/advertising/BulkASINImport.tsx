import { useState } from 'react';
import { Upload, Eye, Plus, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { InfoTooltip } from './InfoTooltip';
import { CampaignTypeBadge } from './CampaignTypeBadge';
import { InlineCampaignTypeSelect } from './InlineCampaignTypeSelect';
import { Badge } from '@/components/ui/badge';
import {
  type TargetASIN,
  type CampaignType,
  CAMPAIGN_TYPES,
} from '@/types/advertising';

interface BulkASINImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (asins: Array<Omit<TargetASIN, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  existingASINs: string[];
  marketplaceId: string;
}

interface ParsedASIN {
  asin: string;
  campaignTypes: CampaignType[];
  notes: string;
  isValid: boolean;
  isDuplicate: boolean;
}

export const BulkASINImport = ({
  isOpen,
  onClose,
  onImport,
  existingASINs,
  marketplaceId,
}: BulkASINImportProps) => {
  const [bulkText, setBulkText] = useState('');
  const [defaultCampaignTypes, setDefaultCampaignTypes] = useState<CampaignType[]>(['SP']);
  const [defaultNotes, setDefaultNotes] = useState('');
  const [parsedASINs, setParsedASINs] = useState<ParsedASIN[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const handleCampaignTypeToggle = (type: CampaignType) => {
    setDefaultCampaignTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const parseASINs = () => {
    const asinRegex = /^[A-Z0-9]{10}$/;
    const lines = bulkText
      .split(/[\n,;\t]+/)
      .map((line) => line.trim().toUpperCase())
      .filter((line) => line.length > 0);

    const existingSet = new Set(existingASINs.map(a => a.toUpperCase()));

    const parsed: ParsedASIN[] = lines.map((asin) => ({
      asin,
      campaignTypes: defaultCampaignTypes,
      notes: defaultNotes,
      isValid: asinRegex.test(asin),
      isDuplicate: existingSet.has(asin),
    }));

    setParsedASINs(parsed);
    setShowPreview(true);
  };

  const updateParsedASIN = (index: number, updates: Partial<ParsedASIN>) => {
    setParsedASINs(prev => 
      prev.map((a, i) => i === index ? { ...a, ...updates } : a)
    );
  };

  const handleImport = () => {
    const asinsToImport = parsedASINs
      .filter((a) => a.isValid && (!skipDuplicates || !a.isDuplicate))
      .map((a) => ({
        asin: a.asin,
        campaignTypes: a.campaignTypes,
        notes: a.notes,
        marketplaceId,
      }));
    onImport(asinsToImport);
    handleClose();
  };

  const handleClose = () => {
    setBulkText('');
    setParsedASINs([]);
    setShowPreview(false);
    onClose();
  };

  const removeFromPreview = (index: number) => {
    setParsedASINs((prev) => prev.filter((_, i) => i !== index));
  };

  const validCount = parsedASINs.filter((a) => a.isValid).length;
  const duplicateCount = parsedASINs.filter((a) => a.isDuplicate).length;
  const invalidCount = parsedASINs.filter((a) => !a.isValid).length;
  const toImportCount = parsedASINs.filter((a) => a.isValid && (!skipDuplicates || !a.isDuplicate)).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importar ASINs en Lote
          </DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-6 py-4">
            {/* Bulk Text Input */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>ASINs (uno por línea o separados por coma/punto y coma)</Label>
                <InfoTooltip content="Pega tu lista de ASINs. Cada ASIN debe tener exactamente 10 caracteres alfanuméricos. Separadores: saltos de línea, comas, punto y coma o tabulaciones." />
              </div>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="B08N5WRWNW&#10;B09V3KXJPB&#10;B07XJ8C8F5&#10;B08CFSZLQ4"
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {bulkText.split(/[\n,;\t]+/).filter((l) => l.trim()).length} ASINs detectados
              </p>
            </div>

            {/* Default Values */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Valores por defecto para todos los ASINs</h4>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Tipos de Campaña</Label>
                  <InfoTooltip content="Selecciona los tipos de campaña por defecto para los ASINs importados" />
                </div>
                <div className="flex flex-wrap gap-3">
                  {CAMPAIGN_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bulk-asin-campaign-${type.value}`}
                        checked={defaultCampaignTypes.includes(type.value)}
                        onCheckedChange={() => handleCampaignTypeToggle(type.value)}
                      />
                      <label
                        htmlFor={`bulk-asin-campaign-${type.value}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {type.value}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="bulk-asin-notes">Notas (opcional)</Label>
                  <InfoTooltip content="Añade notas que se aplicarán a todos los ASINs" />
                </div>
                <Textarea
                  id="bulk-asin-notes"
                  value={defaultNotes}
                  onChange={(e) => setDefaultNotes(e.target.value)}
                  placeholder="Ej: ASINs de competidores principales..."
                  rows={2}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                Vista previa ({parsedASINs.length} ASINs)
              </h4>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                Volver a editar
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                {validCount} válidos
              </Badge>
              {duplicateCount > 0 && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                  {duplicateCount} duplicados
                </Badge>
              )}
              {invalidCount > 0 && (
                <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                  {invalidCount} inválidos
                </Badge>
              )}
            </div>

            {/* Skip duplicates option */}
            {duplicateCount > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <Checkbox
                  id="skip-duplicates"
                  checked={skipDuplicates}
                  onCheckedChange={(checked) => setSkipDuplicates(checked === true)}
                />
                <label htmlFor="skip-duplicates" className="text-sm cursor-pointer">
                  Ignorar ASINs duplicados ({duplicateCount})
                </label>
              </div>
            )}

            <div className="max-h-[400px] overflow-y-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-2 font-medium w-[140px]">ASIN</th>
                    <th className="text-left p-2 font-medium">Estado</th>
                    <th className="text-left p-2 font-medium">Tipos</th>
                    <th className="text-left p-2 font-medium">Notas</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {parsedASINs.map((asin, index) => (
                    <tr 
                      key={index} 
                      className={`border-t border-border hover:bg-muted/30 ${
                        !asin.isValid ? 'bg-red-500/5' : 
                        asin.isDuplicate ? 'bg-yellow-500/5' : ''
                      }`}
                    >
                      <td className="p-2">
                        <Input
                          value={asin.asin}
                          onChange={(e) => {
                            const newAsin = e.target.value.toUpperCase();
                            const isValid = /^[A-Z0-9]{10}$/.test(newAsin);
                            updateParsedASIN(index, { asin: newAsin, isValid });
                          }}
                          className="h-8 font-mono bg-transparent border-transparent hover:border-border focus:border-primary"
                        />
                      </td>
                      <td className="p-2">
                        {!asin.isValid ? (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Inválido
                          </Badge>
                        ) : asin.isDuplicate ? (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                            Duplicado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                            OK
                          </Badge>
                        )}
                      </td>
                      <td className="p-2">
                        <InlineCampaignTypeSelect
                          value={asin.campaignTypes}
                          onChange={(types) => updateParsedASIN(index, { campaignTypes: types })}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={asin.notes}
                          onChange={(e) => updateParsedASIN(index, { notes: e.target.value })}
                          placeholder="Notas..."
                          className="h-8 bg-transparent border-transparent hover:border-border focus:border-primary"
                        />
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => removeFromPreview(index)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {!showPreview ? (
            <Button onClick={parseASINs} disabled={!bulkText.trim()} className="gap-2">
              <Eye className="w-4 h-4" />
              Procesar ASINs
            </Button>
          ) : (
            <Button onClick={handleImport} disabled={toImportCount === 0} className="gap-2">
              <Plus className="w-4 h-4" />
              Guardar {toImportCount} ASINs
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
