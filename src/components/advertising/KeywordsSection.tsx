import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Search, Trash2, ArrowUpDown, Upload, Eye, BookOpen, Megaphone, Info, Star, AlertTriangle, RotateCcw, GitCompare, History, ChevronUp, ChevronDown, Save, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { InfoTooltip } from './InfoTooltip';
import { InlineSelectBadge } from './InlineSelectBadge';
import { InlineEditableCell } from './InlineEditableCell';
import { BulkKeywordImport } from './BulkKeywordImport';
import { BulkCopyTools } from './BulkCopyTools';
import { BulkEditorialStatusToolbar } from './BulkEditorialStatusToolbar';
import { AdvancedFilters, AdvancedFiltersContent, type AdvancedFiltersState } from './AdvancedFilters';
import { AdvancedFiltersAds, AdsFiltersContent, defaultAdsFiltersState, type AdsFiltersState } from './AdvancedFiltersAds';
import { FilterPresetsDropdown } from './FilterPresetsDropdown';
import { KeywordHistoryModal } from './KeywordHistoryModal';
import { AdsHistoryPanel } from './AdsHistoryPanel';
import { KeywordDetailPanel } from './KeywordDetailPanel';
import { MarketScoreCell } from './MarketScoreCell';
import { NewKeywordWizard } from './NewKeywordWizard';
import { KeywordExportCSV } from './KeywordExportCSV';
import { KeywordComparisonPanel } from './KeywordComparisonPanel';
import { ResizableTableHeader } from './ResizableTableHeader';
import { AdsDashboard } from './AdsDashboard';
import { CampaignSelect } from './CampaignSelect';
import { PlanUpgradeModal } from './PlanUpgradeModal';
import { type Keyword, type CampaignType, type CompetitionLevel, type RelevanceLevel, type IntentType, type KeywordState, type BookInfo, type BookEconomy, type HistoryEntry, type AdsData, RELEVANCE_LEVELS, INTENT_TYPES, KEYWORD_STATES, calculateRelevance, classifyIntent } from '@/types/advertising';
import { calculateMarketScore, getDefaultMarketData, KEYWORD_STATUS_OPTIONS, type KeywordStatus } from '@/lib/market-score';
import { createKeywordDefaults } from '@/lib/keyword-helpers';
import { getAutoStatusFromScore } from '@/lib/keyword-builder';
import { sortKeywords, getKeywordMarketScore, isMarketDataIncomplete, SORT_OPTIONS, type SortField, type SortOrder } from '@/lib/keyword-sorting';
import { applyKeywordFilters } from '@/lib/keyword-filters';
import { useKeywordUIPersistence, type FunctionalView } from '@/hooks/useKeywordUIPersistence';
import { useColumnWidths, type ColumnWidths } from '@/hooks/useColumnWidths';
import { useFilterPresets } from '@/hooks/useFilterPresets';
import { useCampaigns } from '@/hooks/useCampaigns';
import { calcularGastoAcumulado, calcularVentasAcumuladas, calcularAcosActualPorcentaje, calcularAcosSiguienteClickPorcentaje, calcularConversionPorcentaje, calcularAcosEquilibrioPorcentaje, formatearPorcentaje, formatearMoneda } from '@/lib/acosEquilibrio';
import { getCurrentPlan, hasAccess } from '@/lib/plan-system';
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
  status: 110
};
const DEFAULT_ADS_WIDTHS: ColumnWidths = {
  checkbox: 40,
  star: 40,
  keyword: 180,
  campaign: 120,
  volume: 90,
  competitors: 100,
  acosPE: 70,
  clicks: 70,
  cpc: 70,
  pedidos: 70,
  gasto: 70,
  ventas: 70,
  acos: 80,
  acosSig: 75,
  conversion: 70,
  beneficio: 80
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
    updateFunctionalView
  } = useKeywordUIPersistence(marketplaceId);

  // Local state synced with persistence
  const [filters, setFilters] = useState<AdvancedFiltersState>(persistedState.filters);
  const [adsFilters, setAdsFilters] = useState<AdsFiltersState>(defaultAdsFiltersState);
  const [sortField, setSortField] = useState<SortField>(persistedState.sortField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(persistedState.sortOrder);
  const [currentPage, setCurrentPage] = useState(1);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [quickAddKeyword, setQuickAddKeyword] = useState('');
  const [historyKeyword, setHistoryKeyword] = useState<Keyword | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardInitialKeyword, setWizardInitialKeyword] = useState('');
  const [validationKeyword, setValidationKeyword] = useState<Keyword | null>(null);
  const [advancedFiltersExpanded, setAdvancedFiltersExpanded] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [adsHistoryKeyword, setAdsHistoryKeyword] = useState<Keyword | null>(null);
  const [showPlanUpgradeModal, setShowPlanUpgradeModal] = useState(false);

  // Filter presets hook
  const {
    presets,
    savePreset,
    deletePreset,
    loadPreset
  } = useFilterPresets();

  // Campaigns hook
  const {
    campaigns,
    addCampaign
  } = useCampaigns(keywords);

  // Plan access check
  const userPlan = getCurrentPlan();
  const hasAdsAccess = hasAccess('ads-management');

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
      setFunctionalView(persistedState.functionalView || 'editorial');
    }
  }, [isHydrated, persistedState]);

  // Sync validationKeyword with updated keywords (for inline edits sync)
  // Use deep comparison for adsData to detect changes even when object reference is same
  useEffect(() => {
    if (validationKeyword) {
      const updatedKeyword = keywords.find(k => k.id === validationKeyword.id);
      if (updatedKeyword) {
        // Compare adsData by content, not reference
        const currentAds = JSON.stringify(validationKeyword.adsData ?? {});
        const newAds = JSON.stringify(updatedKeyword.adsData ?? {});
        const hasAdsChanged = currentAds !== newAds;

        // Also check for other field changes
        const hasTextChanged = updatedKeyword.keyword !== validationKeyword.keyword;
        const hasScoreChanged = updatedKeyword.marketScore !== validationKeyword.marketScore;
        const hasVolumeChanged = updatedKeyword.searchVolume !== validationKeyword.searchVolume;
        const hasCompetitorsChanged = updatedKeyword.competitors !== validationKeyword.competitors;
        if (hasAdsChanged || hasTextChanged || hasScoreChanged || hasVolumeChanged || hasCompetitorsChanged) {
          setValidationKeyword(updatedKeyword);
        }
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
  // The keyword from wizard already has id, createdAt, adsData - use it directly
  const handleWizardComplete = (keyword: Keyword) => {
    // Add to the list first
    onAdd(keyword);
    setWizardInitialKeyword('');
    toast({
      title: 'Keyword creada',
      description: `Market Score: ${keyword.marketScore}/100`
    });
    // Open the panel immediately with the complete keyword (including adsData)
    // The keyword already has all data from the wizard, no need to wait for React
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

  const handleBulkChangeKeywordStatus = (status: KeywordStatus) => {
    onUpdateBulk(Array.from(selectedIds), {
      status,
      statusManuallySet: true,
    });
    onSelectedIdsChange(new Set());
  };
  const handleBulkChangeRelevance = (relevance: RelevanceLevel) => {
    onUpdateBulk(Array.from(selectedIds), {
      relevance
    });
    onSelectedIdsChange(new Set());
  };

  // Handle keyword update from detail panel (silent save for auto-sync)
  const handleKeywordDetailSave = (keywordId: string, updates: Partial<Keyword>) => {
    onUpdate(keywordId, updates);

    // Keep the open lateral panel keyword in sync immediately (no waiting for parent state)
    // This avoids the perception that changes only apply after pressing "Guardar".
    if (validationKeyword?.id === keywordId) {
      setValidationKeyword(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          ...updates,
          updatedAt: new Date(),
        };
      });
    }

    // Only show toast when saving full keyword data (with marketScore)
    if (updates.marketScore !== undefined) {
      toast({
        title: 'Keyword guardada',
        description: `Market Score: ${updates.marketScore}/100`
      });
    }
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

  // Filter and sort keywords - show ALL keywords in both views (no purpose filter)
  const filteredKeywords = useMemo(() => {
    let result = keywords;

    // Apply search and advanced filters
    result = applyKeywordFilters(result, {
      searchTerm,
      status: filters.status,
      minVolume: filters.minVolume,
      maxVolume: filters.maxVolume,
      minCompetition: filters.minCompetition,
      maxCompetition: filters.maxCompetition,
      campaignName: filters.campaignName,
      marketScoreRanges: filters.marketScoreRanges,
      has200PlusReviews: filters.has200PlusReviews,
      hasUnder100Reviews: filters.hasUnder100Reviews
    });

    // Apply ADS-specific filters when in ads view
    if (functionalView === 'ads') {
      result = result.filter(k => {
        const ads = k.adsData;
        const gastoCalculado = calcularGastoAcumulado(ads?.clicks, ads?.cpcActual);
        const ventasCalculadas = calcularVentasAcumuladas(ads?.pedidos, bookEconomy.precioLibro);
        const beneficio = gastoCalculado !== null && ventasCalculadas !== null ? ventasCalculadas - gastoCalculado : null;
        const acosActual = calcularAcosActualPorcentaje(gastoCalculado ?? undefined, ventasCalculadas ?? undefined);

        // Campaign name filter
        if (adsFilters.campaignName) {
          const campaignName = ads?.campaignName?.toLowerCase() || '';
          if (!campaignName.includes(adsFilters.campaignName.toLowerCase())) return false;
        }

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
              Estudio de Keywords
            </Button>
            <Button variant={functionalView === 'ads' ? 'default' : 'ghost'} size="sm" onClick={() => {
            if (!hasAdsAccess) {
              setShowPlanUpgradeModal(true);
              return;
            }
            setFunctionalView('ads');
            updateFunctionalView('ads');
          }} className={cn("gap-2 transition-all", functionalView === 'ads' && "bg-primary text-primary-foreground")}>
              <Megaphone className="w-4 h-4" />
              Gestión de Ads
              <Badge variant="secondary" className="ml-1 bg-blue-500 text-white text-[10px] px-1.5 py-0 h-4">
                Plus
              </Badge>
            </Button>
          </div>
        </div>
        
        {/* Contextual message */}
        <div className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm", functionalView === 'editorial' ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20" : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20")}>
          <Info className="w-4 h-4 flex-shrink-0" />
          {functionalView === 'editorial' ? "Esta vista está pensada para decisiones editoriales, no para inversión publicitaria." : "Esta vista está pensada para decisiones de inversión en Ads."}
        </div>

        {/* ADS Dashboard - only in ads view */}
        {functionalView === 'ads' && hasAdsAccess && <AdsDashboard keywords={keywords} bookEconomy={bookEconomy} />}
      </div>

      {/* Advanced Filters - positioned above table with toolbar */}
      <div className="flex-wrap gap-2 flex items-center justify-start">
        {functionalView === 'editorial' ? <AdvancedFilters filters={filters} onFiltersChange={handleAdvancedFiltersChange} renderTriggerOnly isExpanded={advancedFiltersExpanded} onToggleExpanded={() => setAdvancedFiltersExpanded(!advancedFiltersExpanded)} /> : <AdvancedFiltersAds filters={adsFilters} onFiltersChange={handleAdsFiltersChange} renderTriggerOnly isExpanded={advancedFiltersExpanded} onToggleExpanded={() => setAdvancedFiltersExpanded(!advancedFiltersExpanded)} />}
        
        {/* Filter Presets */}
        <FilterPresetsDropdown type={functionalView} currentFilters={functionalView === 'editorial' ? filters : adsFilters} presets={presets} onSavePreset={savePreset} onLoadPreset={loadedFilters => {
        if (functionalView === 'editorial') {
          handleAdvancedFiltersChange(loadedFilters as AdvancedFiltersState);
        } else {
          handleAdsFiltersChange(loadedFilters as AdsFiltersState);
        }
      }} onDeletePreset={deletePreset} />
      </div>

      {/* Advanced Filters Content */}
      {advancedFiltersExpanded && (functionalView === 'editorial' ? <AdvancedFiltersContent filters={filters} onFiltersChange={handleAdvancedFiltersChange} /> : <AdsFiltersContent filters={adsFilters} onFiltersChange={handleAdsFiltersChange} />)}

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
        }} className="pl-10 pr-8" />
          {searchTerm && <button type="button" onClick={() => {
          onSearchTermChange('');
          setCurrentPage(1);
        }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>}
        </div>
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
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetColumnWidths}>
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Resetear anchos de columna</TooltipContent>
          </Tooltip>
          
          <BulkCopyTools keywords={filteredKeywords} selectedIds={selectedIds} />
          <KeywordExportCSV keywords={filteredKeywords} bookEconomy={bookEconomy} selectedIds={selectedIds} />
          <Button data-tour="bulk-import" variant="outline" size="sm" onClick={() => setIsBulkImportOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            Importar lote
          </Button>
          {selectedIds.size === 2 && <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setIsComparisonOpen(true)} className="gap-2 border-primary/50 text-primary hover:bg-primary/10">
                  <GitCompare className="w-4 h-4" />
                  Comparar
                </Button>
              </TooltipTrigger>
              <TooltipContent>Comparar las 2 keywords seleccionadas lado a lado</TooltipContent>
            </Tooltip>}
          {selectedIds.size > 0 && <Button variant="destructive" size="sm" onClick={handleDeleteSelected} className="gap-2">
              <Trash2 className="w-4 h-4" />
              Eliminar ({selectedIds.size})
            </Button>}
        </div>
      </div>

      {/* Bulk actions (Editorial) */}
      {functionalView === 'editorial' && (
        <BulkEditorialStatusToolbar
          selectedCount={selectedIds.size}
          onChangeStatus={handleBulkChangeKeywordStatus}
        />
      )}

      {/* Content - Table */}
      <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead style={{
                width: columnWidths.checkbox
              }}>
                    <Checkbox checked={selectedIds.size === filteredKeywords.length && filteredKeywords.length > 0} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead style={{
                width: columnWidths.star
              }}>
                    <div className="flex items-center justify-center">
                      <Star className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <ResizableTableHeader columnKey="keyword" width={columnWidths.keyword} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('keyword')}>
                    <div className="flex items-center gap-1">
                      Keyword 
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </ResizableTableHeader>
                  <ResizableTableHeader columnKey="volume" width={columnWidths.volume} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('searchVolume')}>
                    <div className="flex items-center gap-1">
                      Volumen
                      <ArrowUpDown className="w-3 h-3" />
                      <InfoTooltip content="Volumen de búsquedas mensuales estimado." />
                    </div>
                  </ResizableTableHeader>
                  <ResizableTableHeader columnKey="competitors" width={columnWidths.competitors} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('competitors')}>
                    <div className="flex items-center gap-1">
                      Competidores
                      <ArrowUpDown className="w-3 h-3" />
                      <InfoTooltip content="Resultados Amazon para esta búsqueda. Menos de 3000 se considera favorable." />
                    </div>
                  </ResizableTableHeader>
                  
                  {/* Columnas específicas por vista */}
                  {functionalView === 'editorial' ? <>
                      <ResizableTableHeader columnKey="marketScore" width={columnWidths.marketScore} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('marketScore')}>
                        <div className="flex items-center gap-1">
                          Market Score
                          <ArrowUpDown className="w-3 h-3" />
                          <InfoTooltip content="Puntuación 0-100 de viabilidad de mercado." />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader columnKey="status" width={columnWidths.status} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('status')}>
                        <div className="flex items-center gap-1">
                          Estado
                          <ArrowUpDown className="w-3 h-3" />
                          <InfoTooltip content="Pendiente / Válida / Descartada" />
                        </div>
                      </ResizableTableHeader>
                    </> : <>
                      <ResizableTableHeader columnKey="campaign" width={columnWidths.campaign} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('keyword')}>
                        <div className="flex items-center gap-1">
                          Campaña
                          <InfoTooltip content="Nombre de la campaña de Amazon Ads donde se usa esta keyword." />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader columnKey="acosPE" width={columnWidths.acosPE} onResize={setColumnWidth}>
                        <div className="flex items-center gap-1">
                          ACOS PE
                          <InfoTooltip content="ACOS Punto de Equilibrio. Si ACOS actual supera este valor, pierdes dinero." />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader columnKey="clicks" width={columnWidths.clicks} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('clicks')}>
                        <div className="flex items-center gap-1">
                          Clicks
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader columnKey="cpc" width={columnWidths.cpc} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('cpc')}>
                        <div className="flex items-center gap-1">
                          CPC
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader columnKey="pedidos" width={columnWidths.pedidos} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('pedidos')}>
                        <div className="flex items-center gap-1">
                          Pedidos
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader columnKey="gasto" width={columnWidths.gasto} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('gasto')}>
                        <div className="flex items-center gap-1">
                          Gasto
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader columnKey="ventas" width={columnWidths.ventas} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('ventas')}>
                        <div className="flex items-center gap-1">
                          Ventas
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader columnKey="acos" width={columnWidths.acos} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('acosActual')}>
                        <div className="flex items-center gap-1">
                          ACOS
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader columnKey="acosSig" width={columnWidths.acosSig} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('acosSiguiente')}>
                        <div className="flex items-center gap-1">
                          ACOS Sig.
                          <ArrowUpDown className="w-3 h-3" />
                          <InfoTooltip content="ACOS si el siguiente click genera 1 venta. Escenario optimista." />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader columnKey="conversion" width={columnWidths.conversion} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('conversion')}>
                        <div className="flex items-center gap-1">
                          Conv.
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </ResizableTableHeader>
                      <ResizableTableHeader columnKey="beneficio" width={columnWidths.beneficio} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('beneficio')}>
                        <div className="flex items-center gap-1">
                          Beneficio
                          <ArrowUpDown className="w-3 h-3" />
                          <InfoTooltip content="Ventas - Gasto. Muestra la rentabilidad de cada keyword." />
                        </div>
                      </ResizableTableHeader>
                    </>}
                </TableRow>
              </TableHeader>
              <TableBody>
              {paginatedKeywords.length === 0 ? <TableRow>
                    <TableCell colSpan={functionalView === 'editorial' ? 7 : 14} className="text-center py-8 text-muted-foreground">
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
              const acosSiguiente = calcularAcosSiguienteClickPorcentaje(gastoCalculado ?? undefined, ads?.cpcActual, ventasCalculadas ?? undefined, bookEconomy.precioLibro);
              const conversion = calcularConversionPorcentaje(ads?.pedidos, ads?.clicks);
              const acosEquilibrio = bookEconomy.precioLibro > 0 && bookEconomy.regaliasPorVenta > 0 ? bookEconomy.regaliasPorVenta / bookEconomy.precioLibro * 100 : null;

              // Inline update handler for ads data with auto-click logic
              const handleInlineAdsUpdate = (field: 'clicks' | 'cpcActual' | 'pedidos', value: string) => {
                const numValue = value === '' ? undefined : parseFloat(value);
                if (value !== '' && (isNaN(numValue!) || numValue! < 0)) return;
                const baseAds = (ads ?? {}) as AdsData;
                let updatedAdsData: AdsData = {
                  ...baseAds,
                  [field]: numValue
                };

                // Auto-click rule: when increasing pedidos, also increase clicks by the same delta.
                if (field === 'pedidos' && numValue !== undefined) {
                  const prevPedidos = baseAds.pedidos ?? 0;
                  const prevClicks = baseAds.clicks ?? 0;
                  const delta = numValue - prevPedidos;
                  if (delta > 0) {
                    updatedAdsData.clicks = prevClicks + delta;
                  }

                  // Always keep clicks >= pedidos
                  if ((updatedAdsData.clicks ?? 0) < numValue) {
                    updatedAdsData.clicks = numValue;
                  }
                }
                onUpdate(keyword.id, {
                  adsData: updatedAdsData
                });

                // Force sync panel if it's open for this keyword
                if (validationKeyword?.id === keyword.id) {
                  setValidationKeyword({
                    ...keyword,
                    adsData: updatedAdsData,
                    updatedAt: new Date()
                  });
                }
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
                          <Button variant="ghost" size="sm" onClick={handleSetMainKeyword} className={cn("h-7 w-7 p-0", isMainKeyword ? "bg-amber-500/20 text-amber-600 hover:bg-amber-500/30" : "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10")}>
                            <Star className={cn("w-4 h-4", isMainKeyword && "fill-current")} />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {/* Data inconsistency warning */}
                            {hasDataInconsistency && <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-medium">Datos inconsistentes</p>
                                  <p className="text-xs text-muted-foreground">Clicks ({ads?.clicks}) &lt; Pedidos ({ads?.pedidos})</p>
                                </TooltipContent>
                              </Tooltip>}
                            {/* Primary action: Open detail panel */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => setValidationKeyword(keyword)} className="h-7 w-7 p-0 bg-primary/10 hover:bg-primary/20 text-primary">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Abrir ficha de keyword</TooltipContent>
                            </Tooltip>

                            {/* Manual save (forces refresh + sync) */}
                            {functionalView === 'ads' && <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => {
                          const baseAds = (ads ?? {}) as AdsData;
                          const normalizedAds: AdsData = {
                            ...baseAds
                          };
                          // Trigger a new object reference to ensure side panel sync
                          onUpdate(keyword.id, {
                            adsData: normalizedAds
                          });
                          if (validationKeyword?.id === keyword.id) {
                            setValidationKeyword({
                              ...keyword,
                              adsData: normalizedAds
                            });
                          }
                          toast({
                            title: 'Guardado',
                            description: 'Datos de Ads sincronizados.'
                          });
                        }} className="h-7 w-7 p-0 bg-muted/40 hover:bg-muted">
                                    <Save className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Guardar Ads</TooltipContent>
                              </Tooltip>}

                            <div className={cn(isMainKeyword && "text-amber-600 dark:text-amber-400")}>
                              <InlineEditableCell value={keyword.keyword} onSave={value => handleUpdateWithHistory(keyword.id, {
                        keyword: String(value)
                      })} placeholder="Keyword..." className={cn("font-medium", isMainKeyword && "text-amber-600 dark:text-amber-400")} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums text-sm" onClick={e => e.stopPropagation()}>
                          {functionalView === 'editorial' ? <InlineEditableCell value={keyword.searchVolume || 0} type="number" min={0} onSave={value => handleUpdateWithHistory(keyword.id, {
                    searchVolume: Number(value)
                  })} formatter={v => Number(v || 0).toLocaleString()} className="text-sm" /> : (keyword.searchVolume || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="tabular-nums text-sm" onClick={e => e.stopPropagation()}>
                          {functionalView === 'editorial' ? <div className="flex items-center gap-2">
                              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", (keyword.competitors || 0) < 3000 ? "bg-green-500" : "bg-red-500")} />
                              <InlineEditableCell value={keyword.competitors || 0} type="number" min={0} onSave={value => handleUpdateWithHistory(keyword.id, {
                      competitors: Number(value)
                    })} formatter={v => Number(v || 0).toLocaleString()} className="text-sm" />
                            </div> : <div className="flex items-center gap-2">
                              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", (keyword.competitors || 0) < 3000 ? "bg-green-500" : "bg-red-500")} />
                              {(keyword.competitors || 0).toLocaleString()}
                            </div>}
                        </TableCell>
                        
                        {/* Columnas específicas por vista */}
                        {functionalView === 'editorial' ? <>
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
                          </> : <>
                            {/* Campaña - Dropdown select */}
                            <TableCell onClick={e => e.stopPropagation()}>
                              <CampaignSelect value={ads?.campaignName ?? ''} onChange={value => {
                      const baseAds = (ads ?? {}) as AdsData;
                      const updatedAdsData = {
                        ...baseAds,
                        campaignName: value
                      };
                      onUpdate(keyword.id, {
                        adsData: updatedAdsData
                      });
                      // Force sync panel if open for this keyword
                      if (validationKeyword?.id === keyword.id) {
                        setValidationKeyword({
                          ...keyword,
                          adsData: updatedAdsData,
                          updatedAt: new Date()
                        });
                      }
                    }} campaigns={campaigns} onAddCampaign={addCampaign} placeholder="Campaña..." className="h-7 text-xs max-w-[120px]" />
                            </TableCell>
                            {/* ACOS Equilibrio (PE) - Read only reference */}
                            <TableCell className="tabular-nums text-xs font-medium text-primary">
                              {acosEquilibrio !== null ? `${acosEquilibrio.toFixed(1)}%` : '—'}
                            </TableCell>
                            {/* Clicks - Inline editable with increment buttons */}
                            <TableCell onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-0.5">
                                <Input type="number" min={0} step={1} value={ads?.clicks ?? ''} onChange={e => handleInlineAdsUpdate('clicks', e.target.value)} className="h-7 w-14 text-xs tabular-nums text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" />
                                <div className="flex flex-col">
                                  <Button variant="ghost" size="sm" className="h-3.5 w-5 p-0 hover:bg-primary/20" onClick={() => handleInlineAdsUpdate('clicks', String((ads?.clicks ?? 0) + 1))}>
                                    <ChevronUp className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-3.5 w-5 p-0 hover:bg-primary/20" onClick={() => handleInlineAdsUpdate('clicks', String(Math.max(0, (ads?.clicks ?? 0) - 1)))}>
                                    <ChevronDown className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                            {/* CPC - Inline editable with increment buttons */}
                            <TableCell onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-0.5">
                                <Input type="number" min={0} step={0.01} value={ads?.cpcActual ?? ''} onChange={e => handleInlineAdsUpdate('cpcActual', e.target.value)} className="h-7 w-14 text-xs tabular-nums text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0.00" />
                                <div className="flex flex-col">
                                  <Button variant="ghost" size="sm" className="h-3.5 w-5 p-0 hover:bg-primary/20" onClick={() => handleInlineAdsUpdate('cpcActual', String(((ads?.cpcActual ?? 0) + 0.01).toFixed(2)))}>
                                    <ChevronUp className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-3.5 w-5 p-0 hover:bg-primary/20" onClick={() => handleInlineAdsUpdate('cpcActual', String(Math.max(0, (ads?.cpcActual ?? 0) - 0.01).toFixed(2)))}>
                                    <ChevronDown className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                            {/* Pedidos - Inline editable with increment buttons */}
                            <TableCell onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-0.5">
                                <Input type="number" min={0} step={1} value={ads?.pedidos ?? ''} onChange={e => handleInlineAdsUpdate('pedidos', e.target.value)} className="h-7 w-14 text-xs tabular-nums text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" />
                                <div className="flex flex-col">
                                  <Button variant="ghost" size="sm" className="h-3.5 w-5 p-0 hover:bg-primary/20" onClick={() => handleInlineAdsUpdate('pedidos', String((ads?.pedidos ?? 0) + 1))}>
                                    <ChevronUp className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-3.5 w-5 p-0 hover:bg-primary/20" onClick={() => handleInlineAdsUpdate('pedidos', String(Math.max(0, (ads?.pedidos ?? 0) - 1)))}>
                                    <ChevronDown className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                            {/* Gasto - Auto-calculated (read-only) */}
                            <TableCell className="tabular-nums text-xs text-muted-foreground">
                              {formatearMoneda(gastoCalculado)}
                            </TableCell>
                            {/* Ventas - Auto-calculated (read-only) */}
                            <TableCell className="tabular-nums text-xs text-muted-foreground">
                              {formatearMoneda(ventasCalculadas)}
                            </TableCell>
                            {/* ACOS Actual with Alert Icon */}
                            <TableCell className="tabular-nums text-xs">
                              <div className="flex items-center gap-1">
                                {acosActual !== null && acosEquilibrio !== null && acosActual > acosEquilibrio && <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                      </TooltipTrigger>
                                      <TooltipContent side="left" className="text-xs">
                                        <p className="font-medium">ACOS sobre equilibrio</p>
                                        <p>Actual: {formatearPorcentaje(acosActual)}</p>
                                        <p>Equilibrio: {formatearPorcentaje(acosEquilibrio)}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>}
                                <span className={cn(acosActual !== null && acosEquilibrio !== null ? acosActual <= acosEquilibrio ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
                                  {formatearPorcentaje(acosActual)}
                                </span>
                              </div>
                            </TableCell>
                            {/* ACOS Siguiente Click */}
                            <TableCell className="tabular-nums text-xs">
                              <span className={cn(acosSiguiente !== null && acosEquilibrio !== null ? acosSiguiente <= acosEquilibrio ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
                                {formatearPorcentaje(acosSiguiente)}
                              </span>
                            </TableCell>
                            {/* Conversión */}
                            <TableCell className="tabular-nums text-xs text-muted-foreground">
                              {formatearPorcentaje(conversion)}
                            </TableCell>
                            {/* Beneficio */}
                            <TableCell className="tabular-nums text-xs">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help">
                                      {(() => {
                              const beneficio = gastoCalculado !== null && ventasCalculadas !== null ? ventasCalculadas - gastoCalculado : null;
                              if (beneficio === null) return '—';
                              return <span className={beneficio >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                          {formatearMoneda(beneficio)}
                                        </span>;
                            })()}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-xs">
                                    <p className="font-medium">Beneficio = Ventas - Gasto</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      ⚠️ Este NO es el beneficio real. Se calcula con ventas totales (PVP × Pedidos), no con las regalías.
                                      El ACOS te indica si realmente tienes beneficio: si ACOS &lt; PE = beneficio real.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </>}
                      </TableRow>;
            })}
              </TableBody>
            </Table>
          </div>
        </div>

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
      <KeywordDetailPanel keyword={validationKeyword} isOpen={!!validationKeyword} onClose={() => setValidationKeyword(null)} onSave={handleKeywordDetailSave} marketplaceId={marketplaceId} bookEconomy={bookEconomy} defaultTab={functionalView === 'ads' ? 'ads' : 'nicho'} allKeywords={keywords} />
      
      {/* New Keyword Wizard */}
      <NewKeywordWizard open={isWizardOpen} onOpenChange={setIsWizardOpen} onComplete={handleWizardComplete} marketplaceId={marketplaceId} bookInfo={bookInfo} bookEconomy={bookEconomy} existingKeywords={keywords} initialKeyword={wizardInitialKeyword} onOpenExistingKeyword={handleOpenExistingKeyword} campaigns={campaigns} onAddCampaign={addCampaign} />
      
      {/* Keyword Comparison Panel */}
      <KeywordComparisonPanel items={keywords.filter(k => selectedIds.has(k.id)).slice(0, 2)} type="keyword" isOpen={isComparisonOpen} onClose={() => setIsComparisonOpen(false)} onRemove={id => {
      const newSet = new Set(selectedIds);
      newSet.delete(id);
      onSelectedIdsChange(newSet);
      if (newSet.size < 2) setIsComparisonOpen(false);
    }} bookEconomy={bookEconomy} />
      
      {/* ADS History Panel */}
      <AdsHistoryPanel keyword={adsHistoryKeyword?.keyword ?? ''} adsData={adsHistoryKeyword?.adsData} bookEconomy={bookEconomy} isOpen={!!adsHistoryKeyword} onClose={() => setAdsHistoryKeyword(null)} onAdsDataChange={(newAdsData: AdsData) => {
      if (adsHistoryKeyword) {
        onUpdate(adsHistoryKeyword.id, {
          adsData: newAdsData
        });
      }
    }} />
      
      {/* Plan Upgrade Modal */}
      <PlanUpgradeModal open={showPlanUpgradeModal} onOpenChange={setShowPlanUpgradeModal} />
    </div>;
};