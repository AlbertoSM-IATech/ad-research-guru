import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Trash2,
  ArrowUpDown,
  Upload,
  LayoutGrid,
  LayoutList,
  History,
} from 'lucide-react';
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
import { InlineCompetitionLevelSelect } from './InlineCompetitionLevelSelect';
import { InlineSelectBadge } from './InlineSelectBadge';
import { BulkKeywordImport } from './BulkKeywordImport';
import { BulkCopyTools } from './BulkCopyTools';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { AdvancedFilters, type AdvancedFiltersState } from './AdvancedFilters';
import { KeywordCardView } from './KeywordCardView';
import { KeywordHistoryModal } from './KeywordHistoryModal';
import { VariantDetector } from './VariantDetector';
import { AIAutoClassifier } from './AIAutoClassifier';
import {
  type Keyword,
  type CampaignType,
  type CompetitionLevel,
  type RelevanceLevel,
  type IntentType,
  type KeywordState,
  type BookInfo,
  type HistoryEntry,
  RELEVANCE_LEVELS,
  INTENT_TYPES,
  KEYWORD_STATES,
  calculateRelevance,
  classifyIntent,
} from '@/types/advertising';
import { useToast } from '@/hooks/use-toast';

interface KeywordsSectionProps {
  keywords: Keyword[];
  onAdd: (keyword: Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onAddBulk: (keywords: Array<Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  onUpdate: (id: string, keyword: Partial<Keyword>) => void;
  onDelete: (id: string) => void;
  onDeleteBulk: (ids: string[]) => void;
  onUpdateBulk: (ids: string[], updates: Partial<Keyword>) => void;
  marketplaceId: string;
  bookInfo: BookInfo;
}

type SortField = 'keyword' | 'searchVolume' | 'competitionLevel' | 'relevance' | 'state';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'table' | 'cards';

const ITEMS_PER_PAGE = 20;

export const KeywordsSection = ({
  keywords,
  onAdd,
  onAddBulk,
  onUpdate,
  onDelete,
  onDeleteBulk,
  onUpdateBulk,
  marketplaceId,
  bookInfo,
}: KeywordsSectionProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<AdvancedFiltersState>({
    competition: 'all',
    campaignType: 'all',
    minVolume: '',
    maxVolume: '',
    maxCompetition: '',
    relevance: 'all',
    intent: 'all',
    state: 'all',
  });
  const [sortField, setSortField] = useState<SortField>('keyword');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [quickAddKeyword, setQuickAddKeyword] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [historyKeyword, setHistoryKeyword] = useState<Keyword | null>(null);

  const handleQuickAdd = () => {
    if (!quickAddKeyword.trim()) return;
    
    const relevance = calculateRelevance(quickAddKeyword.trim(), bookInfo);
    const intent = classifyIntent(quickAddKeyword.trim());
    
    onAdd({
      keyword: quickAddKeyword.trim(),
      searchVolume: 0,
      competitionLevel: 'medium',
      campaignTypes: ['SP'],
      notes: '',
      marketplaceId,
      relevance,
      intent,
      state: 'pending',
    });
    setQuickAddKeyword('');
    toast({ title: 'Keyword añadida' });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredKeywords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredKeywords.map((k) => k.id)));
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
    toast({ title: `${selectedIds.size} keywords eliminadas` });
  };

  const handleBulkImport = (newKeywords: Array<Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const classifiedKeywords = newKeywords.map(k => ({
      ...k,
      relevance: k.relevance || calculateRelevance(k.keyword, bookInfo),
      intent: k.intent || classifyIntent(k.keyword),
      state: k.state || 'pending' as KeywordState,
    }));
    onAddBulk(classifiedKeywords);
    toast({ title: `${classifiedKeywords.length} keywords añadidas` });
  };

  const handleBulkChangeCampaignType = (types: CampaignType[]) => {
    onUpdateBulk(Array.from(selectedIds), { campaignTypes: types });
    setSelectedIds(new Set());
  };

