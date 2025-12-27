import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, RotateCcw, Save, Settings } from 'lucide-react';
import {
  type IdealTargets,
  type UserMarketScoreOverrides,
  loadUserConfigOverrides,
  saveUserConfigOverrides,
  getDefaultMarketScoreConfig,
  getMarketScoreConfig,
} from '@/lib/market-score-config';
import { MARKETPLACES } from '@/types/advertising';

interface MarketConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMarketplace: string;
  onConfigChange?: () => void;
}

const SUPPORTED_MARKETPLACES = ['us', 'es'];

const FIELD_TOOLTIPS = {
  searchVolume: 'Volumen de búsqueda ideal mensual. Se usará para calibrar qué es "bueno" vs "excelente".',
  competitors: 'Número ideal de competidores. Menos de esto es excelente, más del doble es saturado.',
  price: 'Precio medio ideal. Por debajo de $7.99 se considera bajo margen.',
  royalties: 'Regalías ideales por venta. Se usa para calibrar la viabilidad económica.',
};

export const MarketConfigModal = ({
  isOpen,
  onClose,
  currentMarketplace,
  onConfigChange,
}: MarketConfigModalProps) => {
  const [selectedMarketplace, setSelectedMarketplace] = useState(currentMarketplace);
  const [idealVolume, setIdealVolume] = useState(600);
  const [idealCompetitors, setIdealCompetitors] = useState(3000);
  const [idealPrice, setIdealPrice] = useState(12);
  const [idealRoyalties, setIdealRoyalties] = useState(4);
  const [hasChanges, setHasChanges] = useState(false);

  // Load current config when marketplace changes
  useEffect(() => {
    const config = getMarketScoreConfig(selectedMarketplace);
    setIdealVolume(config.ideal.searchVolume);
    setIdealCompetitors(config.ideal.competitors);
    setIdealPrice(config.ideal.price);
    setIdealRoyalties(config.ideal.royalties);
    setHasChanges(false);
  }, [selectedMarketplace, isOpen]);

  const handleRestore = () => {
    const defaultConfig = getDefaultMarketScoreConfig(selectedMarketplace);
    setIdealVolume(defaultConfig.ideal.searchVolume);
    setIdealCompetitors(defaultConfig.ideal.competitors);
    setIdealPrice(defaultConfig.ideal.price);
    setIdealRoyalties(defaultConfig.ideal.royalties);
    
    // Remove override for this marketplace
    const overrides = loadUserConfigOverrides();
    delete overrides[selectedMarketplace];
    saveUserConfigOverrides(overrides);
    setHasChanges(false);
    onConfigChange?.();
  };

  const handleSave = () => {
    const overrides = loadUserConfigOverrides();
    overrides[selectedMarketplace] = {
      searchVolume: idealVolume,
      competitors: idealCompetitors,
      price: idealPrice,
      royalties: idealRoyalties,
    };
    saveUserConfigOverrides(overrides);
    setHasChanges(false);
    onConfigChange?.();
    onClose();
  };

  const handleChange = (setter: (v: number) => void, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      setter(num);
      setHasChanges(true);
    }
  };

  const marketplaceInfo = MARKETPLACES.find(m => m.id === selectedMarketplace);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Criterios por mercado
          </DialogTitle>
          <DialogDescription>
            Define los valores ideales para calibrar el Market Score. Estos valores afectan los umbrales de puntuación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Marketplace selector */}
          <div className="space-y-2">
            <Label>Mercado</Label>
            <Select value={selectedMarketplace} onValueChange={setSelectedMarketplace}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_MARKETPLACES.map((mpId) => {
                  const mp = MARKETPLACES.find(m => m.id === mpId);
                  return (
                    <SelectItem key={mpId} value={mpId}>
                      {mp?.flag} {mp?.name || mpId}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Ideal Volume */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="idealVolume">Volumen ideal</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-xs">{FIELD_TOOLTIPS.searchVolume}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="idealVolume"
              type="number"
              min={0}
              value={idealVolume}
              onChange={(e) => handleChange(setIdealVolume, e.target.value)}
            />
          </div>

          {/* Ideal Competitors */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="idealCompetitors">Competidores ideal</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-xs">{FIELD_TOOLTIPS.competitors}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="idealCompetitors"
              type="number"
              min={0}
              value={idealCompetitors}
              onChange={(e) => handleChange(setIdealCompetitors, e.target.value)}
            />
          </div>

          {/* Ideal Price */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="idealPrice">Precio ideal ($)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-xs">{FIELD_TOOLTIPS.price}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="idealPrice"
              type="number"
              min={0}
              step={0.01}
              value={idealPrice}
              onChange={(e) => handleChange(setIdealPrice, e.target.value)}
            />
          </div>

          {/* Ideal Royalties */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="idealRoyalties">Regalías ideales ($)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-xs">{FIELD_TOOLTIPS.royalties}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="idealRoyalties"
              type="number"
              min={0}
              step={0.01}
              value={idealRoyalties}
              onChange={(e) => handleChange(setIdealRoyalties, e.target.value)}
            />
          </div>

          {/* Warning alert */}
          <Alert className="bg-amber-500/10 border-amber-500/30">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
              <strong>⚠️ Los valores ideales son tu criterio personal, no una verdad universal.</strong>
              <br />
              Ajusta estas métricas antes de analizar keywords para obtener un Market Score coherente con tu estrategia.
            </AlertDescription>
          </Alert>

          {/* Info alert */}
          <Alert className="bg-muted/50">
            <Info className="w-4 h-4" />
            <AlertDescription className="text-xs">
              Estos valores determinan qué se considera "excelente", "bueno" o "bajo" para cada métrica. 
              El Market Score se recalcula automáticamente.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleRestore} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Restaurar
          </Button>
          <Button onClick={handleSave} className="gap-2" disabled={!hasChanges}>
            <Save className="w-4 h-4" />
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};