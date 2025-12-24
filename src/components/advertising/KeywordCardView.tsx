import { useState } from 'react';
import { MoreVertical, Trash2, History, TrendingUp, TrendingDown, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InlineSelectBadge } from './InlineSelectBadge';
import { InlineCampaignTypeSelect } from './InlineCampaignTypeSelect';
import { 
  type Keyword, 
  type RelevanceLevel, 
  type KeywordState,
  RELEVANCE_LEVELS, 
  KEYWORD_STATES,
  INTENT_TYPES,
} from '@/types/advertising';

interface KeywordCardViewProps {
  keywords: Keyword[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Keyword>) => void;
  onDelete: (id: string) => void;
  onViewHistory: (keyword: Keyword) => void;
}

const getCompetitionBadgeClass = (level: string) => {
  switch (level) {
    case 'low': return 'bg-green-500/10 text-green-600 border-green-500/30';
    case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
    case 'high': return 'bg-red-500/10 text-red-600 border-red-500/30';
    default: return '';
  }
};

const getCompetitionLabel = (level: string) => {
  switch (level) {
    case 'low': return 'Baja';
    case 'medium': return 'Media';
    case 'high': return 'Alta';
    default: return level;
  }
};

export const KeywordCardView = ({
  keywords,
  selectedIds,
  onToggleSelect,
  onUpdate,
  onDelete,
  onViewHistory,
}: KeywordCardViewProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {keywords.map((keyword) => {
        const relevanceInfo = RELEVANCE_LEVELS.find(r => r.value === keyword.relevance);
        const stateInfo = KEYWORD_STATES.find(s => s.value === keyword.state);
        const intentInfo = INTENT_TYPES.find(i => i.value === keyword.intent);
        
        // Check for recent volume change
        const hasVolumeAlert = keyword.history && keyword.history.length > 0 && (() => {
          const volumeChanges = keyword.history.filter(h => h.field === 'searchVolume');
          if (volumeChanges.length === 0) return false;
          const lastChange = volumeChanges[volumeChanges.length - 1];
          const oldVal = Number(lastChange.oldValue) || 0;
          const newVal = Number(lastChange.newValue) || 0;
          if (oldVal === 0) return newVal > 0;
          const changePercent = Math.abs((newVal - oldVal) / oldVal) * 100;
          return changePercent >= 30;
        })();

        return (
          <Card 
            key={keyword.id}
            className={`group hover:shadow-lg transition-all duration-200 ${
              selectedIds.has(keyword.id) ? 'ring-2 ring-primary border-primary' : ''
            }`}
          >
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.has(keyword.id)}
                    onCheckedChange={() => onToggleSelect(keyword.id)}
                  />
                  {relevanceInfo && (
                    <span className="text-lg" title={relevanceInfo.label}>
                      {relevanceInfo.icon}
                    </span>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border-border">
                    <DropdownMenuItem onClick={() => onViewHistory(keyword)}>
                      <History className="w-4 h-4 mr-2" />
                      Ver historial
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(keyword.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Keyword */}
              <h4 className="font-medium text-sm mb-3 line-clamp-2 min-h-[40px]">
                {keyword.keyword}
              </h4>

              {/* Stats Row */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-1">
                  {hasVolumeAlert && (
                    <TrendingUp className="w-3 h-3 text-yellow-500" />
                  )}
                  <span className="text-lg font-bold">{keyword.searchVolume.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">vol.</span>
                </div>
                <Badge variant="outline" className={`text-xs ${getCompetitionBadgeClass(keyword.competitionLevel)}`}>
                  {getCompetitionLabel(keyword.competitionLevel)}
                </Badge>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {stateInfo && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${stateInfo.color}`}
                  >
                    {stateInfo.icon} {stateInfo.label}
                  </Badge>
                )}
                {intentInfo && (
                  <Badge variant="secondary" className="text-xs">
                    {intentInfo.label}
                  </Badge>
                )}
              </div>

              {/* Campaign Types */}
              <div className="pt-2 border-t border-border">
                <InlineCampaignTypeSelect
                  value={keyword.campaignTypes}
                  onChange={(types) => onUpdate(keyword.id, { campaignTypes: types })}
                />
              </div>

              {/* Notes */}
              {keyword.notes && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {keyword.notes}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
