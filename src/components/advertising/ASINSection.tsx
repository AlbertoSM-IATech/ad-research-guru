import { useState } from 'react';
import { Plus, Trash2, Target, Search, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { InfoTooltip } from './InfoTooltip';
import { InlineEditableCell } from './InlineEditableCell';
import { InlineCampaignTypeSelect } from './InlineCampaignTypeSelect';
import { BulkASINImport } from './BulkASINImport';
import { BulkASINCopyTools } from './BulkASINCopyTools';
import { type TargetASIN, type CampaignType } from '@/types/advertising';
import { useToast } from '@/hooks/use-toast';

interface ASINSectionProps {
  asins: TargetASIN[];
  onAdd: (asin: Omit<TargetASIN, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onAddBulk: (asins: Array<Omit<TargetASIN, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  onUpdate: (id: string, asin: Partial<TargetASIN>) => void;
  onDelete: (id: string) => void;
  onDeleteBulk: (ids: string[]) => void;
  marketplaceId: string;
}

export const ASINSection = ({
  asins,
  onAdd,
  onAddBulk,
  onUpdate,
  onDelete,
  onDeleteBulk,
  marketplaceId,
}: ASINSectionProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [quickAddASIN, setQuickAddASIN] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkImport, setShowBulkImport] = useState(false);

  const handleQuickAdd = () => {
    const asinValue = quickAddASIN.toUpperCase().trim();
    if (!asinValue) return;

    // Validate ASIN format
    const asinRegex = /^[A-Z0-9]{10}$/;
    if (!asinRegex.test(asinValue)) {
      toast({
        title: 'Error',
        description: 'El ASIN debe tener exactamente 10 caracteres alfanuméricos',
        variant: 'destructive',
      });
      return;
    }

    onAdd({
      asin: asinValue,
      campaignTypes: ['SP'],
      notes: '',
      marketplaceId,
    });
    setQuickAddASIN('');
    toast({ title: 'ASIN añadido' });
  };

  const handleBulkImport = (importedASINs: Array<Omit<TargetASIN, 'id' | 'createdAt' | 'updatedAt'>>) => {
    onAddBulk(importedASINs);
    toast({ title: `${importedASINs.length} ASINs añadidos` });
  };

  const handleASINUpdate = (id: string, newValue: string | number) => {
    const asinValue = String(newValue).toUpperCase().trim();
    const asinRegex = /^[A-Z0-9]{10}$/;
    if (!asinRegex.test(asinValue)) {
      toast({
        title: 'Error',
        description: 'El ASIN debe tener exactamente 10 caracteres alfanuméricos',
        variant: 'destructive',
      });
      return;
    }
    onUpdate(id, { asin: asinValue });
  };

  const handleBSRUpdate = (id: string, value: string | number) => {
    const numValue = Number(value);
    if (value === '' || value === null) {
      onUpdate(id, { bsr: undefined });
    } else if (!isNaN(numValue) && numValue >= 0) {
      onUpdate(id, { bsr: numValue });
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredASINs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredASINs.map((a) => a.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    onDeleteBulk(Array.from(selectedIds));
    setSelectedIds(new Set());
    toast({ title: `${selectedIds.size} ASINs eliminados` });
  };

  const filteredASINs = asins.filter((a) =>
    searchTerm ? a.asin.toLowerCase().includes(searchTerm.toLowerCase()) : true
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-semibold text-xl">ASIN Objetivo</h3>
          <InfoTooltip content="Los ASIN objetivo permiten orientar tus anuncios hacia productos específicos. Edita directamente en la tabla." />
        </div>
        <div className="flex items-center gap-2">
          <BulkASINCopyTools asins={asins} selectedIds={selectedIds} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBulkImport(true)}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Carga masiva
          </Button>
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Quick Add */}
      <div className="flex gap-2 p-4 bg-muted/30 rounded-lg">
        <Input
          placeholder="Añadir ASIN (ej: B08N5WRWNW)..."
          value={quickAddASIN}
          onChange={(e) => setQuickAddASIN(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
          className="flex-1 font-mono"
          maxLength={10}
        />
        <Button onClick={handleQuickAdd} disabled={!quickAddASIN.trim()} className="gap-2">
          <Plus className="w-4 h-4" />
          Añadir
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar ASIN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {filteredASINs.length} de {asins.length} ASIN
        {selectedIds.size > 0 && ` • ${selectedIds.size} seleccionados`}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={selectedIds.size === filteredASINs.length && filteredASINs.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  ASIN
                  <InfoTooltip content="Código único de 10 caracteres que identifica el producto en Amazon." />
                </div>
              </TableHead>
              <TableHead className="w-[100px]">
                <div className="flex items-center gap-1">
                  BSR
                  <InfoTooltip content="Best Seller Rank - Posición del producto en el ranking de ventas de Amazon. Menor número = más ventas." />
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  Tipos de Campaña
                  <InfoTooltip content="Campañas donde puede usarse este ASIN como objetivo." />
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  Notas
                  <InfoTooltip content="Información sobre el producto, por qué lo seleccionaste, etc." />
                </div>
              </TableHead>
              <TableHead className="w-[60px]">
                <InfoTooltip content="Eliminar ASIN" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredASINs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Target className="w-8 h-8 opacity-50" />
                    <p>{asins.length === 0 ? 'No hay ASIN. Añade tu primer ASIN arriba.' : 'No se encontraron ASIN.'}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredASINs.map((asin) => (
                <TableRow key={asin.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(asin.id)}
                      onCheckedChange={() => toggleSelect(asin.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEditableCell
                      value={asin.asin}
                      onSave={(value) => handleASINUpdate(asin.id, value)}
                      placeholder="ASIN..."
                      className="font-mono font-medium"
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEditableCell
                      value={asin.bsr || ''}
                      onSave={(value) => handleBSRUpdate(asin.id, value)}
                      type="number"
                      min={0}
                      placeholder="—"
                      formatter={(v) => v ? Number(v).toLocaleString() : '—'}
                      className="text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <InlineCampaignTypeSelect
                      value={asin.campaignTypes}
                      onChange={(types) => onUpdate(asin.id, { campaignTypes: types })}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEditableCell
                      value={asin.notes}
                      onSave={(value) => onUpdate(asin.id, { notes: String(value) })}
                      type="textarea"
                      placeholder="Añadir notas..."
                      className="text-sm text-muted-foreground max-w-[300px]"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(asin.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bulk Import Modal */}
      <BulkASINImport
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onImport={handleBulkImport}
        existingASINs={asins.map((a) => a.asin)}
        marketplaceId={marketplaceId}
      />
    </div>
  );
};
