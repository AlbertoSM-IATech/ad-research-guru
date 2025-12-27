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
  loadUserConfigOverrides,
  saveUserConfigOverrides,
  getDefaultMarketScoreConfig,
  getMarketScoreConfig,
  MARKET_SCORE_CONFIG_BY_MARKETPLACE,
} from '@/lib/market-score-config';
import { MARKETPLACES } from '@/types/advertising';

interface MarketConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMarketplace: string;
  onConfigChange?: () => void;
}

// Use ALL marketplaces from the app, not a subset
const ALL_MARKETPLACE_IDS = MARKETPLACES.map(m => m.id);

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
  const [idealCompetitors, setIdealCompetitors] = useState(1000);
  const [idealPrice, setIdealPrice] = useState(12.99);
  const [idealRoyalties, setIdealRoyalties] = useState(4.5);
  const [hasChanges, setHasChanges] = useState(false);

  // Load current config when marketplace changes
  useEffect(() => {
    const config = getMarketScoreConfig(selectedMarketplace);
    setIdealVolume(config.idealVolume);
    setIdealCompetitors(config.idealCompetitors);
    setIdealPrice(config.idealPrice);
    setIdealRoyalties(config.idealRoyalties);
    setHasChanges(false);
  }, [selectedMarketplace, isOpen]);

  const handleRestore = () => {
    const defaultConfig = getDefaultMarketScoreConfig(selectedMarketplace);
    setIdealVolume(defaultConfig.idealVolume);
    setIdealCompetitors(defaultConfig.idealCompetitors);
    setIdealPrice(defaultConfig.idealPrice);
    setIdealRoyalties(defaultConfig.idealRoyalties);
    
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
      idealVolume,
      idealCompetitors,
      idealPrice,
      idealRoyalties,
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

  // Check if this marketplace has user overrides (configured)
  const userOverrides = loadUserConfigOverrides();
  const isConfigured = (mpId: string) => !!userOverrides[mpId];
  
  // Check if marketplace has a base config (not just using default)
  const hasBaseConfig = (mpId: string) => !!MARKET_SCORE_CONFIG_BY_MARKETPLACE[mpId];

  const marketplaceInfo = MARKETPLACES.find(m => m.id === selectedMarketplace);
  const currentMarketIsConfigured = isConfigured(selectedMarketplace);

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
          {/* Marketplace selector - ALL marketplaces */}
          <div className="space-y-2">
            <Label>Mercado</Label>
            <Select value={selectedMarketplace} onValueChange={setSelectedMarketplace}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_MARKETPLACE_IDS.map((mpId) => {
                  const mp = MARKETPLACES.find(m => m.id === mpId);
                  const configured = isConfigured(mpId);
                  const hasBase = hasBaseConfig(mpId);
                  return (
                    <SelectItem key={mpId} value={mpId}>
                      <div className="flex items-center gap-2">
                        <span>{mp?.flag} {mp?.name || mpId}</span>
                        {configured ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-700 dark:text-green-400">Configurado</span>
                        ) : hasBase ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-400">Defaults</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400">Sin config</span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          {/* Warning if using defaults for this marketplace */}
          {!currentMarketIsConfigured && !hasBaseConfig(selectedMarketplace) && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                Este mercado no tiene configuración personalizada. Se usarán valores por defecto (España). 
                <strong> Configura tus valores ideales para obtener un scoring adaptado.</strong>
              </AlertDescription>
            </Alert>
          )}

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
