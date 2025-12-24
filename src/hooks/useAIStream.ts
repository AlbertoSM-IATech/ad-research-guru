import { useState, useCallback, useRef } from "react";
import { AI_CONFIG, AIRequest, AIStreamOptions } from "@/lib/ai-config";

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

      abortControllerRef.current = new AbortController();

      try {
        const resp = await fetch(AI_CONFIG.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Add authorization header if needed
            // Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(request),
          signal: abortControllerRef.current.signal,
        });

        if (!resp.ok) {
          // Handle rate limits and payment errors
          if (resp.status === 429) {
            throw new Error("Límite de peticiones excedido. Intenta de nuevo más tarde.");
          }
          if (resp.status === 402) {
            throw new Error("Se requiere pago. Añade fondos a tu cuenta.");
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

          // Process line-by-line for SSE
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
              // Incomplete JSON, put back and wait for more
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Flush remaining buffer
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
          // Request was cancelled, not an error
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
