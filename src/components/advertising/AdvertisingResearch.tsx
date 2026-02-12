import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Search, Target, FolderOpen, BarChart3, Save, HelpCircle, Settings, HardDrive, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { MarketplaceSelector } from "./MarketplaceSelector";
import { KeywordsSection } from "./KeywordsSection";
import { ASINSection } from "./ASINSection";
import { CategoriesSection } from "./CategoriesSection";
import { StatsPanel } from "./StatsPanel";
import { GlobalSearch, type FilterType, type SortOption } from "./GlobalSearch";
import { CollapsibleEducation } from "./CollapsibleEducation";
import { VisualizationsTab } from "./visualizations/VisualizationsTab";
import { BookInfoPanel } from "./BookInfoPanel";
import { BookInfoPanelCompact } from "./BookInfoPanelCompact";
import { AcosAlertsTray } from "./AcosAlertsTray";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GuidedTour, useTourStatus, type UIStateRequest } from "./GuidedTour";
import { KeyboardShortcutsManager } from "./KeyboardShortcutsManager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MarketConfigModal } from "./MarketConfigModal";
import { BackupModal } from "./BackupModal";
import { loadPersistedState, usePersistence, getLastSyncAt, getAdResearchStorageKey, clearBookStorage, DEFAULT_BOOK_ECONOMY } from "@/hooks/useLocalPersistence";
import { useCampaigns } from "@/hooks/useCampaigns";
import { performMerge } from "@/lib/backup-merge";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Keyword, type TargetASIN, type AdvertisingCategory, type BookInfo, type CampaignPlan, type BookEconomy } from "@/types/advertising";
import { createKeywordDefaults } from "@/lib/keyword-helpers";

// Generate unique ID using crypto.randomUUID with fallback
const generateId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// Helper to check if book context is complete
const isBookContextComplete = (bookInfo: BookInfo): boolean => {
  return !!(bookInfo.title && bookInfo.title.trim().length > 0);
};

