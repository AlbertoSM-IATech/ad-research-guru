import { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, Target, FolderOpen, BarChart3, Lightbulb, Download, Upload, Layers, HelpCircle } from 'lucide-react';
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
import { CompetitiveAnalysisPanel } from './CompetitiveAnalysisPanel';
import { 
  type Keyword, 
  type TargetASIN, 
  type AdvertisingCategory, 
  type BookInfo,
  type CampaignPlan,
  getExampleKeywords,
  getExampleASINs,
  getExampleCategories,
} from '@/types/advertising';

const generateId = () => Math.random().toString(36).substring(2, 15);

export const AdvertisingResearch = () => {
  const [selectedMarketplace, setSelectedMarketplace] = useState('us');
  const [activeTab, setActiveTab] = useState('keywords');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasLoadedExamples, setHasLoadedExamples] = useState(false);
  
  // Tour state
  const { hasCompletedTour, setHasCompletedTour, resetTour } = useTourStatus();
  const [showTour, setShowTour] = useState(false);
  
  // Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCampaignPlanner, setShowCampaignPlanner] = useState(false);
  
  const [bookInfo, setBookInfo] = useState<BookInfo>({
    title: 'Mindfulness para principiantes',
    subtitle: 'Integrando el Mindfulness en la Vida Cotidiana',
    description: 'Una guía práctica para aprender técnicas de meditación, respiración consciente y reducción de estrés. Ideal para quienes buscan calmar la ansiedad y mejorar su bienestar mental.',
    categories: ['Meditación', 'Mindfulness', 'Autoayuda', 'Bienestar mental']
  });
  
  const [keywordsByMarket, setKeywordsByMarket] = useState<Record<string, Keyword[]>>({});
  const [asinsByMarket, setAsinsByMarket] = useState<Record<string, TargetASIN[]>>({});
  const [categoriesByMarket, setCategoriesByMarket] = useState<Record<string, AdvertisingCategory[]>>({});
  const [campaignPlansByMarket, setCampaignPlansByMarket] = useState<Record<string, CampaignPlan[]>>({});
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [globalFilter, setGlobalFilter] = useState<FilterType>('all');
  const [globalSort, setGlobalSort] = useState<SortOption>('relevance');

  // Show tour on first visit
  useEffect(() => {
    if (!hasCompletedTour) {
      setShowTour(true);
    }
  }, [hasCompletedTour]);

  // Load example data when section is empty
  useEffect(() => {
    if (!hasLoadedExamples) {
      const currentKeywords = keywordsByMarket[selectedMarketplace] || [];
      const currentASINs = asinsByMarket[selectedMarketplace] || [];
      const currentCategories = categoriesByMarket[selectedMarketplace] || [];

      if (currentKeywords.length === 0 && currentASINs.length === 0 && currentCategories.length === 0) {
        // Load example keywords
        const exampleKeywords = getExampleKeywords(selectedMarketplace).map(k => ({
          ...k,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        setKeywordsByMarket(prev => ({ ...prev, [selectedMarketplace]: exampleKeywords }));

        // Load example ASINs
        const exampleASINs = getExampleASINs(selectedMarketplace).map(a => ({
          ...a,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        setAsinsByMarket(prev => ({ ...prev, [selectedMarketplace]: exampleASINs }));

        // Load example categories
        const exampleCategories = getExampleCategories(selectedMarketplace).map(c => ({
          ...c,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        setCategoriesByMarket(prev => ({ ...prev, [selectedMarketplace]: exampleCategories }));

        setHasLoadedExamples(true);
      }
    }
  }, [selectedMarketplace, hasLoadedExamples, keywordsByMarket, asinsByMarket, categoriesByMarket]);

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
    // Just a placeholder - data is auto-saved in state
    console.log('Saving...');
  }, []);

  const handleFocusSearch = useCallback(() => {
    const searchInput = document.querySelector('[data-tour="global-search"] input') as HTMLInputElement;
    searchInput?.focus();
  }, []);

  const educationSections = [{
    id: 'concepts',
    title: 'Conceptos Clave',
    icon: 'learn' as const,
    content: <ul className="space-y-1 list-disc list-inside">
      <li><strong>Keyword:</strong> Palabra o frase que los usuarios buscan en Amazon</li>
      <li><strong>Volumen de búsqueda:</strong> Número estimado de búsquedas mensuales</li>
      <li><strong>Competidores:</strong> Nivel de saturación (Alta/Media/Baja)</li>
      <li><strong>Relevancia:</strong> 🔵 Muy relevante, 🟢 Relevante, 🟡 Baja, 🔴 No relevante</li>
      <li><strong>Intención:</strong> Compra, Investigación, Competencia, Problema</li>
      <li><strong>Estado:</strong> 🟢 Funciona, 🟡 Pendiente, 🔵 Baja competencia, 🔴 Descartada</li>
      <li><strong>BSR:</strong> Best Seller Rank - Posición en ventas de Amazon</li>
    </ul>
  }, {
    id: 'tips',
    title: 'Buenas Prácticas',
    icon: 'tip' as const,
    content: <ul className="space-y-1 list-disc list-inside">
      <li>Combina keywords de alto volumen con algunas de baja competencia</li>
      <li>Prioriza keywords con alta relevancia para tu libro</li>
      <li>Usa el panel de sugerencias para descubrir nuevas oportunidades</li>
      <li>Agrupa variantes para optimizar tu estrategia de pujas</li>
    </ul>
  }];

  return (
    <div className="min-h-screen bg-background">
      {/* Keyboard Shortcuts */}
      <KeyboardShortcutsManager
        onSave={handleSave}
        onSearch={handleFocusSearch}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="space-y-4 mb-8">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h1 className="font-heading text-4xl font-bold text-foreground">Investigación Publicitaria</h1>
              <p className="text-muted-foreground max-w-3xl text-base">
                Administra palabras clave, ASIN, categorías y métricas para campañas en diferentes mercados.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTour(true)}
                className="gap-2"
              >
                <HelpCircle className="w-4 h-4" />
                Ver tour
              </Button>
              <ThemeToggle />
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2" data-tour="marketplace">
            <MarketplaceSelector value={selectedMarketplace} onChange={setSelectedMarketplace} />
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Importación avanzada
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportModal(true)}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar datos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCampaignPlanner(true)}
              className="gap-2"
            >
              <Layers className="w-4 h-4" />
              Planes de campaña
            </Button>
          </div>
        </header>

        <Separator className="mb-8" />
        
        {/* Book Info Panel */}
        <section className="mb-8">
          <BookInfoPanel bookInfo={bookInfo} onChange={setBookInfo} />
        </section>

        <Separator className="mb-8" />
        <section className="mb-8">
          <StatsPanel keywords={currentKeywords} asins={currentASINs} categories={currentCategories} />
        </section>

        <Separator className="mb-8" />
        <section className="mb-8" data-tour="global-search">
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
          />
        </section>

        <Separator className="mb-8" />
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" data-tour="tabs">
          <TabsList className="grid w-full grid-cols-4 lg:w-[650px] bg-muted">
            <TabsTrigger value="keywords" className="gap-2 data-[state=active]:bg-card">
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Keywords</span>
              {currentKeywords.length > 0 && <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary">{currentKeywords.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="asins" className="gap-2 data-[state=active]:bg-card">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">ASIN</span>
              {currentASINs.length > 0 && <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary">{currentASINs.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2 data-[state=active]:bg-card">
              <FolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Categorías</span>
              {currentCategories.length > 0 && <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary">{currentCategories.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="visualizations" className="gap-2 data-[state=active]:bg-card">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Visualizaciones</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="keywords" className="mt-6">
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
            />
          </TabsContent>
          <TabsContent value="asins" className="mt-6">
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
            />
          </TabsContent>
          <TabsContent value="categories" className="mt-6">
            <CategoriesSection 
              categories={globalFilter === 'all' || globalFilter === 'categories' ? filteredCategories : []} 
              onAdd={handleAddCategory} 
              onAddBulk={handleAddBulkCategories} 
              onUpdate={handleUpdateCategory} 
              onDelete={handleDeleteCategory} 
              onDeleteBulk={handleDeleteBulkCategories} 
              marketplaceId={selectedMarketplace} 
            />
          </TabsContent>
          <TabsContent value="visualizations" className="mt-6">
            <VisualizationsTab 
              keywords={currentKeywords} 
              asins={currentASINs} 
              categories={currentCategories} 
              keywordsByMarket={keywordsByMarket} 
              asinsByMarket={asinsByMarket} 
              categoriesByMarket={categoriesByMarket} 
            />
          </TabsContent>
        </Tabs>

        <Separator className="my-8" />
        <footer>
          <CollapsibleEducation sections={educationSections} />
        </footer>
      </div>

      {/* Suggestions Panel */}
      <SuggestionsPanel 
        keywords={currentKeywords} 
        onAddKeyword={handleAddSuggestion} 
        isOpen={showSuggestions} 
        onClose={() => setShowSuggestions(!showSuggestions)} 
      />
      
      {/* Guided Tour */}
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
    </div>
  );
};