  const handleBulkChangeState = (state: KeywordState) => {
    onUpdateBulk(Array.from(selectedIds), { state });
    setSelectedIds(new Set());
  };

  const handleBulkChangeRelevance = (relevance: RelevanceLevel) => {
    onUpdateBulk(Array.from(selectedIds), { relevance });
    setSelectedIds(new Set());
  };

  // Handle update with history tracking
  const handleUpdateWithHistory = (id: string, updates: Partial<Keyword>) => {
    const keyword = keywords.find(k => k.id === id);
    if (!keyword) return;
    
    // Track history for specific fields
    type TrackableField = 'searchVolume' | 'state' | 'relevance';
    const historyEntries: HistoryEntry[] = [];
    const trackedFields: TrackableField[] = ['searchVolume', 'state', 'relevance'];
    
    trackedFields.forEach(field => {
      if (updates[field] !== undefined && updates[field] !== keyword[field]) {
        historyEntries.push({
          id: `${Date.now()}-${field}`,
          timestamp: new Date(),
          field,
          oldValue: keyword[field] !== undefined ? keyword[field] : undefined,
          newValue: updates[field],
        });
      }
    });
    
    if (historyEntries.length > 0) {
      onUpdate(id, {
        ...updates,
        history: [...(keyword.history || []), ...historyEntries],
      });
    } else {
      onUpdate(id, updates);
    }
  };

