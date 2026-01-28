import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { KEYWORD_STATUS_OPTIONS, type KeywordStatus } from '@/lib/market-score';

interface BulkEditorialStatusToolbarProps {
  selectedCount: number;
  onChangeStatus: (status: KeywordStatus) => void;
}

export function BulkEditorialStatusToolbar({
  selectedCount,
  onChangeStatus,
}: BulkEditorialStatusToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
      <Badge variant="secondary" className="font-medium">
        {selectedCount} seleccionadas
      </Badge>

      <div className="h-4 w-px bg-border mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            Cambiar estado
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-popover border-border z-50">
          {KEYWORD_STATUS_OPTIONS.map((opt) => (
            <DropdownMenuItem key={opt.value} onClick={() => onChangeStatus(opt.value)}>
              <span className="font-medium">{opt.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
