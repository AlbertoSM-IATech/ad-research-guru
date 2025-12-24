import { useState } from 'react';
import { Search, X, Filter, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InfoTooltip } from './InfoTooltip';
import { cn } from '@/lib/utils';

export type FilterType = 'all' | 'keywords' | 'asins' | 'categories';
export type SortOption = 'relevance' | 'alphabetical' | 'recent';

interface GlobalSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  resultsCount: {
    keywords: number;
    asins: number;
    categories: number;
  };
  compact?: boolean;
}

export const GlobalSearch = ({
  searchTerm,
  onSearchChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
  resultsCount,
  compact = false,
}: GlobalSearchProps) => {
  const [showOptions, setShowOptions] = useState(false);

  const totalResults = resultsCount.keywords + resultsCount.asins + resultsCount.categories;

  const clearSearch = () => {
    onSearchChange('');
  };

  // Compact mode for header integration
  if (compact) {
    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-8 w-[200px] h-9"
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-heading font-semibold text-lg">Búsqueda Global</h3>
        <InfoTooltip content="Busca en todas las keywords, ASIN y categorías de este mercado simultáneamente" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar keywords, ASIN, categorías..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Button
          variant="outline"
          onClick={() => setShowOptions(!showOptions)}
          className={cn('gap-2 shrink-0', showOptions && 'bg-muted')}
        >
          <Filter className="w-4 h-4" />
          Opciones
          <ChevronDown className={cn('w-3 h-3 transition-transform', showOptions && 'rotate-180')} />
        </Button>
      </div>

      {/* Results summary when searching */}
      {searchTerm && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-muted-foreground">Resultados:</span>
          <span className={cn(
            'px-2 py-0.5 rounded-full',
            filter === 'all' || filter === 'keywords' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
          )}>
            {resultsCount.keywords} keywords
          </span>
          <span className={cn(
            'px-2 py-0.5 rounded-full',
            filter === 'all' || filter === 'asins' ? 'bg-accent/10 text-accent' : 'text-muted-foreground'
          )}>
            {resultsCount.asins} ASIN
          </span>
          <span className={cn(
            'px-2 py-0.5 rounded-full',
            filter === 'all' || filter === 'categories' ? 'bg-green-500/10 text-green-600' : 'text-muted-foreground'
          )}>
            {resultsCount.categories} categorías
          </span>
        </div>
      )}

      {showOptions && (
        <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg animate-scale-in">
          <div className="space-y-1">
            <label className="text-sm font-medium">Filtrar por tipo</label>
            <Select value={filter} onValueChange={(v) => onFilterChange(v as FilterType)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="keywords">Solo Keywords</SelectItem>
                <SelectItem value="asins">Solo ASIN</SelectItem>
                <SelectItem value="categories">Solo Categorías</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Ordenar por</label>
            <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="relevance">Relevancia</SelectItem>
                <SelectItem value="alphabetical">Alfabético</SelectItem>
                <SelectItem value="recent">Más recientes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(filter !== 'all' || sort !== 'relevance') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onFilterChange('all');
                onSortChange('relevance');
              }}
              className="self-end"
            >
              <X className="w-4 h-4 mr-1" />
              Restablecer
            </Button>
          )}
        </div>
      )}
    </div>
  );
};