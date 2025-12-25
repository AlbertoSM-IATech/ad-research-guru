import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Search, Target, FolderOpen, BarChart3, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { MarketplaceSelector } from './MarketplaceSelector';
import { KeywordsSection } from './KeywordsSection';
import { ASINSection } from './ASINSection';
import { CategoriesSection } from './CategoriesSection';
import { StatsPanel } from './StatsPanel';
import { GlobalSearch, type FilterType, type SortOption } from './GlobalSearch';
import { CollapsibleEducation } from './CollapsibleEducation';
import { VisualizationsTab } from './visualizations/VisualizationsTab';
import { BookInfoPanel } from './BookInfoPanel';
import { SuggestionsPanel } from './SuggestionsPanel';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AdvancedExportModal } from './AdvancedExportModal';
import { AdvancedImportModal } from './AdvancedImportModal';
import { CampaignPlanManager } from './CampaignPlanManager';
import { GuidedTour, useTourStatus } from './GuidedTour';
import { KeyboardShortcutsManager } from './KeyboardShortcutsManager';
import { AIAssistantDrawer } from './ai/AIAssistantDrawer';
import { HeaderOverflowMenu } from './HeaderOverflowMenu';
import { BackupImportModal } from './BackupImportModal';
import { isAIDemoMode, toggleAIDemoMode } from '@/lib/ai-demo-service';
import { loadPersistedState, usePersistence } from '@/hooks/useLocalPersistence';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  type Keyword, 
  type TargetASIN, 
  type AdvertisingCategory, 
  type BookInfo,
  type CampaignPlan,
} from '@/types/advertising';
import { 
  generateDemoKeywords, 
  generateDemoASINs, 
  generateDemoCategories 
} from '@/lib/demo-data-generator';

const generateId = () => Math.random().toString(36).substring(2, 15);

// Helper to check if book context is complete
const isBookContextComplete = (bookInfo: BookInfo): boolean => {
  return !!(bookInfo.title && bookInfo.title.trim().length > 0);
};

