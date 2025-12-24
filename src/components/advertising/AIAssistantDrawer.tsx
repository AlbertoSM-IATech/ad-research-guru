import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  User,
  Trash2,
  Plus,
  Check,
  CheckCircle,
  X,
  Copy,
  RefreshCw,
  AlertCircle,
  Wand2,
  Zap,
  MessageSquare,
  FileText,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAIStream } from "@/hooks/useAIStream";
import { AI_CONFIG } from "@/lib/ai-config";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type {
  BookInfo,
  Keyword,
  TargetASIN,
  AdvertisingCategory,
  RelevanceLevel,
  IntentType,
  KeywordState,
  CampaignType,
} from "@/types/advertising";
import {
  RELEVANCE_LEVELS,
  INTENT_TYPES,
  KEYWORD_STATES,
} from "@/types/advertising";

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  marketplaceId: string;
  bookInfo: BookInfo;
  activeTab: "keywords" | "asins" | "categories";
  onChangeActiveTab: (tab: "keywords" | "asins" | "categories") => void;
  keywords: Keyword[];
  asins: TargetASIN[];
  categories: AdvertisingCategory[];
  selectedKeywordIds: string[];
  selectedAsinIds: string[];
  selectedCategoryIds: string[];
  onAddKeywords: (keywords: Array<Omit<Keyword, "id" | "createdAt" | "updatedAt">>) => void;
  onUpdateKeywords: (ids: string[], updates: Partial<Keyword>) => void;
  onUpdateBookInfo?: (updates: Partial<BookInfo>) => void;
}

