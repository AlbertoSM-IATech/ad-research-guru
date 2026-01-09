import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Search, Trash2, ArrowUpDown, Upload, LayoutGrid, LayoutList, Eye, BookOpen, Megaphone, Info, Star, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoTooltip } from './InfoTooltip';
import { InlineSelectBadge } from './InlineSelectBadge';
import { InlineEditableCell } from './InlineEditableCell';
import { BulkKeywordImport } from './BulkKeywordImport';
import { BulkCopyTools } from './BulkCopyTools';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { AdvancedFilters, AdvancedFiltersContent, type AdvancedFiltersState } from './AdvancedFilters';
import { AdvancedFiltersAds, AdsFiltersContent, defaultAdsFiltersState, type AdsFiltersState } from './AdvancedFiltersAds';
import { KeywordCardView } from './KeywordCardView';
import { KeywordHistoryModal } from './KeywordHistoryModal';
import { VariantDetector } from './VariantDetector';
import { KeywordDetailPanel } from './KeywordDetailPanel';
import { MarketScoreCell } from './MarketScoreCell';
import { NewKeywordWizard } from './NewKeywordWizard';
import { KeywordExportCSV } from './KeywordExportCSV';
import { ResizableTableHeader } from './ResizableTableHeader';
import { type Keyword, type CampaignType, type CompetitionLevel, type RelevanceLevel, type IntentType, type KeywordState, type BookInfo, type BookEconomy, type HistoryEntry, RELEVANCE_LEVELS, INTENT_TYPES, KEYWORD_STATES, calculateRelevance, classifyIntent } from '@/types/advertising';
import { calculateMarketScore, getDefaultMarketData, KEYWORD_STATUS_OPTIONS, type KeywordStatus } from '@/lib/market-score';
import { createKeywordDefaults } from '@/lib/keyword-helpers';
import { getAutoStatusFromScore } from '@/lib/keyword-builder';
import { sortKeywords, getKeywordMarketScore, isMarketDataIncomplete, SORT_OPTIONS, type SortField, type SortOrder } from '@/lib/keyword-sorting';
import { applyKeywordFilters } from '@/lib/keyword-filters';
import { useKeywordUIPersistence, type FunctionalView } from '@/hooks/useKeywordUIPersistence';
import { useColumnWidths, type ColumnWidths } from '@/hooks/useColumnWidths';
import { calcularGastoAcumulado, calcularVentasAcumuladas, calcularAcosActualPorcentaje, calcularAcosSiguienteClickPorcentaje, calcularConversionPorcentaje, formatearPorcentaje, formatearMoneda } from '@/lib/acosEquilibrio';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Default column widths
const DEFAULT_EDITORIAL_WIDTHS: ColumnWidths = {
  checkbox: 40,
  star: 40,
  keyword: 200,
  volume: 100,
  competitors: 120,
  marketScore: 130,
  status: 110,
};

