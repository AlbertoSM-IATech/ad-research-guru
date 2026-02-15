import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { type Keyword, type TargetASIN, type AdvertisingCategory, type BookInfo, type CampaignPlan, type BookEconomy } from "@/types/advertising";
import { loadPersistedState, usePersistence, getLastSyncAt, clearBookStorage, DEFAULT_BOOK_ECONOMY } from "@/hooks/useLocalPersistence";
import { performMerge } from "@/lib/backup-merge";

// Generate unique ID
const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// Helper to check if book context is complete
export const isBookContextComplete = (bookInfo: BookInfo): boolean => {
  return !!(bookInfo.title && bookInfo.title.trim().length > 0);
};

// Helper to format last sync time
export const formatLastSync = (date: Date | null): string => {
  if (!date) return "—";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  if (diffSec < 60) return "hace unos segundos";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day}/${month} ${hours}:${minutes}`;
};

export interface AdvertisingDataContextType {
  // Core state
  selectedMarketplace: string;
  setSelectedMarketplace: (marketplace: string) => void;
  activeTab: "keywords" | "asins" | "categories";
  setActiveTab: (tab: "keywords" | "asins" | "categories") => void;
  showInsights: boolean;
  setShowInsights: (show: boolean) => void;
  mainView: 'data' | 'insights';
  setMainView: (view: 'data' | 'insights') => void;
  bookInfo: BookInfo;
  setBookInfo: (info: BookInfo) => void;
  bookEconomy: BookEconomy;
  setBookEconomy: (economy: BookEconomy) => void;

  // Data stores
  keywordsByMarket: Record<string, Keyword[]>;
  asinsByMarket: Record<string, TargetASIN[]>;
  categoriesByMarket: Record<string, AdvertisingCategory[]>;
  campaignPlansByMarket: Record<string, CampaignPlan[]>;

  // Current market data
  currentKeywords: Keyword[];
  currentASINs: TargetASIN[];
  currentCategories: AdvertisingCategory[];

  // Keyword handlers
  handleAddKeyword: (keywordData: Omit<Keyword, "id" | "createdAt" | "updatedAt"> | Keyword) => void;
  handleAddBulkKeywords: (keywords: Array<Omit<Keyword, "id" | "createdAt" | "updatedAt">>) => void;
  handleUpdateKeyword: (id: string, updates: Partial<Keyword>) => void;
  handleDeleteKeyword: (id: string) => void;
  handleDeleteBulkKeywords: (ids: string[]) => void;
  handleUpdateBulkKeywords: (ids: string[], updates: Partial<Keyword>) => void;

  // ASIN handlers
  handleAddASIN: (asinData: Omit<TargetASIN, "id" | "createdAt" | "updatedAt">) => void;
  handleAddBulkASINs: (asins: Array<Omit<TargetASIN, "id" | "createdAt" | "updatedAt">>) => void;
  handleUpdateASIN: (id: string, updates: Partial<TargetASIN>) => void;
  handleDeleteASIN: (id: string) => void;
  handleDeleteBulkASINs: (ids: string[]) => void;

  // Category handlers
  handleAddCategory: (categoryData: Omit<AdvertisingCategory, "id" | "createdAt" | "updatedAt">) => void;
  handleAddBulkCategories: (categories: Array<Omit<AdvertisingCategory, "id" | "createdAt" | "updatedAt">>) => void;
  handleUpdateCategory: (id: string, updates: Partial<AdvertisingCategory>) => void;
  handleDeleteCategory: (id: string) => void;
  handleDeleteBulkCategories: (ids: string[]) => void;

  // Campaign Plan handlers
  currentPlans: CampaignPlan[];
  handleCreatePlan: (planData: Omit<CampaignPlan, "id" | "createdAt" | "updatedAt">) => void;
  handleUpdatePlan: (id: string, updates: Partial<CampaignPlan>) => void;
  handleDeletePlan: (id: string) => void;
  handleAssignKeywords: (planId: string, keywordIds: string[]) => void;

  // Sync state
  hasHydrated: boolean;
  lastSyncAt: Date | null;
  isSyncing: boolean;
  syncHistory: Date[];
  pendingChangesCount: number;
  saveNow: () => void;
  handleSaveNow: () => void;

  // Selection
  selection: { keywords: Set<string>; asins: Set<string>; categories: Set<string> };
  setTabSelection: (tab: "keywords" | "asins" | "categories", nextSet: Set<string>) => void;
  clearTabSelection: (tab: "keywords" | "asins" | "categories") => void;
  clearAllSelection: () => void;

  // Search
  globalSearchTerm: string;
  setGlobalSearchTerm: (term: string) => void;

  // Book panel
  isBookPanelOpen: boolean;
  setIsBookPanelOpen: (open: boolean) => void;
  bookContextComplete: boolean;

  // Reset & Restore
  handleResetData: () => void;
  handleRestoreBackup: (data: any, mode: 'replace' | 'merge', options: { restoreOverrides: boolean; restoreUiPrefs: boolean }) => void;

  // Config
  configVersion: number;
  setConfigVersion: (fn: (v: number) => number) => void;

  bookId?: string;
}

const AdvertisingDataContext = createContext<AdvertisingDataContextType | null>(null);

export function useAdvertisingData() {
  const context = useContext(AdvertisingDataContext);
  if (!context) {
    throw new Error("useAdvertisingData must be used within AdvertisingDataProvider");
  }
  return context;
}

interface AdvertisingDataProviderProps {
  children: ReactNode;
  bookId?: string;
}

export function AdvertisingDataProvider({ children, bookId }: AdvertisingDataProviderProps) {
  // Hydration flag
  const [hasHydrated, setHasHydrated] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncHistory, setSyncHistory] = useState<Date[]>([]);
  const [pendingChangesCount, setPendingChangesCount] = useState(0);
  const [selectedMarketplace, setSelectedMarketplace] = useState("us");
  const [activeTab, setActiveTab] = useState<"keywords" | "asins" | "categories">("keywords");
  const [showInsights, setShowInsights] = useState(false);
  const mainView = showInsights ? 'insights' : 'data';
  const setMainView = (view: 'data' | 'insights') => setShowInsights(view === 'insights');
  const [isBookPanelOpen, setIsBookPanelOpen] = useState(true);
  const [configVersion, setConfigVersion] = useState(0);
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");

  const [bookInfo, setBookInfo] = useState<BookInfo>({
    title: "", subtitle: "", description: "", categories: []
  });
  const [bookEconomy, setBookEconomy] = useState<BookEconomy>(DEFAULT_BOOK_ECONOMY);
  const [keywordsByMarket, setKeywordsByMarket] = useState<Record<string, Keyword[]>>({});
  const [asinsByMarket, setAsinsByMarket] = useState<Record<string, TargetASIN[]>>({});
  const [categoriesByMarket, setCategoriesByMarket] = useState<Record<string, AdvertisingCategory[]>>({});
  const [campaignPlansByMarket, setCampaignPlansByMarket] = useState<Record<string, CampaignPlan[]>>({});

  // Selection
  const [selection, setSelection] = useState<{ keywords: Set<string>; asins: Set<string>; categories: Set<string> }>({
    keywords: new Set(), asins: new Set(), categories: new Set()
  });
  const setTabSelection = useCallback((tab: "keywords" | "asins" | "categories", nextSet: Set<string>) => {
    setSelection(prev => ({ ...prev, [tab]: nextSet }));
  }, []);
  const clearTabSelection = useCallback((tab: "keywords" | "asins" | "categories") => {
    setSelection(prev => ({ ...prev, [tab]: new Set() }));
  }, []);
  const clearAllSelection = useCallback(() => {
    setSelection({ keywords: new Set(), asins: new Set(), categories: new Set() });
  }, []);
  useEffect(() => { clearAllSelection(); }, [selectedMarketplace, clearAllSelection]);

  // Hydration
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
      if (persisted.showInsights !== undefined) setShowInsights(persisted.showInsights);
    }
    setLastSyncAt(getLastSyncAt(bookId));
    setHasHydrated(true);
  }, [bookId]);

  // Last sync refresh
  useEffect(() => {
    if (!hasHydrated) return;
    const interval = setInterval(() => setLastSyncAt(getLastSyncAt(bookId)), 10000);
    return () => clearInterval(interval);
  }, [hasHydrated, bookId]);

  // Pending changes tracking
  const isFirstRenderAfterHydration = useRef(true);
  useEffect(() => {
    if (!hasHydrated) return;
    if (isFirstRenderAfterHydration.current) { isFirstRenderAfterHydration.current = false; return; }
    setPendingChangesCount(prev => prev + 1);
  }, [hasHydrated, selectedMarketplace, activeTab, bookInfo, bookEconomy, keywordsByMarket, asinsByMarket, categoriesByMarket, campaignPlansByMarket, showInsights]);

  // Warn before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingChangesCount > 0) { e.preventDefault(); e.returnValue = ""; return ""; }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [pendingChangesCount]);

  // Persistence
  const handleSyncComplete = useCallback(() => {
    const now = new Date();
    setLastSyncAt(now);
    setIsSyncing(true);
    setPendingChangesCount(0);
    setSyncHistory(prev => [now, ...prev].slice(0, 5));
    setTimeout(() => setIsSyncing(false), 1500);
  }, []);

  const { saveNow } = usePersistence({
    selectedMarketplace, activeTab, bookInfo, bookEconomy,
    keywordsByMarket, asinsByMarket, categoriesByMarket, campaignPlansByMarket, showInsights
  }, hasHydrated, handleSyncComplete, bookId);

  const handleSaveNow = useCallback(() => {
    saveNow();
    toast.success("Guardado manualmente");
  }, [saveNow]);

  const bookContextComplete = isBookContextComplete(bookInfo);
  useEffect(() => {
    if (bookContextComplete) setIsBookPanelOpen(false);
  }, [bookContextComplete]);

  const currentKeywords = keywordsByMarket[selectedMarketplace] || [];
  const currentASINs = asinsByMarket[selectedMarketplace] || [];
  const currentCategories = categoriesByMarket[selectedMarketplace] || [];

  // KEYWORD HANDLERS
  const handleAddKeyword = useCallback((keywordData: Omit<Keyword, "id" | "createdAt" | "updatedAt"> | Keyword) => {
    const incoming = keywordData as Partial<Keyword>;
    const newKeyword: Keyword = {
      ...(keywordData as any),
      id: incoming.id ?? generateId(),
      createdAt: incoming.createdAt ?? new Date(),
      updatedAt: new Date()
    };
    setKeywordsByMarket(prev => ({
      ...prev, [selectedMarketplace]: [...(prev[selectedMarketplace] || []), newKeyword]
    }));
  }, [selectedMarketplace]);

  const handleAddBulkKeywords = useCallback((keywords: Array<Omit<Keyword, "id" | "createdAt" | "updatedAt">>) => {
    const newKeywords = keywords.map(k => ({ ...k, id: generateId(), createdAt: new Date(), updatedAt: new Date() }));
    setKeywordsByMarket(prev => ({
      ...prev, [selectedMarketplace]: [...(prev[selectedMarketplace] || []), ...newKeywords]
    }));
  }, [selectedMarketplace]);

  const handleUpdateKeyword = useCallback((id: string, updates: Partial<Keyword>) => {
    setKeywordsByMarket(prev => ({
      ...prev, [selectedMarketplace]: (prev[selectedMarketplace] || []).map(k =>
        k.id === id ? { ...k, ...updates, updatedAt: new Date() } : k
      )
    }));
  }, [selectedMarketplace]);

  const handleDeleteKeyword = useCallback((id: string) => {
    setKeywordsByMarket(prev => ({
      ...prev, [selectedMarketplace]: (prev[selectedMarketplace] || []).filter(k => k.id !== id)
    }));
  }, [selectedMarketplace]);

  const handleDeleteBulkKeywords = useCallback((ids: string[]) => {
    setKeywordsByMarket(prev => ({
      ...prev, [selectedMarketplace]: (prev[selectedMarketplace] || []).filter(k => !ids.includes(k.id))
    }));
  }, [selectedMarketplace]);

  const handleUpdateBulkKeywords = useCallback((ids: string[], updates: Partial<Keyword>) => {
    setKeywordsByMarket(prev => ({
      ...prev, [selectedMarketplace]: (prev[selectedMarketplace] || []).map(k =>
        ids.includes(k.id) ? { ...k, ...updates, updatedAt: new Date() } : k
      )
    }));
  }, [selectedMarketplace]);

  // ASIN HANDLERS
  const handleAddASIN = useCallback((asinData: Omit<TargetASIN, "id" | "createdAt" | "updatedAt">) => {
    const newASIN: TargetASIN = { ...asinData, id: generateId(), createdAt: new Date(), updatedAt: new Date() };
    setAsinsByMarket(prev => ({
      ...prev, [selectedMarketplace]: [...(prev[selectedMarketplace] || []), newASIN]
    }));
  }, [selectedMarketplace]);

  const handleAddBulkASINs = useCallback((asins: Array<Omit<TargetASIN, "id" | "createdAt" | "updatedAt">>) => {
    const newASINs = asins.map(a => ({ ...a, id: generateId(), createdAt: new Date(), updatedAt: new Date() }));
    setAsinsByMarket(prev => ({
      ...prev, [selectedMarketplace]: [...(prev[selectedMarketplace] || []), ...newASINs]
    }));
  }, [selectedMarketplace]);

  const handleUpdateASIN = useCallback((id: string, updates: Partial<TargetASIN>) => {
    setAsinsByMarket(prev => ({
      ...prev, [selectedMarketplace]: (prev[selectedMarketplace] || []).map(a =>
        a.id === id ? { ...a, ...updates, updatedAt: new Date() } : a
      )
    }));
  }, [selectedMarketplace]);

  const handleDeleteASIN = useCallback((id: string) => {
    setAsinsByMarket(prev => ({
      ...prev, [selectedMarketplace]: (prev[selectedMarketplace] || []).filter(a => a.id !== id)
    }));
  }, [selectedMarketplace]);

  const handleDeleteBulkASINs = useCallback((ids: string[]) => {
    setAsinsByMarket(prev => ({
      ...prev, [selectedMarketplace]: (prev[selectedMarketplace] || []).filter(a => !ids.includes(a.id))
    }));
  }, [selectedMarketplace]);

  // CATEGORY HANDLERS
  const handleAddCategory = useCallback((categoryData: Omit<AdvertisingCategory, "id" | "createdAt" | "updatedAt">) => {
    const newCategory: AdvertisingCategory = { ...categoryData, id: generateId(), createdAt: new Date(), updatedAt: new Date() };
    setCategoriesByMarket(prev => ({
      ...prev, [selectedMarketplace]: [...(prev[selectedMarketplace] || []), newCategory]
    }));
  }, [selectedMarketplace]);

  const handleAddBulkCategories = useCallback((categories: Array<Omit<AdvertisingCategory, "id" | "createdAt" | "updatedAt">>) => {
    const newCategories = categories.map(c => ({ ...c, id: generateId(), createdAt: new Date(), updatedAt: new Date() }));
    setCategoriesByMarket(prev => ({
      ...prev, [selectedMarketplace]: [...(prev[selectedMarketplace] || []), ...newCategories]
    }));
  }, [selectedMarketplace]);

  const handleUpdateCategory = useCallback((id: string, updates: Partial<AdvertisingCategory>) => {
    setCategoriesByMarket(prev => ({
      ...prev, [selectedMarketplace]: (prev[selectedMarketplace] || []).map(c =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
      )
    }));
  }, [selectedMarketplace]);

  const handleDeleteCategory = useCallback((id: string) => {
    setCategoriesByMarket(prev => ({
      ...prev, [selectedMarketplace]: (prev[selectedMarketplace] || []).filter(c => c.id !== id)
    }));
  }, [selectedMarketplace]);

  const handleDeleteBulkCategories = useCallback((ids: string[]) => {
    setCategoriesByMarket(prev => ({
      ...prev, [selectedMarketplace]: (prev[selectedMarketplace] || []).filter(c => !ids.includes(c.id))
    }));
  }, [selectedMarketplace]);

  // CAMPAIGN PLAN HANDLERS
  const currentPlans = campaignPlansByMarket[selectedMarketplace] || [];

  const handleCreatePlan = useCallback((planData: Omit<CampaignPlan, "id" | "createdAt" | "updatedAt">) => {
    const newPlan: CampaignPlan = { ...planData, id: generateId(), createdAt: new Date(), updatedAt: new Date() };
    setCampaignPlansByMarket(prev => ({
      ...prev, [selectedMarketplace]: [...(prev[selectedMarketplace] || []), newPlan]
    }));
  }, [selectedMarketplace]);

  const handleUpdatePlan = useCallback((id: string, updates: Partial<CampaignPlan>) => {
    setCampaignPlansByMarket(prev => ({
      ...prev, [selectedMarketplace]: (prev[selectedMarketplace] || []).map(p =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
      )
    }));
  }, [selectedMarketplace]);

  const handleDeletePlan = useCallback((id: string) => {
    setCampaignPlansByMarket(prev => ({
      ...prev, [selectedMarketplace]: (prev[selectedMarketplace] || []).filter(p => p.id !== id)
    }));
  }, [selectedMarketplace]);

  const handleAssignKeywords = useCallback((planId: string, keywordIds: string[]) => {
    setCampaignPlansByMarket(prev => ({
      ...prev, [selectedMarketplace]: (prev[selectedMarketplace] || []).map(p =>
        p.id === planId ? { ...p, keywords: [...new Set([...p.keywords, ...keywordIds])], updatedAt: new Date() } : p
      )
    }));
  }, [selectedMarketplace]);

  // RESET
  const handleResetData = useCallback(() => {
    clearBookStorage(bookId);
    setSelectedMarketplace("us");
    setActiveTab("keywords");
    setBookInfo({ title: "", subtitle: "", description: "", categories: [] });
    setBookEconomy(DEFAULT_BOOK_ECONOMY);
    setKeywordsByMarket({});
    setAsinsByMarket({});
    setCategoriesByMarket({});
    setCampaignPlansByMarket({});
    setGlobalSearchTerm("");
    setSelection({ keywords: new Set(), asins: new Set(), categories: new Set() });
    setShowInsights(false);
    setPendingChangesCount(0);
    setIsBookPanelOpen(true);
    toast.success("Datos reseteados");
  }, [bookId]);

  // RESTORE BACKUP
  const handleRestoreBackup = useCallback((data: any, mode: 'replace' | 'merge', options: { restoreOverrides: boolean; restoreUiPrefs: boolean }) => {
    if (mode === 'replace') {
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
      const mergeResult = performMerge({
        selectedMarketplace, activeTab, bookInfo, bookEconomy,
        keywordsByMarket, asinsByMarket, categoriesByMarket, campaignPlansByMarket, showInsights
      }, data);
      setBookInfo(mergeResult.bookInfo);
      setBookEconomy(mergeResult.bookEconomy);
      setKeywordsByMarket(mergeResult.keywordsByMarket);
      setAsinsByMarket(mergeResult.asinsByMarket);
      setCategoriesByMarket(mergeResult.categoriesByMarket);
      setCampaignPlansByMarket(mergeResult.campaignPlansByMarket);
      toast.info(`KW: +${mergeResult.stats.keywordsAdded}/↻${mergeResult.stats.keywordsUpdated} | ASIN: +${mergeResult.stats.asinsAdded}/↻${mergeResult.stats.asinsUpdated}`, { duration: 5000 });
    }
    setSelection({ keywords: new Set(), asins: new Set(), categories: new Set() });
    setPendingChangesCount(0);
  }, [selectedMarketplace, activeTab, bookInfo, bookEconomy, keywordsByMarket, asinsByMarket, categoriesByMarket, campaignPlansByMarket, showInsights]);

  const value = useMemo<AdvertisingDataContextType>(() => ({
    selectedMarketplace, setSelectedMarketplace,
    activeTab, setActiveTab,
    showInsights, setShowInsights,
    mainView, setMainView,
    bookInfo, setBookInfo,
    bookEconomy, setBookEconomy,
    keywordsByMarket, asinsByMarket, categoriesByMarket, campaignPlansByMarket,
    currentKeywords, currentASINs, currentCategories,
    handleAddKeyword, handleAddBulkKeywords, handleUpdateKeyword, handleDeleteKeyword, handleDeleteBulkKeywords, handleUpdateBulkKeywords,
    handleAddASIN, handleAddBulkASINs, handleUpdateASIN, handleDeleteASIN, handleDeleteBulkASINs,
    handleAddCategory, handleAddBulkCategories, handleUpdateCategory, handleDeleteCategory, handleDeleteBulkCategories,
    currentPlans, handleCreatePlan, handleUpdatePlan, handleDeletePlan, handleAssignKeywords,
    hasHydrated, lastSyncAt, isSyncing, syncHistory, pendingChangesCount, saveNow, handleSaveNow,
    selection, setTabSelection, clearTabSelection, clearAllSelection,
    globalSearchTerm, setGlobalSearchTerm,
    isBookPanelOpen, setIsBookPanelOpen, bookContextComplete,
    handleResetData, handleRestoreBackup,
    configVersion, setConfigVersion,
    bookId,
  }), [
    selectedMarketplace, activeTab, showInsights, mainView,
    bookInfo, bookEconomy,
    keywordsByMarket, asinsByMarket, categoriesByMarket, campaignPlansByMarket,
    currentKeywords, currentASINs, currentCategories,
    handleAddKeyword, handleAddBulkKeywords, handleUpdateKeyword, handleDeleteKeyword, handleDeleteBulkKeywords, handleUpdateBulkKeywords,
    handleAddASIN, handleAddBulkASINs, handleUpdateASIN, handleDeleteASIN, handleDeleteBulkASINs,
    handleAddCategory, handleAddBulkCategories, handleUpdateCategory, handleDeleteCategory, handleDeleteBulkCategories,
    currentPlans, handleCreatePlan, handleUpdatePlan, handleDeletePlan, handleAssignKeywords,
    hasHydrated, lastSyncAt, isSyncing, syncHistory, pendingChangesCount, saveNow, handleSaveNow,
    selection, setTabSelection, clearTabSelection, clearAllSelection,
    globalSearchTerm, setGlobalSearchTerm,
    isBookPanelOpen, setIsBookPanelOpen, bookContextComplete,
    handleResetData, handleRestoreBackup,
    configVersion, setConfigVersion,
    bookId,
  ]);

  return (
    <AdvertisingDataContext.Provider value={value}>
      {children}
    </AdvertisingDataContext.Provider>
  );
}
