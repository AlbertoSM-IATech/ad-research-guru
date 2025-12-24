import { useState, useCallback, useRef } from "react";
import { AI_CONFIG, AIRequest, AIStreamOptions } from "@/lib/ai-config";
import { isAIDemoMode, streamDemoResponse } from "@/lib/ai-demo-service";

interface UseAIStreamReturn {
  isLoading: boolean;
  error: string | null;
  response: string;
  streamAI: (request: AIRequest, options?: Partial<AIStreamOptions>) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

export function useAIStream(): UseAIStreamReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setResponse("");
    setError(null);
    setIsLoading(false);
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const streamAI = useCallback(
    async (request: AIRequest, options?: Partial<AIStreamOptions>) => {
      // Cancel any existing request
      cancel();

      setIsLoading(true);
      setError(null);
      setResponse("");

      // Check if demo mode is enabled
      if (isAIDemoMode()) {
        try {
          let fullResponse = "";
          await streamDemoResponse(request, {
            onDelta: (chunk) => {
              fullResponse += chunk;
              setResponse(fullResponse);
              options?.onDelta?.(chunk);
            },
            onComplete: () => {
              options?.onComplete?.();
            },
            onError: (err) => {
              setError(err.message);
              options?.onError?.(err);
            },
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Error desconocido";
          setError(errorMessage);
          options?.onError?.(err instanceof Error ? err : new Error(errorMessage));
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Real API call
      abortControllerRef.current = new AbortController();

      try {
        const resp = await fetch(AI_CONFIG.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
          signal: abortControllerRef.current.signal,
        });

        if (!resp.ok) {
          if (resp.status === 429) {
            throw new Error("Límite de peticiones excedido. Intenta de nuevo más tarde.");
          }
          if (resp.status === 402) {
            throw new Error("Se requiere pago. Añade fondos a tu cuenta.");
          }
          if (resp.status === 404) {
            throw new Error("Backend no configurado. Activa el Modo Demo para probar la interfaz.");
          }
          throw new Error(`Error del servidor: ${resp.status}`);
        }

        if (!resp.body) {
          throw new Error("No se recibió respuesta del servidor");
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let fullResponse = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                fullResponse += content;
                setResponse(fullResponse);
                options?.onDelta?.(content);
              }
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                fullResponse += content;
                setResponse(fullResponse);
                options?.onDelta?.(content);
              }
            } catch {
              /* ignore partial leftovers */
            }
          }
        }

        options?.onComplete?.();
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        const errorMessage = err instanceof Error ? err.message : "Error desconocido";
        setError(errorMessage);
        options?.onError?.(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [cancel]
  );

  return {
    isLoading,
    error,
    response,
    streamAI,
    cancel,
    reset,
  };
}
