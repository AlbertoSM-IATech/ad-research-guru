import { useState } from 'react';
import { 
  Settings2, 
  Tags, 
  Target, 
  Trash2, 
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  type CampaignType,
  type KeywordState,
  type RelevanceLevel,
  CAMPAIGN_TYPES,
  KEYWORD_STATES,
  RELEVANCE_LEVELS,
} from '@/types/advertising';
import { useToast } from '@/hooks/use-toast';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onChangeCampaignType: (types: CampaignType[]) => void;
  onChangeState: (state: KeywordState) => void;
  onChangeRelevance: (relevance: RelevanceLevel) => void;
  onDelete: () => void;
}

export const BulkActionsToolbar = ({
  selectedCount,
  onChangeCampaignType,
  onChangeState,
  onChangeRelevance,
  onDelete,
}: BulkActionsToolbarProps) => {
  const { toast } = useToast();

  if (selectedCount === 0) return null;

  const handleAction = (action: string, callback: () => void) => {
    callback();
    toast({
      title: 'Acción aplicada',
      description: `${action} aplicado a ${selectedCount} keywords`,
    });
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20 animate-scale-in">
      <Badge variant="secondary" className="font-medium">
        {selectedCount} seleccionadas
      </Badge>
      
      <div className="h-4 w-px bg-border mx-2" />
      
      {/* Campaign Type */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Target className="w-4 h-4" />
            Tipo campaña
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-popover border-border z-50">
          {CAMPAIGN_TYPES.map((type) => (
            <DropdownMenuItem
              key={type.value}
              onClick={() => handleAction(`Tipo ${type.value}`, () => onChangeCampaignType([type.value]))}
            >
              <span className="font-medium">{type.value}</span>
              <span className="ml-2 text-xs text-muted-foreground">{type.label}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleAction('Todos los tipos', () => onChangeCampaignType(['SP', 'SB', 'SBV', 'SD']))}
          >
            Todos los tipos
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* State */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Tags className="w-4 h-4" />
            Estado
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-popover border-border z-50">
          {KEYWORD_STATES.map((state) => (
            <DropdownMenuItem
              key={state.value}
              onClick={() => handleAction(state.label, () => onChangeState(state.value))}
            >
              <span className="mr-2">{state.icon}</span>
              {state.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Relevance */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Zap className="w-4 h-4" />
            Relevancia
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-popover border-border z-50">
          {RELEVANCE_LEVELS.map((level) => (
            <DropdownMenuItem
              key={level.value}
              onClick={() => handleAction(level.label, () => onChangeRelevance(level.value))}
            >
              <span className="mr-2">{level.icon}</span>
              {level.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-4 w-px bg-border mx-2" />

      {/* Delete */}
      <Button
        variant="destructive"
        size="sm"
        onClick={() => handleAction('Eliminación', onDelete)}
        className="gap-2"
      >
        <Trash2 className="w-4 h-4" />
        Eliminar
      </Button>
    </div>
  );
};