const DEFAULT_ADS_WIDTHS: ColumnWidths = {
  checkbox: 40,
  star: 40,
  keyword: 180,
  volume: 90,
  competitors: 100,
  acosPE: 70,
  clicks: 70,
  cpc: 70,
  pedidos: 70,
  gasto: 70,
  ventas: 70,
  acos: 80,
  conversion: 70,
  beneficio: 80,
};
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
  bookEconomy: BookEconomy;
  onBookInfoChange: (bookInfo: BookInfo) => void;
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
  bookEconomy,
  onBookInfoChange,
  selectedIds,
  onSelectedIdsChange,
  searchTerm,
  onSearchTermChange
}: KeywordsSectionProps) => {
  const {
    toast
  } = useToast();

  // Use persistence hook for UI state
  const {
    state: persistedState,
    isHydrated,
    updateFilters,
    updateQuickFilter,
    updateSort,
    updateViewMode,
    updateFunctionalView
  } = useKeywordUIPersistence(marketplaceId);

  // Local state synced with persistence
  const [filters, setFilters] = useState<AdvancedFiltersState>(persistedState.filters);
  const [adsFilters, setAdsFilters] = useState<AdsFiltersState>(defaultAdsFiltersState);
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
  const [advancedFiltersExpanded, setAdvancedFiltersExpanded] = useState(false);

  // Functional view state (Editorial vs Ads)
  const [functionalView, setFunctionalView] = useState<FunctionalView>(persistedState.functionalView || 'editorial');

  // Column width management for resizable columns
  const { 
    widths: editorialWidths, 
    setColumnWidth: setEditorialColumnWidth, 
    resetWidths: resetEditorialWidths 
  } = useColumnWidths(`keywords-editorial-${marketplaceId}`, DEFAULT_EDITORIAL_WIDTHS);
  
  const { 
    widths: adsWidths, 
    setColumnWidth: setAdsColumnWidth, 
    resetWidths: resetAdsWidths 
  } = useColumnWidths(`keywords-ads-${marketplaceId}`, DEFAULT_ADS_WIDTHS);

  const columnWidths = functionalView === 'editorial' ? editorialWidths : adsWidths;
  const setColumnWidth = functionalView === 'editorial' ? setEditorialColumnWidth : setAdsColumnWidth;
  const resetColumnWidths = functionalView === 'editorial' ? resetEditorialWidths : resetAdsWidths;

  // Sync persisted state when hydrated
  useEffect(() => {
    if (isHydrated) {
      setFilters(persistedState.filters);
      setSortField(persistedState.sortField);
      setSortOrder(persistedState.sortOrder);
      setViewMode(persistedState.viewMode);
      setFunctionalView(persistedState.functionalView || 'editorial');
    }
  }, [isHydrated, persistedState]);

  // Sync validationKeyword with updated keywords (for inline edits sync)
  useEffect(() => {
    if (validationKeyword) {
      const updatedKeyword = keywords.find(k => k.id === validationKeyword.id);
      if (updatedKeyword && updatedKeyword !== validationKeyword) {
        setValidationKeyword(updatedKeyword);
      }
    }
  }, [keywords, validationKeyword]);

  // Memoize callback to avoid infinite loops
  const stableOnSelectedIdsChange = useCallback(onSelectedIdsChange, [onSelectedIdsChange]);

  // Open wizard instead of adding directly
  const handleQuickAdd = () => {
    if (!quickAddKeyword.trim()) return;
    setWizardInitialKeyword(quickAddKeyword.trim());
    setIsWizardOpen(true);
    setQuickAddKeyword('');
  };

  // Handle wizard completion - open detail panel immediately
  const handleWizardComplete = (keyword: Keyword) => {
    onAdd(keyword);
    setWizardInitialKeyword('');
    toast({
      title: 'Keyword creada',
      description: `Market Score: ${keyword.marketScore}/100`
    });
    setValidationKeyword(keyword);
  };

  // Handle opening existing keyword from wizard duplicate detection
  const handleOpenExistingKeyword = (keyword: Keyword) => {
    setValidationKeyword(keyword);
  };

  // Open wizard for new keyword
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
      onSelectedIdsChange(new Set(filteredKeywords.map(k => k.id)));
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
    toast({
      title: `${count} keywords eliminadas`
    });
  };
  const handleBulkImport = (newKeywords: Array<Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const classifiedKeywords = newKeywords.map(k => ({
      ...k,
      relevance: k.relevance || calculateRelevance(k.keyword, bookInfo),
      intent: k.intent || classifyIntent(k.keyword),
      state: k.state || 'pending' as KeywordState
    }));
    onAddBulk(classifiedKeywords);
    toast({
      title: `${classifiedKeywords.length} keywords añadidas`
    });
  };
  const handleBulkChangeCampaignType = (types: CampaignType[]) => {
    onUpdateBulk(Array.from(selectedIds), {
      campaignTypes: types
    });
    onSelectedIdsChange(new Set());
  };
  const handleBulkChangeState = (state: KeywordState) => {
    onUpdateBulk(Array.from(selectedIds), {
      state
    });
    onSelectedIdsChange(new Set());
  };
  const handleBulkChangeRelevance = (relevance: RelevanceLevel) => {
    onUpdateBulk(Array.from(selectedIds), {
      relevance
    });
    onSelectedIdsChange(new Set());
  };

  // Handle keyword update from detail panel
  const handleKeywordDetailSave = (keywordId: string, updates: Partial<Keyword>) => {
    onUpdate(keywordId, updates);
    toast({
      title: 'Keyword guardada',
      description: `Market Score: ${updates.marketScore}/100`
    });
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
          newValue: updates[field]
        });
      }
    });

    // Auto-update status if not manually set and market data changed
    let finalUpdates = {
      ...updates
    };
    const marketDataFields = ['searchVolume', 'competitors', 'price', 'royalties'];
    const isMarketDataUpdate = marketDataFields.some(f => updates[f as keyof typeof updates] !== undefined);
    const isMarketStructureUpdate = updates.marketStructure !== undefined;
    if ((isMarketDataUpdate || isMarketStructureUpdate) && !keyword.statusManuallySet) {
      const newSearchVolume = updates.searchVolume ?? keyword.searchVolume;
      const newCompetitors = updates.competitors ?? keyword.competitors;
      const newPrice = updates.price ?? keyword.price;
      const newRoyalties = updates.royalties ?? keyword.royalties;
      const marketData = keyword.marketData ?? getDefaultMarketData();
      const newMarketStructure = {
        selfContained: updates.marketStructure?.selfContained ?? keyword.marketStructure?.selfContained ?? false,
        amazonSuggestion: updates.marketStructure?.amazonSuggestion ?? keyword.marketStructure?.amazonSuggestion ?? false,
        booksSellingWell: updates.marketStructure?.booksSellingWell ?? keyword.marketStructure?.booksSellingWell ?? false,
        indieAuthorsSelling: updates.marketStructure?.indieAuthorsSelling ?? keyword.marketStructure?.indieAuthorsSelling ?? false,
        topMatchesIntent: updates.marketStructure?.topMatchesIntent ?? keyword.marketStructure?.topMatchesIntent ?? false,
        variantsPotential: updates.marketStructure?.variantsPotential ?? keyword.marketStructure?.variantsPotential ?? false
      };
      const newMarketScore = calculateMarketScore({
        searchVolume: newSearchVolume,
        competitors: newCompetitors,
        price: newPrice,
        royalties: newRoyalties,
        trafficSource: marketData.trafficSource
      }, marketplaceId, newMarketStructure).total;
      finalUpdates.marketScore = newMarketScore;
      finalUpdates.status = getAutoStatusFromScore(newMarketScore);
    }
    if (historyEntries.length > 0) {
      onUpdate(id, {
        ...finalUpdates,
        history: [...(keyword.history || []), ...historyEntries]
      });
    } else {
      onUpdate(id, finalUpdates);
    }
  };

  // Handle advanced filter change
  const handleAdvancedFiltersChange = (newFilters: AdvancedFiltersState) => {
    setFilters(newFilters);
    updateFilters(newFilters);
    setCurrentPage(1);
  };

  // Handle ADS filter change
  const handleAdsFiltersChange = (newFilters: AdsFiltersState) => {
    setAdsFilters(newFilters);
    setCurrentPage(1);
  };

  // Filter and sort keywords with functional view purpose filtering
  const filteredKeywords = useMemo(() => {
    let result = keywords;

    // Apply functional view purpose filter
    const purposeFilter = functionalView === 'editorial' ? ['editorial', 'both'] : ['ads', 'both'];
    result = result.filter(k => purposeFilter.includes(k.purpose));

    // Apply search and advanced filters
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
      state: filters.state
    });

    // Apply ADS-specific filters when in ads view
    if (functionalView === 'ads') {
      result = result.filter(k => {
        const ads = k.adsData;
        const gastoCalculado = calcularGastoAcumulado(ads?.clicks, ads?.cpcActual);
        const ventasCalculadas = calcularVentasAcumuladas(ads?.pedidos, bookEconomy.precioLibro);
        const beneficio = gastoCalculado !== null && ventasCalculadas !== null ? ventasCalculadas - gastoCalculado : null;
        const acosActual = calcularAcosActualPorcentaje(gastoCalculado ?? undefined, ventasCalculadas ?? undefined);

        // Rentabilidad filter
        if (adsFilters.rentabilidad === 'profitable' && (beneficio === null || beneficio < 0)) return false;
        if (adsFilters.rentabilidad === 'unprofitable' && (beneficio === null || beneficio >= 0)) return false;

        // Clicks range
        if (adsFilters.minClicks && (ads?.clicks ?? 0) < parseInt(adsFilters.minClicks)) return false;
        if (adsFilters.maxClicks && (ads?.clicks ?? Infinity) > parseInt(adsFilters.maxClicks)) return false;

        // CPC range
        if (adsFilters.minCpc && (ads?.cpcActual ?? 0) < parseFloat(adsFilters.minCpc)) return false;
        if (adsFilters.maxCpc && (ads?.cpcActual ?? Infinity) > parseFloat(adsFilters.maxCpc)) return false;

        // Pedidos range
        if (adsFilters.minPedidos && (ads?.pedidos ?? 0) < parseInt(adsFilters.minPedidos)) return false;
        if (adsFilters.maxPedidos && (ads?.pedidos ?? Infinity) > parseInt(adsFilters.maxPedidos)) return false;

        // ACOS range
        if (adsFilters.minAcos && (acosActual === null || acosActual < parseFloat(adsFilters.minAcos))) return false;
        if (adsFilters.maxAcos && (acosActual === null || acosActual > parseFloat(adsFilters.maxAcos))) return false;

        // Beneficio range
        if (adsFilters.minBeneficio && (beneficio === null || beneficio < parseFloat(adsFilters.minBeneficio))) return false;
        if (adsFilters.maxBeneficio && (beneficio === null || beneficio > parseFloat(adsFilters.maxBeneficio))) return false;

        return true;
      });
    }

    return sortKeywords(result, sortField, sortOrder, bookEconomy.precioLibro);
  }, [keywords, searchTerm, filters, adsFilters, sortField, sortOrder, functionalView, bookEconomy.precioLibro]);

  // Purge invalid selection IDs when filtered list changes
  useEffect(() => {
    const validIds = new Set(filteredKeywords.map(k => k.id));
    const nextSelected = new Set([...selectedIds].filter(id => validIds.has(id)));
    if (nextSelected.size !== selectedIds.size) {
      stableOnSelectedIdsChange(nextSelected);
    }
  }, [filteredKeywords, selectedIds, stableOnSelectedIdsChange]);
  const totalPages = Math.ceil(filteredKeywords.length / ITEMS_PER_PAGE);
  const paginatedKeywords = filteredKeywords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Get row background color based on market score
  const getRowScoreClass = (score: number): string => {
    if (score >= 70) return 'bg-green-500/5 hover:bg-green-500/10';
    if (score >= 40) return 'bg-yellow-500/5 hover:bg-yellow-500/10';
    if (score > 0) return 'bg-red-500/5 hover:bg-red-500/10';
    return 'hover:bg-muted/30';
  };

  // Get status badge styling
  const getStatusBadge = (status: KeywordStatus) => {
    const option = KEYWORD_STATUS_OPTIONS.find(s => s.value === status);
    return option || KEYWORD_STATUS_OPTIONS[0];
  };
  return <div data-tour="keywords-section" className="space-y-6 animate-fade-in">
      {/* Functional View Toggle */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-xl">Palabras Clave</h3>
          
          {/* View Toggle: Editorial / Ads */}
          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
            <Button variant={functionalView === 'editorial' ? 'default' : 'ghost'} size="sm" onClick={() => {
            setFunctionalView('editorial');
            updateFunctionalView('editorial');
          }} className={cn("gap-2 transition-all", functionalView === 'editorial' && "bg-primary text-primary-foreground")}>
              <BookOpen className="w-4 h-4" />
              Estudio de Nicho
            </Button>
            <Button variant={functionalView === 'ads' ? 'default' : 'ghost'} size="sm" onClick={() => {
            setFunctionalView('ads');
            updateFunctionalView('ads');
          }} className={cn("gap-2 transition-all", functionalView === 'ads' && "bg-primary text-primary-foreground")}>
              <Megaphone className="w-4 h-4" />
              Gestión de Ads
            </Button>
          </div>
        </div>
        
        {/* Contextual message */}
        <div className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm", functionalView === 'editorial' ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20" : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20")}>
          <Info className="w-4 h-4 flex-shrink-0" />
          {functionalView === 'editorial' ? "Esta vista está pensada para decisiones editoriales, no para inversión publicitaria." : "Esta vista está pensada para decisiones de inversión en Ads."}
        </div>
      </div>

      {/* Advanced Filters - positioned above table with toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {functionalView === 'editorial' ? (
          <AdvancedFilters filters={filters} onFiltersChange={handleAdvancedFiltersChange} renderTriggerOnly isExpanded={advancedFiltersExpanded} onToggleExpanded={() => setAdvancedFiltersExpanded(!advancedFiltersExpanded)} />
        ) : (
          <AdvancedFiltersAds filters={adsFilters} onFiltersChange={handleAdsFiltersChange} renderTriggerOnly isExpanded={advancedFiltersExpanded} onToggleExpanded={() => setAdvancedFiltersExpanded(!advancedFiltersExpanded)} />
        )}
      </div>

      {/* Advanced Filters Content */}
      {advancedFiltersExpanded && (
        functionalView === 'editorial' 
          ? <AdvancedFiltersContent filters={filters} onFiltersChange={handleAdvancedFiltersChange} />
          : <AdsFiltersContent filters={adsFilters} onFiltersChange={handleAdsFiltersChange} />
      )}

      {/* Quick Add, Search & Sort */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        {/* Column 1: Quick Add */}
        <div className="flex gap-2">
          <Input placeholder="Escribe una keyword..." value={quickAddKeyword} onChange={e => setQuickAddKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleQuickAdd()} className="flex-1" />
          <Button onClick={quickAddKeyword.trim() ? handleQuickAdd : handleOpenNewKeywordWizard} size="sm" className="gap-1 bg-primary hover:bg-primary/90 whitespace-nowrap">
            <Plus className="w-4 h-4" />
            {quickAddKeyword.trim() ? 'Añadir' : 'Nueva'}
          </Button>
        </div>

        {/* Column 2: Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar keywords..." value={searchTerm} onChange={e => {
          onSearchTermChange(e.target.value);
          setCurrentPage(1);
        }} className="pl-10" />
        </div>

        {/* Column 3: Sort */}
        <Select value={`${sortField}-${sortOrder}`} onValueChange={handleSortOptionChange}>
          <SelectTrigger>
            <SelectValue placeholder="Ordenar..." />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {SORT_OPTIONS.map(opt => <SelectItem key={`${opt.field}-${opt.order}`} value={`${opt.field}-${opt.order}`}>
                {opt.label}
              </SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Toolbar + Results count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {filteredKeywords.length} de {keywords.length} keywords
          {selectedIds.size > 0 && ` • ${selectedIds.size} seleccionadas`}
        </div>
        <div className="flex items-center gap-2">
          {/* Reset Column Widths */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={resetColumnWidths}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Resetear anchos de columna</TooltipContent>
          </Tooltip>
          
          {/* View Toggle */}
          <div className="flex items-center rounded-md border border-border">
            <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" className="rounded-r-none" onClick={() => handleViewModeChange('table')}>
              <LayoutList className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === 'cards' ? 'secondary' : 'ghost'} size="sm" className="rounded-l-none" onClick={() => handleViewModeChange('cards')}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
          <BulkCopyTools keywords={filteredKeywords} selectedIds={selectedIds} />
          <KeywordExportCSV keywords={filteredKeywords} bookEconomy={bookEconomy} selectedIds={selectedIds} />
          <VariantDetector keywords={keywords} onGroupVariants={(groupId, keywordIds) => {
          keywordIds.forEach(id => {
            const kw = keywords.find(k => k.id === id);
            if (kw) {
              onUpdate(id, {
                notes: kw.notes ? `${kw.notes} [Variante: ${groupId}]` : `[Variante: ${groupId}]`
              });
            }
          });
          toast({
            title: `${keywordIds.length} keywords agrupadas como variantes`
          });
        }} onSeparateVariants={keywordIds => {
          toast({
            title: 'Variantes separadas'
          });
        }} />
          <Button data-tour="bulk-import" variant="outline" size="sm" onClick={() => setIsBulkImportOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            Importar lote
          </Button>
          {selectedIds.size > 0 && <Button variant="destructive" size="sm" onClick={handleDeleteSelected} className="gap-2">
              <Trash2 className="w-4 h-4" />
              Eliminar ({selectedIds.size})
            </Button>}
        </div>
      </div>

      {/* Content - Table or Cards */}
      {viewMode === 'table' ? <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead style={{ width: columnWidths.checkbox }}>
                    <Checkbox checked={selectedIds.size === filteredKeywords.length && filteredKeywords.length > 0} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead style={{ width: columnWidths.star }}>
                    <div className="flex items-center justify-center">
                      <Star className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <ResizableTableHeader
                    columnKey="keyword"
                    width={columnWidths.keyword}
                    onResize={setColumnWidth}
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('keyword')}
                  >
                    <div className="flex items-center gap-1">
                      Keyword 
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnKey="volume"
                    width={columnWidths.volume}
                    onResize={setColumnWidth}
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('searchVolume')}
                  >
                    <div className="flex items-center gap-1">
                      Volumen
                      <ArrowUpDown className="w-3 h-3" />
                      <InfoTooltip content="Volumen de búsquedas mensuales estimado." />
                    </div>
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnKey="competitors"
                    width={columnWidths.competitors}
                    onResize={setColumnWidth}
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('competitors')}
                  >
                    <div className="flex items-center gap-1">
                      Competidores
                      <ArrowUpDown className="w-3 h-3" />
                      <InfoTooltip content="Resultados Amazon para esta búsqueda. Menos de 3000 se considera favorable." />
                    </div>
                  </ResizableTableHeader>
                  
                  {/* Columnas específicas por vista */}
                  {functionalView === 'editorial' ? (
                    <>
                      <ResizableTableHeader
                        columnKey="marketScore"
                        width={columnWidths.marketScore}
                        onResize={setColumnWidth}
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('marketScore')}
                      >
                        <div className="flex items-center gap-1">
                          Market Score
                          <ArrowUpDown className="w-3 h-3" />
                          <InfoTooltip content="Puntuación 0-100 de viabilidad de mercado." />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader
                        columnKey="status"
                        width={columnWidths.status}
                        onResize={setColumnWidth}
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center gap-1">
                          Estado
                          <ArrowUpDown className="w-3 h-3" />
                          <InfoTooltip content="Pendiente / Válida / Descartada" />
                        </div>
                      </ResizableTableHeader>
                    </>
                  ) : (
                    <>
                      <ResizableTableHeader
                        columnKey="acosPE"
                        width={columnWidths.acosPE}
                        onResize={setColumnWidth}
                      >
                        <div className="flex items-center gap-1">
                          ACOS PE
                          <InfoTooltip content="ACOS Punto de Equilibrio. Si ACOS actual supera este valor, pierdes dinero." />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader
                        columnKey="clicks"
                        width={columnWidths.clicks}
                        onResize={setColumnWidth}
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('clicks')}
                      >
                        <div className="flex items-center gap-1">
                          Clicks
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader
                        columnKey="cpc"
                        width={columnWidths.cpc}
                        onResize={setColumnWidth}
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('cpc')}
                      >
                        <div className="flex items-center gap-1">
                          CPC
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader
                        columnKey="pedidos"
                        width={columnWidths.pedidos}
                        onResize={setColumnWidth}
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('pedidos')}
                      >
                        <div className="flex items-center gap-1">
                          Pedidos
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader
                        columnKey="gasto"
                        width={columnWidths.gasto}
                        onResize={setColumnWidth}
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('gasto')}
                      >
                        <div className="flex items-center gap-1">
                          Gasto
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader
                        columnKey="ventas"
                        width={columnWidths.ventas}
                        onResize={setColumnWidth}
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('ventas')}
                      >
                        <div className="flex items-center gap-1">
                          Ventas
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader
                        columnKey="acos"
                        width={columnWidths.acos}
                        onResize={setColumnWidth}
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('acosActual')}
                      >
                        <div className="flex items-center gap-1">
                          ACOS
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader
                        columnKey="conversion"
                        width={columnWidths.conversion}
                        onResize={setColumnWidth}
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('conversion')}
                      >
                        <div className="flex items-center gap-1">
                          Conv.
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader
                        columnKey="beneficio"
                        width={columnWidths.beneficio}
                        onResize={setColumnWidth}
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('beneficio')}
                      >
                        <div className="flex items-center gap-1">
                          Beneficio
                          <ArrowUpDown className="w-3 h-3" />
                          <InfoTooltip content="Ventas - Gasto. Muestra la rentabilidad de cada keyword." />
                        </div>
                      </ResizableTableHeader>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedKeywords.length === 0 ? <TableRow>
                    <TableCell colSpan={functionalView === 'editorial' ? 7 : 13} className="text-center py-8 text-muted-foreground">
                      {keywords.length === 0 ? 'No hay keywords. Añade tu primera keyword o importa en lote.' : 'No se encontraron keywords con los filtros aplicados.'}
                    </TableCell>
                  </TableRow> : paginatedKeywords.map(keyword => {
              const score = getKeywordMarketScore(keyword);
              const incomplete = isMarketDataIncomplete(keyword);
              const ads = keyword.adsData;
              
              // Auto-calculated values for Ads view
              const gastoCalculado = calcularGastoAcumulado(ads?.clicks, ads?.cpcActual);
              const ventasCalculadas = calcularVentasAcumuladas(ads?.pedidos, bookEconomy.precioLibro);
              const acosActual = calcularAcosActualPorcentaje(gastoCalculado ?? undefined, ventasCalculadas ?? undefined);
              const acosSiguiente = calcularAcosSiguienteClickPorcentaje(
                gastoCalculado ?? undefined, 
                ads?.cpcActual, 
                ventasCalculadas ?? undefined, 
                bookEconomy.precioLibro
              );
              const conversion = calcularConversionPorcentaje(ads?.pedidos, ads?.clicks);
              const acosEquilibrio = bookEconomy.precioLibro > 0 && bookEconomy.regaliasPorVenta > 0
                ? (bookEconomy.regaliasPorVenta / bookEconomy.precioLibro) * 100
                : null;
              
              // Inline update handler for ads data
              const handleInlineAdsUpdate = (field: 'clicks' | 'cpcActual' | 'pedidos', value: string) => {
                const numValue = value === '' ? undefined : parseFloat(value);
                if (value !== '' && (isNaN(numValue!) || numValue! < 0)) return;
                
                onUpdate(keyword.id, {
                  adsData: {
                    ...ads,
                    [field]: numValue,
                  }
                });
              };
              
              // Check for data inconsistency: clicks < pedidos
              const hasDataInconsistency = ads?.clicks !== undefined && ads?.pedidos !== undefined && ads.clicks < ads.pedidos;
              const isMainKeyword = bookInfo.mainKeywordId === keyword.id;
              
              // Handle setting as main keyword
              const handleSetMainKeyword = (e: React.MouseEvent) => {
                e.stopPropagation();
                onBookInfoChange({
                  ...bookInfo,
                  mainKeywordId: isMainKeyword ? undefined : keyword.id
                });
              };
              
              return <TableRow key={keyword.id} className={cn('transition-colors', functionalView === 'editorial' ? getRowScoreClass(score) : hasDataInconsistency ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-muted/30')}>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Checkbox checked={selectedIds.has(keyword.id)} onCheckedChange={() => toggleSelect(keyword.id)} />
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSetMainKeyword}
                            className={cn(
                              "h-7 w-7 p-0",
                              isMainKeyword 
                                ? "bg-amber-500/20 text-amber-600 hover:bg-amber-500/30" 
                                : "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                            )}
                          >
                            <Star className={cn("w-4 h-4", isMainKeyword && "fill-current")} />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {/* Data inconsistency warning */}
                            {hasDataInconsistency && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-medium">Datos inconsistentes</p>
                                  <p className="text-xs text-muted-foreground">Clicks ({ads?.clicks}) &lt; Pedidos ({ads?.pedidos})</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {/* Primary action: Open detail panel */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => setValidationKeyword(keyword)} className="h-7 w-7 p-0 bg-primary/10 hover:bg-primary/20 text-primary">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Abrir ficha de keyword</TooltipContent>
                            </Tooltip>
                            <div className={cn(
                              isMainKeyword && "text-amber-600 dark:text-amber-400"
                            )}>
                              <InlineEditableCell
                                value={keyword.keyword}
                                onSave={(value) => handleUpdateWithHistory(keyword.id, { keyword: String(value) })}
                                placeholder="Keyword..."
                                className={cn(
                                  "font-medium",
                                  isMainKeyword && "text-amber-600 dark:text-amber-400"
                                )}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums text-sm" onClick={e => e.stopPropagation()}>
                          {functionalView === 'editorial' ? (
                            <InlineEditableCell
                              value={keyword.searchVolume || 0}
                              type="number"
                              min={0}
                              onSave={(value) => handleUpdateWithHistory(keyword.id, { searchVolume: Number(value) })}
                              formatter={(v) => Number(v || 0).toLocaleString()}
                              className="text-sm"
                            />
                          ) : (
                            (keyword.searchVolume || 0).toLocaleString()
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums text-sm" onClick={e => e.stopPropagation()}>
                          {functionalView === 'editorial' ? (
                            <div className="flex items-center gap-2">
                              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", (keyword.competitors || 0) < 3000 ? "bg-green-500" : "bg-red-500")} />
                              <InlineEditableCell
                                value={keyword.competitors || 0}
                                type="number"
                                min={0}
                                onSave={(value) => handleUpdateWithHistory(keyword.id, { competitors: Number(value) })}
                                formatter={(v) => Number(v || 0).toLocaleString()}
                                className="text-sm"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", (keyword.competitors || 0) < 3000 ? "bg-green-500" : "bg-red-500")} />
                              {(keyword.competitors || 0).toLocaleString()}
                            </div>
                          )}
                        </TableCell>
                        
                        {/* Columnas específicas por vista */}
                        {functionalView === 'editorial' ? (
                          <>
                            <TableCell>
                              <MarketScoreCell marketData={keyword.marketData} score={score} isIncomplete={incomplete} onValidate={() => setValidationKeyword(keyword)} />
                            </TableCell>
                            <TableCell onClick={e => e.stopPropagation()}>
                              <InlineSelectBadge value={keyword.status || 'pending'} options={KEYWORD_STATUS_OPTIONS.map(s => ({
                                value: s.value,
                                label: s.label,
                                color: s.color
                              }))} onChange={value => handleUpdateWithHistory(keyword.id, {
                                status: value as KeywordStatus,
                                statusManuallySet: true
                              })} />
                            </TableCell>
                          </>
                        ) : (
                          <>
                            {/* ACOS Equilibrio (PE) - Read only reference */}
                            <TableCell className="tabular-nums text-xs font-medium text-primary">
                              {acosEquilibrio !== null ? `${acosEquilibrio.toFixed(1)}%` : '—'}
                            </TableCell>
                            {/* Clicks - Inline editable */}
                            <TableCell onClick={e => e.stopPropagation()}>
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                value={ads?.clicks ?? ''}
                                onChange={(e) => handleInlineAdsUpdate('clicks', e.target.value)}
                                className="h-7 w-14 text-xs tabular-nums"
                                placeholder="—"
                              />
                            </TableCell>
                            {/* CPC - Inline editable */}
                            <TableCell onClick={e => e.stopPropagation()}>
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={ads?.cpcActual ?? ''}
                                onChange={(e) => handleInlineAdsUpdate('cpcActual', e.target.value)}
                                className="h-7 w-14 text-xs tabular-nums"
                                placeholder="—"
                              />
                            </TableCell>
                            {/* Pedidos - Inline editable */}
                            <TableCell onClick={e => e.stopPropagation()}>
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                value={ads?.pedidos ?? ''}
                                onChange={(e) => handleInlineAdsUpdate('pedidos', e.target.value)}
                                className="h-7 w-14 text-xs tabular-nums"
                                placeholder="—"
                              />
                            </TableCell>
                            {/* Gasto - Auto-calculated (read-only) */}
                            <TableCell className="tabular-nums text-xs text-muted-foreground">
                              {formatearMoneda(gastoCalculado)}
                            </TableCell>
                            {/* Ventas - Auto-calculated (read-only) */}
                            <TableCell className="tabular-nums text-xs text-muted-foreground">
                              {formatearMoneda(ventasCalculadas)}
                            </TableCell>
                            {/* ACOS Actual */}
                            <TableCell className="tabular-nums text-xs">
                              <span className={cn(
                                acosActual !== null && acosEquilibrio !== null
                                  ? acosActual <= acosEquilibrio
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                  : 'text-muted-foreground'
                              )}>
                                {formatearPorcentaje(acosActual)}
                              </span>
                            </TableCell>
                            {/* Conversión */}
                            <TableCell className="tabular-nums text-xs text-muted-foreground">
                              {formatearPorcentaje(conversion)}
                            </TableCell>
                            {/* Beneficio */}
                            <TableCell className="tabular-nums text-xs">
                              {(() => {
                                const beneficio = gastoCalculado !== null && ventasCalculadas !== null
                                  ? ventasCalculadas - gastoCalculado
                                  : null;
                                if (beneficio === null) return '—';
                                return (
                                  <span className={beneficio >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                    {formatearMoneda(beneficio)}
                                  </span>
                                );
                              })()}
                            </TableCell>
                          </>
                        )}
                      </TableRow>;
            })}
              </TableBody>
            </Table>
          </div>
        </div> : <KeywordCardView keywords={paginatedKeywords} selectedIds={selectedIds} onToggleSelect={toggleSelect} onUpdate={handleUpdateWithHistory} onDelete={onDelete} onViewHistory={keyword => setHistoryKeyword(keyword)} />}

      {/* Pagination */}
      {totalPages > 1 && <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              Siguiente
            </Button>
          </div>
        </div>}

      {/* Bulk Import Modal */}
      <BulkKeywordImport isOpen={isBulkImportOpen} onClose={() => setIsBulkImportOpen(false)} onImport={handleBulkImport} marketplaceId={marketplaceId} bookInfo={bookInfo} existingKeywords={keywords.map(k => k.keyword)} />

      {/* History Modal */}
      <KeywordHistoryModal keyword={historyKeyword} isOpen={!!historyKeyword} onClose={() => setHistoryKeyword(null)} />

      {/* Keyword Detail Panel */}
      <KeywordDetailPanel 
        keyword={validationKeyword} 
        isOpen={!!validationKeyword} 
        onClose={() => setValidationKeyword(null)} 
        onSave={handleKeywordDetailSave} 
        marketplaceId={marketplaceId}
        bookEconomy={bookEconomy}
        defaultTab={functionalView === 'ads' ? 'ads' : 'nicho'}
      />
      
      {/* New Keyword Wizard */}
      <NewKeywordWizard open={isWizardOpen} onOpenChange={setIsWizardOpen} onComplete={handleWizardComplete} marketplaceId={marketplaceId} bookInfo={bookInfo} existingKeywords={keywords} initialKeyword={wizardInitialKeyword} onOpenExistingKeyword={handleOpenExistingKeyword} />
    </div>;
};