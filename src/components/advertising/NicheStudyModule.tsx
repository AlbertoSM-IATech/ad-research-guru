import { useState, useMemo, useCallback, useRef } from "react";
import { Search, TrendingUp, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BookInfoPanelCompact } from "./BookInfoPanelCompact";
import { KeywordsSection } from "./KeywordsSection";
import { StatsPanel } from "./StatsPanel";
import { VisualizationsTab } from "./visualizations/VisualizationsTab";
import { CollapsibleEducation } from "./CollapsibleEducation";
import { KeyboardShortcutsManager } from "./KeyboardShortcutsManager";
import { useAdvertisingData, formatLastSync } from "./AdvertisingDataProvider";
import { cn } from "@/lib/utils";
import { type FilterType, type SortOption } from "./GlobalSearch";

export const NicheStudyModule = () => {
  const ctx = useAdvertisingData();

  const {
    selectedMarketplace, bookInfo, setBookInfo, bookEconomy, setBookEconomy,
    currentKeywords, currentASINs, currentCategories,
    keywordsByMarket, asinsByMarket, categoriesByMarket,
    handleAddKeyword, handleAddBulkKeywords, handleUpdateKeyword,
    handleDeleteKeyword, handleDeleteBulkKeywords, handleUpdateBulkKeywords,
    selection, setTabSelection,
    globalSearchTerm, setGlobalSearchTerm,
    lastSyncAt, isSyncing, syncHistory, pendingChangesCount, handleSaveNow, saveNow,
  } = ctx;

  const [mainView, setMainView] = useState<'data' | 'insights'>('data');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const handleSave = useCallback(() => { saveNow(); }, [saveNow]);
  const handleFocusSearch = useCallback(() => { searchInputRef.current?.focus(); }, []);

  // Education sections
  const educationSections = [
    {
      id: "kdp-concepts",
      title: "Conceptos KDP (Metadata y Keywords)",
      icon: "learn" as const,
      content: (
        <ul className="space-y-1.5 list-disc list-inside">
          <li><strong>Keywords:</strong> KDP permite hasta <strong>7 frases clave</strong> por libro. Usa frases específicas (2-4 palabras).</li>
          <li><strong>Categorías:</strong> Puedes asignar hasta <strong>3 categorías</strong> por libro.</li>
          <li><strong>Título + Subtítulo:</strong> Máximo 200 caracteres combinados. No incluyas promos, rank claims, HTML ni URLs.</li>
          <li><strong>Contenido IA:</strong> Si usas IA para crear contenido, debes declararlo en KDP.</li>
          <li><strong>Regalías eBooks:</strong> 35% o 70% (rango de precios específico por marketplace). Print: ~60%.</li>
        </ul>
      ),
    },
    {
      id: "common-errors",
      title: "Errores Comunes a Evitar",
      icon: "reminder" as const,
      content: (
        <ul className="space-y-1.5 list-disc list-inside">
          <li><strong>Keyword stuffing en título:</strong> Amazon penaliza títulos con keywords forzadas.</li>
          <li><strong>No declarar IA:</strong> KDP exige declarar contenido generado por IA.</li>
          <li><strong>Categorías irrelevantes:</strong> Elegir categorías solo por baja competencia perjudica la descubribilidad.</li>
        </ul>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <KeyboardShortcutsManager onSave={handleSave} onSearch={handleFocusSearch} />

      <div className="w-full px-3 sm:px-4 lg:px-6 py-6">
        <header className="mb-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl font-bold text-foreground">Estudio de Nicho</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-help text-xs">ⓘ</span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-sm">
                    <p className="text-xs">Investiga nichos, analiza keywords editoriales y visualiza oportunidades de mercado.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </header>

        {/* Book Info */}
        <section className="mb-4 space-y-2" data-tour="book-info">
          <BookInfoPanelCompact
            bookInfo={bookInfo} onChange={setBookInfo}
            bookEconomy={bookEconomy} onBookEconomyChange={setBookEconomy}
            keywords={currentKeywords} marketplaceId={selectedMarketplace}
          />
        </section>

        {/* Main View Toggle + Sync */}
        <section className="mb-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-1 p-0.5 bg-muted rounded-md w-fit">
              <Button data-tour="tab-datos" variant={mainView === 'data' ? 'default' : 'ghost'} size="sm"
                onClick={() => setMainView('data')}
                className={cn("gap-1.5 h-7 text-xs px-3 transition-all", mainView === 'data' && "bg-primary text-primary-foreground")}>
                <Search className="w-3.5 h-3.5" />Datos
              </Button>
              <Button data-tour="tab-visualizaciones" variant={mainView === 'insights' ? 'default' : 'ghost'} size="sm"
                onClick={() => setMainView('insights')}
                className={cn("gap-1.5 h-7 text-xs px-3 transition-all", mainView === 'insights' && "bg-primary text-primary-foreground")}>
                <TrendingUp className="w-3.5 h-3.5" />Visualizaciones
              </Button>
            </div>

            {/* Sync status */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-[11px] transition-all duration-300 ${pendingChangesCount > 0 ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground"} ${isSyncing ? "animate-pulse" : ""}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pendingChangesCount > 0 ? "bg-amber-500 dark:bg-amber-400" : "bg-green-500"} ${isSyncing ? "animate-pulse" : ""}`} />
                {pendingChangesCount > 0 ? `${pendingChangesCount} pendientes` : "Sincronizado"}
              </span>
              {pendingChangesCount > 0 && (
                <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] gap-0.5" onClick={handleSaveNow}>
                  <Save className="w-3 h-3" />
                </Button>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[11px] text-muted-foreground cursor-help">{formatLastSync(lastSyncAt)}</span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium text-xs">Historial</p>
                      {syncHistory.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sin sincronizaciones</p>
                      ) : (
                        <ul className="text-xs space-y-0.5">
                          {syncHistory.map((date, i) => (
                            <li key={i} className="text-muted-foreground">
                              {date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                              {i === 0 && <span className="ml-1 text-green-500">(última)</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Data View */}
          {mainView === 'data' && (
            <KeywordsSection
              keywords={currentKeywords}
              onAdd={handleAddKeyword}
              onAddBulk={handleAddBulkKeywords}
              onUpdate={handleUpdateKeyword}
              onDelete={handleDeleteKeyword}
              onDeleteBulk={handleDeleteBulkKeywords}
              onUpdateBulk={handleUpdateBulkKeywords}
              marketplaceId={selectedMarketplace}
              bookInfo={bookInfo}
              bookEconomy={bookEconomy}
              onBookInfoChange={setBookInfo}
              selectedIds={selection.keywords}
              onSelectedIdsChange={(ids) => setTabSelection("keywords", ids)}
              searchTerm={globalSearchTerm}
              onSearchTermChange={setGlobalSearchTerm}
              forcedView="editorial"
            />
          )}

          {/* Insights View */}
          {mainView === 'insights' && (
            <div className="space-y-6 animate-fade-in">
              <div data-tour="stats">
                <StatsPanel keywords={currentKeywords} asins={currentASINs} categories={currentCategories} />
              </div>
              <Separator />
              <VisualizationsTab
                keywords={currentKeywords} asins={currentASINs} categories={currentCategories}
                keywordsByMarket={keywordsByMarket} asinsByMarket={asinsByMarket} categoriesByMarket={categoriesByMarket}
              />
              <Separator />
              <CollapsibleEducation sections={educationSections} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
