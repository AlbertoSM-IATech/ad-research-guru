import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { QuickFilter, QuickFilterOption } from '@/lib/keyword-filters';
import { QUICK_FILTER_OPTIONS } from '@/lib/keyword-filters';

interface QuickFiltersBarProps {
  activeFilter: QuickFilter;
  onFilterChange: (filter: QuickFilter) => void;
  counts: {
    all: number;
    'ready-for-ads': number;
    candidates: number;
    discard: number;
  };
}

export const QuickFiltersBar = ({ 
  activeFilter, 
  onFilterChange, 
  counts 
}: QuickFiltersBarProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground mr-1">Filtro rápido:</span>
      {QUICK_FILTER_OPTIONS.map((option) => {
        const isActive = activeFilter === option.value;
        const count = counts[option.value];
        
        return (
          <button
            key={option.value}
            onClick={() => onFilterChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
              'border hover:shadow-sm',
              isActive
                ? option.color + ' border-current'
                : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
            )}
            title={option.description}
          >
            {option.label}
            <Badge 
              variant="secondary" 
              className={cn(
                'h-5 min-w-[20px] px-1.5 text-[10px] font-semibold',
                isActive ? 'bg-background/50' : ''
              )}
            >
              {count}
            </Badge>
          </button>
        );
      })}
    </div>
  );
};
