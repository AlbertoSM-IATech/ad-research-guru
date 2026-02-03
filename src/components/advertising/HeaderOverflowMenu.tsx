import { useState } from 'react';
import { 
  MoreHorizontal, 
  Settings, 
  Play,
  Trash2,
  HardDrive,
  RefreshCw
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
  onStartTour: () => void;
  onResetData: () => void;
  onRegenerateDemo: () => void;
  onOpenMarketConfig: () => void;
  onOpenBackup: () => void;
}

export const HeaderOverflowMenu = ({
  onStartTour,
  onResetData,
  onRegenerateDemo,
  onOpenMarketConfig,
  onOpenBackup,
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
          {/* Sección: Ayuda */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">Ayuda</DropdownMenuLabel>
          <DropdownMenuItem onClick={onStartTour} className="gap-2 cursor-pointer">
            <Play className="h-4 w-4" />
            Iniciar tour guiado
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Sección: Sistema */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">Sistema</DropdownMenuLabel>
          <DropdownMenuItem onClick={onOpenMarketConfig} className="gap-2 cursor-pointer">
            <Settings className="h-4 w-4" />
            Criterios por mercado
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenBackup} className="gap-2 cursor-pointer">
            <HardDrive className="h-4 w-4" />
            Backup
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
          <DropdownMenuItem onClick={onRegenerateDemo} className="gap-2 cursor-pointer">
            <RefreshCw className="h-4 w-4" />
            Regenerar datos demo
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
