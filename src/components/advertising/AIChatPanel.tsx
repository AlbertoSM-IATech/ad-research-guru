import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Minimize2,
  Maximize2,
  X,
  Loader2,
  Sparkles,
  User,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAIStream } from "@/hooks/useAIStream";
import { AI_CONFIG } from "@/lib/ai-config";
import type { BookInfo, Keyword, TargetASIN } from "@/types/advertising";

interface AIChatPanelProps {
  bookInfo: BookInfo;
  keywords: Keyword[];
  asins: TargetASIN[];
  marketplaceId: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function AIChatPanel({
  bookInfo,
  keywords,
  asins,
  marketplaceId,
}: AIChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isLoading, streamAI, cancel } = useAIStream();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

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

    // Create assistant message placeholder
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
        onComplete: () => {
          // Message is already updated via onDelta
        },
        onError: (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: `Error: ${err.message}` }
                : m
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

  const clearChat = () => {
    setMessages([]);
  };

  const suggestedQuestions = [
    "¿Qué keywords tienen mejor potencial?",
    "Analiza mi competencia",
    "Sugiere mejoras para mi título",
    "¿Qué categorías debería usar?",
  ];

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg gap-0 z-50"
        size="icon"
      >
        <MessageSquare className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "fixed right-4 bottom-4 bg-card border border-border rounded-lg shadow-xl z-50 flex flex-col transition-all duration-200",
        isMinimized ? "w-72 h-14" : "w-96 h-[500px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-medium">Asistente IA</span>
        </div>
        <div className="flex items-center gap-1">
          {!isMinimized && messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearChat}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
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
                        "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.content || (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
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

          {/* Input */}
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
                {isLoading ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