// ==================== CHAT TAB ====================
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function ChatTab({
  bookInfo,
  keywords,
  asins,
  marketplaceId,
}: {
  bookInfo: BookInfo;
  keywords: Keyword[];
  asins: TargetASIN[];
  marketplaceId: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isLoading, streamAI, cancel } = useAIStream();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
    ]);

    await streamAI(
      {
        action: AI_CONFIG.actions.CHAT,
        messages: [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: userMessage.content },
        ],
        context: {
          bookInfo: {
            title: bookInfo.title,
            subtitle: bookInfo.subtitle,
            description: bookInfo.description,
            categories: bookInfo.categories,
          },
          keywords: keywords.slice(0, 50).map((k) => ({
            keyword: k.keyword,
            volume: k.searchVolume,
            competition: k.competitionLevel,
          })),
          asins: asins.slice(0, 20).map((a) => ({
            asin: a.asin,
            title: a.title,
          })),
          marketplace: marketplaceId,
        },
      },
      {
        onDelta: (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m
            )
          );
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => setMessages([]);

  const suggestedQuestions = [
    "¿Qué keywords tienen mejor potencial?",
    "Analiza mi competencia",
    "Sugiere mejoras para mi título",
    "¿Qué categorías debería usar?",
  ];

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center text-muted-foreground text-sm">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-primary/50" />
              <p>¡Hola! Soy tu asistente de Amazon Advertising.</p>
              <p className="mt-1">Pregúntame sobre tus keywords, competencia o estrategias.</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Sugerencias:</p>
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInputValue(q);
                    inputRef.current?.focus();
                  }}
                  className="w-full text-left text-sm p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.content || <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
                {message.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {messages.length > 0 && (
        <div className="px-4 py-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={clearChat} className="text-xs">
            <Trash2 className="w-3 h-3 mr-1" />
            Limpiar chat
          </Button>
        </div>
      )}

      <div className="p-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Escribe tu pregunta..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={isLoading ? cancel : handleSend}
            disabled={!inputValue.trim() && !isLoading}
            size="icon"
          >
            {isLoading ? <X className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==================== GENERATE TAB ====================
interface GeneratedKeyword {
  keyword: string;
  estimatedVolume: "high" | "medium" | "low";
  intent: string;
  relevance: "high" | "medium" | "low";
  reason: string;
  selected: boolean;
}

function GenerateTab({
  bookInfo,
  marketplaceId,
  existingKeywords,
  onAddKeywords,
  activeTab,
  onChangeActiveTab,
}: {
  bookInfo: BookInfo;
  marketplaceId: string;
  existingKeywords: string[];
  onAddKeywords: (keywords: Array<Omit<Keyword, "id" | "createdAt" | "updatedAt">>) => void;
  activeTab: "keywords" | "asins" | "categories";
  onChangeActiveTab: (tab: "keywords" | "asins" | "categories") => void;
}) {
  const { toast } = useToast();
  const [additionalContext, setAdditionalContext] = useState("");
  const [generatedKeywords, setGeneratedKeywords] = useState<GeneratedKeyword[]>([]);
  const { isLoading, error, response, streamAI, cancel, reset } = useAIStream();

  // Show warning if not in keywords tab
  if (activeTab !== "keywords") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">Generación disponible en Keywords</h3>
        <p className="text-sm text-muted-foreground mb-4">
          La generación de keywords con IA solo funciona en el tab de Keywords.
        </p>
        <Button onClick={() => onChangeActiveTab("keywords")} className="gap-2">
          <Zap className="w-4 h-4" />
          Ir a Keywords
        </Button>
      </div>
    );
  }

  const handleGenerate = async () => {
    setGeneratedKeywords([]);
    reset();

    await streamAI(
      {
        action: AI_CONFIG.actions.GENERATE_KEYWORDS,
        messages: [
          {
            role: "user",
            content: `Genera 15-20 keywords relevantes para este libro.
${additionalContext ? `\nContexto adicional: ${additionalContext}` : ""}
Keywords existentes a evitar duplicar: ${existingKeywords.join(", ") || "Ninguna"}
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
      // Still streaming
    }
  };

  // Auto-parse when response changes
  useEffect(() => {
    if (!isLoading && response && generatedKeywords.length === 0) {
      parseResponse();
    }
  }, [isLoading, response]);

  const toggleKeyword = (index: number) => {
    setGeneratedKeywords((prev) =>
      prev.map((k, i) => (i === index ? { ...k, selected: !k.selected } : k))
    );
  };

  const selectAll = () => setGeneratedKeywords((prev) => prev.map((k) => ({ ...k, selected: true })));
  const deselectAll = () => setGeneratedKeywords((prev) => prev.map((k) => ({ ...k, selected: false })));

  const handleAddSelected = () => {
    const selected = generatedKeywords.filter((k) => k.selected);
    if (selected.length === 0) {
      toast({ title: "Selecciona al menos una keyword" });
      return;
    }

    const newKeywords: Array<Omit<Keyword, "id" | "createdAt" | "updatedAt">> = selected.map((k) => ({
      keyword: k.keyword,
      searchVolume: k.estimatedVolume === "high" ? 5000 : k.estimatedVolume === "medium" ? 1000 : 100,
      competitionLevel: k.estimatedVolume === "high" ? "high" : k.estimatedVolume === "medium" ? "medium" : "low",
      campaignTypes: ["SP"] as CampaignType[],
      notes: `[IA] ${k.reason}`,
      marketplaceId,
      relevance: k.relevance === "high" ? "very-high" : k.relevance === "medium" ? "high" : "low",
      intent: k.intent === "transactional" ? "purchase" : "research",
      state: "pending" as KeywordState,
    }));

    onAddKeywords(newKeywords);
    toast({ title: `${selected.length} keywords añadidas` });
    setGeneratedKeywords([]);
    setAdditionalContext("");
    reset();
  };

  const selectedCount = generatedKeywords.filter((k) => k.selected).length;

  return (
    <div className="flex flex-col h-full p-4">
      {/* Book Info Summary */}
      <div className="p-3 bg-muted/50 rounded-lg text-sm mb-4">
        <p className="font-medium">{bookInfo.title || "Sin título"}</p>
        {bookInfo.subtitle && (
          <p className="text-muted-foreground">{bookInfo.subtitle}</p>
        )}
        {bookInfo.categories && bookInfo.categories.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {bookInfo.categories.slice(0, 3).map((cat, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {cat}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Additional Context */}
      <div className="space-y-2 mb-4">
        <Label className="text-sm">Contexto adicional (opcional)</Label>
        <Textarea
          placeholder="Añade información extra: público objetivo, temas específicos..."
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
          className="gap-2 mb-4"
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
        <div className="p-4 bg-muted/30 rounded-lg mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm font-medium">Generando keywords...</span>
            <Button variant="ghost" size="sm" onClick={cancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive mb-4">
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
                  className={cn(
                    "flex items-start gap-3 p-2 rounded-md transition-colors cursor-pointer",
                    kw.selected ? "bg-primary/10" : "hover:bg-muted/50"
                  )}
                  onClick={() => toggleKeyword(index)}
                >
                  <Checkbox
                    checked={kw.selected}
                    onCheckedChange={() => toggleKeyword(index)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{kw.keyword}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          kw.estimatedVolume === "high"
                            ? "border-green-500 text-green-600"
                            : kw.estimatedVolume === "medium"
                            ? "border-amber-500 text-amber-600"
                            : ""
                        )}
                      >
                        Vol: {kw.estimatedVolume}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {kw.reason}
                    </p>
                  </div>
                  {kw.selected && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
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
            <Button onClick={handleAddSelected} disabled={selectedCount === 0} className="flex-1 gap-2">
              <Plus className="w-4 h-4" />
              Añadir {selectedCount}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== CLASSIFY TAB ====================
interface ClassificationResult {
  keyword: string;
  relevance: RelevanceLevel;
  intent: IntentType;
  state: KeywordState;
  campaignTypes: CampaignType[];
  confidence: number;
}

function ClassifyTab({
  keywords,
  selectedIds,
  bookInfo,
  marketplaceId,
  onUpdateKeywords,
  activeTab,
  onChangeActiveTab,
}: {
  keywords: Keyword[];
  selectedIds: string[];
  bookInfo: BookInfo;
  marketplaceId: string;
  onUpdateKeywords: (ids: string[], updates: Partial<Keyword>) => void;
  activeTab: "keywords" | "asins" | "categories";
  onChangeActiveTab: (tab: "keywords" | "asins" | "categories") => void;
}) {
  const { toast } = useToast();
  const [results, setResults] = useState<ClassificationResult[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const { isLoading, error, response, streamAI, reset } = useAIStream();

  // Show warning if not in keywords tab
  if (activeTab !== "keywords") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">Clasificación disponible en Keywords</h3>
        <p className="text-sm text-muted-foreground mb-4">
          La clasificación automática solo funciona con keywords.
        </p>
        <Button onClick={() => onChangeActiveTab("keywords")} className="gap-2">
          <Zap className="w-4 h-4" />
          Ir a Keywords
        </Button>
      </div>
    );
  }

  const keywordsToClassify =
    selectedIds.length > 0
      ? keywords.filter((k) => selectedIds.includes(k.id))
      : keywords.slice(0, 20);

  const handleClassify = async () => {
    setResults([]);
    reset();

    const keywordList = keywordsToClassify.map((k) => ({
      keyword: k.keyword,
      searchVolume: k.searchVolume,
    }));

    await streamAI(
      {
        action: AI_CONFIG.actions.CLASSIFY,
        messages: [
          {
            role: "user",
            content: `Clasifica las siguientes keywords para el libro: "${bookInfo.title || "Sin título"}"

Keywords a clasificar:
${keywordList.map((k, i) => `${i + 1}. "${k.keyword}" (vol: ${k.searchVolume})`).join("\n")}

Para cada keyword, proporciona:
- relevance: "very-high" | "high" | "low" | "none"
- intent: "purchase" | "research" | "competition" | "problem"
- state: "pending" | "tested-works" | "low-competition" | "discarded"
- campaignTypes: array de ["SP", "SB", "SBV", "SD"]
- confidence: 0-100

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
        onError: (err) => {
          toast({
            title: "Error al clasificar",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  // Parse when response changes
  useEffect(() => {
    if (!isLoading && response && results.length === 0) {
      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as ClassificationResult[];
          setResults(parsed);
        }
      } catch {
        // Still streaming
      }
    }
  }, [isLoading, response]);

  const handleApplyResults = () => {
    setIsApplying(true);

    results.forEach((result) => {
      const matchingKeyword = keywordsToClassify.find(
        (k) => k.keyword.toLowerCase() === result.keyword.toLowerCase()
      );
      if (matchingKeyword) {
        onUpdateKeywords([matchingKeyword.id], {
          relevance: result.relevance,
          intent: result.intent,
          state: result.state,
          campaignTypes: result.campaignTypes,
        });
      }
    });

    setIsApplying(false);
    setShowConfirmDialog(false);
    toast({
      title: "Clasificación aplicada",
      description: `${results.length} keywords actualizadas`,
    });
    setResults([]);
  };

  const getRelevanceLabel = (level: RelevanceLevel) =>
    RELEVANCE_LEVELS.find((r) => r.value === level)?.label || level;
  const getIntentLabel = (intent: IntentType) =>
    INTENT_TYPES.find((i) => i.value === intent)?.label || intent;
  const getStateLabel = (state: KeywordState) =>
    KEYWORD_STATES.find((s) => s.value === state)?.label || state;

  return (
    <div className="flex flex-col h-full p-4">
      {/* Keywords to classify */}
      <div className="p-3 bg-muted/30 rounded-lg mb-4">
        <p className="text-sm font-medium mb-2">
          {selectedIds.length > 0
            ? `${selectedIds.length} keywords seleccionadas`
            : `Primeras ${keywordsToClassify.length} keywords`}
        </p>
        <div className="flex flex-wrap gap-1">
          {keywordsToClassify.slice(0, 8).map((k) => (
            <Badge key={k.id} variant="outline" className="text-xs">
              {k.keyword}
            </Badge>
          ))}
          {keywordsToClassify.length > 8 && (
            <Badge variant="secondary" className="text-xs">
              +{keywordsToClassify.length - 8} más
            </Badge>
          )}
        </div>
      </div>

      {/* Start button */}
      {!isLoading && results.length === 0 && (
        <Button onClick={handleClassify} className="w-full gap-2 mb-4">
          <Sparkles className="w-4 h-4" />
          Iniciar clasificación
        </Button>
      )}

      {isLoading && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analizando keywords...
          </div>
          <Progress value={undefined} className="h-2" />
        </div>
      )}

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive mb-4">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <>
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg border border-border bg-muted/20 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{result.keyword}</span>
                    <Badge variant="outline" className="text-xs">
                      {result.confidence}%
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 text-xs">
                    <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300">
                      {getRelevanceLabel(result.relevance)}
                    </Badge>
                    <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300">
                      {getIntentLabel(result.intent)}
                    </Badge>
                    <Badge className="bg-green-500/20 text-green-700 dark:text-green-300">
                      {getStateLabel(result.state)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setResults([]);
                reset();
              }}
              className="flex-1"
            >
              Descartar
            </Button>
            <Button onClick={() => setShowConfirmDialog(true)} className="flex-1 gap-2">
              <Check className="w-4 h-4" />
              Aplicar ({results.length})
            </Button>
          </div>
        </>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aplicar clasificación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se actualizarán {results.length} keywords con la clasificación sugerida por la IA.
              Esta acción modificará los campos de relevancia, intención, estado y tipos de campaña.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyResults} disabled={isApplying}>
              {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== COPY TAB ====================
function CopyTab({
  bookInfo,
  keywords,
  marketplaceId,
  onUpdateBookInfo,
}: {
  bookInfo: BookInfo;
  keywords: Keyword[];
  marketplaceId: string;
  onUpdateBookInfo?: (updates: Partial<BookInfo>) => void;
}) {
  const { toast } = useToast();
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState("profesional");
  const [format, setFormat] = useState<"bullets" | "paragraph">("bullets");
  const [generatedCopy, setGeneratedCopy] = useState("");
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const { isLoading, error, response, streamAI, reset } = useAIStream();

  const handleGenerate = async () => {
    reset();
    setGeneratedCopy("");

    const topKeywords = keywords
      .filter((k) => k.relevance === "very-high" || k.relevance === "high")
      .slice(0, 20)
      .map((k) => k.keyword);

    await streamAI(
      {
        action: AI_CONFIG.actions.COPYWRITING,
        messages: [
          {
            role: "user",
            content: `Genera contenido de copy para Amazon KDP.
            
Objetivo: Crear contenido persuasivo para el libro
Público objetivo: ${targetAudience || "General"}
Tono: ${tone}
Formato: ${format === "bullets" ? "Bullet points" : "Párrafos"}

Keywords principales a incluir: ${topKeywords.join(", ") || "No hay keywords"}

Genera:
- Título optimizado (max 200 caracteres)
- Subtítulo (max 200 caracteres)
- ${format === "bullets" ? "7 bullet points" : "Descripción de 4000 caracteres máximo"}`,
          },
        ],
        context: {
          bookInfo,
          keywords: keywords.slice(0, 30).map((k) => ({ keyword: k.keyword })),
          marketplace: marketplaceId,
        },
      },
      {
        onDelta: (chunk) => {
          setGeneratedCopy((prev) => prev + chunk);
        },
        onError: (err) => {
          toast({
            title: "Error al generar copy",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedCopy);
    setCopiedToClipboard(true);
    toast({ title: "Copiado al portapapeles" });
    setTimeout(() => setCopiedToClipboard(false), 2000);
  };

  return (
    <div className="flex flex-col h-full p-4">
      {/* Configuration */}
      <div className="space-y-4 mb-4">
        <div className="space-y-2">
          <Label className="text-sm">Público objetivo</Label>
          <Input
            placeholder="Ej: Emprendedores, madres, estudiantes..."
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-sm">Tono</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              disabled={isLoading}
            >
              <option value="profesional">Profesional</option>
              <option value="casual">Casual</option>
              <option value="persuasivo">Persuasivo</option>
              <option value="emocional">Emocional</option>
              <option value="tecnico">Técnico</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Formato</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={format}
              onChange={(e) => setFormat(e.target.value as "bullets" | "paragraph")}
              disabled={isLoading}
            >
              <option value="bullets">Bullet points</option>
              <option value="paragraph">Párrafos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Book Summary */}
      <div className="p-3 bg-muted/50 rounded-lg text-sm mb-4">
        <p className="font-medium">{bookInfo.title || "Sin título"}</p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary">{keywords.length} keywords</Badge>
          <Badge variant="outline">
            {keywords.filter((k) => k.relevance === "very-high" || k.relevance === "high").length} alta relevancia
          </Badge>
        </div>
      </div>

      {/* Generate Button */}
      {!generatedCopy && (
        <Button onClick={handleGenerate} disabled={isLoading || !bookInfo.title} className="gap-2 mb-4">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Generar Copy
            </>
          )}
        </Button>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      {/* Generated Content */}
      {(generatedCopy || isLoading) && (
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 border border-border rounded-lg p-3">
            <div className="text-sm whitespace-pre-wrap">
              {generatedCopy || (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generando contenido...
                </div>
              )}
            </div>
          </ScrollArea>

          {generatedCopy && (
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setGeneratedCopy("");
                  reset();
                }}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerar
              </Button>
              <Button onClick={handleCopy} className="flex-1 gap-2">
                {copiedToClipboard ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== MAIN DRAWER ====================
export function AIAssistantDrawer({
  isOpen,
  onOpenChange,
  marketplaceId,
  bookInfo,
  activeTab,
  onChangeActiveTab,
  keywords,
  asins,
  categories,
  selectedKeywordIds,
  selectedAsinIds,
  selectedCategoryIds,
  onAddKeywords,
  onUpdateKeywords,
  onUpdateBookInfo,
}: AIAssistantDrawerProps) {
  const [internalTab, setInternalTab] = useState("chat");

  const hasContext = bookInfo.title && bookInfo.title.trim().length > 0;
  const hasData = keywords.length > 0 || asins.length > 0 || categories.length > 0;

  const marketplaceLabels: Record<string, string> = {
    us: "EE.UU.",
    uk: "Reino Unido",
    de: "Alemania",
    es: "España",
    fr: "Francia",
    it: "Italia",
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Asistente IA
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {marketplaceLabels[marketplaceId] || marketplaceId} •{" "}
            {hasContext ? bookInfo.title : "Sin contexto de libro"}
          </p>
        </SheetHeader>

        {/* Empty State */}
        {!hasData && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Sin datos disponibles</h3>
            <p className="text-sm text-muted-foreground">
              Importa datos o añade items para usar las funciones de IA.
            </p>
          </div>
        )}

        {/* Tabs Content */}
        {hasData && (
          <Tabs value={internalTab} onValueChange={setInternalTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-4 rounded-none border-b border-border h-12">
              <TabsTrigger value="chat" className="gap-1 text-xs">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="generate" className="gap-1 text-xs">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Generar</span>
              </TabsTrigger>
              <TabsTrigger value="classify" className="gap-1 text-xs">
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Clasificar</span>
              </TabsTrigger>
              <TabsTrigger value="copy" className="gap-1 text-xs">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Copy</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
              <ChatTab
                bookInfo={bookInfo}
                keywords={keywords}
                asins={asins}
                marketplaceId={marketplaceId}
              />
            </TabsContent>

            <TabsContent value="generate" className="flex-1 overflow-auto mt-0">
              <GenerateTab
                bookInfo={bookInfo}
                marketplaceId={marketplaceId}
                existingKeywords={keywords.map((k) => k.keyword)}
                onAddKeywords={onAddKeywords}
                activeTab={activeTab}
                onChangeActiveTab={onChangeActiveTab}
              />
            </TabsContent>

            <TabsContent value="classify" className="flex-1 overflow-auto mt-0">
              <ClassifyTab
                keywords={keywords}
                selectedIds={selectedKeywordIds}
                bookInfo={bookInfo}
                marketplaceId={marketplaceId}
                onUpdateKeywords={onUpdateKeywords}
                activeTab={activeTab}
                onChangeActiveTab={onChangeActiveTab}
              />
            </TabsContent>

            <TabsContent value="copy" className="flex-1 overflow-auto mt-0">
              <CopyTab
                bookInfo={bookInfo}
                keywords={keywords}
                marketplaceId={marketplaceId}
                onUpdateBookInfo={onUpdateBookInfo}
              />
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
