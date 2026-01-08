import { useState } from 'react';
import { Filter, ArrowUpDown } from 'lucide-react';
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
import { type TargetASIN } from '@/types/advertising';

export interface CompetitiveFiltersState {
  minBsr: string;
  maxBsr: string;
  threatLevel: 'all' | 'high' | 'medium' | 'low';
  sortBy: 'threatScore' | 'bsr' | 'sharedKeywords';
  sortOrder: 'asc' | 'desc';
}

export const defaultCompetitiveFiltersState: CompetitiveFiltersState = {
  minBsr: '',
  maxBsr: '',
  threatLevel: 'all',
  sortBy: 'threatScore',
  sortOrder: 'desc',
};

interface CompetitiveAnalysisFiltersProps {
  filters: CompetitiveFiltersState;
  onFiltersChange: (filters: CompetitiveFiltersState) => void;
}

export const CompetitiveAnalysisFilters = ({
  filters,
  onFiltersChange,
}: CompetitiveAnalysisFiltersProps) => {
  const updateFilter = <K extends keyof CompetitiveFiltersState>(
    key: K,
    value: CompetitiveFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange(defaultCompetitiveFiltersState);
  };

  const hasFilters = 
    filters.minBsr !== '' || 
    filters.maxBsr !== '' || 
    filters.threatLevel !== 'all';

  return (
    <div className="flex flex-wrap items-end gap-3 p-3 bg-muted/30 rounded-lg border border-border">
      {/* BSR Range */}
      <div className="space-y-1">
        <Label className="text-xs">BSR mín.</Label>
        <Input
          type="number"
          value={filters.minBsr}
          onChange={(e) => updateFilter('minBsr', e.target.value)}
          placeholder="0"
          className="h-8 w-24"
        />
      </div>
      
      <div className="space-y-1">
        <Label className="text-xs">BSR máx.</Label>
        <Input
          type="number"
          value={filters.maxBsr}
          onChange={(e) => updateFilter('maxBsr', e.target.value)}
          placeholder="∞"
          className="h-8 w-24"
        />
      </div>

      {/* Threat Level */}
      <div className="space-y-1">
        <Label className="text-xs">Nivel de amenaza</Label>
        <Select
          value={filters.threatLevel}
          onValueChange={(v) => updateFilter('threatLevel', v as CompetitiveFiltersState['threatLevel'])}
        >
          <SelectTrigger className="h-8 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="high">
              <span className="text-red-600">Alta (70+)</span>
            </SelectItem>
            <SelectItem value="medium">
              <span className="text-yellow-600">Media (40-69)</span>
            </SelectItem>
            <SelectItem value="low">
              <span className="text-green-600">Baja (&lt;40)</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-border" />

      {/* Sort By */}
      <div className="space-y-1">
        <Label className="text-xs">Ordenar por</Label>
        <Select
          value={filters.sortBy}
          onValueChange={(v) => updateFilter('sortBy', v as CompetitiveFiltersState['sortBy'])}
        >
          <SelectTrigger className="h-8 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="threatScore">Amenaza</SelectItem>
            <SelectItem value="bsr">BSR</SelectItem>
            <SelectItem value="sharedKeywords">Keywords compartidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sort Order */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1"
        onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
      >
        <ArrowUpDown className="w-3 h-3" />
        {filters.sortOrder === 'desc' ? 'Mayor' : 'Menor'}
      </Button>

      {/* Reset */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground"
          onClick={resetFilters}
        >
          Limpiar
        </Button>
      )}
    </div>
  );
};

// Helper function to filter and sort ASINs
export function applyCompetitiveFilters(
  asins: TargetASIN[],
  filters: CompetitiveFiltersState
): TargetASIN[] {
  let result = [...asins];

  // Filter by BSR
  if (filters.minBsr) {
    const min = parseInt(filters.minBsr);
    result = result.filter(a => (a.bsr || 0) >= min);
  }
  if (filters.maxBsr) {
    const max = parseInt(filters.maxBsr);
    result = result.filter(a => (a.bsr || Infinity) <= max);
  }

  // Filter by threat level
  if (filters.threatLevel !== 'all') {
    result = result.filter(a => {
      const score = a.threatScore || 0;
      switch (filters.threatLevel) {
        case 'high': return score >= 70;
        case 'medium': return score >= 40 && score < 70;
        case 'low': return score < 40;
        default: return true;
      }
    });
  }

  // Sort
  result.sort((a, b) => {
    let aVal: number, bVal: number;
    switch (filters.sortBy) {
      case 'threatScore':
        aVal = a.threatScore || 0;
        bVal = b.threatScore || 0;
        break;
      case 'bsr':
        aVal = a.bsr || Infinity;
        bVal = b.bsr || Infinity;
        break;
      case 'sharedKeywords':
        aVal = a.sharedKeywords || 0;
        bVal = b.sharedKeywords || 0;
        break;
      default:
        aVal = 0;
        bVal = 0;
    }
    return filters.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  });

  return result;
}
