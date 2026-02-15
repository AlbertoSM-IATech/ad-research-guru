import { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/advertising/AppSidebar";
import { NicheStudyModule } from "@/components/advertising/NicheStudyModule";
import { AdsManagementModule } from "@/components/advertising/AdsManagementModule";
import { AdvertisingDataProvider, useAdvertisingData } from "@/components/advertising/AdvertisingDataProvider";
import { BackupModal } from "@/components/advertising/BackupModal";
import { MarketConfigModal } from "@/components/advertising/MarketConfigModal";
import { NicheTour } from "@/components/advertising/NicheTour";
import { AdsTour } from "@/components/advertising/AdsTour";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function AppLayout() {
  const location = useLocation();
  const ctx = useAdvertisingData();
  const {
    selectedMarketplace, bookInfo, bookEconomy,
    keywordsByMarket, asinsByMarket, categoriesByMarket, campaignPlansByMarket,
    showInsights, activeTab,
    handleResetData, handleRestoreBackup,
    configVersion, setConfigVersion,
    bookId,
  } = ctx;

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showMarketConfigModal, setShowMarketConfigModal] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showTour, setShowTour] = useState(false);

  const isAdsRoute = location.pathname === "/ads";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          onOpenBackup={() => setShowBackupModal(true)}
          onOpenMarketConfig={() => setShowMarketConfigModal(true)}
          onOpenReset={() => setShowResetDialog(true)}
          onOpenTour={() => setShowTour(true)}
        />
        <main className="flex-1 overflow-auto">
          <div className="flex items-center h-10 border-b border-border/50 px-2">
            <SidebarTrigger />
          </div>
          <Routes>
            <Route path="/estudio" element={<NicheStudyModule />} />
            <Route path="/ads" element={<AdsManagementModule />} />
            <Route path="*" element={<Navigate to="/estudio" replace />} />
          </Routes>
        </main>
      </div>

      {/* Tour - context-specific */}
      {isAdsRoute ? (
        <AdsTour isOpen={showTour} onClose={() => setShowTour(false)} onComplete={() => setShowTour(false)} />
      ) : (
        <NicheTour isOpen={showTour} onClose={() => setShowTour(false)} onComplete={() => setShowTour(false)} />
      )}

      {/* Modals */}
      <BackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        bookId={bookId}
        selectedMarketplace={selectedMarketplace}
        activeTab={activeTab}
        bookInfo={bookInfo}
        bookEconomy={bookEconomy}
        keywordsByMarket={keywordsByMarket}
        asinsByMarket={asinsByMarket}
        categoriesByMarket={categoriesByMarket}
        campaignPlansByMarket={campaignPlansByMarket}
        showInsights={showInsights}
        onRestore={handleRestoreBackup}
      />
      <MarketConfigModal
        isOpen={showMarketConfigModal}
        onClose={() => setShowMarketConfigModal(false)}
        currentMarketplace={selectedMarketplace}
        onConfigChange={() => setConfigVersion((v: number) => v + 1)}
      />
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restablecer datos</AlertDialogTitle>
            <AlertDialogDescription>
              Esto borrará todos los datos guardados localmente. Esta acción no se puede deshacer.
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
    </SidebarProvider>
  );
}

const Index = () => {
  return (
    <AdvertisingDataProvider>
      <AppLayout />
    </AdvertisingDataProvider>
  );
};

export default Index;