export const AdvertisingResearch = () => {
  // Hydration flag - must be first
  const [hasHydrated, setHasHydrated] = useState(false);
  
  const [selectedMarketplace, setSelectedMarketplace] = useState('us');
  const [activeTab, setActiveTab] = useState<'keywords' | 'asins' | 'categories'>('keywords');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasLoadedExamples, setHasLoadedExamples] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(isAIDemoMode());
  const [showInsights, setShowInsights] = useState(false);
  
  // Tour state
  const { hasCompletedTour, setHasCompletedTour, resetTour } = useTourStatus();
  const [showTour, setShowTour] = useState(false);
  
  // Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBackupImportModal, setShowBackupImportModal] = useState(false);
  const [showCampaignPlanner, setShowCampaignPlanner] = useState(false);
  
  // Book panel state - React controlled, no DOM hacks
  const [isBookPanelOpen, setIsBookPanelOpen] = useState(true);
  
  // AI Assistant state - React controlled
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  
  // Selection states for each tab - lifted from sections for AIAssistant access
  const [selection, setSelection] = useState<{
    keywords: Set<string>;
    asins: Set<string>;
    categories: Set<string>;
  }>({
    keywords: new Set(),
    asins: new Set(),
    categories: new Set(),
  });

  // Selection helpers
  const setTabSelection = useCallback((tab: 'keywords' | 'asins' | 'categories', nextSet: Set<string>) => {
    setSelection(prev => ({ ...prev, [tab]: nextSet }));
  }, []);

  const clearTabSelection = useCallback((tab: 'keywords' | 'asins' | 'categories') => {
    setSelection(prev => ({ ...prev, [tab]: new Set() }));
  }, []);

  const clearAllSelection = useCallback(() => {
    setSelection({ keywords: new Set(), asins: new Set(), categories: new Set() });
  }, []);

  // Clear selection when marketplace changes (don't mix IDs between markets)
  useEffect(() => {
    clearAllSelection();
  }, [selectedMarketplace, clearAllSelection]);
  
  const [bookInfo, setBookInfo] = useState<BookInfo>({
    title: '',
    subtitle: '',
    description: '',
    categories: []
  });
  
  const [keywordsByMarket, setKeywordsByMarket] = useState<Record<string, Keyword[]>>({});
  const [asinsByMarket, setAsinsByMarket] = useState<Record<string, TargetASIN[]>>({});
  const [categoriesByMarket, setCategoriesByMarket] = useState<Record<string, AdvertisingCategory[]>>({});
  const [campaignPlansByMarket, setCampaignPlansByMarket] = useState<Record<string, CampaignPlan[]>>({});
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [globalFilter, setGlobalFilter] = useState<FilterType>('all');
  const [globalSort, setGlobalSort] = useState<SortOption>('relevance');

  // ============= HYDRATION FROM LOCALSTORAGE =============
  useEffect(() => {
    const persisted = loadPersistedState();
    if (persisted) {
      setSelectedMarketplace(persisted.selectedMarketplace);
      setActiveTab(persisted.activeTab);
      setBookInfo(persisted.bookInfo);
      setKeywordsByMarket(persisted.keywordsByMarket);
      setAsinsByMarket(persisted.asinsByMarket);
      setCategoriesByMarket(persisted.categoriesByMarket);
      setCampaignPlansByMarket(persisted.campaignPlansByMarket);
      if (persisted.showInsights !== undefined) {
        setShowInsights(persisted.showInsights);
      }
      // Skip loading demo data if we have persisted data
      setHasLoadedExamples(true);
    }
    setHasHydrated(true);
  }, []);

  // ============= PERSISTENCE TO LOCALSTORAGE =============
  usePersistence(
    {
      selectedMarketplace,
      activeTab,
      bookInfo,
      keywordsByMarket,
      asinsByMarket,
      categoriesByMarket,
      campaignPlansByMarket,
      showInsights,
    },
    hasHydrated
  );

  const bookContextComplete = isBookContextComplete(bookInfo);
  
  // Auto-collapse book panel when context is complete
  useEffect(() => {
    if (bookContextComplete) {
      setIsBookPanelOpen(false);
    }
  }, [bookContextComplete]);

  // Load example data when section is empty (only after hydration)
  useEffect(() => {
    if (!hasHydrated) return;
    if (!hasLoadedExamples) {
      const currentKeywords = keywordsByMarket[selectedMarketplace] || [];
      const currentASINs = asinsByMarket[selectedMarketplace] || [];
      const currentCategories = categoriesByMarket[selectedMarketplace] || [];

      if (currentKeywords.length === 0 && currentASINs.length === 0 && currentCategories.length === 0) {
        // Load demo keywords (150)
        const exampleKeywords = generateDemoKeywords(selectedMarketplace, 150).map(k => ({
          ...k,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        setKeywordsByMarket(prev => ({ ...prev, [selectedMarketplace]: exampleKeywords }));

        // Load demo ASINs (40)
        const exampleASINs = generateDemoASINs(selectedMarketplace, 40).map(a => ({
          ...a,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        setAsinsByMarket(prev => ({ ...prev, [selectedMarketplace]: exampleASINs }));

        // Load demo categories (15)
        const exampleCategories = generateDemoCategories(selectedMarketplace, 15).map(c => ({
          ...c,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        setCategoriesByMarket(prev => ({ ...prev, [selectedMarketplace]: exampleCategories }));

        setHasLoadedExamples(true);
      }
    }
  }, [hasHydrated, selectedMarketplace, hasLoadedExamples, keywordsByMarket, asinsByMarket, categoriesByMarket]);

  const currentKeywords = keywordsByMarket[selectedMarketplace] || [];
  const currentASINs = asinsByMarket[selectedMarketplace] || [];
  const currentCategories = categoriesByMarket[selectedMarketplace] || [];

  const filteredKeywords = useMemo(() => currentKeywords.filter(k => globalSearchTerm ? k.keyword.toLowerCase().includes(globalSearchTerm.toLowerCase()) : true), [currentKeywords, globalSearchTerm]);
  const filteredASINs = useMemo(() => currentASINs.filter(a => globalSearchTerm ? a.asin.toLowerCase().includes(globalSearchTerm.toLowerCase()) : true), [currentASINs, globalSearchTerm]);
  const filteredCategories = useMemo(() => currentCategories.filter(c => globalSearchTerm ? c.name.toLowerCase().includes(globalSearchTerm.toLowerCase()) : true), [currentCategories, globalSearchTerm]);

  // Keywords handlers
  const handleAddKeyword = useCallback((keywordData: Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newKeyword: Keyword = {
      ...keywordData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setKeywordsByMarket(prev => ({
      ...prev,
      [selectedMarketplace]: [...(prev[selectedMarketplace] || []), newKeyword]
    }));
  }, [selectedMarketplace]);

  const handleAddBulkKeywords = useCallback((keywords: Array<Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'>>) => {
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
  const handleAddASIN = useCallback((asinData: Omit<TargetASIN, 'id' | 'createdAt' | 'updatedAt'>) => {
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

  const handleAddBulkASINs = useCallback((asins: Array<Omit<TargetASIN, 'id' | 'createdAt' | 'updatedAt'>>) => {
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
  const handleAddCategory = useCallback((categoryData: Omit<AdvertisingCategory, 'id' | 'createdAt' | 'updatedAt'>) => {
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

  const handleAddBulkCategories = useCallback((categories: Array<Omit<AdvertisingCategory, 'id' | 'createdAt' | 'updatedAt'>>) => {
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
  
  const handleCreatePlan = useCallback((planData: Omit<CampaignPlan, 'id' | 'createdAt' | 'updatedAt'>) => {
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

  // Suggestion handler
  const handleAddSuggestion = useCallback((keyword: string) => {
    handleAddKeyword({
      keyword,
      searchVolume: 0,
      competitionLevel: 'medium',
      campaignTypes: ['SP'],
      notes: 'Añadida desde sugerencias',
      marketplaceId: selectedMarketplace,
      state: 'pending'
    });
  }, [handleAddKeyword, selectedMarketplace]);

  // Keyboard shortcut handlers
  const handleSave = useCallback(() => {
    console.log('Saving...');
  }, []);

  // Search focus via ref - no DOM hacks
  const searchInputRef = useRef<HTMLInputElement>(null);
  const handleFocusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  // Toggle demo mode handler
  const handleToggleDemo = useCallback(() => {
    const newMode = !isDemoMode;
    toggleAIDemoMode(newMode);
    setIsDemoMode(newMode);
  }, [isDemoMode]);

  // Reset data handler - clears localStorage and resets all states to initial values
  const handleResetData = useCallback(() => {
    // 1. Clear localStorage
    localStorage.removeItem('ad-research:v1');
    
    // 2. Reset all states to initial values
    setSelectedMarketplace('us');
    setActiveTab('keywords');
    setBookInfo({ title: '', subtitle: '', description: '', categories: [] });
    setKeywordsByMarket({});
    setAsinsByMarket({});
    setCategoriesByMarket({});
    setCampaignPlansByMarket({});
    setGlobalSearchTerm('');
    setGlobalFilter('all');
    setGlobalSort('relevance');
    setSelection({ keywords: new Set(), asins: new Set(), categories: new Set() });
    setShowInsights(false);
    setHasLoadedExamples(false); // This will trigger demo data reload
    
    // 3. Close any open modals
    setShowExportModal(false);
    setShowImportModal(false);
    setShowCampaignPlanner(false);
    
    // 4. Close AI assistant and reopen book panel
    setIsAIAssistantOpen(false);
    setIsBookPanelOpen(true);
    
    // 5. Show confirmation toast
    import('sonner').then(({ toast }) => {
      toast.success('Datos reseteados');
    });
  }, []);

  // Export backup handler - downloads current state as JSON
  const handleExportBackup = useCallback(() => {
    const serializeData = <T,>(data: T): T => {
      return JSON.parse(JSON.stringify(data, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }));
    };

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      storageKey: 'ad-research:v1',
      data: {
        selectedMarketplace,
        activeTab,
        bookInfo: serializeData(bookInfo),
        keywordsByMarket: serializeData(keywordsByMarket),
        asinsByMarket: serializeData(asinsByMarket),
        categoriesByMarket: serializeData(categoriesByMarket),
        campaignPlansByMarket: serializeData(campaignPlansByMarket),
        showInsights,
      },
    };

    const jsonString = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const date = new Date().toISOString().split('T')[0];
    const filename = `ad-research-backup-v1-${date}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    import('sonner').then(({ toast }) => {
      toast.success('Backup exportado');
    });
  }, [selectedMarketplace, activeTab, bookInfo, keywordsByMarket, asinsByMarket, categoriesByMarket, campaignPlansByMarket, showInsights]);

  // Import backup handler - restores state from imported data
  const handleImportBackup = useCallback((data: {
    selectedMarketplace: string;
    activeTab: 'keywords' | 'asins' | 'categories';
    bookInfo: BookInfo;
    keywordsByMarket: Record<string, Keyword[]>;
    asinsByMarket: Record<string, TargetASIN[]>;
    categoriesByMarket: Record<string, AdvertisingCategory[]>;
    campaignPlansByMarket: Record<string, CampaignPlan[]>;
    showInsights?: boolean;
  }) => {
    // Set all states from imported data
    setSelectedMarketplace(data.selectedMarketplace);
    setActiveTab(data.activeTab);
    setBookInfo(data.bookInfo);
    setKeywordsByMarket(data.keywordsByMarket);
    setAsinsByMarket(data.asinsByMarket);
    setCategoriesByMarket(data.categoriesByMarket);
    setCampaignPlansByMarket(data.campaignPlansByMarket);
    if (data.showInsights !== undefined) {
      setShowInsights(data.showInsights);
    }
    
    // Prevent demo data from loading
    setHasLoadedExamples(true);
    
    // Clear selection
    setSelection({ keywords: new Set(), asins: new Set(), categories: new Set() });
    
    // Close backup modal
    setShowBackupImportModal(false);
  }, []);

  // Education sections (accessible from overflow menu)
  const educationSections = [{
    id: 'concepts',
    title: 'Conceptos Clave',
    icon: 'learn' as const,
    content: <ul className="space-y-1 list-disc list-inside">
      <li><strong>Keyword:</strong> Palabra o frase que los usuarios buscan en Amazon</li>
      <li><strong>Volumen de búsqueda:</strong> Número estimado de búsquedas mensuales</li>
      <li><strong>Competidores:</strong> Nivel de saturación (Alta/Media/Baja)</li>
    </ul>
  }, {
    id: 'tips',
    title: 'Buenas Prácticas',
    icon: 'tip' as const,
    content: <ul className="space-y-1 list-disc list-inside">
      <li>Combina keywords de alto volumen con algunas de baja competencia</li>
      <li>Prioriza keywords con alta relevancia para tu libro</li>
    </ul>
  }];

  return (
    <div className="min-h-screen bg-background">
      {/* Keyboard Shortcuts */}
      <KeyboardShortcutsManager
        onSave={handleSave}
        onSearch={handleFocusSearch}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* === HEADER === Minimalista y profesional */}
        <header className="mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Title */}
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Investigación Publicitaria
            </h1>
            
            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Marketplace Selector */}
              <MarketplaceSelector 
                value={selectedMarketplace} 
                onChange={setSelectedMarketplace} 
              />
              
              {/* Global Search */}
              <div className="hidden md:block" data-tour="global-search">
                <GlobalSearch 
                  searchTerm={globalSearchTerm} 
                  onSearchChange={setGlobalSearchTerm} 
                  filter={globalFilter} 
                  onFilterChange={setGlobalFilter} 
                  sort={globalSort} 
                  onSortChange={setGlobalSort} 
                  resultsCount={{
                    keywords: filteredKeywords.length,
                    asins: filteredASINs.length,
                    categories: filteredCategories.length
                  }}
                  compact
                />
              </div>
              
              {/* AI Assistant Button - Único punto de entrada, controlado por estado */}
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={() => setIsAIAssistantOpen(true)}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Asistente IA</span>
              </Button>
              
              {/* Theme Toggle - Discreto */}
              <ThemeToggle />
              
              {/* Overflow Menu */}
              <HeaderOverflowMenu
                onImport={() => setShowImportModal(true)}
                onExport={() => setShowExportModal(true)}
                onStartTour={() => setShowTour(true)}
                onOpenCampaignPlanner={() => setShowCampaignPlanner(true)}
                onToggleDemo={handleToggleDemo}
                isDemoMode={isDemoMode}
                onResetData={handleResetData}
                onExportBackup={handleExportBackup}
                onImportBackup={() => setShowBackupImportModal(true)}
              />
            </div>
          </div>
          
          {/* Mobile search */}
          <div className="md:hidden mt-4" data-tour="global-search-mobile">
            <GlobalSearch 
              searchTerm={globalSearchTerm} 
              onSearchChange={setGlobalSearchTerm} 
              filter={globalFilter} 
              onFilterChange={setGlobalFilter} 
              sort={globalSort} 
              onSortChange={setGlobalSort} 
              resultsCount={{
                keywords: filteredKeywords.length,
                asins: filteredASINs.length,
                categories: filteredCategories.length
              }}
              compact
            />
          </div>
        </header>

        {/* === SECCIÓN 1: CONTEXTO === Controlado por estado, sin DOM hacks */}
        {(isBookPanelOpen || !bookContextComplete) && (
          <section className="mb-6">
            <BookInfoPanel bookInfo={bookInfo} onChange={setBookInfo} />
          </section>
        )}
        
        {/* Context summary when complete and panel closed - Minimal */}
        {bookContextComplete && !isBookPanelOpen && (
          <div className="mb-6 p-3 rounded-lg border border-border/50 bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{bookInfo.title}</p>
                {bookInfo.subtitle && (
                  <p className="text-xs text-muted-foreground">{bookInfo.subtitle}</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsBookPanelOpen(true)}
              className="text-xs"
            >
              Editar contexto
            </Button>
          </div>
        )}

        {/* === SECCIÓN 2: TRABAJO (CORE) === Dominante visualmente */}
        <section className="mb-6" data-tour="tabs">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'keywords' | 'asins' | 'categories')} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 lg:w-[450px] bg-muted">
              <TabsTrigger value="keywords" className="gap-2 data-[state=active]:bg-card">
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Keywords</span>
                {currentKeywords.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                    {currentKeywords.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="asins" className="gap-2 data-[state=active]:bg-card">
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">ASIN</span>
                {currentASINs.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                    {currentASINs.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-2 data-[state=active]:bg-card">
                <FolderOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Categorías</span>
                {currentCategories.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                    {currentCategories.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="keywords" className="mt-4">
              <KeywordsSection 
                keywords={globalFilter === 'all' || globalFilter === 'keywords' ? filteredKeywords : []} 
                onAdd={handleAddKeyword} 
                onAddBulk={handleAddBulkKeywords} 
                onUpdate={handleUpdateKeyword} 
                onDelete={handleDeleteKeyword} 
                onDeleteBulk={handleDeleteBulkKeywords} 
                onUpdateBulk={handleUpdateBulkKeywords} 
                marketplaceId={selectedMarketplace} 
                bookInfo={bookInfo}
                selectedIds={selection.keywords}
                onSelectedIdsChange={(ids) => setTabSelection('keywords', ids)}
              />
            </TabsContent>
            <TabsContent value="asins" className="mt-4">
              <ASINSection 
                asins={globalFilter === 'all' || globalFilter === 'asins' ? filteredASINs : []} 
                keywords={currentKeywords}
                bookTitle={bookInfo.title}
                onAdd={handleAddASIN} 
                onAddBulk={handleAddBulkASINs} 
                onUpdate={handleUpdateASIN} 
                onDelete={handleDeleteASIN} 
                onDeleteBulk={handleDeleteBulkASINs} 
                marketplaceId={selectedMarketplace}
                selectedIds={selection.asins}
                onSelectedIdsChange={(ids) => setTabSelection('asins', ids)}
              />
            </TabsContent>
            <TabsContent value="categories" className="mt-4">
              <CategoriesSection 
                categories={globalFilter === 'all' || globalFilter === 'categories' ? filteredCategories : []} 
                onAdd={handleAddCategory} 
                onAddBulk={handleAddBulkCategories} 
                onUpdate={handleUpdateCategory} 
                onDelete={handleDeleteCategory} 
                onDeleteBulk={handleDeleteBulkCategories} 
                marketplaceId={selectedMarketplace}
                selectedIds={selection.categories}
                onSelectedIdsChange={(ids) => setTabSelection('categories', ids)}
              />
            </TabsContent>
          </Tabs>
        </section>

        {/* === SECCIÓN 4: INSIGHTS === Secundaria, colapsable */}
        <section className="mt-8">
          <Collapsible open={showInsights} onOpenChange={setShowInsights}>
            <CollapsibleTrigger className="w-full flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-accent" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Insights y Visualizaciones</p>
                  <p className="text-xs text-muted-foreground">Analiza lo ya trabajado</p>
                </div>
              </div>
              <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", showInsights && "rotate-180")} />
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-4 space-y-6">
              <StatsPanel 
                keywords={currentKeywords} 
                asins={currentASINs} 
                categories={currentCategories} 
              />
              
              <Separator />
              
              <VisualizationsTab 
                keywords={currentKeywords} 
                asins={currentASINs} 
                categories={currentCategories} 
                keywordsByMarket={keywordsByMarket} 
                asinsByMarket={asinsByMarket} 
                categoriesByMarket={categoriesByMarket} 
              />
              
              <Separator />
              
              <CollapsibleEducation sections={educationSections} />
            </CollapsibleContent>
          </Collapsible>
        </section>
      </div>

      {/* === MODALS Y PANELES OCULTOS === */}
      
      {/* Suggestions Panel - Accesible pero no dominante */}
      <SuggestionsPanel 
        keywords={currentKeywords} 
        onAddKeyword={handleAddSuggestion} 
        isOpen={showSuggestions} 
        onClose={() => setShowSuggestions(!showSuggestions)} 
      />
      
      {/* Guided Tour - Solo desde overflow */}
      <GuidedTour
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        onComplete={() => {
          setHasCompletedTour(true);
          setShowTour(false);
        }}
      />
      
      {/* Advanced Export Modal */}
      <AdvancedExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        keywords={currentKeywords}
        asins={currentASINs}
        categories={currentCategories}
        marketplaceId={selectedMarketplace}
      />
      
      {/* Advanced Import Modal */}
      <AdvancedImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleAddBulkKeywords}
        marketplaceId={selectedMarketplace}
        bookInfo={bookInfo}
        existingKeywords={currentKeywords.map(k => k.keyword)}
      />
      
      {/* Campaign Plan Manager */}
      <CampaignPlanManager
        keywords={currentKeywords}
        plans={currentPlans}
        onCreatePlan={handleCreatePlan}
        onUpdatePlan={handleUpdatePlan}
        onDeletePlan={handleDeletePlan}
        onAssignKeywords={handleAssignKeywords}
        isOpen={showCampaignPlanner}
        onClose={() => setShowCampaignPlanner(false)}
      />
      
      {/* AI Assistant Drawer - Único punto de IA */}
      <AIAssistantDrawer
        open={isAIAssistantOpen}
        onOpenChange={setIsAIAssistantOpen}
        marketplaceId={selectedMarketplace}
        bookInfo={bookInfo}
        activeTab={activeTab as 'keywords' | 'asins' | 'categories'}
        onChangeActiveTab={(tab) => setActiveTab(tab)}
        keywords={currentKeywords}
        asins={currentASINs}
        categories={currentCategories}
        selection={selection}
        onAddKeywords={handleAddBulkKeywords}
        onUpdateKeywordsBulk={handleUpdateBulkKeywords}
        onUpdateBookInfo={(updates) => setBookInfo(prev => ({ ...prev, ...updates }))}
      />
      
      {/* Backup Import Modal */}
      <BackupImportModal
        isOpen={showBackupImportModal}
        onClose={() => setShowBackupImportModal(false)}
        onImport={handleImportBackup}
      />
    </div>
  );
};