// Helper to format last sync time
const formatLastSync = (date: Date | null): string => {
  if (!date) return "—";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  if (diffSec < 60) return "hace unos segundos";
  if (diffMin < 60) return `hace ${diffMin} min`;

  // Format as DD/MM HH:MM
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day}/${month} ${hours}:${minutes}`;
};
interface AdvertisingResearchProps {
  bookId?: string;
}
export const AdvertisingResearch = ({
  bookId
}: AdvertisingResearchProps) => {
  // Hydration flag - must be first
  const [hasHydrated, setHasHydrated] = useState(false);

  // Last sync indicator
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync history (last 5 syncs)
  const [syncHistory, setSyncHistory] = useState<Date[]>([]);

  // Pending changes counter
  const [pendingChangesCount, setPendingChangesCount] = useState(0);
  const [selectedMarketplace, setSelectedMarketplace] = useState("us");
  const [activeTab, setActiveTab] = useState<"keywords" | "asins" | "categories">("keywords");
  const [showInsights, setShowInsights] = useState(false);

  // Derived mainView from showInsights for UI
  const mainView = showInsights ? 'insights' : 'data';
  const setMainView = (view: 'data' | 'insights') => setShowInsights(view === 'insights');

  // Tour state
  const {
    hasCompletedTour,
    setHasCompletedTour,
    resetTour
  } = useTourStatus();
  const [showTour, setShowTour] = useState(false);

  // Modal states
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showMarketConfigModal, setShowMarketConfigModal] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [configVersion, setConfigVersion] = useState(0); // To trigger re-renders on config change

  // Book panel state - React controlled, no DOM hacks
  const [isBookPanelOpen, setIsBookPanelOpen] = useState(true);

  // Selection states for each tab - lifted from sections for AIAssistant access
  const [selection, setSelection] = useState<{
    keywords: Set<string>;
    asins: Set<string>;
    categories: Set<string>;
  }>({
    keywords: new Set(),
    asins: new Set(),
    categories: new Set()
  });

  // Selection helpers
  const setTabSelection = useCallback((tab: "keywords" | "asins" | "categories", nextSet: Set<string>) => {
    setSelection(prev => ({
      ...prev,
      [tab]: nextSet
    }));
  }, []);
  const clearTabSelection = useCallback((tab: "keywords" | "asins" | "categories") => {
    setSelection(prev => ({
      ...prev,
      [tab]: new Set()
    }));
  }, []);
  const clearAllSelection = useCallback(() => {
    setSelection({
      keywords: new Set(),
      asins: new Set(),
      categories: new Set()
    });
  }, []);

  // Clear selection when marketplace changes (don't mix IDs between markets)
  useEffect(() => {
    clearAllSelection();
  }, [selectedMarketplace, clearAllSelection]);
  const [bookInfo, setBookInfo] = useState<BookInfo>({
    title: "",
    subtitle: "",
    description: "",
    categories: []
  });
  const [bookEconomy, setBookEconomy] = useState<BookEconomy>(DEFAULT_BOOK_ECONOMY);
  const [keywordsByMarket, setKeywordsByMarket] = useState<Record<string, Keyword[]>>({});
  const [asinsByMarket, setAsinsByMarket] = useState<Record<string, TargetASIN[]>>({});
  const [categoriesByMarket, setCategoriesByMarket] = useState<Record<string, AdvertisingCategory[]>>({});
  const [campaignPlansByMarket, setCampaignPlansByMarket] = useState<Record<string, CampaignPlan[]>>({});
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [globalFilter, setGlobalFilter] = useState<FilterType>("all");
  const [globalSort, setGlobalSort] = useState<SortOption>("relevance");

  // ============= HYDRATION FROM LOCALSTORAGE =============
  useEffect(() => {
    const persisted = loadPersistedState(bookId);
    if (persisted) {
      setSelectedMarketplace(persisted.selectedMarketplace);
      setActiveTab(persisted.activeTab);
      setBookInfo(persisted.bookInfo);
      setBookEconomy(persisted.bookEconomy ?? DEFAULT_BOOK_ECONOMY);
      setKeywordsByMarket(persisted.keywordsByMarket);
      setAsinsByMarket(persisted.asinsByMarket);
      setCategoriesByMarket(persisted.categoriesByMarket);
      setCampaignPlansByMarket(persisted.campaignPlansByMarket);
      if (persisted.showInsights !== undefined) {
        setShowInsights(persisted.showInsights);
      }
    }
    // Set initial last sync time
    setLastSyncAt(getLastSyncAt(bookId));
    setHasHydrated(true);
  }, [bookId]);

  // ============= LAST SYNC REFRESH (every 10s) =============
  useEffect(() => {
    if (!hasHydrated) return;
    const interval = setInterval(() => {
      setLastSyncAt(getLastSyncAt(bookId));
    }, 10000);
    return () => clearInterval(interval);
  }, [hasHydrated, bookId]);

  // ============= PENDING CHANGES TRACKING =============
  // Use a ref to track if this is the first render after hydration
  const isFirstRenderAfterHydration = useRef(true);

  // Track changes to persistable state (increment pendingChangesCount)
  useEffect(() => {
    // Don't count changes before hydration
    if (!hasHydrated) return;

    // Skip the first render after hydration (initial load)
    if (isFirstRenderAfterHydration.current) {
      isFirstRenderAfterHydration.current = false;
      return;
    }

    // Increment pending changes count
    setPendingChangesCount(prev => prev + 1);
  }, [hasHydrated, selectedMarketplace, activeTab, bookInfo, bookEconomy, keywordsByMarket, asinsByMarket, categoriesByMarket, campaignPlansByMarket, showInsights]);

  // ============= WARN BEFORE LEAVING WITH PENDING CHANGES =============
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingChangesCount > 0) {
        e.preventDefault();
        // Modern browsers require returnValue to be set
        e.returnValue = "";
        return "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [pendingChangesCount]);

  // ============= PERSISTENCE TO LOCALSTORAGE =============
  const handleSyncComplete = useCallback(() => {
    const now = new Date();
    setLastSyncAt(now);
    setIsSyncing(true);
    setPendingChangesCount(0); // Reset pending changes
    // Add to sync history (keep last 5)
    setSyncHistory(prev => [now, ...prev].slice(0, 5));
    // Reset syncing animation after 1.5s
    setTimeout(() => setIsSyncing(false), 1500);
  }, []);
  const {
    saveNow
  } = usePersistence({
    selectedMarketplace,
    activeTab,
    bookInfo,
    bookEconomy,
    keywordsByMarket,
    asinsByMarket,
    categoriesByMarket,
    campaignPlansByMarket,
    showInsights
  }, hasHydrated, handleSyncComplete, bookId);

  // Handle manual save
  const handleSaveNow = useCallback(() => {
    saveNow();
    toast.success("Guardado manualmente");
  }, [saveNow]);
  const bookContextComplete = isBookContextComplete(bookInfo);

  // Auto-collapse book panel when context is complete
  useEffect(() => {
    if (bookContextComplete) {
      setIsBookPanelOpen(false);
    }
  }, [bookContextComplete]);

  const currentKeywords = keywordsByMarket[selectedMarketplace] || [];
  const currentASINs = asinsByMarket[selectedMarketplace] || [];
  const currentCategories = categoriesByMarket[selectedMarketplace] || [];

  // Campaigns hook for alerts tray
  const {
    campaigns
  } = useCampaigns(currentKeywords);
  const filteredKeywords = useMemo(() => currentKeywords.filter(k => globalSearchTerm ? k.keyword.toLowerCase().includes(globalSearchTerm.toLowerCase()) : true), [currentKeywords, globalSearchTerm]);
  const filteredASINs = useMemo(() => currentASINs.filter(a => globalSearchTerm ? a.asin.toLowerCase().includes(globalSearchTerm.toLowerCase()) : true), [currentASINs, globalSearchTerm]);
  const filteredCategories = useMemo(() => currentCategories.filter(c => globalSearchTerm ? c.name.toLowerCase().includes(globalSearchTerm.toLowerCase()) : true), [currentCategories, globalSearchTerm]);

  // Keywords handlers
  const handleAddKeyword = useCallback((keywordData: Omit<Keyword, "id" | "createdAt" | "updatedAt"> | Keyword) => {
    // IMPORTANT: when coming from the Wizard, keywordData already includes id/createdAt/updatedAt.
    // If we overwrite the id here, the lateral panel (opened with the wizard keyword) will point
    // to a non-existent keyword and Ads data will look "lost".
    const incoming = keywordData as Partial<Keyword>;
    const newKeyword: Keyword = {
      ...(keywordData as any),
      id: incoming.id ?? generateId(),
      createdAt: incoming.createdAt ?? new Date(),
      updatedAt: new Date()
    };
    setKeywordsByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: [...(prev[selectedMarketplace] || []), newKeyword]
    }));
  }, [selectedMarketplace]);
  const handleAddBulkKeywords = useCallback((keywords: Array<Omit<Keyword, "id" | "createdAt" | "updatedAt">>) => {
    const newKeywords = keywords.map(k => ({
      ...k,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    setKeywordsByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: [...(prev[selectedMarketplace] || []), ...newKeywords]
    }));
  }, [selectedMarketplace]);
  const handleUpdateKeyword = useCallback((id: string, updates: Partial<Keyword>) => {
    setKeywordsByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: (prev[selectedMarketplace] || []).map(k => k.id === id ? {
        ...k,
        ...updates,
        updatedAt: new Date()
      } : k)
    }));
  }, [selectedMarketplace]);
  const handleDeleteKeyword = useCallback((id: string) => {
    setKeywordsByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: (prev[selectedMarketplace] || []).filter(k => k.id !== id)
    }));
  }, [selectedMarketplace]);
  const handleDeleteBulkKeywords = useCallback((ids: string[]) => {
    setKeywordsByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: (prev[selectedMarketplace] || []).filter(k => !ids.includes(k.id))
    }));
  }, [selectedMarketplace]);
  const handleUpdateBulkKeywords = useCallback((ids: string[], updates: Partial<Keyword>) => {
    setKeywordsByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: (prev[selectedMarketplace] || []).map(k => ids.includes(k.id) ? {
        ...k,
        ...updates,
        updatedAt: new Date()
      } : k)
    }));
  }, [selectedMarketplace]);

  // ASIN handlers
  const handleAddASIN = useCallback((asinData: Omit<TargetASIN, "id" | "createdAt" | "updatedAt">) => {
    const newASIN: TargetASIN = {
      ...asinData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setAsinsByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: [...(prev[selectedMarketplace] || []), newASIN]
    }));
  }, [selectedMarketplace]);
  const handleAddBulkASINs = useCallback((asins: Array<Omit<TargetASIN, "id" | "createdAt" | "updatedAt">>) => {
    const newASINs = asins.map(a => ({
      ...a,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    setAsinsByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: [...(prev[selectedMarketplace] || []), ...newASINs]
    }));
  }, [selectedMarketplace]);
  const handleUpdateASIN = useCallback((id: string, updates: Partial<TargetASIN>) => {
    setAsinsByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: (prev[selectedMarketplace] || []).map(a => a.id === id ? {
        ...a,
        ...updates,
        updatedAt: new Date()
      } : a)
    }));
  }, [selectedMarketplace]);
  const handleDeleteASIN = useCallback((id: string) => {
    setAsinsByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: (prev[selectedMarketplace] || []).filter(a => a.id !== id)
    }));
  }, [selectedMarketplace]);
  const handleDeleteBulkASINs = useCallback((ids: string[]) => {
    setAsinsByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: (prev[selectedMarketplace] || []).filter(a => !ids.includes(a.id))
    }));
  }, [selectedMarketplace]);

  // Category handlers
  const handleAddCategory = useCallback((categoryData: Omit<AdvertisingCategory, "id" | "createdAt" | "updatedAt">) => {
    const newCategory: AdvertisingCategory = {
      ...categoryData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setCategoriesByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: [...(prev[selectedMarketplace] || []), newCategory]
    }));
  }, [selectedMarketplace]);
  const handleAddBulkCategories = useCallback((categories: Array<Omit<AdvertisingCategory, "id" | "createdAt" | "updatedAt">>) => {
    const newCategories = categories.map(c => ({
      ...c,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    setCategoriesByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: [...(prev[selectedMarketplace] || []), ...newCategories]
    }));
  }, [selectedMarketplace]);
  const handleUpdateCategory = useCallback((id: string, updates: Partial<AdvertisingCategory>) => {
    setCategoriesByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: (prev[selectedMarketplace] || []).map(c => c.id === id ? {
        ...c,
        ...updates,
        updatedAt: new Date()
      } : c)
    }));
  }, [selectedMarketplace]);
  const handleDeleteCategory = useCallback((id: string) => {
    setCategoriesByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: (prev[selectedMarketplace] || []).filter(c => c.id !== id)
    }));
  }, [selectedMarketplace]);
  const handleDeleteBulkCategories = useCallback((ids: string[]) => {
    setCategoriesByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: (prev[selectedMarketplace] || []).filter(c => !ids.includes(c.id))
    }));
  }, [selectedMarketplace]);

  // Campaign Plan handlers
  const currentPlans = campaignPlansByMarket[selectedMarketplace] || [];
  const handleCreatePlan = useCallback((planData: Omit<CampaignPlan, "id" | "createdAt" | "updatedAt">) => {
    const newPlan: CampaignPlan = {
      ...planData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setCampaignPlansByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: [...(prev[selectedMarketplace] || []), newPlan]
    }));
  }, [selectedMarketplace]);
  const handleUpdatePlan = useCallback((id: string, updates: Partial<CampaignPlan>) => {
    setCampaignPlansByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: (prev[selectedMarketplace] || []).map(p => p.id === id ? {
        ...p,
        ...updates,
        updatedAt: new Date()
      } : p)
    }));
  }, [selectedMarketplace]);
  const handleDeletePlan = useCallback((id: string) => {
    setCampaignPlansByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: (prev[selectedMarketplace] || []).filter(p => p.id !== id)
    }));
  }, [selectedMarketplace]);
  const handleAssignKeywords = useCallback((planId: string, keywordIds: string[]) => {
    setCampaignPlansByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: (prev[selectedMarketplace] || []).map(p => p.id === planId ? {
        ...p,
        keywords: [...new Set([...p.keywords, ...keywordIds])],
        updatedAt: new Date()
      } : p)
    }));
  }, [selectedMarketplace]);

  // Keyboard shortcut handlers
  const handleSave = useCallback(() => {
    saveNow();
    toast.success("Guardado con ⌘S");
  }, [saveNow]);

  // Search focus via ref - no DOM hacks
  const searchInputRef = useRef<HTMLInputElement>(null);
  const handleFocusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);


  // Reset data handler - clears localStorage and resets all states to initial values
  const handleResetData = useCallback(() => {
    // 1. Clear all localStorage keys for this book (including UI state)
    clearBookStorage(bookId);

    // 2. Reset all states to initial values
    setSelectedMarketplace("us");
    setActiveTab("keywords");
    setBookInfo({
      title: "",
      subtitle: "",
      description: "",
      categories: []
    });
    setKeywordsByMarket({});
    setAsinsByMarket({});
    setCategoriesByMarket({});
    setCampaignPlansByMarket({});
    setGlobalSearchTerm("");
    setGlobalFilter("all");
    setGlobalSort("relevance");
    setSelection({
      keywords: new Set(),
      asins: new Set(),
      categories: new Set()
    });
    setShowInsights(false);
    setPendingChangesCount(0); // Reset pending changes

    // 3. Close any open modals
    setShowBackupModal(false);

    // 4. Reopen book panel
    setIsBookPanelOpen(true);

    // 5. Show confirmation toast
    toast.success("Datos reseteados");
  }, [bookId]);

  // Backup restore handler - handles both replace and merge modes
  const handleRestoreBackup = useCallback((data: {
    selectedMarketplace: string;
    activeTab: "keywords" | "asins" | "categories";
    bookInfo: BookInfo;
    bookEconomy: BookEconomy;
    keywordsByMarket: Record<string, Keyword[]>;
    asinsByMarket: Record<string, TargetASIN[]>;
    categoriesByMarket: Record<string, AdvertisingCategory[]>;
    campaignPlansByMarket: Record<string, CampaignPlan[]>;
    showInsights: boolean;
  }, mode: 'replace' | 'merge', options: {
    restoreOverrides: boolean;
    restoreUiPrefs: boolean;
  }) => {
    if (mode === 'replace') {
      // Replace all data
      setSelectedMarketplace(data.selectedMarketplace);
      setActiveTab(data.activeTab);
      setBookInfo(data.bookInfo);
      setBookEconomy(data.bookEconomy);
      setKeywordsByMarket(data.keywordsByMarket);
      setAsinsByMarket(data.asinsByMarket);
      setCategoriesByMarket(data.categoriesByMarket);
      setCampaignPlansByMarket(data.campaignPlansByMarket);
      setShowInsights(data.showInsights);
    } else {
      // Merge data
      const mergeResult = performMerge({
        selectedMarketplace,
        activeTab,
        bookInfo,
        bookEconomy,
        keywordsByMarket,
        asinsByMarket,
        categoriesByMarket,
        campaignPlansByMarket,
        showInsights
      }, data);
      setBookInfo(mergeResult.bookInfo);
      setBookEconomy(mergeResult.bookEconomy);
      setKeywordsByMarket(mergeResult.keywordsByMarket);
      setAsinsByMarket(mergeResult.asinsByMarket);
      setCategoriesByMarket(mergeResult.categoriesByMarket);
      setCampaignPlansByMarket(mergeResult.campaignPlansByMarket);
      toast.info(`KW: +${mergeResult.stats.keywordsAdded}/↻${mergeResult.stats.keywordsUpdated} | ASIN: +${mergeResult.stats.asinsAdded}/↻${mergeResult.stats.asinsUpdated}`, {
        duration: 5000
      });
    }


    // Clear selection
    setSelection({
      keywords: new Set(),
      asins: new Set(),
      categories: new Set()
    });

    // Reset pending changes
    setPendingChangesCount(0);
  }, [selectedMarketplace, activeTab, bookInfo, bookEconomy, keywordsByMarket, asinsByMarket, categoriesByMarket, campaignPlansByMarket, showInsights]);

  // Education sections (accessible from overflow menu)
  const educationSections = [{
    id: "concepts",
    title: "Conceptos Clave",
    icon: "learn" as const,
    content: <ul className="space-y-1 list-disc list-inside">
          <li>
            <strong>Keyword:</strong> Palabra o frase que los usuarios buscan en Amazon
          </li>
          <li>
            <strong>Volumen de búsqueda:</strong> Número estimado de búsquedas mensuales
          </li>
          <li>
            <strong>Competidores:</strong> Nivel de saturación (Alta/Media/Baja)
          </li>
        </ul>
  }, {
    id: "tips",
    title: "Buenas Prácticas",
    icon: "tip" as const,
    content: <ul className="space-y-1 list-disc list-inside">
          <li>Combina keywords de alto volumen con algunas de baja competencia</li>
          <li>Prioriza keywords con alta relevancia para tu libro</li>
        </ul>
  }];
  return <div className="min-h-screen bg-background">
      {/* Keyboard Shortcuts */}
      <KeyboardShortcutsManager onSave={handleSave} onSearch={handleFocusSearch} />

      <div className="w-full px-3 sm:px-4 lg:px-6 py-6">
        <header className="mb-4">
          {/* Row 1: Title + Actions */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl font-bold text-foreground">Keywords & ADS</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-help text-xs">ⓘ</span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-sm">
                    <p className="text-xs">
                      <span className="font-medium">Aviso:</span> Este panel es un gestor complementario que ayuda a la visión y toma de decisiones (elección de nicho, KWs rentables, campañas de ADS), pero no sustituye herramientas de análisis de nicho, keywords o competencia. No arroja datos reales de Amazon.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex items-center gap-2">
              {/* Marketplace Selector */}
              <div data-tour="marketplace">
                <MarketplaceSelector value={selectedMarketplace} onChange={setSelectedMarketplace} />
              </div>

              {/* Header action buttons */}
              <div className="flex items-center gap-0.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowTour(true)}>
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">{hasCompletedTour ? "Repetir tour" : "Tour guiado"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowMarketConfigModal(true)}>
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Criterios por mercado</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowBackupModal(true)}>
                        <HardDrive className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Backup</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <ThemeToggle />

                <div className="w-px h-5 bg-border mx-0.5" />

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setShowResetDialog(true)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Restablecer datos</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {/* Mobile search */}
          <div className="md:hidden mt-3" data-tour="global-search-mobile">
            <GlobalSearch searchTerm={globalSearchTerm} onSearchChange={setGlobalSearchTerm} filter={globalFilter} onFilterChange={setGlobalFilter} sort={globalSort} onSortChange={setGlobalSort} resultsCount={{
            keywords: filteredKeywords.length,
            asins: filteredASINs.length,
            categories: filteredCategories.length
          }} compact />
          </div>
        </header>

        {/* === SECCIÓN 1: CONTEXTO COMPACTO === */}
        {/* Always show compact panel + alerts tray */}
        <section className="mb-4 space-y-2">
          <BookInfoPanelCompact bookInfo={bookInfo} onChange={setBookInfo} bookEconomy={bookEconomy} onBookEconomyChange={setBookEconomy} keywords={currentKeywords} marketplaceId={selectedMarketplace} />
        </section>

        {/* === SECCIÓN 2: PESTAÑAS PRINCIPALES === */}
        <section className="mb-4">
          {/* Sync bar + Main View Toggle on same row */}
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            {/* Main View Toggle */}
            <div className="flex items-center gap-1 p-0.5 bg-muted rounded-md w-fit">
              <Button data-tour="tab-datos" variant={mainView === 'data' ? 'default' : 'ghost'} size="sm" onClick={() => setMainView('data')} className={cn("gap-1.5 h-7 text-xs px-3 transition-all", mainView === 'data' && "bg-primary text-primary-foreground")}>
                <Search className="w-3.5 h-3.5" />
                Datos
              </Button>
              <Button data-tour="tab-visualizaciones" variant={mainView === 'insights' ? 'default' : 'ghost'} size="sm" onClick={() => setMainView('insights')} className={cn("gap-1.5 h-7 text-xs px-3 transition-all", mainView === 'insights' && "bg-primary text-primary-foreground")}>
                <TrendingUp className="w-3.5 h-3.5" />
                Visualizaciones
              </Button>
            </div>

            {/* Sync status */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-[11px] transition-all duration-300 ${pendingChangesCount > 0 ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground"} ${isSyncing ? "animate-pulse" : ""}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pendingChangesCount > 0 ? "bg-amber-500 dark:bg-amber-400" : "bg-green-500"} ${isSyncing ? "animate-pulse" : ""}`} />
                {pendingChangesCount > 0 ? `${pendingChangesCount} pendientes` : "Sincronizado"}
              </span>
              {pendingChangesCount > 0 && <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] gap-0.5" onClick={handleSaveNow}>
                <Save className="w-3 h-3" />
              </Button>}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[11px] text-muted-foreground cursor-help">
                      {formatLastSync(lastSyncAt)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium text-xs">Historial</p>
                      {syncHistory.length === 0 ? <p className="text-xs text-muted-foreground">Sin sincronizaciones</p> : <ul className="text-xs space-y-0.5">
                          {syncHistory.map((date, i) => <li key={i} className="text-muted-foreground">
                              {date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                              {i === 0 && <span className="ml-1 text-green-500">(última)</span>}
                            </li>)}
                        </ul>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Data View: Sub-tabs inline */}
          {mainView === 'data' && <Tabs value={activeTab} onValueChange={v => setActiveTab(v as "keywords" | "asins" | "categories")} className="space-y-3">
              <TabsList className="h-8 bg-muted/50 w-fit">
                <TabsTrigger value="keywords" className="gap-1.5 text-xs h-7 px-3 data-[state=active]:bg-card">
                  <Search className="w-3.5 h-3.5" />
                  Keywords
                  {currentKeywords.length > 0 && <span className="ml-1 px-1 py-0 text-[10px] rounded-full bg-primary/10 text-primary">{currentKeywords.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="asins" className="gap-1.5 text-xs h-7 px-3 data-[state=active]:bg-card">
                  <Target className="w-3.5 h-3.5" />
                  ASIN
                  {currentASINs.length > 0 && <span className="ml-1 px-1 py-0 text-[10px] rounded-full bg-primary/10 text-primary">{currentASINs.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="categories" className="gap-1.5 text-xs h-7 px-3 data-[state=active]:bg-card">
                  <FolderOpen className="w-3.5 h-3.5" />
                  Categorías
                  {currentCategories.length > 0 && <span className="ml-1 px-1 py-0 text-[10px] rounded-full bg-primary/10 text-primary">{currentCategories.length}</span>}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="keywords" className="mt-3 space-y-4">
                <KeywordsSection keywords={globalFilter === "all" || globalFilter === "keywords" ? filteredKeywords : []} onAdd={handleAddKeyword} onAddBulk={handleAddBulkKeywords} onUpdate={handleUpdateKeyword} onDelete={handleDeleteKeyword} onDeleteBulk={handleDeleteBulkKeywords} onUpdateBulk={handleUpdateBulkKeywords} marketplaceId={selectedMarketplace} bookInfo={bookInfo} bookEconomy={bookEconomy} onBookInfoChange={setBookInfo} selectedIds={selection.keywords} onSelectedIdsChange={ids => setTabSelection("keywords", ids)} searchTerm={globalSearchTerm} onSearchTermChange={setGlobalSearchTerm} />
              </TabsContent>
              <TabsContent value="asins" className="mt-3">
                <ASINSection asins={globalFilter === "all" || globalFilter === "asins" ? filteredASINs : []} keywords={currentKeywords} bookTitle={bookInfo.title} onAdd={handleAddASIN} onAddBulk={handleAddBulkASINs} onUpdate={handleUpdateASIN} onDelete={handleDeleteASIN} onDeleteBulk={handleDeleteBulkASINs} marketplaceId={selectedMarketplace} selectedIds={selection.asins} onSelectedIdsChange={ids => setTabSelection("asins", ids)} />
              </TabsContent>
              <TabsContent value="categories" className="mt-3">
                <CategoriesSection categories={globalFilter === "all" || globalFilter === "categories" ? filteredCategories : []} onAdd={handleAddCategory} onAddBulk={handleAddBulkCategories} onUpdate={handleUpdateCategory} onDelete={handleDeleteCategory} onDeleteBulk={handleDeleteBulkCategories} marketplaceId={selectedMarketplace} selectedIds={selection.categories} onSelectedIdsChange={ids => setTabSelection("categories", ids)} />
              </TabsContent>
            </Tabs>}

          {/* Insights View */}
          {mainView === 'insights' && <div className="space-y-6 animate-fade-in">
              <div data-tour="stats">
                <StatsPanel keywords={currentKeywords} asins={currentASINs} categories={currentCategories} />
              </div>

              <Separator />

              <VisualizationsTab keywords={currentKeywords} asins={currentASINs} categories={currentCategories} keywordsByMarket={keywordsByMarket} asinsByMarket={asinsByMarket} categoriesByMarket={categoriesByMarket} />

              <Separator />

              <CollapsibleEducation sections={educationSections} />
            </div>}
        </section>
      </div>

      {/* === MODALS Y PANELES OCULTOS === */}

      {/* Guided Tour - Solo desde overflow */}
      {/* Guided Tour */}
      <GuidedTour isOpen={showTour} onClose={() => setShowTour(false)} onComplete={() => {
      setHasCompletedTour(true);
      setShowTour(false);
    }} onRequestUIState={(state: UIStateRequest) => {
      if (state.activeTab !== undefined) {
        setActiveTab(state.activeTab);
      }
      if (state.showInsights !== undefined) {
        setShowInsights(state.showInsights);
      }
      if (state.isBookPanelOpen !== undefined) {
        setIsBookPanelOpen(state.isBookPanelOpen);
      }
      if (state.mainView !== undefined) {
        setMainView(state.mainView);
      }
    }} />

      {/* Backup Modal */}
      <BackupModal isOpen={showBackupModal} onClose={() => setShowBackupModal(false)} bookId={bookId} selectedMarketplace={selectedMarketplace} activeTab={activeTab} bookInfo={bookInfo} bookEconomy={bookEconomy} keywordsByMarket={keywordsByMarket} asinsByMarket={asinsByMarket} categoriesByMarket={categoriesByMarket} campaignPlansByMarket={campaignPlansByMarket} showInsights={showInsights} onRestore={handleRestoreBackup} />

      {/* Market Config Modal */}
      <MarketConfigModal isOpen={showMarketConfigModal} onClose={() => setShowMarketConfigModal(false)} currentMarketplace={selectedMarketplace} onConfigChange={() => setConfigVersion(v => v + 1)} />

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restablecer datos</AlertDialogTitle>
            <AlertDialogDescription>
              Esto borrará todos los datos guardados localmente (keywords, ASINs, categorías, campañas y contexto del libro). Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { setShowResetDialog(false); handleResetData(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Restablecer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};