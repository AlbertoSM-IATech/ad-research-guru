import { 
  MoreHorizontal, 
  Upload, 
  Download, 
  HelpCircle, 
  Settings, 
  Play,
  Layers,
  ToggleLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderOverflowMenuProps {
  onImport: () => void;
  onExport: () => void;
  onStartTour: () => void;
  onOpenCampaignPlanner: () => void;
  onToggleDemo: () => void;
  isDemoMode: boolean;
}

export const HeaderOverflowMenu = ({
  onImport,
  onExport,
  onStartTour,
  onOpenCampaignPlanner,
  onToggleDemo,
  isDemoMode,
}: HeaderOverflowMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <MoreHorizontal className="h-5 w-5" />
          <span className="sr-only">Más opciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onImport} className="gap-2 cursor-pointer">
          <Upload className="h-4 w-4" />
          Importar datos
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExport} className="gap-2 cursor-pointer">
          <Download className="h-4 w-4" />
          Exportar datos
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={onOpenCampaignPlanner} className="gap-2 cursor-pointer">
          <Layers className="h-4 w-4" />
          Planes de campaña
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={onStartTour} className="gap-2 cursor-pointer">
          <Play className="h-4 w-4" />
          Iniciar tour guiado
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleDemo} className="gap-2 cursor-pointer">
          <ToggleLeft className="h-4 w-4" />
          {isDemoMode ? 'Desactivar modo demo' : 'Activar modo demo'}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem className="gap-2 cursor-pointer">
          <HelpCircle className="h-4 w-4" />
          Ayuda
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer">
          <Settings className="h-4 w-4" />
          Ajustes del módulo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
