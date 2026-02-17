import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Search, Trash2, ArrowUpDown, Eye, BookOpen, Megaphone, Info, Star, AlertTriangle, RotateCcw, GitCompare, ChevronUp, ChevronDown, Save, Crown, Upload, X } from 'lucide-react';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
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
import { NewAdsKeywordWizard } from './NewAdsKeywordWizard';
import { KeywordExportCSV } from './KeywordExportCSV';
import { KeywordComparisonPanel } from './KeywordComparisonPanel';
import { ResizableTableHeader } from './ResizableTableHeader';
import { DraggableResizableHeader } from './DraggableResizableHeader';
import { AdsDashboard } from './AdsDashboard';
import { CampaignSelect } from './CampaignSelect';
import { PlanUpgradeModal } from './PlanUpgradeModal';
import { AcosSparkline } from './AcosSparkline';
import { AcosAlertsTray } from './AcosAlertsTray';
import { AdvancedImportModal } from './AdvancedImportModal';
import { AmazonAdsImportModal } from './AmazonAdsImportModal';
import { type Keyword, type CampaignType, type CompetitionLevel, type RelevanceLevel, type IntentType, type KeywordState, type BookInfo, type BookEconomy, type HistoryEntry, type AdsData, RELEVANCE_LEVELS, INTENT_TYPES, KEYWORD_STATES, calculateRelevance, classifyIntent, getCurrencySymbol } from '@/types/advertising';
import { calculateMarketScore, getDefaultMarketData, KEYWORD_STATUS_OPTIONS, type KeywordStatus } from '@/lib/market-score';
import { createKeywordDefaults } from '@/lib/keyword-helpers';
import { getAutoStatusFromScore } from '@/lib/keyword-builder';
import { sortKeywords, getKeywordMarketScore, isMarketDataIncomplete, SORT_OPTIONS, type SortField, type SortOrder } from '@/lib/keyword-sorting';
import { applyKeywordFilters } from '@/lib/keyword-filters';
import { useKeywordUIPersistence, type FunctionalView } from '@/hooks/useKeywordUIPersistence';
import { useColumnWidths, type ColumnWidths } from '@/hooks/useColumnWidths';
import { useColumnOrder } from '@/hooks/useColumnOrder';
import { useFilterPresets } from '@/hooks/useFilterPresets';
import { useCampaigns } from '@/hooks/useCampaigns';
import { calcularGastoAcumulado, calcularVentasAcumuladas, calcularAcosActualPorcentaje, calcularAcosSiguienteClickPorcentaje, calcularConversionPorcentaje, calcularAcosEquilibrioPorcentaje, formatearPorcentaje, formatearMoneda } from '@/lib/acosEquilibrio';
import { getCurrentPlan, hasAccess } from '@/lib/plan-system';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Highlighted columns (ACOS focus)
const HIGHLIGHTED_COLUMNS = new Set(['acos', 'acosSig']);

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
  campaign: 100,
  volume: 80,
  competitors: 90,
  acosPE: 65,
  impresiones: 70,
  clicks: 60,
  ctr: 60,
  cpc: 70,
  pedidos: 60,
  gasto: 65,
  ventas: 65,
  acos: 75,
  acosSig: 70,
  tendencia: 80,
  conversion: 65,
  beneficio: 75
};

