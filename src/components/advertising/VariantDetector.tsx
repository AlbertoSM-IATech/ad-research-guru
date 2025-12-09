import { useState, useMemo } from 'react';
import { GitMerge, Unlink, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { detectVariants, type Keyword } from '@/types/advertising';
import { cn } from '@/lib/utils';

interface VariantDetectorProps {
  keywords: Keyword[];
  onGroupVariants: (groupId: string, keywordIds: string[]) => void;
  onSeparateVariants: (keywordIds: string[]) => void;
}

export const VariantDetector = ({
  keywords,
  onGroupVariants,
  onSeparateVariants,
}: VariantDetectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  
  const variantGroups = useMemo(() => {
    const keywordTexts = keywords.map(k => k.keyword);
    const groups = detectVariants(keywordTexts);
    
    // Map back to keyword objects
    const result: Array<{ groupId: string; keywords: Keyword[] }> = [];
    
    groups.forEach((variants, groupId) => {
      const matchingKeywords = keywords.filter(k => 
        variants.some(v => v.toLowerCase() === k.keyword.toLowerCase())
      );
      if (matchingKeywords.length > 1) {
        result.push({ groupId, keywords: matchingKeywords });
      }
    });
    
    return result;
  }, [keywords]);

  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleGroupSelected = () => {
    selectedGroups.forEach(groupId => {
      const group = variantGroups.find(g => g.groupId === groupId);
      if (group) {
        onGroupVariants(groupId, group.keywords.map(k => k.id));
      }
    });
    setSelectedGroups(new Set());
    setIsOpen(false);
  };

  if (variantGroups.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <GitMerge className="w-4 h-4" />
        Variantes detectadas
        <Badge variant="secondary" className="ml-1">{variantGroups.length}</Badge>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <GitMerge className="w-5 h-5" />
              Detección de Variantes
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Se han detectado {variantGroups.length} grupos de keywords que podrían ser variantes. 
              Puedes agruparlas para analizarlas juntas.
            </p>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {variantGroups.map((group) => (
                  <div
                    key={group.groupId}
                    className={cn(
                      "p-4 rounded-lg border border-border hover:border-primary/50 transition-colors",
                      selectedGroups.has(group.groupId) && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Checkbox
                        checked={selectedGroups.has(group.groupId)}
                        onCheckedChange={() => toggleGroup(group.groupId)}
                      />
                      <span className="text-sm font-medium">
                        Grupo de {group.keywords.length} variantes
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 ml-7">
                      {group.keywords.map((keyword) => (
                        <Badge
                          key={keyword.id}
                          variant="outline"
                          className="bg-muted/50"
                        >
                          {keyword.keyword}
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({keyword.searchVolume.toLocaleString()})
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cerrar
            </Button>
            <Button
              onClick={handleGroupSelected}
              disabled={selectedGroups.size === 0}
              className="gap-2"
            >
              <GitMerge className="w-4 h-4" />
              Agrupar seleccionados ({selectedGroups.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
