import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, FolderOpen, Search, Upload } from 'lucide-react';
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
import { BulkCategoryImport } from './BulkCategoryImport';
import { BulkCategoryCopyTools } from './BulkCategoryCopyTools';
import { type AdvertisingCategory, type CampaignType } from '@/types/advertising';
import { useToast } from '@/hooks/use-toast';

interface CategoriesSectionProps {
  categories: AdvertisingCategory[];
  onAdd: (category: Omit<AdvertisingCategory, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onAddBulk: (categories: Array<Omit<AdvertisingCategory, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  onUpdate: (id: string, category: Partial<AdvertisingCategory>) => void;
  onDelete: (id: string) => void;
  onDeleteBulk: (ids: string[]) => void;
  marketplaceId: string;
  // Lifted selection state
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
}

export const CategoriesSection = ({
  categories,
  onAdd,
  onAddBulk,
  onUpdate,
  onDelete,
  onDeleteBulk,
  marketplaceId,
  selectedIds,
  onSelectedIdsChange,
}: CategoriesSectionProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [quickAddName, setQuickAddName] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Memoize callback to avoid infinite loops
  const stableOnSelectedIdsChange = useCallback(onSelectedIdsChange, [onSelectedIdsChange]);

  const handleQuickAdd = () => {
    if (!quickAddName.trim()) return;

    onAdd({
      name: quickAddName.trim(),
      amazonId: '',
      campaignTypes: ['SD'],
      notes: '',
      marketplaceId,
    });
    setQuickAddName('');
    toast({ title: 'Categoría añadida' });
  };

  const handleBulkImport = (importedCategories: Array<Omit<AdvertisingCategory, 'id' | 'createdAt' | 'updatedAt'>>) => {
    onAddBulk(importedCategories);
    toast({ title: `${importedCategories.length} categorías añadidas` });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCategories.length) {
      onSelectedIdsChange(new Set());
    } else {
      onSelectedIdsChange(new Set(filteredCategories.map((c) => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onSelectedIdsChange(newSet);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    onDeleteBulk(Array.from(selectedIds));
    onSelectedIdsChange(new Set());
    toast({ title: `${count} categorías eliminadas` });
  };

  const filteredCategories = categories.filter((c) =>
    searchTerm ? c.name.toLowerCase().includes(searchTerm.toLowerCase()) : true
  );

  // Purge invalid selection IDs when filtered list changes
  useEffect(() => {
    const validIds = new Set(filteredCategories.map(c => c.id));
    const nextSelected = new Set([...selectedIds].filter(id => validIds.has(id)));
    if (nextSelected.size !== selectedIds.size) {
      stableOnSelectedIdsChange(nextSelected);
    }
  }, [filteredCategories, selectedIds, stableOnSelectedIdsChange]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-semibold text-xl">Categorías</h3>
          <InfoTooltip content="Las categorías publicitarias te permiten orientar tus anuncios hacia secciones específicas del catálogo de Amazon." />
        </div>
        <div className="flex items-center gap-2">
          <BulkCategoryCopyTools categories={categories} selectedIds={selectedIds} />
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
          placeholder="Añadir categoría (ej: Libros > Ficción)..."
          value={quickAddName}
          onChange={(e) => setQuickAddName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
          className="flex-1"
        />
        <Button onClick={handleQuickAdd} disabled={!quickAddName.trim()} className="gap-2">
          <Plus className="w-4 h-4" />
          Añadir
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar categorías..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {filteredCategories.length} de {categories.length} categorías
        {selectedIds.size > 0 && ` • ${selectedIds.size} seleccionadas`}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={selectedIds.size === filteredCategories.length && filteredCategories.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  Categoría
                  <InfoTooltip content="Nombre descriptivo de la categoría. Ej: Libros > Ficción > Ciencia Ficción" />
                </div>
              </TableHead>
              <TableHead className="w-[150px]">
                <div className="flex items-center gap-1">
                  ID de Amazon
                  <InfoTooltip content="Identificador único de la categoría en Amazon (opcional). Lo encuentras en la URL." />
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  Tipos de Campaña
                  <InfoTooltip content="Campañas donde puede usarse esta categoría." />
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  Notas
                  <InfoTooltip content="CPC estimado, estrategia, observaciones..." />
                </div>
              </TableHead>
              <TableHead className="w-[60px]">
                <InfoTooltip content="Eliminar categoría" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <FolderOpen className="w-8 h-8 opacity-50" />
                    <p>{categories.length === 0 ? 'No hay categorías. Añade tu primera categoría arriba.' : 'No se encontraron categorías.'}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((category) => (
                <TableRow key={category.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(category.id)}
                      onCheckedChange={() => toggleSelect(category.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEditableCell
                      value={category.name}
                      onSave={(value) => onUpdate(category.id, { name: String(value) })}
                      placeholder="Nombre categoría..."
                      className="font-medium"
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEditableCell
                      value={category.amazonId}
                      onSave={(value) => onUpdate(category.id, { amazonId: String(value) })}
                      placeholder="ID..."
                      className="font-mono text-sm text-muted-foreground"
                    />
                  </TableCell>
                  <TableCell>
                    <InlineCampaignTypeSelect
                      value={category.campaignTypes}
                      onChange={(types) => onUpdate(category.id, { campaignTypes: types })}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEditableCell
                      value={category.notes}
                      onSave={(value) => onUpdate(category.id, { notes: String(value) })}
                      type="textarea"
                      placeholder="Añadir notas..."
                      className="text-sm text-muted-foreground max-w-[250px]"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(category.id)}
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
      <BulkCategoryImport
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onImport={handleBulkImport}
        existingCategories={categories.map((c) => c.name)}
        marketplaceId={marketplaceId}
      />
    </div>
  );
};