  // Filter and sort keywords
  const filteredKeywords = useMemo(() => {
    return keywords
      .filter((k) => {
        if (searchTerm && !k.keyword.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        if (filters.competition !== 'all' && k.competitionLevel !== filters.competition) {
          return false;
        }
        if (filters.campaignType !== 'all' && !k.campaignTypes.includes(filters.campaignType)) {
          return false;
        }
        if (filters.minVolume && k.searchVolume < parseInt(filters.minVolume)) {
          return false;
        }
        if (filters.maxVolume && k.searchVolume > parseInt(filters.maxVolume)) {
          return false;
        }
        if (filters.relevance !== 'all' && k.relevance !== filters.relevance) {
          return false;
        }
        if (filters.intent !== 'all' && k.intent !== filters.intent) {
          return false;
        }
        if (filters.state !== 'all' && k.state !== filters.state) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const modifier = sortOrder === 'asc' ? 1 : -1;
        if (sortField === 'keyword') {
          return a.keyword.localeCompare(b.keyword) * modifier;
        }
        if (sortField === 'searchVolume') {
          return (a.searchVolume - b.searchVolume) * modifier;
        }
        if (sortField === 'competitionLevel') {
          const order = ['low', 'medium', 'high'];
          return (order.indexOf(a.competitionLevel) - order.indexOf(b.competitionLevel)) * modifier;
        }
        if (sortField === 'relevance') {
          const order = ['very-high', 'high', 'low', 'none'];
          return (order.indexOf(a.relevance || 'none') - order.indexOf(b.relevance || 'none')) * modifier;
        }
        if (sortField === 'state') {
          const order = ['tested-works', 'pending', 'low-competition', 'discarded'];
          return (order.indexOf(a.state || 'pending') - order.indexOf(b.state || 'pending')) * modifier;
        }
        return 0;
      });
  }, [keywords, searchTerm, filters, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredKeywords.length / ITEMS_PER_PAGE);
  const paginatedKeywords = filteredKeywords.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-semibold text-xl">Palabras Clave</h3>
          <InfoTooltip content="Gestiona las palabras clave. Edita directamente haciendo clic en cualquier celda." />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center rounded-md border border-border">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode('table')}
            >
              <LayoutList className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
          <BulkCopyTools keywords={filteredKeywords} selectedIds={selectedIds} />
          <VariantDetector
            keywords={keywords}
            onGroupVariants={(groupId, keywordIds) => {
              // Mark keywords as variants by updating their notes
              keywordIds.forEach(id => {
                const kw = keywords.find(k => k.id === id);
                if (kw) {
                  onUpdate(id, { 
                    notes: kw.notes ? `${kw.notes} [Variante: ${groupId}]` : `[Variante: ${groupId}]` 
                  });
                }
              });
              toast({ title: `${keywordIds.length} keywords agrupadas como variantes` });
            }}
            onSeparateVariants={(keywordIds) => {
              toast({ title: 'Variantes separadas' });
            }}
          />
          <AIAutoClassifier
            keywords={keywords}
            selectedIds={Array.from(selectedIds)}
            bookInfo={bookInfo}
            marketplaceId={marketplaceId}
            onUpdateKeywords={(ids, updates) => {
              ids.forEach((id, i) => {
                onUpdate(id, updates[i]);
              });
            }}
          />
          <Button variant="outline" size="sm" onClick={() => setIsBulkImportOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            Añadir palabras clave en lote
          </Button>
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected} className="gap-2">
              <Trash2 className="w-4 h-4" />
              Eliminar ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedIds.size}
        onChangeCampaignType={handleBulkChangeCampaignType}
        onChangeState={handleBulkChangeState}
        onChangeRelevance={handleBulkChangeRelevance}
        onDelete={handleDeleteSelected}
      />

      {/* Quick Add */}
      <div className="flex gap-2 p-4 bg-muted/30 rounded-lg">
        <Input
          placeholder="Añadir keyword rápida..."
          value={quickAddKeyword}
          onChange={(e) => setQuickAddKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
          className="flex-1"
        />
        <Button onClick={handleQuickAdd} disabled={!quickAddKeyword.trim()} className="gap-2">
          <Plus className="w-4 h-4" />
          Añadir
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar keywords..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        <AdvancedFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {filteredKeywords.length} de {keywords.length} keywords
        {selectedIds.size > 0 && ` • ${selectedIds.size} seleccionadas`}
      </div>

      {/* Content - Table or Cards */}
      {viewMode === 'table' ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedIds.size === filteredKeywords.length && filteredKeywords.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort('keyword')}>
                    <div className="flex items-center gap-1">Keyword <ArrowUpDown className="w-3 h-3" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-foreground w-[120px]" onClick={() => handleSort('searchVolume')}>
                    <div className="flex items-center gap-1">
                      Vol. búsqueda
                      <ArrowUpDown className="w-3 h-3" />
                      <InfoTooltip content="Número estimado de veces que los usuarios buscan esta palabra clave mensualmente en Amazon. Este valor puede variar por mercado y no es proporcionado por Amazon directamente, por lo que el publisher puede introducir valores manuales o basados en herramientas externas." />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-foreground w-[150px]" onClick={() => handleSort('competitionLevel')}>
                    <div className="flex items-center gap-1">
                      Competidores
                      <ArrowUpDown className="w-3 h-3" />
                      <InfoTooltip content="Número total de productos que aparecen en Amazon al introducir esta palabra clave. Este dato representa la saturación de la búsqueda. Es subjetivo y depende del mercado, por lo que se deberá seleccionar manualmente Alta / Media / Baja." />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-foreground w-[120px]" onClick={() => handleSort('relevance')}>
                    <div className="flex items-center gap-1">
                      Relevancia <ArrowUpDown className="w-3 h-3" />
                      <InfoTooltip content="🔵 Muy relevante, 🟢 Relevante, 🟡 Baja, 🔴 No relevante" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[110px]">
                    <div className="flex items-center gap-1">
                      Intención
                      <InfoTooltip content="Compra, Investigación, Competencia, Problema" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-foreground w-[100px]" onClick={() => handleSort('state')}>
                    <div className="flex items-center gap-1">Estado <ArrowUpDown className="w-3 h-3" /></div>
                  </TableHead>
                  <TableHead className="w-[150px]">
                    <div className="flex items-center gap-1">
                      Campaña
                      <InfoTooltip content="SP, SB, SBV, SD" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[150px]">Notas</TableHead>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedKeywords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {keywords.length === 0
                        ? 'No hay keywords. Añade tu primera keyword o importa en lote.'
                        : 'No se encontraron keywords con los filtros aplicados.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedKeywords.map((keyword) => (
                    <TableRow key={keyword.id} className="hover:bg-muted/30">
                      <TableCell>
                        <Checkbox checked={selectedIds.has(keyword.id)} onCheckedChange={() => toggleSelect(keyword.id)} />
                      </TableCell>
                      <TableCell>
                        <InlineEditableCell
                          value={keyword.keyword}
                          onSave={(value) => handleUpdateWithHistory(keyword.id, { keyword: String(value) })}
                          placeholder="Keyword..."
                          className="font-medium"
                        />
                      </TableCell>
                      <TableCell>
                        <InlineEditableCell
                          value={keyword.searchVolume}
                          onSave={(value) => handleUpdateWithHistory(keyword.id, { searchVolume: Number(value) })}
                          type="number"
                          min={0}
                          formatter={(v) => Number(v).toLocaleString()}
                        />
                      </TableCell>
                      <TableCell>
                        <InlineCompetitionLevelSelect
                          value={keyword.competitionLevel}
                          note={keyword.competitionNote}
                          onChange={(level, note) => handleUpdateWithHistory(keyword.id, { competitionLevel: level, competitionNote: note })}
                        />
                      </TableCell>
                      <TableCell>
                        <InlineSelectBadge
                          value={keyword.relevance || 'none'}
                          options={RELEVANCE_LEVELS.map(r => ({ value: r.value, label: r.label, icon: r.icon }))}
                          onChange={(value) => handleUpdateWithHistory(keyword.id, { relevance: value as RelevanceLevel })}
                        />
                      </TableCell>
                      <TableCell>
                        <InlineSelectBadge
                          value={keyword.intent || 'research'}
                          options={INTENT_TYPES.map(i => ({ value: i.value, label: i.label }))}
                          onChange={(value) => handleUpdateWithHistory(keyword.id, { intent: value as IntentType })}
                        />
                      </TableCell>
                      <TableCell>
                        <InlineSelectBadge
                          value={keyword.state || 'pending'}
                          options={KEYWORD_STATES.map(s => ({ value: s.value, label: s.label, icon: s.icon }))}
                          onChange={(value) => handleUpdateWithHistory(keyword.id, { state: value as KeywordState })}
                        />
                      </TableCell>
                      <TableCell>
                        <InlineCampaignTypeSelect
                          value={keyword.campaignTypes}
                          onChange={(types) => handleUpdateWithHistory(keyword.id, { campaignTypes: types })}
                        />
                      </TableCell>
                      <TableCell>
                        <InlineEditableCell
                          value={keyword.notes}
                          onSave={(value) => handleUpdateWithHistory(keyword.id, { notes: String(value) })}
                          type="textarea"
                          placeholder="Notas..."
                          className="text-sm text-muted-foreground max-w-[150px]"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {keyword.history && keyword.history.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setHistoryKeyword(keyword)}
                              className="text-muted-foreground hover:text-primary"
                              title="Ver historial"
                            >
                              <History className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(keyword.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        /* Card View */
        <KeywordCardView
          keywords={paginatedKeywords}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onUpdate={handleUpdateWithHistory}
          onDelete={onDelete}
          onViewHistory={(keyword) => setHistoryKeyword(keyword)}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      <BulkKeywordImport
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImport={handleBulkImport}
        marketplaceId={marketplaceId}
        bookInfo={bookInfo}
        existingKeywords={keywords.map((k) => k.keyword)}
      />

      {/* History Modal */}
      <KeywordHistoryModal
        keyword={historyKeyword}
        isOpen={!!historyKeyword}
        onClose={() => setHistoryKeyword(null)}
      />
    </div>
  );
};
