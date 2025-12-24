import { useState } from 'react';
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAIStream } from '@/hooks/useAIStream';
import { AI_CONFIG } from '@/lib/ai-config';
import { 
  type Keyword, 
  type BookInfo,
  type RelevanceLevel,
  type IntentType,
  type KeywordState,
  type CampaignType,
  RELEVANCE_LEVELS,
  INTENT_TYPES,
  KEYWORD_STATES,
} from '@/types/advertising';
import { useToast } from '@/hooks/use-toast';

interface AIAutoClassifierProps {
  keywords: Keyword[];
  selectedIds: string[];
  bookInfo: BookInfo;
  marketplaceId: string;
  onUpdateKeywords: (ids: string[], updates: Partial<Keyword>[]) => void;
}

interface ClassificationResult {
  keyword: string;
  relevance: RelevanceLevel;
  intent: IntentType;
  state: KeywordState;
  campaignTypes: CampaignType[];
  confidence: number;
}

export const AIAutoClassifier = ({
  keywords,
  selectedIds,
  bookInfo,
  marketplaceId,
  onUpdateKeywords,
}: AIAutoClassifierProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<ClassificationResult[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const { isLoading, error, response, streamAI, reset } = useAIStream();

  const keywordsToClassify = selectedIds.length > 0 
    ? keywords.filter(k => selectedIds.includes(k.id))
    : keywords.slice(0, 20); // Limit to 20 if none selected

  const handleClassify = async () => {
    setResults([]);
    reset();

    const keywordList = keywordsToClassify.map(k => ({
      keyword: k.keyword,
      searchVolume: k.searchVolume,
      currentRelevance: k.relevance,
      currentIntent: k.intent,
    }));

    const bookContext = `
Libro: "${bookInfo.title || 'Sin título'}"
${bookInfo.subtitle ? `Subtítulo: "${bookInfo.subtitle}"` : ''}
${bookInfo.description ? `Descripción: "${bookInfo.description}"` : ''}
${bookInfo.categories?.length ? `Categorías: ${bookInfo.categories.join(', ')}` : ''}
    `.trim();

    await streamAI(
      {
        action: AI_CONFIG.actions.CLASSIFY,
        messages: [
          {
            role: 'user',
            content: `Clasifica las siguientes keywords para publicidad de Amazon del libro descrito.

${bookContext}

Keywords a clasificar:
${keywordList.map((k, i) => `${i + 1}. "${k.keyword}" (vol: ${k.searchVolume})`).join('\n')}

Para cada keyword, proporciona:
- relevance: "very-high" | "high" | "low" | "none" (relevancia respecto al libro)
- intent: "purchase" | "research" | "competition" | "problem" (intención del buscador)
- state: "pending" | "tested-works" | "low-competition" | "discarded" (estado sugerido)
- campaignTypes: array de ["SP", "SB", "SBV", "SD"] (tipos de campaña recomendados)
- confidence: 0-100 (confianza en la clasificación)

Responde SOLO con un JSON array válido.`,
          },
        ],
        context: {
          bookInfo,
          keywords: keywordList,
          marketplace: marketplaceId,
        },
      },
      {
        onComplete: () => {
          // Parse will happen on response change
        },
        onError: (err) => {
          toast({
            title: 'Error al clasificar',
            description: err.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  // Parse response when complete
  const parseResults = () => {
    if (!response) return;
    
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as ClassificationResult[];
        setResults(parsed);
      }
    } catch (e) {
      console.error('Error parsing classification results:', e);
    }
  };

  // Effect to parse when response changes and loading stops
  if (!isLoading && response && results.length === 0) {
    parseResults();
  }

  const handleApplyResults = () => {
    if (results.length === 0) return;
    
    setIsApplying(true);
    
    const updates: { id: string; updates: Partial<Keyword> }[] = [];
    
    results.forEach((result) => {
      const matchingKeyword = keywordsToClassify.find(
        k => k.keyword.toLowerCase() === result.keyword.toLowerCase()
      );
      
      if (matchingKeyword) {
        updates.push({
          id: matchingKeyword.id,
          updates: {
            relevance: result.relevance,
            intent: result.intent,
            state: result.state,
            campaignTypes: result.campaignTypes,
          },
        });
      }
    });

    // Apply updates
    updates.forEach(({ id, updates: u }) => {
      onUpdateKeywords([id], [u]);
    });

    setIsApplying(false);
    setIsOpen(false);
    toast({
      title: 'Clasificación aplicada',
      description: `${updates.length} keywords actualizadas`,
    });
  };

  const getRelevanceLabel = (level: RelevanceLevel) => 
    RELEVANCE_LEVELS.find(r => r.value === level)?.label || level;

  const getIntentLabel = (intent: IntentType) =>
    INTENT_TYPES.find(i => i.value === intent)?.label || intent;

  const getStateLabel = (state: KeywordState) =>
    KEYWORD_STATES.find(s => s.value === state)?.label || state;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Sparkles className="w-4 h-4" />
        Auto-clasificar IA
        {selectedIds.length > 0 && (
          <Badge variant="secondary" className="ml-1">{selectedIds.length}</Badge>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Auto-clasificación con IA
            </DialogTitle>
            <DialogDescription>
              La IA analizará {keywordsToClassify.length} keywords y sugerirá clasificaciones 
              basadas en el contexto del libro.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Keywords to classify */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium mb-2">Keywords a clasificar:</p>
              <div className="flex flex-wrap gap-1">
                {keywordsToClassify.slice(0, 10).map((k) => (
                  <Badge key={k.id} variant="outline" className="text-xs">
                    {k.keyword}
                  </Badge>
                ))}
                {keywordsToClassify.length > 10 && (
                  <Badge variant="secondary" className="text-xs">
                    +{keywordsToClassify.length - 10} más
                  </Badge>
                )}
              </div>
            </div>

            {/* Start button or progress */}
            {!isLoading && results.length === 0 && (
              <Button onClick={handleClassify} className="w-full gap-2">
                <Sparkles className="w-4 h-4" />
                Iniciar clasificación
              </Button>
            )}

            {isLoading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analizando keywords...
                </div>
                <Progress value={undefined} className="h-2" />
              </div>
            )}

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border border-border bg-muted/20 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{result.keyword}</span>
                        <Badge variant="outline" className="text-xs">
                          {result.confidence}% confianza
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300">
                          {getRelevanceLabel(result.relevance)}
                        </Badge>
                        <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300">
                          {getIntentLabel(result.intent)}
                        </Badge>
                        <Badge className="bg-green-500/20 text-green-700 dark:text-green-300">
                          {getStateLabel(result.state)}
                        </Badge>
                        {result.campaignTypes.map((type) => (
                          <Badge key={type} variant="secondary">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            {results.length > 0 && (
              <Button onClick={handleApplyResults} disabled={isApplying} className="gap-2">
                {isApplying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Aplicar clasificación ({results.length})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
