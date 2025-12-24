import { useState } from 'react';
import { Upload, Eye, Plus, X } from 'lucide-react';
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
import { InlineCampaignTypeSelect } from './InlineCampaignTypeSelect';
import { Badge } from '@/components/ui/badge';
import {
  type AdvertisingCategory,
  type CampaignType,
  CAMPAIGN_TYPES,
  normalizeText,
} from '@/types/advertising';

interface BulkCategoryImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (categories: Array<Omit<AdvertisingCategory, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  existingCategories: string[];
  marketplaceId: string;
}

interface ParsedCategory {
  name: string;
  amazonId: string;
  campaignTypes: CampaignType[];
  notes: string;
  isDuplicate: boolean;
}

export const BulkCategoryImport = ({
  isOpen,
  onClose,
  onImport,
  existingCategories,
  marketplaceId,
}: BulkCategoryImportProps) => {
  const [bulkText, setBulkText] = useState('');
  const [defaultCampaignTypes, setDefaultCampaignTypes] = useState<CampaignType[]>(['SD']);
  const [defaultNotes, setDefaultNotes] = useState('');
  const [parsedCategories, setParsedCategories] = useState<ParsedCategory[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const handleCampaignTypeToggle = (type: CampaignType) => {
    setDefaultCampaignTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const parseCategories = () => {
    const lines = bulkText
      .split(/[\n;]+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const existingSet = new Set(existingCategories.map(c => normalizeText(c)));

    const parsed: ParsedCategory[] = lines.map((line) => {
      // Check if line contains amazonId (format: "Category Name | amazonId" or "Category Name, amazonId")
      const parts = line.split(/[|,\t]/).map(p => p.trim());
      const name = parts[0] || '';
      const amazonId = parts[1] || '';

      return {
        name,
        amazonId,
        campaignTypes: defaultCampaignTypes,
        notes: defaultNotes,
        isDuplicate: existingSet.has(normalizeText(name)),
      };
    });

    setParsedCategories(parsed);
    setShowPreview(true);
  };

  const updateParsedCategory = (index: number, updates: Partial<ParsedCategory>) => {
    setParsedCategories(prev => 
      prev.map((c, i) => i === index ? { ...c, ...updates } : c)
    );
  };

  const handleImport = () => {
    const categoriesToImport = parsedCategories
      .filter((c) => c.name.trim() && (!skipDuplicates || !c.isDuplicate))
      .map((c) => ({
        name: c.name,
        amazonId: c.amazonId,
        campaignTypes: c.campaignTypes,
        notes: c.notes,
        marketplaceId,
      }));
    onImport(categoriesToImport);
    handleClose();
  };

  const handleClose = () => {
    setBulkText('');
    setParsedCategories([]);
    setShowPreview(false);
    onClose();
  };

  const removeFromPreview = (index: number) => {
    setParsedCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const validCount = parsedCategories.filter((c) => c.name.trim()).length;
  const duplicateCount = parsedCategories.filter((c) => c.isDuplicate).length;
  const toImportCount = parsedCategories.filter((c) => c.name.trim() && (!skipDuplicates || !c.isDuplicate)).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importar Categorías en Lote
          </DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-6 py-4">
            {/* Bulk Text Input */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Categorías (una por línea)</Label>
                <InfoTooltip content="Pega tu lista de categorías. Puedes incluir el ID de Amazon separado por | o coma. Ej: Libros > Ficción | 12345" />
              </div>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Libros > Ficción&#10;Libros > No Ficción | 123456&#10;Electrónica > Accesorios&#10;Hogar > Decoración, 789012"
                rows={8}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {bulkText.split(/[\n;]+/).filter((l) => l.trim()).length} categorías detectadas
              </p>
              <p className="text-xs text-muted-foreground">
                Formato opcional: <code className="bg-muted px-1 rounded">Nombre categoría | ID Amazon</code>
              </p>
            </div>

            {/* Default Values */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Valores por defecto para todas las categorías</h4>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Tipos de Campaña</Label>
                  <InfoTooltip content="Selecciona los tipos de campaña por defecto para las categorías importadas" />
                </div>
                <div className="flex flex-wrap gap-3">
                  {CAMPAIGN_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bulk-cat-campaign-${type.value}`}
                        checked={defaultCampaignTypes.includes(type.value)}
                        onCheckedChange={() => handleCampaignTypeToggle(type.value)}
                      />
                      <label
                        htmlFor={`bulk-cat-campaign-${type.value}`}
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
                  <Label htmlFor="bulk-cat-notes">Notas (opcional)</Label>
                  <InfoTooltip content="Añade notas que se aplicarán a todas las categorías" />
                </div>
                <Textarea
                  id="bulk-cat-notes"
                  value={defaultNotes}
                  onChange={(e) => setDefaultNotes(e.target.value)}
                  placeholder="Ej: Categorías principales de mi nicho..."
                  rows={2}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                Vista previa ({parsedCategories.length} categorías)
              </h4>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                Volver a editar
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                {validCount} válidas
              </Badge>
              {duplicateCount > 0 && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                  {duplicateCount} duplicadas
                </Badge>
              )}
            </div>

            {/* Skip duplicates option */}
            {duplicateCount > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <Checkbox
                  id="skip-duplicate-cats"
                  checked={skipDuplicates}
                  onCheckedChange={(checked) => setSkipDuplicates(checked === true)}
                />
                <label htmlFor="skip-duplicate-cats" className="text-sm cursor-pointer">
                  Ignorar categorías duplicadas ({duplicateCount})
                </label>
              </div>
            )}

            <div className="max-h-[400px] overflow-y-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-2 font-medium">Categoría</th>
                    <th className="text-left p-2 font-medium w-[120px]">ID Amazon</th>
                    <th className="text-left p-2 font-medium">Estado</th>
                    <th className="text-left p-2 font-medium">Tipos</th>
                    <th className="text-left p-2 font-medium">Notas</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {parsedCategories.map((category, index) => (
                    <tr
                      key={index}
                      className={`border-t border-border hover:bg-muted/30 ${
                        category.isDuplicate ? 'bg-yellow-500/5' : ''
                      }`}
                    >
                      <td className="p-2">
                        <Input
                          value={category.name}
                          onChange={(e) => updateParsedCategory(index, { name: e.target.value })}
                          className="h-8 bg-transparent border-transparent hover:border-border focus:border-primary"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={category.amazonId}
                          onChange={(e) => updateParsedCategory(index, { amazonId: e.target.value })}
                          placeholder="Opcional"
                          className="h-8 font-mono bg-transparent border-transparent hover:border-border focus:border-primary"
                        />
                      </td>
                      <td className="p-2">
                        {category.isDuplicate ? (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                            Duplicada
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                            OK
                          </Badge>
                        )}
                      </td>
                      <td className="p-2">
                        <InlineCampaignTypeSelect
                          value={category.campaignTypes}
                          onChange={(types) => updateParsedCategory(index, { campaignTypes: types })}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={category.notes}
                          onChange={(e) => updateParsedCategory(index, { notes: e.target.value })}
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
            <Button onClick={parseCategories} disabled={!bulkText.trim()} className="gap-2">
              <Eye className="w-4 h-4" />
              Procesar Categorías
            </Button>
          ) : (
            <Button onClick={handleImport} disabled={toImportCount === 0} className="gap-2">
              <Plus className="w-4 h-4" />
              Guardar {toImportCount} Categorías
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
