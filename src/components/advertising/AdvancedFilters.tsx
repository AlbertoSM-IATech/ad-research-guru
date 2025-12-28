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
import {
  type CampaignType,
  type CompetitionLevel,
  type RelevanceLevel,
  type IntentType,
  type KeywordState,
  CAMPAIGN_TYPES,
  RELEVANCE_LEVELS,
  INTENT_TYPES,
  KEYWORD_STATES,
} from '@/types/advertising';
import { 
  type KeywordPurpose, 
  type KeywordStatus,
  KEYWORD_PURPOSE_OPTIONS,
  KEYWORD_STATUS_OPTIONS,
} from '@/lib/market-score';
import { cn } from '@/lib/utils';

export interface AdvancedFiltersState {
  competition: CompetitionLevel | 'all';
  campaignType: CampaignType | 'all';
  minVolume: string;
  maxVolume: string;
  maxCompetition: string;
  relevance: RelevanceLevel | 'all';
  intent: IntentType | 'all';
  state: KeywordState | 'all';
  purpose: KeywordPurpose | 'all';
  status: KeywordStatus | 'all';
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
    if (key === 'minVolume' || key === 'maxVolume' || key === 'maxCompetition') {
      return value !== '';
    }
    return value !== 'all';
  }).length;

  const resetFilters = () => {
    onFiltersChange({
      competition: 'all',
      campaignType: 'all',
      minVolume: '',
      maxVolume: '',
      maxCompetition: '',
      relevance: 'all',
      intent: 'all',
      state: 'all',
      purpose: 'all',
      status: 'all',
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

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 bg-muted/30 rounded-lg border border-border animate-scale-in">
      {/* Purpose */}
      <div className="space-y-2">
        <Label className="text-xs">Propósito</Label>
        <Select
          value={filters.purpose}
          onValueChange={(v) => updateFilter('purpose', v as KeywordPurpose | 'all')}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="all">Todos</SelectItem>
            {KEYWORD_PURPOSE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

      {/* Competition */}
      <div className="space-y-2">
        <Label className="text-xs">Competencia</Label>
        <Select
          value={filters.competition}
          onValueChange={(v) => updateFilter('competition', v as CompetitionLevel | 'all')}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campaign Type */}
      <div className="space-y-2">
        <Label className="text-xs">Tipo campaña</Label>
        <Select
          value={filters.campaignType}
          onValueChange={(v) => updateFilter('campaignType', v as CampaignType | 'all')}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="all">Todos</SelectItem>
            {CAMPAIGN_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Relevance */}
      <div className="space-y-2">
        <Label className="text-xs">Relevancia</Label>
        <Select
          value={filters.relevance}
          onValueChange={(v) => updateFilter('relevance', v as RelevanceLevel | 'all')}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="all">Todas</SelectItem>
            {RELEVANCE_LEVELS.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                <span className="flex items-center gap-1">
                  <span>{level.icon}</span>
                  {level.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Intent */}
      <div className="space-y-2">
        <Label className="text-xs">Intención</Label>
        <Select
          value={filters.intent}
          onValueChange={(v) => updateFilter('intent', v as IntentType | 'all')}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="all">Todas</SelectItem>
            {INTENT_TYPES.map((intent) => (
              <SelectItem key={intent.value} value={intent.value}>
                {intent.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* State (legacy) */}
      <div className="space-y-2">
        <Label className="text-xs">Estado (legacy)</Label>
        <Select
          value={filters.state}
          onValueChange={(v) => updateFilter('state', v as KeywordState | 'all')}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="all">Todos</SelectItem>
            {KEYWORD_STATES.map((state) => (
              <SelectItem key={state.value} value={state.value}>
                <span className="flex items-center gap-1">
                  <span>{state.icon}</span>
                  {state.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
    </div>
  );
};