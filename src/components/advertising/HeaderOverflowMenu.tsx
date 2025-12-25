import { useState } from 'react';
import { 
  MoreHorizontal, 
  Upload, 
  Download, 
  HelpCircle, 
  Settings, 
  Play,
  Layers,
  FlaskConical,
  Trash2,
  FileJson
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
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

interface HeaderOverflowMenuProps {
  onImport: () => void;
  onExport: () => void;
  onStartTour: () => void;
  onOpenCampaignPlanner: () => void;
  onToggleDemo: () => void;
  isDemoMode: boolean;
  onResetData: () => void;
  onExportBackup: () => void;
}

export const HeaderOverflowMenu = ({
  onImport,
  onExport,
  onStartTour,
  onOpenCampaignPlanner,
  onToggleDemo,
  isDemoMode,
  onResetData,
  onExportBackup,
}: HeaderOverflowMenuProps) => {
  const [showResetDialog, setShowResetDialog] = useState(false);

  const handleConfirmReset = () => {
    setShowResetDialog(false);
    onResetData();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreHorizontal className="h-5 w-5" />
            <span className="sr-only">Más opciones</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Sección: Datos */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">Datos</DropdownMenuLabel>
          <DropdownMenuItem onClick={onImport} className="gap-2 cursor-pointer">
            <Upload className="h-4 w-4" />
            Importar datos
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExport} className="gap-2 cursor-pointer">
            <Download className="h-4 w-4" />
            Exportar datos
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Sección: Herramientas */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">Herramientas</DropdownMenuLabel>
          <DropdownMenuItem onClick={onOpenCampaignPlanner} className="gap-2 cursor-pointer">
            <Layers className="h-4 w-4" />
            Planes de campaña
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Sección: Ayuda */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">Ayuda</DropdownMenuLabel>
          <DropdownMenuItem onClick={onStartTour} className="gap-2 cursor-pointer">
            <Play className="h-4 w-4" />
            Iniciar tour guiado
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 cursor-pointer">
            <HelpCircle className="h-4 w-4" />
            Ayuda
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Sección: Sistema */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">Sistema</DropdownMenuLabel>
          <DropdownMenuItem className="gap-2 cursor-pointer">
            <Settings className="h-4 w-4" />
            Ajustes del módulo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportBackup} className="gap-2 cursor-pointer">
            <FileJson className="h-4 w-4" />
            Exportar backup (JSON)
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowResetDialog(true)} 
            className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Restablecer datos
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Sección: Experimental */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">Experimental</DropdownMenuLabel>
          <DropdownMenuItem onClick={onToggleDemo} className="gap-2 cursor-pointer">
            <FlaskConical className="h-4 w-4" />
            {isDemoMode ? 'Desactivar modo demo' : 'Activar modo demo'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
              onClick={handleConfirmReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Restablecer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};