import { useState } from "react";
import { Wand2, Copy, Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAIStream } from "@/hooks/useAIStream";
import { AI_CONFIG } from "@/lib/ai-config";
import { useToast } from "@/hooks/use-toast";
import type { BookInfo, Keyword } from "@/types/advertising";

interface AICopywritingModalProps {
  bookInfo: BookInfo;
  keywords: Keyword[];
  marketplaceId: string;
  onUpdateBookInfo?: (updates: Partial<BookInfo>) => void;
}

interface CopywritingResult {
  title?: string;
  subtitle?: string;
  bulletPoints?: string[];
  description?: string;
  backendKeywords?: string;
}

export function AICopywritingModal({
  bookInfo,
  keywords,
  marketplaceId,
  onUpdateBookInfo,
}: AICopywritingModalProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState("profesional");
  const [result, setResult] = useState<CopywritingResult>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { isLoading, error, response, streamAI, reset } = useAIStream();

  const handleGenerate = async (type: "full" | "title" | "bullets" | "description") => {
    reset();
    setResult({});

    const topKeywords = keywords
      .filter((k) => k.relevance === "very-high" || k.relevance === "high")
      .slice(0, 20)
      .map((k) => k.keyword);

    let prompt = "";
    switch (type) {
      case "full":
        prompt = "Genera el contenido completo: título, subtítulo, 7 bullet points, descripción y backend keywords.";
        break;
      case "title":
        prompt = "Genera solo el título y subtítulo optimizados para SEO y conversión.";
        break;
      case "bullets":
        prompt = "Genera solo 7 bullet points persuasivos que destaquen beneficios.";
        break;
      case "description":
        prompt = "Genera solo la descripción del libro (max 4000 caracteres).";
        break;
    }

    await streamAI(
      {
        action: AI_CONFIG.actions.COPYWRITING,
        messages: [
          {
            role: "user",
            content: `${prompt}

Público objetivo: ${targetAudience || "General"}
Tono: ${tone}

Keywords principales a incluir naturalmente: ${topKeywords.join(", ") || "No hay keywords definidas"}`,
          },
        ],
        context: {
          bookInfo: {
            title: bookInfo.title,
            subtitle: bookInfo.subtitle,
            description: bookInfo.description,
            categories: bookInfo.categories,
          },
          keywords: keywords.slice(0, 30).map((k) => ({ keyword: k.keyword })),
          marketplace: marketplaceId,
        },
      },
      {
        onComplete: () => {
          parseResult();
        },
        onError: (err) => {
          toast({
            title: "Error al generar contenido",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const parseResult = () => {
    if (!response) return;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setResult(parsed);
      }
    } catch {
      // Still streaming
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: "Copiado al portapapeles" });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0"
      onClick={() => copyToClipboard(text, field)}
    >
      {copiedField === field ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </Button>
  );

  const applyToBookInfo = (field: keyof BookInfo, value: string) => {
    if (onUpdateBookInfo) {
      onUpdateBookInfo({ [field]: value });
      toast({ title: `${field} actualizado` });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Wand2 className="w-4 h-4" />
          Copywriting IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Asistente de Copywriting
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="generate" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Generar</TabsTrigger>
            <TabsTrigger value="results" disabled={Object.keys(result).length === 0}>
              Resultados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="flex-1 space-y-4 mt-4">
            {/* Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Público objetivo</Label>
                <Input
                  placeholder="Ej: Emprendedores, madres, estudiantes..."
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tono</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                >
                  <option value="profesional">Profesional</option>
                  <option value="casual">Casual</option>
                  <option value="persuasivo">Persuasivo</option>
                  <option value="emocional">Emocional</option>
                  <option value="tecnico">Técnico</option>
                  <option value="divertido">Divertido</option>
                </select>
              </div>
            </div>

            {/* Book Summary */}
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="font-medium">{bookInfo.title || "Sin título"}</p>
              {bookInfo.description && (
                <p className="text-muted-foreground line-clamp-2 mt-1">
                  {bookInfo.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">{keywords.length} keywords</Badge>
                <Badge variant="outline">
                  {keywords.filter((k) => k.relevance === "very-high" || k.relevance === "high").length} alta relevancia
                </Badge>
              </div>
            </div>

            {/* Generation Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleGenerate("full")}
                disabled={isLoading}
                className="h-auto py-4 flex-col gap-1"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Wand2 className="w-5 h-5" />
                )}
                <span className="font-medium">Contenido Completo</span>
                <span className="text-xs opacity-70">Título, bullets, descripción</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGenerate("title")}
                disabled={isLoading}
                className="h-auto py-4 flex-col gap-1"
              >
                <span className="font-medium">Solo Título</span>
                <span className="text-xs opacity-70">Título + Subtítulo</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGenerate("bullets")}
                disabled={isLoading}
                className="h-auto py-4 flex-col gap-1"
              >
                <span className="font-medium">Solo Bullets</span>
                <span className="text-xs opacity-70">7 puntos clave</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGenerate("description")}
                disabled={isLoading}
                className="h-auto py-4 flex-col gap-1"
              >
                <span className="font-medium">Solo Descripción</span>
                <span className="text-xs opacity-70">Hasta 4000 caracteres</span>
              </Button>
            </div>

            {/* Loading/Error */}
            {isLoading && (
              <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm">Generando contenido...</span>
              </div>
            )}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {error}
              </div>
            )}
          </TabsContent>

          <TabsContent value="results" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                {/* Title */}
                {result.title && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">Título</Label>
                      <div className="flex gap-1">
                        <CopyButton text={result.title} field="title" />
                        {onUpdateBookInfo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => applyToBookInfo("title", result.title!)}
                          >
                            Aplicar
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium">{result.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.title.length}/200 caracteres
                      </p>
                    </div>
                  </div>
                )}

                {/* Subtitle */}
                {result.subtitle && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">Subtítulo</Label>
                      <div className="flex gap-1">
                        <CopyButton text={result.subtitle} field="subtitle" />
                        {onUpdateBookInfo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => applyToBookInfo("subtitle", result.subtitle!)}
                          >
                            Aplicar
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p>{result.subtitle}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.subtitle.length}/200 caracteres
                      </p>
                    </div>
                  </div>
                )}

                {/* Bullet Points */}
                {result.bulletPoints && result.bulletPoints.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">Bullet Points</Label>
                      <CopyButton
                        text={result.bulletPoints.join("\n")}
                        field="bullets"
                      />
                    </div>
                    <div className="space-y-2">
                      {result.bulletPoints.map((bullet, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg"
                        >
                          <Badge variant="secondary" className="shrink-0">
                            {i + 1}
                          </Badge>
                          <p className="text-sm flex-1">{bullet}</p>
                          <CopyButton text={bullet} field={`bullet-${i}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {result.description && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">Descripción</Label>
                      <div className="flex gap-1">
                        <CopyButton text={result.description} field="description" />
                        {onUpdateBookInfo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => applyToBookInfo("description", result.description!)}
                          >
                            Aplicar
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{result.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {result.description.length}/4000 caracteres
                      </p>
                    </div>
                  </div>
                )}

                {/* Backend Keywords */}
                {result.backendKeywords && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">Backend Keywords</Label>
                      <CopyButton text={result.backendKeywords} field="backend" />
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-mono">{result.backendKeywords}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.backendKeywords.length}/250 caracteres
                      </p>
                    </div>
                  </div>
                )}

                {/* Regenerate */}
                <Button
                  variant="outline"
                  onClick={() => handleGenerate("full")}
                  disabled={isLoading}
                  className="w-full gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerar todo
                </Button>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
