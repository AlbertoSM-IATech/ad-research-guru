import { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ADS-specific filter state
export interface AdsFiltersState {
  minClicks: string;
  maxClicks: string;
  minCpc: string;
  maxCpc: string;
  minPedidos: string;
  maxPedidos: string;
  minAcos: string;
  maxAcos: string;
  minBeneficio: string;
  maxBeneficio: string;
  rentabilidad: 'all' | 'profitable' | 'unprofitable';
}

export const defaultAdsFiltersState: AdsFiltersState = {
  minClicks: '',
  maxClicks: '',
  minCpc: '',
  maxCpc: '',
  minPedidos: '',
  maxPedidos: '',
  minAcos: '',
  maxAcos: '',
  minBeneficio: '',
  maxBeneficio: '',
  rentabilidad: 'all',
};

interface AdvancedFiltersAdsProps {
  filters: AdsFiltersState;
  onFiltersChange: (filters: AdsFiltersState) => void;
  renderTriggerOnly?: boolean;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export const AdvancedFiltersAds = ({ 
  filters, 
  onFiltersChange,
  renderTriggerOnly = false,
  isExpanded: controlledExpanded,
  onToggleExpanded
}: AdvancedFiltersAdsProps) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const toggleExpanded = onToggleExpanded || (() => setInternalExpanded(!internalExpanded));

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'rentabilidad') return value !== 'all';
    return value !== '';
  }).length;

  const resetFilters = () => {
    onFiltersChange(defaultAdsFiltersState);
  };

  // Render only the trigger button (for inline placement)
  if (renderTriggerOnly) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleExpanded}
          className="gap-1.5"
        >
          <Filter className="w-4 h-4" />
          Filtros Ads
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-5 min-w-[20px] px-1.5 text-[10px]">
              {activeFiltersCount}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </Button>
        
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={resetFilters}
            className="h-8 w-8 text-muted-foreground"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleExpanded}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filtros Ads
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </Button>
        
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="w-3 h-3" />
            Limpiar
          </Button>
        )}
      </div>

      {isExpanded && (
        <AdsFiltersContent filters={filters} onFiltersChange={onFiltersChange} />
      )}
    </div>
  );
};

// Separate component for the expanded content (full width)
export const AdsFiltersContent = ({ 
  filters, 
  onFiltersChange 
}: { 
  filters: AdsFiltersState; 
  onFiltersChange: (filters: AdsFiltersState) => void;
}) => {
  const updateFilter = <K extends keyof AdsFiltersState>(
    key: K,
    value: AdsFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4 bg-muted/30 rounded-lg border border-border animate-scale-in">
      {/* Rentabilidad */}
      <div className="space-y-2">
        <Label className="text-xs">Rentabilidad</Label>
        <Select
          value={filters.rentabilidad}
          onValueChange={(v) => updateFilter('rentabilidad', v as 'all' | 'profitable' | 'unprofitable')}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="profitable">
              <span className="text-green-600">Rentables</span>
            </SelectItem>
            <SelectItem value="unprofitable">
              <span className="text-red-600">No rentables</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Min Clicks */}
      <div className="space-y-2">
        <Label className="text-xs">Clicks mín.</Label>
        <Input
          type="number"
          value={filters.minClicks}
          onChange={(e) => updateFilter('minClicks', e.target.value)}
          placeholder="0"
          className="h-9"
        />
      </div>

      {/* Max Clicks */}
      <div className="space-y-2">
        <Label className="text-xs">Clicks máx.</Label>
        <Input
          type="number"
          value={filters.maxClicks}
          onChange={(e) => updateFilter('maxClicks', e.target.value)}
          placeholder="∞"
          className="h-9"
        />
      </div>

      {/* Min CPC */}
      <div className="space-y-2">
        <Label className="text-xs">CPC mín. ($)</Label>
        <Input
          type="number"
          step="0.01"
          value={filters.minCpc}
          onChange={(e) => updateFilter('minCpc', e.target.value)}
          placeholder="0"
          className="h-9"
        />
      </div>

      {/* Max CPC */}
      <div className="space-y-2">
        <Label className="text-xs">CPC máx. ($)</Label>
        <Input
          type="number"
          step="0.01"
          value={filters.maxCpc}
          onChange={(e) => updateFilter('maxCpc', e.target.value)}
          placeholder="∞"
          className="h-9"
        />
      </div>

      {/* Min Pedidos */}
      <div className="space-y-2">
        <Label className="text-xs">Pedidos mín.</Label>
        <Input
          type="number"
          value={filters.minPedidos}
          onChange={(e) => updateFilter('minPedidos', e.target.value)}
          placeholder="0"
          className="h-9"
        />
      </div>

      {/* Max Pedidos */}
      <div className="space-y-2">
        <Label className="text-xs">Pedidos máx.</Label>
        <Input
          type="number"
          value={filters.maxPedidos}
          onChange={(e) => updateFilter('maxPedidos', e.target.value)}
          placeholder="∞"
          className="h-9"
        />
      </div>

      {/* Min ACOS */}
      <div className="space-y-2">
        <Label className="text-xs">ACOS mín. (%)</Label>
        <Input
          type="number"
          step="0.1"
          value={filters.minAcos}
          onChange={(e) => updateFilter('minAcos', e.target.value)}
          placeholder="0"
          className="h-9"
        />
      </div>

      {/* Max ACOS */}
      <div className="space-y-2">
        <Label className="text-xs">ACOS máx. (%)</Label>
        <Input
          type="number"
          step="0.1"
          value={filters.maxAcos}
          onChange={(e) => updateFilter('maxAcos', e.target.value)}
          placeholder="∞"
          className="h-9"
        />
      </div>

      {/* Min Beneficio */}
      <div className="space-y-2">
        <Label className="text-xs">Beneficio mín. ($)</Label>
        <Input
          type="number"
          step="0.01"
          value={filters.minBeneficio}
          onChange={(e) => updateFilter('minBeneficio', e.target.value)}
          placeholder="-∞"
          className="h-9"
        />
      </div>

      {/* Max Beneficio */}
      <div className="space-y-2">
        <Label className="text-xs">Beneficio máx. ($)</Label>
        <Input
          type="number"
          step="0.01"
          value={filters.maxBeneficio}
          onChange={(e) => updateFilter('maxBeneficio', e.target.value)}
          placeholder="∞"
          className="h-9"
        />
      </div>
    </div>
  );
};
