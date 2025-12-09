import { useState, useMemo } from 'react';
import { Lightbulb, Plus, X, RefreshCw, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateSuggestions, type Keyword, type CampaignType } from '@/types/advertising';
import { cn } from '@/lib/utils';

interface SuggestionsPanelProps {
  keywords: Keyword[];
  onAddKeyword: (keyword: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SuggestionsPanel = ({
  keywords,
  onAddKeyword,
  isOpen,
  onClose,
}: SuggestionsPanelProps) => {
  const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(new Set());
  
  const suggestions = useMemo(() => {
    if (keywords.length === 0) return [];
    
    // Get unique suggestions from top keywords
    const allSuggestions = new Set<string>();
    const existingKeywords = new Set(keywords.map(k => k.keyword.toLowerCase()));
    
    // Take suggestions from top 5 keywords by volume
    const topKeywords = [...keywords]
      .sort((a, b) => b.searchVolume - a.searchVolume)
      .slice(0, 5);
    
    topKeywords.forEach(keyword => {
      generateSuggestions(keyword.keyword).forEach(s => {
        const normalized = s.toLowerCase();
        if (!existingKeywords.has(normalized) && !allSuggestions.has(normalized)) {
          allSuggestions.add(s);
        }
      });
    });
    
    return Array.from(allSuggestions).slice(0, 20);
  }, [keywords]);

  const handleAdd = (suggestion: string) => {
    onAddKeyword(suggestion);
    setAddedSuggestions(prev => new Set(prev).add(suggestion.toLowerCase()));
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onClose()}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-40 gap-2 bg-card shadow-lg"
      >
        <Lightbulb className="w-4 h-4 text-yellow-500" />
        Sugerencias
        <ChevronRight className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border shadow-2xl z-50 animate-slide-in-right">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          <h3 className="font-heading font-semibold">Sugerencias</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="p-4 border-b border-border bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Sugerencias basadas en tus {keywords.length} keywords actuales. Haz clic para añadir.
        </p>
      </div>
      
      <ScrollArea className="h-[calc(100%-140px)]">
        <div className="p-4 space-y-2">
          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Añade keywords para ver sugerencias</p>
            </div>
          ) : (
            suggestions.map((suggestion, index) => {
              const isAdded = addedSuggestions.has(suggestion.toLowerCase());
              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors",
                    isAdded && "opacity-50 bg-muted/30"
                  )}
                >
                  <span className="text-sm font-medium truncate flex-1 mr-2">{suggestion}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAdd(suggestion)}
                    disabled={isAdded}
                    className="shrink-0"
                  >
                    {isAdded ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 text-xs">
                        Añadida
                      </Badge>
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
