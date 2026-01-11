import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bookmark, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FilterPreset } from '@/hooks/useFilterPresets';
import type { AdvancedFiltersState } from './AdvancedFilters';
import type { AdsFiltersState } from './AdvancedFiltersAds';

interface FilterPresetsDropdownProps {
  type: 'editorial' | 'ads';
  currentFilters: AdvancedFiltersState | AdsFiltersState;
  presets: FilterPreset[];
  onSavePreset: (name: string, type: 'editorial' | 'ads', filters: AdvancedFiltersState | AdsFiltersState) => void;
  onLoadPreset: (filters: AdvancedFiltersState | AdsFiltersState) => void;
  onDeletePreset: (id: string) => void;
}

export const FilterPresetsDropdown = ({
  type,
  currentFilters,
  presets,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
}: FilterPresetsDropdownProps) => {
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  const typePresets = presets.filter(p => p.type === type);

  const handleSave = () => {
    if (!presetName.trim()) return;
    onSavePreset(presetName, type, currentFilters);
    setPresetName('');
    setIsSaveDialogOpen(false);
  };

  const handleLoad = (preset: FilterPreset) => {
    onLoadPreset(preset.filters);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Bookmark className="w-4 h-4" />
            Presets
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 bg-popover border-border z-50">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Presets de filtros ({type === 'editorial' ? 'Nicho' : 'ADS'})
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {typePresets.length === 0 ? (
            <div className="px-2 py-3 text-center text-sm text-muted-foreground">
              No hay presets guardados
            </div>
          ) : (
            typePresets.map((preset) => (
              <DropdownMenuItem 
                key={preset.id} 
                className="flex items-center justify-between group"
                onSelect={(e) => e.preventDefault()}
              >
                <button
                  className="flex-1 text-left text-sm"
                  onClick={() => handleLoad(preset)}
                >
                  {preset.name}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePreset(preset.id);
                  }}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </DropdownMenuItem>
            ))
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsSaveDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Guardar preset actual
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Preset Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar preset de filtros</DialogTitle>
            <DialogDescription>
              Dale un nombre al preset para poder cargarlo más tarde.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nombre del preset..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!presetName.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
