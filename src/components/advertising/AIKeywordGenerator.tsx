import { useState } from "react";
import { Sparkles, Plus, X, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useAIStream } from "@/hooks/useAIStream";
import { AI_CONFIG } from "@/lib/ai-config";
import { useToast } from "@/hooks/use-toast";
import type { BookInfo, Keyword } from "@/types/advertising";
import { createKeywordDefaults } from "@/lib/keyword-helpers";

interface AIKeywordGeneratorProps {
  bookInfo: BookInfo;
  marketplaceId: string;
  existingKeywords: string[];
  onAddKeywords: (keywords: Array<Omit<Keyword, "id" | "createdAt" | "updatedAt">>) => void;
}

interface GeneratedKeyword {
  keyword: string;
  estimatedVolume: "high" | "medium" | "low";
  intent: string;
  relevance: "high" | "medium" | "low";
  reason: string;
  selected: boolean;
}

export function AIKeywordGenerator({
  bookInfo,
  marketplaceId,
  existingKeywords,
  onAddKeywords,
}: AIKeywordGeneratorProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [additionalContext, setAdditionalContext] = useState("");
  const [generatedKeywords, setGeneratedKeywords] = useState<GeneratedKeyword[]>([]);
  const { isLoading, error, response, streamAI, cancel, reset } = useAIStream();

  const handleGenerate = async () => {
    setGeneratedKeywords([]);
    reset();

    const existingKeywordsList = existingKeywords.join(", ");

    await streamAI(
      {
        action: AI_CONFIG.actions.GENERATE_KEYWORDS,
        messages: [
          {
            role: "user",
            content: `Genera 15-20 keywords relevantes para este libro.
            
${additionalContext ? `Contexto adicional: ${additionalContext}` : ""}

Keywords existentes a evitar duplicar: ${existingKeywordsList || "Ninguna"}

Recuerda generar keywords en el idioma apropiado para el marketplace.`,
          },
        ],
        context: {
          bookInfo: {
            title: bookInfo.title,
            subtitle: bookInfo.subtitle,
            description: bookInfo.description,
            categories: bookInfo.categories,
          },
          marketplace: marketplaceId,
        },
      },
      {
        onComplete: () => {
          // Parse the response
          try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.keywords && Array.isArray(parsed.keywords)) {
                setGeneratedKeywords(
                  parsed.keywords.map((k: Omit<GeneratedKeyword, "selected">) => ({
                    ...k,
                    selected: true,
                  }))
                );
              }
            }
          } catch (e) {
            console.error("Error parsing AI response:", e);
          }
        },
        onError: (err) => {
          toast({
            title: "Error al generar keywords",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  // Re-parse when response changes
  const parseResponse = () => {
    if (!response) return;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.keywords && Array.isArray(parsed.keywords)) {
          setGeneratedKeywords(
            parsed.keywords.map((k: Omit<GeneratedKeyword, "selected">) => ({
              ...k,
              selected: true,
            }))
          );
        }
      }
    } catch {
      // Still streaming, incomplete JSON
    }
  };

  const toggleKeyword = (index: number) => {
    setGeneratedKeywords((prev) =>
      prev.map((k, i) => (i === index ? { ...k, selected: !k.selected } : k))
    );
  };

  const selectAll = () => {
    setGeneratedKeywords((prev) => prev.map((k) => ({ ...k, selected: true })));
  };

  const deselectAll = () => {
    setGeneratedKeywords((prev) => prev.map((k) => ({ ...k, selected: false })));
  };

  const handleAddSelected = () => {
    const selected = generatedKeywords.filter((k) => k.selected);
    if (selected.length === 0) {
      toast({ title: "Selecciona al menos una keyword" });
      return;
    }

    const newKeywords = selected.map((k) => createKeywordDefaults({
      keyword: k.keyword,
      searchVolume: k.estimatedVolume === "high" ? 5000 : k.estimatedVolume === "medium" ? 1000 : 100,
      competitionLevel: k.estimatedVolume === "high" ? "high" : k.estimatedVolume === "medium" ? "medium" : "low",
      campaignTypes: ["SP"],
      notes: `[IA] ${k.reason}`,
      marketplaceId,
      relevance: k.relevance === "high" ? "very-high" : k.relevance === "medium" ? "high" : "low",
      intent: k.intent === "transactional" ? "purchase" : "research",
      state: "pending",
    }));

    onAddKeywords(newKeywords);
    toast({ title: `${selected.length} keywords añadidas` });
    setIsOpen(false);
    setGeneratedKeywords([]);
    setAdditionalContext("");
    reset();
  };

  const selectedCount = generatedKeywords.filter((k) => k.selected).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="w-4 h-4" />
          Generar con IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Generador de Keywords con IA
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Book Info Summary */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium">{bookInfo.title || "Sin título"}</p>
            {bookInfo.subtitle && (
              <p className="text-muted-foreground">{bookInfo.subtitle}</p>
            )}
            {bookInfo.categories && bookInfo.categories.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {bookInfo.categories.map((cat, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {cat}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Additional Context */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Contexto adicional (opcional)</label>
            <Textarea
              placeholder="Añade información extra: público objetivo, temas específicos, competencia..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={2}
              disabled={isLoading}
            />
          </div>

          {/* Generate Button */}
          {generatedKeywords.length === 0 && (
            <Button
              onClick={handleGenerate}
              disabled={isLoading || !bookInfo.title}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generar Keywords
                </>
              )}
            </Button>
          )}

          {/* Loading State */}
          {isLoading && response && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm font-medium">Generando keywords...</span>
                <Button variant="ghost" size="sm" onClick={cancel}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap max-h-32 overflow-auto">
                {response.slice(0, 500)}...
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="mt-2"
                onClick={parseResponse}
              >
                Ver resultados parciales
              </Button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Generated Keywords */}
          {generatedKeywords.length > 0 && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {selectedCount} de {generatedKeywords.length} seleccionadas
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Todas
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>
                    Ninguna
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 border border-border rounded-lg">
                <div className="p-2 space-y-1">
                  {generatedKeywords.map((kw, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-2 rounded-md transition-colors cursor-pointer ${
                        kw.selected ? "bg-primary/10" : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleKeyword(index)}
                    >
                      <Checkbox
                        checked={kw.selected}
                        onCheckedChange={() => toggleKeyword(index)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{kw.keyword}</span>
                          <Badge
                            variant="outline"
                            className={
                              kw.estimatedVolume === "high"
                                ? "border-green-500 text-green-600"
                                : kw.estimatedVolume === "medium"
                                ? "border-amber-500 text-amber-600"
                                : "border-muted-foreground"
                            }
                          >
                            Vol: {kw.estimatedVolume}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {kw.intent}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {kw.reason}
                        </p>
                      </div>
                      {kw.selected && (
                        <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedKeywords([]);
                    reset();
                  }}
                  className="flex-1"
                >
                  Regenerar
                </Button>
                <Button
                  onClick={handleAddSelected}
                  disabled={selectedCount === 0}
                  className="flex-1 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Añadir {selectedCount} keywords
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
