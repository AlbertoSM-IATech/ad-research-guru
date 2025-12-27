import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Trash2,
  ArrowUpDown,
  Upload,
  LayoutGrid,
  LayoutList,
  History,
  PanelRightOpen,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { InfoTooltip } from './InfoTooltip';
import { InlineEditableCell } from './InlineEditableCell';
import { InlineCampaignTypeSelect } from './InlineCampaignTypeSelect';
import { InlineCompetitionLevelSelect } from './InlineCompetitionLevelSelect';
import { InlineSelectBadge } from './InlineSelectBadge';
import { BulkKeywordImport } from './BulkKeywordImport';
import { BulkCopyTools } from './BulkCopyTools';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { AdvancedFilters, type AdvancedFiltersState } from './AdvancedFilters';
import { QuickFiltersBar } from './QuickFiltersBar';
import { KeywordCardView } from './KeywordCardView';
import { KeywordHistoryModal } from './KeywordHistoryModal';
import { VariantDetector } from './VariantDetector';
import { KeywordDetailPanel } from './KeywordDetailPanel';
import { MarketScoreCell } from './MarketScoreCell';
import { NewKeywordWizard } from './NewKeywordWizard';
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
import { calculateMarketScore, getDefaultMarketData } from '@/lib/market-score';
import { createKeywordDefaults } from '@/lib/keyword-helpers';
import { getAutoStatusFromScore } from '@/lib/keyword-builder';
import { 
  sortKeywords, 
  getKeywordMarketScore, 
  isMarketDataIncomplete,
  SORT_OPTIONS,
  type SortField,
  type SortOrder,
} from '@/lib/keyword-sorting';
import {
  applyKeywordFilters,
  applyQuickFilter,
  type QuickFilter,
} from '@/lib/keyword-filters';
import { useKeywordUIPersistence } from '@/hooks/useKeywordUIPersistence';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface KeywordsSectionProps {
  keywords: Keyword[];
  onAdd: (keyword: Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'> | Keyword) => void;
  onAddBulk: (keywords: Array<Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  onUpdate: (id: string, keyword: Partial<Keyword>) => void;
  onDelete: (id: string) => void;
  onDeleteBulk: (ids: string[]) => void;
  onUpdateBulk: (ids: string[], updates: Partial<Keyword>) => void;
  marketplaceId: string;
  bookInfo: BookInfo;
  // Lifted selection state
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  // Unified search - passed from parent
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
}

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
  selectedIds,
  onSelectedIdsChange,
  searchTerm,
  onSearchTermChange,
}: KeywordsSectionProps) => {
  const { toast } = useToast();
  
  // Use persistence hook for UI state
  const {
    state: persistedState,
    isHydrated,
    updateFilters,
    updateQuickFilter,
    updateSort,
    updateViewMode,
  } = useKeywordUIPersistence(marketplaceId);
  
  // Local state synced with persistence
  const [filters, setFilters] = useState<AdvancedFiltersState>(persistedState.filters);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(persistedState.quickFilter);
  const [sortField, setSortField] = useState<SortField>(persistedState.sortField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(persistedState.sortOrder);
  const [viewMode, setViewMode] = useState<ViewMode>(persistedState.viewMode);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [quickAddKeyword, setQuickAddKeyword] = useState('');
  const [historyKeyword, setHistoryKeyword] = useState<Keyword | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardInitialKeyword, setWizardInitialKeyword] = useState('');
  const [validationKeyword, setValidationKeyword] = useState<Keyword | null>(null);
  
  // Sync persisted state when hydrated
  useEffect(() => {
    if (isHydrated) {
      setFilters(persistedState.filters);
      setQuickFilter(persistedState.quickFilter);
      setSortField(persistedState.sortField);
      setSortOrder(persistedState.sortOrder);
      setViewMode(persistedState.viewMode);
    }
  }, [isHydrated, persistedState]);

  // Memoize callback to avoid infinite loops
  const stableOnSelectedIdsChange = useCallback(onSelectedIdsChange, [onSelectedIdsChange]);

  // Open wizard instead of adding directly
  const handleQuickAdd = () => {
    if (!quickAddKeyword.trim()) return;
    setWizardInitialKeyword(quickAddKeyword.trim());
    setIsWizardOpen(true);
    setQuickAddKeyword('');
  };
  
  // Handle wizard completion - open detail panel immediately (no setTimeout hack)
  const handleWizardComplete = (keyword: Keyword) => {
    // Add the keyword (it already has id, createdAt, updatedAt from wizard)
    onAdd(keyword);
    setWizardInitialKeyword('');
    
    // Show toast
    toast({ 
      title: 'Keyword creada', 
      description: `Market Score: ${keyword.marketScore}/100` 
    });
    
    // Open detail panel immediately - no need to search, we have the complete keyword
    setValidationKeyword(keyword);
  };
  
  // Handle opening existing keyword from wizard duplicate detection
  const handleOpenExistingKeyword = (keyword: Keyword) => {
    setValidationKeyword(keyword);
  };
  
  // Open wizard for new keyword (no pre-filled keyword)
  const handleOpenNewKeywordWizard = () => {
    setWizardInitialKeyword('');
    setIsWizardOpen(true);
  };

  const handleSort = (field: SortField) => {
    let newOrder: SortOrder;
    if (sortField === field) {
      newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      newOrder = field === 'marketScore' || field === 'searchVolume' ? 'desc' : 'asc';
    }
    setSortField(field);
    setSortOrder(newOrder);
    updateSort(field, newOrder);
  };

  const handleSortOptionChange = (value: string) => {
    const [field, order] = value.split('-') as [SortField, SortOrder];
    setSortField(field);
    setSortOrder(order);
    updateSort(field, order);
  };
  
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    updateViewMode(mode);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredKeywords.length) {
      onSelectedIdsChange(new Set());
    } else {
      onSelectedIdsChange(new Set(filteredKeywords.map((k) => k.id)));
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
    toast({ title: `${count} keywords eliminadas` });
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
    onSelectedIdsChange(new Set());
  };

  const handleBulkChangeState = (state: KeywordState) => {
    onUpdateBulk(Array.from(selectedIds), { state });
    onSelectedIdsChange(new Set());
  };

  const handleBulkChangeRelevance = (relevance: RelevanceLevel) => {
    onUpdateBulk(Array.from(selectedIds), { relevance });
    onSelectedIdsChange(new Set());
  };

  // Handle keyword update from detail panel
  const handleKeywordDetailSave = (keywordId: string, updates: Partial<Keyword>) => {
    onUpdate(keywordId, updates);
    toast({ title: 'Keyword guardada', description: `Market Score: ${updates.marketScore}/100` });
  };

  // Handle update with history tracking + auto status update
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
    
    // Auto-update status if not manually set and market data changed
    let finalUpdates = { ...updates };
    const marketDataFields = ['searchVolume', 'competitors', 'price', 'royalties'];
    const isMarketDataUpdate = marketDataFields.some(f => updates[f as keyof typeof updates] !== undefined);
    
    if (isMarketDataUpdate && !keyword.statusManuallySet) {
      // Recalculate market score with new data
      const newSearchVolume = updates.searchVolume ?? keyword.searchVolume;
      const newCompetitors = updates.competitors ?? keyword.competitors;
      const newPrice = updates.price ?? keyword.price;
      const newRoyalties = updates.royalties ?? keyword.royalties;
      const marketData = keyword.marketData ?? getDefaultMarketData();
      
      const newMarketScore = calculateMarketScore({
        searchVolume: newSearchVolume,
        competitors: newCompetitors,
        price: newPrice,
        royalties: newRoyalties,
        brandRisk: marketData.brandRisk,
        trafficSource: marketData.trafficSource,
      }).total;
      
      finalUpdates.marketScore = newMarketScore;
      finalUpdates.status = getAutoStatusFromScore(newMarketScore);
    }
    
    if (historyEntries.length > 0) {
      onUpdate(id, {
        ...finalUpdates,
        history: [...(keyword.history || []), ...historyEntries],
      });
    } else {
      onUpdate(id, finalUpdates);
    }
  };

  // Handle quick filter change - resets advanced filters
  const handleQuickFilterChange = (filter: QuickFilter) => {
    setQuickFilter(filter);
    updateQuickFilter(filter);
    if (filter !== 'all') {
      // Reset advanced filters when using quick filter
      const resetFilters: AdvancedFiltersState = {
        competition: 'all',
        campaignType: 'all',
        minVolume: '',
        maxVolume: '',
        maxCompetition: '',
        relevance: 'all',
        intent: 'all',
        state: 'all',
        purpose: 'all',
        status: 'all',
      };
      setFilters(resetFilters);
      updateFilters(resetFilters);
    }
    setCurrentPage(1);
  };

  // Handle advanced filter change - resets quick filter
  const handleAdvancedFiltersChange = (newFilters: AdvancedFiltersState) => {
    setFilters(newFilters);
    updateFilters(newFilters);
    setQuickFilter('all');
    updateQuickFilter('all');
    setCurrentPage(1);
  };

  // Calculate quick filter counts
  const quickFilterCounts = useMemo(() => {
    return {
      all: keywords.length,
      'ready-for-ads': applyQuickFilter(keywords, 'ready-for-ads').length,
      candidates: applyQuickFilter(keywords, 'candidates').length,
      discard: applyQuickFilter(keywords, 'discard').length,
    };
  }, [keywords]);

  // Filter and sort keywords
  const filteredKeywords = useMemo(() => {
    let result = keywords;

    // Apply quick filter first if active
    if (quickFilter !== 'all') {
      result = applyQuickFilter(result, quickFilter);
    }

    // Then apply search and advanced filters
    result = applyKeywordFilters(result, {
      searchTerm,
      purpose: filters.purpose,
      status: filters.status,
      competition: filters.competition,
      campaignType: filters.campaignType,
      minVolume: filters.minVolume,
      maxVolume: filters.maxVolume,
      maxCompetition: filters.maxCompetition,
      relevance: filters.relevance,
      intent: filters.intent,
      state: filters.state,
    });

    // Finally sort
    return sortKeywords(result, sortField, sortOrder);
  }, [keywords, searchTerm, filters, quickFilter, sortField, sortOrder]);

  // Purge invalid selection IDs when filtered list changes
  useEffect(() => {
    const validIds = new Set(filteredKeywords.map(k => k.id));
    const nextSelected = new Set([...selectedIds].filter(id => validIds.has(id)));
    if (nextSelected.size !== selectedIds.size) {
      stableOnSelectedIdsChange(nextSelected);
    }
  }, [filteredKeywords, selectedIds, stableOnSelectedIdsChange]);

  const totalPages = Math.ceil(filteredKeywords.length / ITEMS_PER_PAGE);
  const paginatedKeywords = filteredKeywords.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Get row background color based on market score
  const getRowScoreClass = (score: number): string => {
    if (score >= 70) return 'bg-green-500/5 hover:bg-green-500/10';
    if (score >= 40) return 'bg-yellow-500/5 hover:bg-yellow-500/10';
    if (score > 0) return 'bg-red-500/5 hover:bg-red-500/10';
    return 'hover:bg-muted/30';
  };

  return (
    <div data-tour="keywords-section" className="space-y-6 animate-fade-in">
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
              onClick={() => handleViewModeChange('table')}
            >
              <LayoutList className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => handleViewModeChange('cards')}
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
          <Button data-tour="bulk-import" variant="outline" size="sm" onClick={() => setIsBulkImportOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            Importar lote
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

      {/* Quick Filters */}
      <QuickFiltersBar
        activeFilter={quickFilter}
        onFilterChange={handleQuickFilterChange}
        counts={quickFilterCounts}
      />

      {/* Quick Add - unified with wizard */}
      <div className="flex gap-2 p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <Input
          placeholder="Escribe una keyword y pulsa Enter..."
          value={quickAddKeyword}
          onChange={(e) => setQuickAddKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
          className="flex-1"
        />
        <Button 
          onClick={quickAddKeyword.trim() ? handleQuickAdd : handleOpenNewKeywordWizard} 
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          {quickAddKeyword.trim() ? 'Añadir' : 'Nueva keyword'}
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar keywords..."
              value={searchTerm}
              onChange={(e) => {
                onSearchTermChange(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          {/* Sort selector */}
          <Select
            value={`${sortField}-${sortOrder}`}
            onValueChange={handleSortOptionChange}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Ordenar por..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={`${opt.field}-${opt.order}`} value={`${opt.field}-${opt.order}`}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <AdvancedFilters filters={filters} onFiltersChange={handleAdvancedFiltersChange} />
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Mostrando {filteredKeywords.length} de {keywords.length} keywords
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
                  <TableHead className="cursor-pointer hover:text-foreground w-[100px]" onClick={() => handleSort('searchVolume')}>
                    <div className="flex items-center gap-1">
                      Volumen
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[120px]">
                    <div className="flex items-center gap-1">
                      Competidores
                      <InfoTooltip content="Número de resultados en Amazon" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-foreground w-[130px]" onClick={() => handleSort('marketScore')}>
                    <div className="flex items-center gap-1">
                      Market Score
                      <ArrowUpDown className="w-3 h-3" />
                      <InfoTooltip content="Score de mercado 0-100. Click para ver desglose." />
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
                  <TableHead className="w-[80px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedKeywords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {keywords.length === 0
                        ? 'No hay keywords. Añade tu primera keyword o importa en lote.'
                        : 'No se encontraron keywords con los filtros aplicados.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedKeywords.map((keyword) => {
                    const score = getKeywordMarketScore(keyword);
                    const incomplete = isMarketDataIncomplete(keyword);
                    
                    return (
                      <TableRow 
                        key={keyword.id} 
                        className={cn(
                          'transition-colors cursor-pointer',
                          getRowScoreClass(score)
                        )}
                        onClick={() => setValidationKeyword(keyword)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selectedIds.has(keyword.id)} onCheckedChange={() => toggleSelect(keyword.id)} />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <InlineEditableCell
                            value={keyword.keyword}
                            onSave={(value) => handleUpdateWithHistory(keyword.id, { keyword: String(value) })}
                            placeholder="Keyword..."
                            className="font-medium"
                          />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <InlineEditableCell
                            value={keyword.searchVolume}
                            onSave={(value) => handleUpdateWithHistory(keyword.id, { searchVolume: Number(value) })}
                            type="number"
                            min={0}
                            formatter={(v) => Number(v).toLocaleString()}
                          />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <InlineEditableCell
                            value={keyword.competitors || 0}
                            onSave={(value) => handleUpdateWithHistory(keyword.id, { competitors: Number(value) })}
                            type="number"
                            min={0}
                            formatter={(v) => Number(v).toLocaleString()}
                          />
                        </TableCell>
                        <TableCell>
                          <MarketScoreCell
                            marketData={keyword.marketData}
                            score={score}
                            isIncomplete={incomplete}
                            onValidate={() => setValidationKeyword(keyword)}
                          />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <InlineSelectBadge
                            value={keyword.state || 'pending'}
                            options={KEYWORD_STATES.map(s => ({ value: s.value, label: s.label, icon: s.icon }))}
                            onChange={(value) => handleUpdateWithHistory(keyword.id, { state: value as KeywordState })}
                          />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <InlineCampaignTypeSelect
                            value={keyword.campaignTypes}
                            onChange={(types) => handleUpdateWithHistory(keyword.id, { campaignTypes: types })}
                          />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setValidationKeyword(keyword)}
                                  className="text-muted-foreground hover:text-primary"
                                >
                                  <PanelRightOpen className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Abrir ficha de keyword</TooltipContent>
                            </Tooltip>
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
                    );
                  })
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

      {/* Keyword Detail Panel */}
      <KeywordDetailPanel
        keyword={validationKeyword}
        isOpen={!!validationKeyword}
        onClose={() => setValidationKeyword(null)}
        onSave={handleKeywordDetailSave}
        marketplaceId={marketplaceId}
      />
      
      {/* New Keyword Wizard */}
      <NewKeywordWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onComplete={handleWizardComplete}
        marketplaceId={marketplaceId}
        bookInfo={bookInfo}
        existingKeywords={keywords}
        initialKeyword={wizardInitialKeyword}
        onOpenExistingKeyword={handleOpenExistingKeyword}
      />
    </div>
  );
};
