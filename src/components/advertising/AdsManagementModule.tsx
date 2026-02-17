import { useState, useCallback, useRef } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BookInfoPanelCompact } from "./BookInfoPanelCompact";
import { KeywordsSection } from "./KeywordsSection";
import { KeyboardShortcutsManager } from "./KeyboardShortcutsManager";
import { CollapsibleEducation } from "./CollapsibleEducation";
import { PlanUpgradeModal } from "./PlanUpgradeModal";
import { useAdvertisingData, formatLastSync } from "./AdvertisingDataProvider";
import { hasAccess } from "@/lib/plan-system";

export const AdsManagementModule = () => {
  const ctx = useAdvertisingData();
  const {
    selectedMarketplace, bookInfo, setBookInfo, bookEconomy, setBookEconomy,
    currentKeywords,
    handleAddKeyword, handleAddBulkKeywords, handleUpdateKeyword,
    handleDeleteKeyword, handleDeleteBulkKeywords, handleUpdateBulkKeywords,
    selection, setTabSelection,
    globalSearchTerm, setGlobalSearchTerm,
    lastSyncAt, isSyncing, syncHistory, pendingChangesCount, handleSaveNow, saveNow
  } = ctx;

  const hasAdsAccess = hasAccess('ads-management');
  const [showPlanUpgradeModal, setShowPlanUpgradeModal] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const handleSave = useCallback(() => {saveNow();}, [saveNow]);
  const handleFocusSearch = useCallback(() => {searchInputRef.current?.focus();}, []);

  // If no access, show upgrade modal
  if (!hasAdsAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-foreground">Gestión de ADS</h2>
          <p className="text-muted-foreground">Esta funcionalidad requiere el plan Plus.</p>
          <Button onClick={() => setShowPlanUpgradeModal(true)}>Ver planes</Button>
          <PlanUpgradeModal open={showPlanUpgradeModal} onOpenChange={setShowPlanUpgradeModal} />
        </div>
      </div>);

  }

  // Education sections for Ads
  const educationSections = [
  {
    id: "ads-practices",
    title: "Buenas Prácticas de Amazon Ads",
    icon: "tip" as const,
    content:
    <ul className="space-y-1.5 list-disc list-inside">
          <li><strong>ACOS:</strong> Advertising Cost of Sales = Gasto / Ventas. Compara siempre con tu Punto de Equilibrio.</li>
          <li><strong>Targeting:</strong> Una vez live, <strong>no puedes cambiar el tipo de targeting</strong> (auto/manual).</li>
          <li><strong>Match Types:</strong> Broad, Phrase, Exact. Empieza con Broad, refina con Exact.</li>
          <li><strong>Límites:</strong> Máximo 10 palabras y 80 caracteres por keyword de Ads.</li>
          <li><strong>Revisión:</strong> Revisa bids cada 2 semanas. Sube top performers, reduce no convertidores.</li>
        </ul>

  },
  {
    id: "checklist",
    title: "Checklist Rápido de Optimización",
    icon: "tip" as const,
    content:
    <ul className="space-y-1.5 list-disc list-inside">
          <li>✅ Revisa rendimiento cada <strong>2 semanas</strong> mínimo.</li>
          <li>✅ Mina el <strong>Search Term Report</strong> quincenalmente.</li>
          <li>✅ Compara tu ACOS actual con el <strong>Punto de Equilibrio</strong> antes de escalar.</li>
          <li>✅ Añade <strong>keywords negativas</strong> para evitar gasto irrelevante.</li>
        </ul>

  }];


  return (
    <div className="min-h-screen bg-background">
      <KeyboardShortcutsManager onSave={handleSave} onSearch={handleFocusSearch} />

      <div className="w-full px-3 sm:px-4 lg:px-6 py-6">
        <header className="mb-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl font-bold text-foreground">Gestión de ADS</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-help text-xs">ⓘ</span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-sm">
                    <p className="text-xs">Gestiona tus campañas de Amazon Ads, importa datos de rendimiento y monitoriza ACOS vs Punto de Equilibrio.</p>
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
            keywords={currentKeywords} marketplaceId={selectedMarketplace} />

        </section>

        {/* Sync status */}
        



































        {/* Keywords in Ads mode */}
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
          forcedView="ads" />


        {/* Education */}
        <div className="mt-6">
          
        </div>
      </div>
    </div>);

};