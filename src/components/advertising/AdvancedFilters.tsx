import { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  type KeywordStatus,
  KEYWORD_STATUS_OPTIONS,
} from '@/lib/market-score';
import { cn } from '@/lib/utils';

// Market Score range options for multiselect
const MARKET_SCORE_RANGES = [
  { value: '0-40', label: 'Descartar (0-40)', color: 'bg-red-500/20 text-red-600 border-red-500/30' },
  { value: '40-70', label: 'Candidatas (40-70)', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  { value: '70-100', label: 'Listas (70-100)', color: 'bg-green-500/20 text-green-600 border-green-500/30' },
];

export interface AdvancedFiltersState {
  minVolume: string;
  maxVolume: string;
  minCompetition: string;
  maxCompetition: string;
  status: KeywordStatus | 'all';
  campaignName: string;
  marketScoreRanges: string[]; // e.g., ['0-40', '40-70', '70-100']
  has200PlusReviews: boolean;
  hasUnder100Reviews: boolean;
}

interface AdvancedFiltersProps {
  filters: AdvancedFiltersState;
  onFiltersChange: (filters: AdvancedFiltersState) => void;
  renderTriggerOnly?: boolean;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export const AdvancedFilters = ({ 
  filters, 
  onFiltersChange,
  renderTriggerOnly = false,
  isExpanded: controlledExpanded,
  onToggleExpanded
}: AdvancedFiltersProps) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const toggleExpanded = onToggleExpanded || (() => setInternalExpanded(!internalExpanded));

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'minVolume' || key === 'maxVolume' || key === 'minCompetition' || key === 'maxCompetition' || key === 'campaignName') {
      return value !== '';
    }
    if (key === 'marketScoreRanges') {
      return (value as string[]).length > 0;
    }
    if (key === 'has200PlusReviews' || key === 'hasUnder100Reviews') {
      return value === true;
    }
    return value !== 'all';
  }).length;

  const resetFilters = () => {
    onFiltersChange({
      minVolume: '',
      maxVolume: '',
      minCompetition: '',
      maxCompetition: '',
      status: 'all',
      campaignName: '',
      marketScoreRanges: [],
      has200PlusReviews: false,
      hasUnder100Reviews: false,
    });
  };

  const updateFilter = <K extends keyof AdvancedFiltersState>(
    key: K,
    value: AdvancedFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
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
          Filtros
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
          Filtros avanzados
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
        <AdvancedFiltersContent filters={filters} onFiltersChange={onFiltersChange} />
      )}
    </div>
  );
};

// Separate component for the expanded content (full width)
export const AdvancedFiltersContent = ({ 
  filters, 
  onFiltersChange 
}: { 
  filters: AdvancedFiltersState; 
  onFiltersChange: (filters: AdvancedFiltersState) => void;
}) => {
  const updateFilter = <K extends keyof AdvancedFiltersState>(
    key: K,
    value: AdvancedFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleMarketScoreRange = (range: string) => {
    const current = filters.marketScoreRanges || [];
    if (current.includes(range)) {
      updateFilter('marketScoreRanges', current.filter(r => r !== range));
    } else {
      updateFilter('marketScoreRanges', [...current, range]);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 bg-muted/30 rounded-lg border border-border animate-scale-in">
      {/* Status */}
      <div className="space-y-2">
        <Label className="text-xs">Estado validación</Label>
        <Select
          value={filters.status}
          onValueChange={(v) => updateFilter('status', v as KeywordStatus | 'all')}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="all">Todos</SelectItem>
            {KEYWORD_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className={cn('px-1 rounded', opt.color)}>
                  {opt.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Market Score Ranges (multiselect) */}
      <div className="space-y-2 col-span-2">
        <Label className="text-xs">Market Score (rangos)</Label>
        <div className="flex flex-wrap gap-1">
          {MARKET_SCORE_RANGES.map(range => (
            <Badge 
              key={range.value}
              variant="outline"
              className={cn(
                'cursor-pointer transition-all text-xs',
                (filters.marketScoreRanges || []).includes(range.value) 
                  ? range.color 
                  : 'opacity-50 hover:opacity-75'
              )}
              onClick={() => toggleMarketScoreRange(range.value)}
            >
              {range.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Campaign Name */}
      <div className="space-y-2">
        <Label className="text-xs">Nombre campaña</Label>
        <Input
          type="text"
          value={filters.campaignName}
          onChange={(e) => updateFilter('campaignName', e.target.value)}
          placeholder="Buscar..."
          className="h-9"
        />
      </div>

      {/* Min Volume */}
      <div className="space-y-2">
        <Label className="text-xs">Volumen mín.</Label>
        <Input
          type="number"
          value={filters.minVolume}
          onChange={(e) => updateFilter('minVolume', e.target.value)}
          placeholder="0"
          className="h-9"
        />
      </div>

      {/* Max Volume */}
      <div className="space-y-2">
        <Label className="text-xs">Volumen máx.</Label>
        <Input
          type="number"
          value={filters.maxVolume}
          onChange={(e) => updateFilter('maxVolume', e.target.value)}
          placeholder="∞"
          className="h-9"
        />
      </div>

      {/* Min Competition */}
      <div className="space-y-2">
        <Label className="text-xs">Competidores mín.</Label>
        <Input
          type="number"
          value={filters.minCompetition}
          onChange={(e) => updateFilter('minCompetition', e.target.value)}
          placeholder="0"
          className="h-9"
        />
      </div>

      {/* Max Competition */}
      <div className="space-y-2">
        <Label className="text-xs">Competidores máx.</Label>
        <Input
          type="number"
          value={filters.maxCompetition}
          onChange={(e) => updateFilter('maxCompetition', e.target.value)}
          placeholder="∞"
          className="h-9"
        />
      </div>

      {/* +200 Reviews */}
      <div className="space-y-2">
        <Label className="text-xs">Competencia (+200W)</Label>
        <div className="flex items-center gap-2 h-9">
          <Checkbox
            id="has200PlusReviews"
            checked={filters.has200PlusReviews}
            onCheckedChange={(checked) => updateFilter('has200PlusReviews', checked === true)}
          />
          <Label htmlFor="has200PlusReviews" className="text-xs cursor-pointer">
            Libros con +200 reseñas
          </Label>
        </div>
      </div>

      {/* -100 Reviews */}
      <div className="space-y-2">
        <Label className="text-xs">Competencia (-100W)</Label>
        <div className="flex items-center gap-2 h-9">
          <Checkbox
            id="hasUnder100Reviews"
            checked={filters.hasUnder100Reviews}
            onCheckedChange={(checked) => updateFilter('hasUnder100Reviews', checked === true)}
          />
          <Label htmlFor="hasUnder100Reviews" className="text-xs cursor-pointer">
            Libros con -100 reseñas
          </Label>
        </div>
      </div>
    </div>
  );
};