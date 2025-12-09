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
}

interface AdvancedFiltersProps {
  filters: AdvancedFiltersState;
  onFiltersChange: (filters: AdvancedFiltersState) => void;
}

export const AdvancedFilters = ({ filters, onFiltersChange }: AdvancedFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

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
    });
  };

  const updateFilter = <K extends keyof AdvancedFiltersState>(
    key: K,
    value: AdvancedFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border border-border animate-scale-in">
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

          {/* State */}
          <div className="space-y-2">
            <Label className="text-xs">Estado</Label>
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
            <Label className="text-xs">Competencia máx.</Label>
            <Input
              type="number"
              value={filters.maxCompetition}
              onChange={(e) => updateFilter('maxCompetition', e.target.value)}
              placeholder="100"
              min={0}
              max={100}
              className="h-9"
            />
          </div>
        </div>
      )}
    </div>
  );
};