// Default column orders (reorderable columns only - checkbox, star, keyword are fixed)
const DEFAULT_EDITORIAL_ORDER = ['volume', 'competitors', 'marketScore', 'status'];
const DEFAULT_ADS_ORDER = ['campaign', 'acosPE', 'impresiones', 'clicks', 'ctr', 'cpc', 'pedidos', 'gasto', 'ventas', 'acos', 'acosSig', 'tendencia', 'conversion', 'beneficio'];
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
  // Force a specific view (editorial or ads) - when provided, hides the view toggle
  forcedView?: 'editorial' | 'ads';
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
  onSearchTermChange,
  forcedView: forcedViewProp
}: KeywordsSectionProps) => {
  const {
    toast
  } = useToast();
  const currencySymbol = getCurrencySymbol(marketplaceId);
  // Use persistence hook for UI state
  const {
    state: persistedState,
    isHydrated,
    updateFilters,
    updateAdsFilters: persistAdsFilters,
    updateQuickFilter,
    updateSort,
    updateFunctionalView
  } = useKeywordUIPersistence(marketplaceId);

  // Local state synced with persistence - SEPARATE filters for each view
  const [filters, setFilters] = useState<AdvancedFiltersState>(persistedState.filters);
  const [adsFilters, setAdsFilters] = useState<AdsFiltersState>(persistedState.adsFilters || defaultAdsFiltersState);
  const [sortField, setSortField] = useState<SortField>(persistedState.sortField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(persistedState.sortOrder);
  const [currentPage, setCurrentPage] = useState(1);
  const [showExternalImportModal, setShowExternalImportModal] = useState(false);
  const [showAmazonAdsImport, setShowAmazonAdsImport] = useState(false);
  const [quickAddKeyword, setQuickAddKeyword] = useState('');
  const [historyKeyword, setHistoryKeyword] = useState<Keyword | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isAdsWizardOpen, setIsAdsWizardOpen] = useState(false);
  const [isAlertsDialogOpen, setIsAlertsDialogOpen] = useState(false);
  const [wizardInitialKeyword, setWizardInitialKeyword] = useState('');
  // Single source of truth: store only the ID, derive the keyword from keywords array
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null);
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

  // Functional view state (Editorial vs Ads) - use forcedView if provided
  const [functionalViewInternal, setFunctionalViewInternal] = useState<FunctionalView>(persistedState.functionalView || 'editorial');
  const functionalView = forcedViewProp || functionalViewInternal;
  const setFunctionalView = forcedViewProp ? () => {} : setFunctionalViewInternal;

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

  // Column order management for drag-and-drop reordering
  const {
    order: editorialColumnOrder,
    reorder: reorderEditorialColumns,
    resetOrder: resetEditorialOrder
  } = useColumnOrder(`keywords-editorial-${marketplaceId}`, DEFAULT_EDITORIAL_ORDER);
  const {
    order: adsColumnOrder,
    reorder: reorderAdsColumns,
    resetOrder: resetAdsOrder
  } = useColumnOrder(`keywords-ads-${marketplaceId}`, DEFAULT_ADS_ORDER);
  const columnOrder = functionalView === 'editorial' ? editorialColumnOrder : adsColumnOrder;
  const reorderColumns = functionalView === 'editorial' ? reorderEditorialColumns : reorderAdsColumns;
  const resetColumnOrder = functionalView === 'editorial' ? resetEditorialOrder : resetAdsOrder;

  // DnD sensor for column reordering (with activation distance to avoid accidental drags)
  const dndSensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8
    }
  }));
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    if (over && active.id !== over.id) {
      reorderColumns(String(active.id), String(over.id));
    }
  }, [reorderColumns]);

  // Sync persisted state when hydrated - SEPARATE filters for each view
  useEffect(() => {
    if (isHydrated) {
      setFilters(persistedState.filters);
      setAdsFilters(persistedState.adsFilters || defaultAdsFiltersState);
      setSortField(persistedState.sortField);
      setSortOrder(persistedState.sortOrder);
      if (!forcedViewProp) {
        setFunctionalViewInternal(persistedState.functionalView || 'editorial');
      }
    }
  }, [isHydrated, persistedState]);

  // Derive selected keyword from keywords array (single source of truth - no sync patches!)
  const selectedKeyword = useMemo(() => keywords.find((k) => k.id === selectedKeywordId) ?? null, [keywords, selectedKeywordId]);

  // Memoize callback to avoid infinite loops
  const stableOnSelectedIdsChange = useCallback(onSelectedIdsChange, [onSelectedIdsChange]);

  // Open wizard instead of adding directly
  const handleQuickAdd = () => {
    if (!quickAddKeyword.trim()) return;
    setWizardInitialKeyword(quickAddKeyword.trim());
    if (functionalView === 'ads') {
      setIsAdsWizardOpen(true);
    } else {
      setIsWizardOpen(true);
    }
    setQuickAddKeyword('');
  };

  // State to track newly created keyword for visibility check
  const [pendingKeywordId, setPendingKeywordId] = useState<string | null>(null);

  // Handle wizard completion - open detail panel immediately
  // The keyword from wizard already has id, createdAt, adsData - use it directly
  const handleWizardComplete = (keyword: Keyword) => {
    // Add to the list first
    onAdd(keyword);
    setWizardInitialKeyword('');

    // Open panel by ID - the keyword is already in the store, derivation will sync automatically
    setSelectedKeywordId(keyword.id);

    // Mark for visibility check after keywords update
    setPendingKeywordId(keyword.id);
  };

  // Handle opening existing keyword from wizard duplicate detection
  const handleOpenExistingKeyword = (keyword: Keyword) => {
    setSelectedKeywordId(keyword.id);
  };

  // Open wizard for new keyword
  const handleOpenNewKeywordWizard = () => {
    setWizardInitialKeyword('');
    if (functionalView === 'ads') {
      setIsAdsWizardOpen(true);
    } else {
      setIsWizardOpen(true);
    }
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
    toast({
      title: `${count} keywords eliminadas`
    });
  };
  const handleBulkImport = (newKeywords: Array<Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const classifiedKeywords = newKeywords.map((k) => ({
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
      statusManuallySet: true
    });
    onSelectedIdsChange(new Set());
  };
  const handleBulkChangeRelevance = (relevance: RelevanceLevel) => {
    onUpdateBulk(Array.from(selectedIds), {
      relevance
    });
    onSelectedIdsChange(new Set());
  };

  // Handle keyword update from detail panel (no local state patch needed - derivation handles sync)
  const handleKeywordDetailSave = (keywordId: string, updates: Partial<Keyword>) => {
    onUpdate(keywordId, updates);

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
    const keyword = keywords.find((k) => k.id === id);
    if (!keyword) return;

    // Track history for specific fields
    type TrackableField = 'searchVolume' | 'state' | 'relevance';
    const historyEntries: HistoryEntry[] = [];
    const trackedFields: TrackableField[] = ['searchVolume', 'state', 'relevance'];
    trackedFields.forEach((field) => {
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
    const isMarketDataUpdate = marketDataFields.some((f) => updates[f as keyof typeof updates] !== undefined);
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

  // Handle ADS filter change - INDEPENDENT from editorial filters
  const handleAdsFiltersChange = (newFilters: AdsFiltersState) => {
    setAdsFilters(newFilters);
    persistAdsFilters(newFilters);
    setCurrentPage(1);
  };

  // Reveal keyword and open panel - clears filters to ensure visibility
  const revealKeywordAndOpenPanel = useCallback((keywordId: string) => {
    // Clear search
    onSearchTermChange('');

    // Reset ADS filters but keep needsAttention to show the alert keywords
    setAdsFilters({
      ...defaultAdsFiltersState,
      needsAttention: true
    });
    persistAdsFilters({
      ...defaultAdsFiltersState,
      needsAttention: true
    });

    // Wait for filter update then navigate to keyword page
    requestAnimationFrame(() => {
      const idx = keywords.findIndex((k) => k.id === keywordId);
      if (idx >= 0) {
        setCurrentPage(Math.floor(idx / ITEMS_PER_PAGE) + 1);
      }
      setSelectedKeywordId(keywordId);
    });
  }, [keywords, onSearchTermChange, persistAdsFilters]);

  // Filter and sort keywords - filter by purpose based on functional view
  const filteredKeywords = useMemo(() => {
    // Step 1: Filter by purpose
    let result = keywords.filter((k) => {
      if (functionalView === 'editorial') {
        return k.purpose === 'editorial' || k.purpose === 'both';
      } else {
        return k.purpose === 'ads' || k.purpose === 'both';
      }
    });

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
      result = result.filter((k) => {
        const ads = k.adsData;
        const gastoCalculado = calcularGastoAcumulado(ads?.clicks, ads?.cpcActual);
        const ventasCalculadas = calcularVentasAcumuladas(ads?.pedidos, bookEconomy.precioLibro);
        const beneficio = gastoCalculado !== null && ventasCalculadas !== null ? ventasCalculadas - gastoCalculado : null;
        const acosActual = calcularAcosActualPorcentaje(gastoCalculado ?? undefined, ventasCalculadas ?? undefined);
        const acosEquilibrioVal = bookEconomy.precioLibro > 0 && bookEconomy.regaliasPorVenta > 0 ? bookEconomy.regaliasPorVenta / bookEconomy.precioLibro * 100 : null;

        // Campaign name filter
        if (adsFilters.campaignName) {
          const campaignName = ads?.campaignName?.toLowerCase() || '';
          if (!campaignName.includes(adsFilters.campaignName.toLowerCase())) return false;
        }

        // Rentabilidad filter - CORRECTED: use ACOS vs PE, not beneficio
        // Profitable = ACOS actual <= ACOS equilibrio (PE)
        // Unprofitable = ACOS actual > ACOS equilibrio (PE)
        if (adsFilters.rentabilidad === 'profitable') {
          // Must have ACOS data and be <= PE
          if (acosActual === null || acosEquilibrioVal === null || acosActual > acosEquilibrioVal) return false;
        }
        if (adsFilters.rentabilidad === 'unprofitable') {
          // Must have ACOS data and be > PE
          if (acosActual === null || acosEquilibrioVal === null || acosActual <= acosEquilibrioVal) return false;
        }

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

        // Needs Attention filter (ACOS > ACOS PE)
        if (adsFilters.needsAttention) {
          const acosEquilibrioVal = bookEconomy.precioLibro > 0 && bookEconomy.regaliasPorVenta > 0 ? bookEconomy.regaliasPorVenta / bookEconomy.precioLibro * 100 : null;
          // Only pass if ACOS actual > ACOS equilibrio
          if (acosEquilibrioVal === null || acosActual === null || acosActual <= acosEquilibrioVal) {
            return false;
          }
        }
        return true;
      });
    }

    // Sort first
    let sorted = sortKeywords(result, sortField, sortOrder, bookEconomy.precioLibro);

    // Pin main keyword to top if it exists and is in the filtered results
    if (bookInfo.mainKeywordId) {
      const mainKeywordIndex = sorted.findIndex((k) => k.id === bookInfo.mainKeywordId);
      if (mainKeywordIndex > 0) {
        const [mainKeyword] = sorted.splice(mainKeywordIndex, 1);
        sorted = [mainKeyword, ...sorted];
      }
    }
    return sorted;
  }, [keywords, searchTerm, filters, adsFilters, sortField, sortOrder, functionalView, bookEconomy.precioLibro, bookEconomy.regaliasPorVenta, bookInfo.mainKeywordId]);

  // Check visibility of newly created keyword and show appropriate toast
  useEffect(() => {
    if (!pendingKeywordId) return;

    // Find keyword in the updated keywords array
    const keyword = keywords.find((k) => k.id === pendingKeywordId);
    if (!keyword) return; // Keyword not yet in the list

    // Find index in filtered list
    const indexInFiltered = filteredKeywords.findIndex((k) => k.id === pendingKeywordId);

    // Clear pending state
    setPendingKeywordId(null);
    if (indexInFiltered === -1) {
      // Keyword is filtered out by search/filters
      toast({
        title: 'Keyword creada',
        description: `Market Score: ${keyword.marketScore}/100 — Puede estar oculta por filtros activos`,
        action: <Button variant="outline" size="sm" onClick={() => {
          onSearchTermChange('');
          setFilters({
            status: null,
            minVolume: '',
            maxVolume: '',
            minCompetition: '',
            maxCompetition: '',
            campaignName: '',
            marketScoreRanges: [],
            has200PlusReviews: false,
            hasUnder100Reviews: false
          });
          setAdsFilters(defaultAdsFiltersState);
          setCurrentPage(1);
        }}>
            Limpiar filtros
          </Button>
      });
      return;
    }

    // Calculate which page the keyword is on
    const targetPage = Math.floor(indexInFiltered / ITEMS_PER_PAGE) + 1;
    if (targetPage === currentPage) {
      // Keyword is visible on current page - simple toast
      toast({
        title: 'Keyword creada',
        description: `Market Score: ${keyword.marketScore}/100`
      });
    } else {
      // Keyword is on a different page
      toast({
        title: 'Keyword creada',
        description: `Market Score: ${keyword.marketScore}/100 — Está en página ${targetPage}`,
        action: <Button variant="outline" size="sm" onClick={() => setCurrentPage(targetPage)}>
            Ver keyword
          </Button>
      });
    }
  }, [keywords, pendingKeywordId, filteredKeywords, currentPage, toast, onSearchTermChange]);

  // Purge invalid selection IDs when filtered list changes
  useEffect(() => {
    const validIds = new Set(filteredKeywords.map((k) => k.id));
    const nextSelected = new Set([...selectedIds].filter((id) => validIds.has(id)));
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
    const option = KEYWORD_STATUS_OPTIONS.find((s) => s.value === status);
    return option || KEYWORD_STATUS_OPTIONS[0];
  };

  // --- Header renderers for column reordering ---
  const renderEditorialHeader = (colKey: string) => {
    switch (colKey) {
      case 'volume':
        return <DraggableResizableHeader key={colKey} columnKey="volume" width={columnWidths.volume} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('searchVolume')}>
          <div className="flex items-center gap-1">
            Volumen
            <ArrowUpDown className="w-3 h-3" />
            <InfoTooltip content="Volumen de búsquedas mensuales estimado." />
          </div>
        </DraggableResizableHeader>;
      case 'competitors':
        return <DraggableResizableHeader key={colKey} columnKey="competitors" width={columnWidths.competitors} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('competitors')}>
          <div className="flex items-center gap-1">
            Competidores
            <ArrowUpDown className="w-3 h-3" />
            <InfoTooltip content="Resultados Amazon para esta búsqueda. Menos de 3000 se considera favorable." />
          </div>
        </DraggableResizableHeader>;
      case 'marketScore':
        return <DraggableResizableHeader key={colKey} columnKey="marketScore" width={columnWidths.marketScore} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('marketScore')}>
          <div className="flex items-center gap-1">
            Market Score
            <ArrowUpDown className="w-3 h-3" />
            <InfoTooltip content="Puntuación 0-100 de viabilidad de mercado." />
          </div>
        </DraggableResizableHeader>;
      case 'status':
        return <DraggableResizableHeader key={colKey} columnKey="status" width={columnWidths.status} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('status')}>
          <div className="flex items-center gap-1">
            Estado
            <ArrowUpDown className="w-3 h-3" />
            <InfoTooltip content="Pendiente / Válida / Descartada" />
          </div>
        </DraggableResizableHeader>;
      default:
        return null;
    }
  };
  const renderAdsHeader = (colKey: string) => {
    const isHighlighted = HIGHLIGHTED_COLUMNS.has(colKey);
    switch (colKey) {
      case 'campaign':
        return <DraggableResizableHeader key={colKey} columnKey="campaign" width={columnWidths.campaign} onResize={setColumnWidth}>
          <div className="flex items-center gap-1">
            Campaña
            <InfoTooltip content="Nombre de la campaña de Amazon Ads donde se usa esta keyword." />
          </div>
        </DraggableResizableHeader>;
      case 'volume':
        return <DraggableResizableHeader key={colKey} columnKey="volume" width={columnWidths.volume || 80} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('searchVolume')}>
          <div className="flex items-center gap-1">
            Vol.
            <ArrowUpDown className="w-3 h-3" />
          </div>
        </DraggableResizableHeader>;
      case 'competitors':
        return <DraggableResizableHeader key={colKey} columnKey="competitors" width={columnWidths.competitors || 90} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('competitors')}>
          <div className="flex items-center gap-1">
            Comp.
            <ArrowUpDown className="w-3 h-3" />
          </div>
        </DraggableResizableHeader>;
      case 'acosPE':
        return <DraggableResizableHeader key={colKey} columnKey="acosPE" width={columnWidths.acosPE} onResize={setColumnWidth}>
          <div className="flex items-center gap-1">
            PE
            <InfoTooltip content="ACOS Punto de Equilibrio. Si ACOS actual supera este valor, pierdes dinero." />
          </div>
        </DraggableResizableHeader>;
      case 'clicks':
        return <DraggableResizableHeader key={colKey} columnKey="clicks" width={columnWidths.clicks} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('clicks')}>
          <div className="flex items-center gap-1">
            Clicks
            <ArrowUpDown className="w-3 h-3" />
          </div>
        </DraggableResizableHeader>;
      case 'impresiones':
        return <DraggableResizableHeader key={colKey} columnKey="impresiones" width={columnWidths.impresiones || 70} onResize={setColumnWidth}>
          <div className="flex items-center gap-1">
            Impr.
            <InfoTooltip content="Número total de veces que se ha mostrado tu anuncio." />
          </div>
        </DraggableResizableHeader>;
      case 'ctr':
        return <DraggableResizableHeader key={colKey} columnKey="ctr" width={columnWidths.ctr || 60} onResize={setColumnWidth}>
          <div className="flex items-center gap-1">
            CTR
            <InfoTooltip content="Frecuencia con la que los clientes hacen clic en tu anuncio cuando se muestra. Un CTR del 3-5% es considerado óptimo." />
          </div>
        </DraggableResizableHeader>;
      case 'cpc':
        return <DraggableResizableHeader key={colKey} columnKey="cpc" width={columnWidths.cpc || 70} onResize={setColumnWidth}>
          <div className="flex items-center gap-1">
            CPC
            <InfoTooltip content="Coste por clic actual." />
          </div>
        </DraggableResizableHeader>;
      case 'pedidos':
        return <DraggableResizableHeader key={colKey} columnKey="pedidos" width={columnWidths.pedidos} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('pedidos')}>
          <div className="flex items-center gap-1">
            Pedidos
            <ArrowUpDown className="w-3 h-3" />
          </div>
        </DraggableResizableHeader>;
      case 'gasto':
        return <DraggableResizableHeader key={colKey} columnKey="gasto" width={columnWidths.gasto} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('gasto')}>
          <div className="flex items-center gap-1">
            Gasto
            <ArrowUpDown className="w-3 h-3" />
          </div>
        </DraggableResizableHeader>;
      case 'ventas':
        return <DraggableResizableHeader key={colKey} columnKey="ventas" width={columnWidths.ventas} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('ventas')}>
          <div className="flex items-center gap-1">
            Ventas
            <ArrowUpDown className="w-3 h-3" />
          </div>
        </DraggableResizableHeader>;
      case 'acos':
        return <DraggableResizableHeader key={colKey} columnKey="acos" width={columnWidths.acos} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('acosActual')} highlighted={isHighlighted}>
          <div className="flex items-center gap-1">
            <span className="font-bold">ACOS</span>
            <ArrowUpDown className="w-3 h-3" />
          </div>
        </DraggableResizableHeader>;
      case 'acosSig':
        return <DraggableResizableHeader key={colKey} columnKey="acosSig" width={columnWidths.acosSig || 70} onResize={setColumnWidth} highlighted={isHighlighted}>
          <div className="flex items-center gap-1">
            <span className="font-bold">ACOS Sig.</span>
            <InfoTooltip content="ACOS proyectado si se produce un click más sin venta. Útil para anticipar el impacto." />
          </div>
        </DraggableResizableHeader>;
      case 'tendencia':
        return <DraggableResizableHeader key={colKey} columnKey="tendencia" width={columnWidths.tendencia || 80} onResize={setColumnWidth}>
          <div className="flex items-center gap-1">
            Tendencia
            <InfoTooltip content="Evolución del ACOS en los últimos 7 días. Línea punteada = Punto de Equilibrio." />
          </div>
        </DraggableResizableHeader>;
      case 'conversion':
        return <DraggableResizableHeader key={colKey} columnKey="conversion" width={columnWidths.conversion} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('conversion')}>
          <div className="flex items-center gap-1">
            Conv.
            <ArrowUpDown className="w-3 h-3" />
          </div>
        </DraggableResizableHeader>;
      case 'beneficio':
        return <DraggableResizableHeader key={colKey} columnKey="beneficio" width={columnWidths.beneficio} onResize={setColumnWidth} className="cursor-pointer hover:text-foreground" onClick={() => handleSort('beneficio')}>
          <div className="flex items-center gap-1">
            Beneficio
            <ArrowUpDown className="w-3 h-3" />
            <InfoTooltip content="Ventas - Gasto. Nota: El ACOS es el verdadero indicador de rentabilidad." />
          </div>
        </DraggableResizableHeader>;
      default:
        return null;
    }
  };
  return <div data-tour="keywords-section" className="space-y-6 animate-fade-in">
      {/* Functional View Toggle - hidden when forcedView is set */}
      <div className="gap-4 flex-col flex items-start justify-start">
        <div className="items-start justify-between flex flex-col px-0 mx-0 my-0 py-0 gap-[13px]">
          
          {/* View Toggle: Editorial / Ads - only shown when no forcedView */}
          {!forcedViewProp &&
        <div className="p-1 bg-muted rounded-lg items-start justify-start flex flex-row px-[5px] my-0 py-0 gap-[4px]">
              <Button data-tour="btn-estudio-kw" variant={functionalView === 'editorial' ? 'default' : 'ghost'} size="sm" onClick={() => {
            setFunctionalView('editorial');
            updateFunctionalView('editorial');
          }} className={cn("gap-2 transition-all text-xs", functionalView === 'editorial' && "bg-primary text-primary-foreground")}>
                <BookOpen className="w-4 h-4" />
                Estudio de Keywords
              </Button>
              <Button data-tour="tab-ads" variant={functionalView === 'ads' ? 'default' : 'ghost'} size="sm" onClick={() => {
            if (!hasAdsAccess) {
              setShowPlanUpgradeModal(true);
              return;
            }
            setFunctionalView('ads');
            updateFunctionalView('ads');
          }} className={cn("gap-2 transition-all text-xs", functionalView === 'ads' && "bg-primary text-primary-foreground")}>
                <Megaphone className="w-4 h-4" />
                Gestión de Ads
                <Badge variant="secondary" className="ml-1 bg-blue-500 text-white text-[10px] px-1.5 py-0 h-4">
                  Plus
                </Badge>
              </Button>
            </div>
        }
        </div>
        
        {/* ADS Dashboard - only in ads view, collapsible - full width */}
        {functionalView === 'ads' && hasAdsAccess && <details className="group w-full bg-secondary rounded-lg" open>
            <summary className="gap-2 cursor-pointer select-none text-sm font-semibold transition-colors flex-row w-full border-primary text-[#f98334] flex items-start justify-center border-0 px-0 my-[2px] py-[12px]">
              <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-0 -rotate-90" />
              Dashboard de rendimiento
            </summary>
            <div className="px-4 pb-4">
              <AdsDashboard keywords={keywords} bookEconomy={bookEconomy} currencySymbol={currencySymbol} />
            </div>
          </details>}
      </div>

      {/* Advanced Filters - positioned above table with toolbar */}
      <div className="flex-wrap gap-2 flex items-center justify-start">
        {functionalView === 'editorial' ? <AdvancedFilters filters={filters} onFiltersChange={handleAdvancedFiltersChange} renderTriggerOnly isExpanded={advancedFiltersExpanded} onToggleExpanded={() => setAdvancedFiltersExpanded(!advancedFiltersExpanded)} /> : <AdvancedFiltersAds filters={adsFilters} onFiltersChange={handleAdsFiltersChange} renderTriggerOnly isExpanded={advancedFiltersExpanded} onToggleExpanded={() => setAdvancedFiltersExpanded(!advancedFiltersExpanded)} />}
        
        {/* Filter Presets */}
        <FilterPresetsDropdown type={functionalView} currentFilters={functionalView === 'editorial' ? filters : adsFilters} presets={presets} onSavePreset={savePreset} onLoadPreset={(loadedFilters) => {
        if (functionalView === 'editorial') {
          handleAdvancedFiltersChange(loadedFilters as AdvancedFiltersState);
        } else {
          handleAdsFiltersChange(loadedFilters as AdsFiltersState);
        }
      }} onDeletePreset={deletePreset} />
      </div>

      {/* Advanced Filters Content */}
      {advancedFiltersExpanded && (functionalView === 'editorial' ? <AdvancedFiltersContent filters={filters} onFiltersChange={handleAdvancedFiltersChange} /> : <AdsFiltersContent filters={adsFilters} onFiltersChange={handleAdsFiltersChange} />)}

      {/* Unified toolbar - single row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* 1. Import */}
        {functionalView === 'editorial' && <Button data-tour="external-import" size="sm" onClick={() => setShowExternalImportModal(true)} className="gap-2 bg-primary hover:bg-primary/90">
            <Upload className="w-4 h-4" />
            Importar datos
          </Button>}
        {functionalView === 'ads' && <Button data-tour="btn-import-ads" size="sm" onClick={() => setShowAmazonAdsImport(true)} className="gap-2 text-sm font-sans font-medium px-[27px] bg-accent">
            <Upload className="w-4 h-4" />
            Importar Amazon ADS
          </Button>}

        {/* 2. + Nueva (button only) */}
        <Button onClick={handleOpenNewKeywordWizard} size="sm" variant="outline" className="gap-1 whitespace-nowrap h-8 bg-primary">
          <Plus className="w-4 h-4" />
          Nueva
        </Button>

        {/* 3. Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar keywords..." value={searchTerm} onChange={(e) => {
          onSearchTermChange(e.target.value);
          setCurrentPage(1);
        }} className="pl-10 pr-8 w-48 h-8" />
          {searchTerm && <button type="button" onClick={() => {
          onSearchTermChange('');
          setCurrentPage(1);
        }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>}
        </div>

        {/* 4. Counter */}
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {filteredKeywords.length} de {keywords.length} keywords
        </div>

        {/* 5. Contextual view badge */}
        




        {/* 6. Needs Attention (ads only) */}
        {functionalView === 'ads' && (() => {
        const acosEquilibrioVal = bookEconomy.precioLibro > 0 && bookEconomy.regaliasPorVenta > 0 ? bookEconomy.regaliasPorVenta / bookEconomy.precioLibro * 100 : null;
        const needsAttentionCount = acosEquilibrioVal !== null ? keywords.filter((k) => {
          const ads = k.adsData;
          const gastoCalculado = calcularGastoAcumulado(ads?.clicks, ads?.cpcActual);
          const ventasCalculadas = calcularVentasAcumuladas(ads?.pedidos, bookEconomy.precioLibro);
          const acosActual = calcularAcosActualPorcentaje(gastoCalculado ?? undefined, ventasCalculadas ?? undefined);
          return acosActual !== null && acosActual > acosEquilibrioVal;
        }).length : 0;
        if (needsAttentionCount === 0) return null;
        return <Button variant="outline" size="sm" onClick={() => setIsAlertsDialogOpen(true)} className={cn("gap-1.5 text-xs border-red-500/50 text-red-600 hover:bg-red-500/10 h-8")}>
              <AlertTriangle className="w-3.5 h-3.5" />
              Necesitan atención: {needsAttentionCount}
            </Button>;
      })()}

        {/* 7. Separator */}
        <div className="h-5 w-px bg-border hidden sm:block" />

        {/* 8. Transfer buttons */}
        {functionalView === 'editorial' ? <>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" disabled={selectedIds.size === 0} onClick={() => {
          onUpdateBulk(Array.from(selectedIds), { purpose: 'both' });
          onSelectedIdsChange(new Set());
          toast({ title: `${selectedIds.size} keywords enviadas también a Ads`, description: 'Ahora aparecen en ambas vistas.' });
        }}>
              <Megaphone className="w-3.5 h-3.5" />
              Enviar también a Ads
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs text-muted-foreground" disabled={selectedIds.size === 0} onClick={() => {
          onUpdateBulk(Array.from(selectedIds), { purpose: 'ads' });
          onSelectedIdsChange(new Set());
          toast({ title: `${selectedIds.size} keywords movidas a Ads`, description: 'Ya no aparecen en Estudio de KW.' });
        }}>
              Mover a Ads
            </Button>
          </> : <>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" disabled={selectedIds.size === 0} onClick={() => {
          onUpdateBulk(Array.from(selectedIds), { purpose: 'both' });
          onSelectedIdsChange(new Set());
          toast({ title: `${selectedIds.size} keywords enviadas también a Estudio`, description: 'Ahora aparecen en ambas vistas.' });
        }}>
              <BookOpen className="w-3.5 h-3.5" />
              Enviar también a Estudio
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs text-muted-foreground" disabled={selectedIds.size === 0} onClick={() => {
          onUpdateBulk(Array.from(selectedIds), { purpose: 'editorial' });
          onSelectedIdsChange(new Set());
          toast({ title: `${selectedIds.size} keywords movidas a Estudio`, description: 'Ya no aparecen en Gestión de Ads.' });
        }}>
              Mover a Estudio
            </Button>
          </>}

        {/* 9. Spacer */}
        <div className="flex-1" />

        {/* 10. Reset columns */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
            resetColumnWidths();
            resetColumnOrder();
          }}>
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Resetear columnas (ancho y orden)</TooltipContent>
        </Tooltip>

        {/* 11. Copy all */}
        <BulkCopyTools keywords={filteredKeywords} selectedIds={selectedIds} />

        {/* 12. Export CSV */}
        <KeywordExportCSV keywords={filteredKeywords} bookEconomy={bookEconomy} selectedIds={selectedIds} />

        {/* 13. Compare (if 2 selected) */}
        {selectedIds.size === 2 && <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setIsComparisonOpen(true)} className="gap-2 border-primary/50 text-primary hover:bg-primary/10">
                <GitCompare className="w-4 h-4" />
                Comparar
              </Button>
            </TooltipTrigger>
            <TooltipContent>Comparar las 2 keywords seleccionadas lado a lado</TooltipContent>
          </Tooltip>}

        {/* 14. Delete (if selection) */}
        {selectedIds.size > 0 && <Button variant="destructive" size="sm" onClick={handleDeleteSelected} className="gap-2">
            <Trash2 className="w-4 h-4" />
            Eliminar ({selectedIds.size})
          </Button>}
      </div>

      {/* Bulk actions (Editorial) */}
      {functionalView === 'editorial' && <BulkEditorialStatusToolbar selectedCount={selectedIds.size} onChangeStatus={handleBulkChangeKeywordStatus} onQuickValidate={() => handleBulkChangeKeywordStatus('valid')} />}

      {/* Content - Table with DnD column reordering */}
      <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  {/* Fixed columns: checkbox, star, keyword */}
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

                  {/* Reorderable columns rendered in user-defined order */}
                  <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                    {columnOrder.map((colKey) => {
                    if (functionalView === 'editorial') {
                      return renderEditorialHeader(colKey);
                    } else {
                      return renderAdsHeader(colKey);
                    }
                  })}
                  </SortableContext>
                </TableRow>
              </TableHeader>
              <TableBody>
              {paginatedKeywords.length === 0 ? <TableRow>
                    <TableCell colSpan={3 + columnOrder.length} className="text-center py-8 text-muted-foreground">
                      {keywords.length === 0 ? 'No hay keywords. Añade tu primera keyword o importa en lote.' : 'No se encontraron keywords con los filtros aplicados.'}
                    </TableCell>
                  </TableRow> : paginatedKeywords.map((keyword) => {
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

                // Inline update handler for ads data with auto-click logic + auto CTR
                const handleInlineAdsUpdate = (field: 'clicks' | 'cpcActual' | 'pedidos' | 'impresiones', value: string | number) => {
                  const numValue = value === '' ? undefined : typeof value === 'number' ? value : parseFloat(value);
                  if (value !== '' && (numValue === undefined || isNaN(numValue) || numValue < 0)) return;
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

                  // Auto CTR calculation
                  const finalClicks = updatedAdsData.clicks ?? 0;
                  const finalImpr = updatedAdsData.impresiones ?? 0;
                  if (finalImpr > 0) {
                    updatedAdsData.ctr = Math.round(finalClicks / finalImpr * 10000) / 100;
                  }
                  onUpdate(keyword.id, {
                    adsData: updatedAdsData
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

                // Cell highlight class for ACOS columns
                const highlightCellClass = "bg-primary/5";

                // Render a cell by column key for editorial view
                const renderEditorialCellContent = (colKey: string) => {
                  switch (colKey) {
                    case 'volume':
                      return <TableCell key={colKey} className="tabular-nums text-sm" onClick={(e) => e.stopPropagation()}>
                      <InlineEditableCell value={keyword.searchVolume || 0} type="number" min={0} onSave={(value) => handleUpdateWithHistory(keyword.id, {
                          searchVolume: Number(value)
                        })} formatter={(v) => Number(v || 0).toLocaleString()} className="text-sm" />
                    </TableCell>;
                    case 'competitors':
                      return <TableCell key={colKey} className="tabular-nums text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", (keyword.competitors || 0) < 3000 ? "bg-green-500" : "bg-red-500")} />
                        <InlineEditableCell value={keyword.competitors || 0} type="number" min={0} onSave={(value) => handleUpdateWithHistory(keyword.id, {
                            competitors: Number(value)
                          })} formatter={(v) => Number(v || 0).toLocaleString()} className="text-sm" />
                      </div>
                    </TableCell>;
                    case 'marketScore':
                      return <TableCell key={colKey}>
                      <MarketScoreCell marketData={keyword.marketData} score={score} isIncomplete={incomplete} onValidate={() => setSelectedKeywordId(keyword.id)} />
                    </TableCell>;
                    case 'status':
                      return <TableCell key={colKey} onClick={(e) => e.stopPropagation()}>
                      <InlineSelectBadge value={keyword.status || 'pending'} options={KEYWORD_STATUS_OPTIONS.map((s) => ({
                          value: s.value,
                          label: s.label,
                          color: s.color
                        }))} onChange={(value) => handleUpdateWithHistory(keyword.id, {
                          status: value as KeywordStatus,
                          statusManuallySet: true
                        })} />
                    </TableCell>;
                    default:
                      return null;
                  }
                };

                // Render a cell by column key for ads view
                const renderAdsCellContent = (colKey: string) => {
                  const isHighlighted = HIGHLIGHTED_COLUMNS.has(colKey);
                  switch (colKey) {
                    case 'campaign':
                      return <TableCell key={colKey} className="text-xs text-muted-foreground truncate max-w-[100px]">
                      {ads?.campaignName || '—'}
                    </TableCell>;
                    case 'volume':
                      return <TableCell key={colKey} className="tabular-nums text-xs text-muted-foreground">
                      {(keyword.searchVolume || 0).toLocaleString()}
                    </TableCell>;
                    case 'competitors':
                      return <TableCell key={colKey} className="tabular-nums text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", (keyword.competitors || 0) < 3000 ? "bg-green-500" : "bg-red-500")} />
                        {(keyword.competitors || 0).toLocaleString()}
                      </div>
                    </TableCell>;
                    case 'acosPE':
                      return <TableCell key={colKey} className="tabular-nums text-xs font-medium text-primary">
                      {acosEquilibrio !== null ? `${acosEquilibrio.toFixed(1)}%` : '—'}
                    </TableCell>;
                    case 'clicks':
                      return <TableCell key={colKey} className="tabular-nums text-xs" onClick={(e) => e.stopPropagation()}>
                      <InlineEditableCell value={ads?.clicks ?? 0} type="number" min={0} onSave={(value) => handleInlineAdsUpdate('clicks', value)} className="text-xs" />
                    </TableCell>;
                    case 'impresiones':
                      return <TableCell key={colKey} className="tabular-nums text-xs" onClick={(e) => e.stopPropagation()}>
                      <InlineEditableCell value={ads?.impresiones ?? 0} type="number" min={0} onSave={(value) => handleInlineAdsUpdate('impresiones', value)} formatter={(v) => Number(v || 0).toLocaleString()} className="text-xs" />
                    </TableCell>;
                    case 'ctr':
                      return <TableCell key={colKey} className="tabular-nums text-xs">
                      <span className={cn(ads?.ctr !== undefined ? ads.ctr >= 3 && ads.ctr <= 5 ? 'text-green-600 dark:text-green-400' : ads.ctr < 3 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground' : 'text-muted-foreground')}>
                        {ads?.ctr !== undefined ? `${ads.ctr.toFixed(2)}%` : '—'}
                      </span>
                    </TableCell>;
                    case 'cpc':
                      return <TableCell key={colKey} className="tabular-nums text-xs" onClick={(e) => e.stopPropagation()}>
                      <InlineEditableCell value={ads?.cpcActual ?? 0} type="number" min={0} step={0.01} onSave={(value) => handleInlineAdsUpdate('cpcActual', value)} formatter={(v) => `${currencySymbol}${Number(v || 0).toFixed(2)}`} className="text-xs" />
                    </TableCell>;
                    case 'pedidos':
                      return <TableCell key={colKey} className="tabular-nums text-xs" onClick={(e) => e.stopPropagation()}>
                      <InlineEditableCell value={ads?.pedidos ?? 0} type="number" min={0} onSave={(value) => handleInlineAdsUpdate('pedidos', value)} className="text-xs" />
                    </TableCell>;
                    case 'gasto':
                      return <TableCell key={colKey} className="tabular-nums text-xs text-muted-foreground">
                      {formatearMoneda(gastoCalculado, currencySymbol)}
                    </TableCell>;
                    case 'ventas':
                      return <TableCell key={colKey} className="tabular-nums text-xs text-muted-foreground">
                      {formatearMoneda(ventasCalculadas, currencySymbol)}
                    </TableCell>;
                    case 'acos':
                      return <TableCell key={colKey} className={cn("tabular-nums text-xs", isHighlighted && highlightCellClass)}>
                      <div className="flex items-center gap-1">
                        {acosActual !== null && acosEquilibrio !== null && acosActual > acosEquilibrio && <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="left" className="text-xs">
                                <p className="font-medium">ACOS sobre equilibrio</p>
                                <p>Actual: {formatearPorcentaje(acosActual)}</p>
                                <p>Equilibrio: {formatearPorcentaje(acosEquilibrio)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>}
                        <span className={cn("font-semibold", acosActual !== null && acosEquilibrio !== null ? acosActual <= acosEquilibrio ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
                          {formatearPorcentaje(acosActual)}
                        </span>
                      </div>
                    </TableCell>;
                    case 'acosSig':
                      return <TableCell key={colKey} className={cn("tabular-nums text-xs", isHighlighted && highlightCellClass)}>
                      <span className={cn("font-semibold", acosSiguiente !== null && acosEquilibrio !== null ? acosSiguiente <= acosEquilibrio ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
                        {formatearPorcentaje(acosSiguiente)}
                      </span>
                    </TableCell>;
                    case 'tendencia':
                      return <TableCell key={colKey}>
                      <AcosSparkline history={ads?.history} acosEquilibrio={acosEquilibrio} />
                    </TableCell>;
                    case 'conversion':
                      return <TableCell key={colKey} className="tabular-nums text-xs text-muted-foreground">
                      {formatearPorcentaje(conversion)}
                    </TableCell>;
                    case 'beneficio':
                      return <TableCell key={colKey} className="tabular-nums text-xs">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">
                              {(() => {
                                  const beneficio = gastoCalculado !== null && ventasCalculadas !== null ? ventasCalculadas - gastoCalculado : null;
                                  if (beneficio === null) return '—';
                                  return <span className={beneficio >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                  {formatearMoneda(beneficio, currencySymbol)}
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
                    </TableCell>;
                    default:
                      return null;
                  }
                };
                return <TableRow key={keyword.id} className={cn('transition-colors', functionalView === 'editorial' ? getRowScoreClass(score) : hasDataInconsistency ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-muted/30')}>
                        {/* Fixed cells: checkbox, star, keyword */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selectedIds.has(keyword.id)} onCheckedChange={() => toggleSelect(keyword.id)} />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
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
                            
                            {/* Needs Attention badge - ACOS > PE - Icon only */}
                            {functionalView === 'ads' && acosEquilibrio !== null && acosActual !== null && acosActual > acosEquilibrio && <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-medium">ACOS sobre equilibrio</p>
                                  <p className="text-xs text-muted-foreground">
                                    ACOS: {formatearPorcentaje(acosActual)} vs PE: {formatearPorcentaje(acosEquilibrio)}
                                  </p>
                                </TooltipContent>
                              </Tooltip>}
                            
                            {/* Primary action: Open detail panel */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedKeywordId(keyword.id)} className="h-7 w-7 p-0 bg-primary/10 hover:bg-primary/20 text-primary">
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
                            onUpdate(keyword.id, {
                              adsData: normalizedAds
                            });
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

                            <div className={cn(isMainKeyword && "text-amber-600 dark:text-amber-400", "flex items-center gap-1")}>
                              <InlineEditableCell value={keyword.keyword} onSave={(value) => handleUpdateWithHistory(keyword.id, {
                          keyword: String(value)
                        })} placeholder="Keyword..." className={cn("font-medium", isMainKeyword && "text-amber-600 dark:text-amber-400")} />
                              {keyword.purpose === 'both' && <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/30 text-primary shrink-0">
                                      Ambas
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>Esta keyword aparece en Estudio y en Ads</TooltipContent>
                                </Tooltip>}
                            </div>
                          </div>
                        </TableCell>

                        {/* Ordered cells rendered in user-defined column order */}
                        {columnOrder.map((colKey) => {
                    if (functionalView === 'editorial') {
                      return renderEditorialCellContent(colKey);
                    } else {
                      return renderAdsCellContent(colKey);
                    }
                  })}
                      </TableRow>;
              })}
              </TableBody>
            </Table>
          </div>
        </div>
      </DndContext>

      {/* Pagination */}
      {totalPages > 1 && <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              Siguiente
            </Button>
          </div>
        </div>}

      {/* External Import Modal (Editorial view) */}
      <AdvancedImportModal isOpen={showExternalImportModal} onClose={() => setShowExternalImportModal(false)} onImport={handleBulkImport} marketplaceId={marketplaceId} existingKeywords={keywords} />
      
      {/* Amazon ADS Import Modal (Ads view) */}
      <AmazonAdsImportModal isOpen={showAmazonAdsImport} onClose={() => setShowAmazonAdsImport(false)} keywords={keywords} onUpdateKeyword={onUpdate} onAddBulk={onAddBulk} addCampaign={addCampaign} bookEconomy={bookEconomy} marketplaceId={marketplaceId} />

      {/* History Modal */}
      <KeywordHistoryModal keyword={historyKeyword} isOpen={!!historyKeyword} onClose={() => setHistoryKeyword(null)} />

      {/* Keyword Detail Panel */}
      <KeywordDetailPanel keyword={selectedKeyword} isOpen={!!selectedKeywordId} onClose={() => setSelectedKeywordId(null)} onSave={handleKeywordDetailSave} marketplaceId={marketplaceId} bookEconomy={bookEconomy} defaultTab={functionalView === 'ads' ? 'ads' : 'nicho'} allKeywords={keywords} visibleKeywordIds={filteredKeywords.map((k) => k.id)} onNavigate={(id) => setSelectedKeywordId(id)} />
      
      {/* New Keyword Wizard */}
      <NewKeywordWizard open={isWizardOpen} onOpenChange={setIsWizardOpen} onComplete={handleWizardComplete} marketplaceId={marketplaceId} bookInfo={bookInfo} bookEconomy={bookEconomy} existingKeywords={keywords} initialKeyword={wizardInitialKeyword} onOpenExistingKeyword={handleOpenExistingKeyword} campaigns={campaigns} onAddCampaign={addCampaign} defaultPurpose={functionalView === 'ads' ? 'ads' : 'editorial'} />
      
      {/* New Ads Keyword Wizard */}
      <NewAdsKeywordWizard open={isAdsWizardOpen} onOpenChange={setIsAdsWizardOpen} onComplete={handleWizardComplete} marketplaceId={marketplaceId} existingKeywords={keywords} initialKeyword={wizardInitialKeyword} campaigns={campaigns} onAddCampaign={addCampaign} onOpenExistingKeyword={handleOpenExistingKeyword} />
      
      {/* Keyword Comparison Panel */}
      <KeywordComparisonPanel items={keywords.filter((k) => selectedIds.has(k.id)).slice(0, 2)} type="keyword" isOpen={isComparisonOpen} onClose={() => setIsComparisonOpen(false)} onRemove={(id) => {
      const newSet = new Set(selectedIds);
      newSet.delete(id);
      onSelectedIdsChange(newSet);
      if (newSet.size < 2) setIsComparisonOpen(false);
    }} bookEconomy={bookEconomy} />
      
      {/* ADS History Panel */}
      <AdsHistoryPanel keyword={adsHistoryKeyword?.keyword ?? ''} adsData={adsHistoryKeyword?.adsData} bookEconomy={bookEconomy} isOpen={!!adsHistoryKeyword} onClose={() => setAdsHistoryKeyword(null)} currencySymbol={currencySymbol} onAdsDataChange={(newAdsData: AdsData) => {
      if (adsHistoryKeyword) {
        onUpdate(adsHistoryKeyword.id, {
          adsData: newAdsData
        });
      }
    }} />
      
      {/* Plan Upgrade Modal */}
      <PlanUpgradeModal open={showPlanUpgradeModal} onOpenChange={setShowPlanUpgradeModal} />
      
      {/* ACOS Alerts Dialog */}
      {isAlertsDialogOpen && <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/50" onClick={() => setIsAlertsDialogOpen(false)} />
        <div className="relative z-50 bg-background border border-border rounded-xl shadow-2xl w-[90vw] max-w-[900px] max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold">Keywords que necesitan atención</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsAlertsDialogOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <AcosAlertsTray keywords={keywords} bookEconomy={bookEconomy} campaigns={campaigns} onKeywordClick={(kw) => {
            setIsAlertsDialogOpen(false);
            revealKeywordAndOpenPanel(kw.id);
          }} />
          </div>
        </div>
      </div>}
    </div>;
};