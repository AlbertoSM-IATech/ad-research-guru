# Guía de Implementación de IA - Publify

## Resumen

Esta documentación describe cómo implementar la integración de IA en el panel de Advertising Research usando Lovable AI Gateway o cualquier backend compatible.

## Arquitectura

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐     ┌─────────────┐
│   Usuario   │────▶│  React Frontend  │────▶│   Edge Function     │────▶│  Lovable AI │
│             │◀────│  (useAIStream)   │◀────│   (Backend)         │◀────│   Gateway   │
└─────────────┘     └──────────────────┘     └─────────────────────┘     └─────────────┘
                         streaming                  streaming
```

## 1. Configuración del Frontend (YA IMPLEMENTADO)

### Archivos creados:

- `src/lib/ai-config.ts` - Configuración de endpoints y tipos
- `src/hooks/useAIStream.ts` - Hook para streaming de respuestas IA

### Configuración:

Edita `src/lib/ai-config.ts` y cambia el endpoint:

```typescript
export const AI_CONFIG = {
  endpoint: "https://TU-PROYECTO.supabase.co/functions/v1/ai-assistant",
  // ...
};
```

O usa una variable de entorno:
```env
VITE_AI_ENDPOINT=https://tu-proyecto.supabase.co/functions/v1/ai-assistant
```

## 2. Edge Function (BACKEND - A IMPLEMENTAR)

### Estructura de archivos:

```
supabase/
├── config.toml
└── functions/
    └── ai-assistant/
        └── index.ts
```

### config.toml:

```toml
[functions.ai-assistant]
verify_jwt = false
```

### Edge Function (`supabase/functions/ai-assistant/index.ts`):

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// System prompts por acción
const SYSTEM_PROMPTS: Record<string, string> = {
  "generate-keywords": `Eres un experto en Amazon Advertising y SEO de libros.
Tu tarea es generar keywords relevantes para libros en Amazon.

REGLAS:
- Genera keywords en el idioma del marketplace
- Incluye long-tail keywords (3-5 palabras)
- Considera la intención del comprador
- Incluye variantes y sinónimos

FORMATO DE RESPUESTA (JSON):
{
  "keywords": [
    {
      "keyword": "string",
      "estimatedVolume": "high" | "medium" | "low",
      "intent": "informational" | "navigational" | "transactional" | "commercial",
      "relevance": "high" | "medium" | "low",
      "reason": "string explicando por qué es relevante"
    }
  ]
}`,

  "classify": `Eres un experto en clasificación de keywords para Amazon Advertising.
Clasifica las keywords proporcionadas según:
- Relevancia para el libro
- Intención del usuario
- Nivel de competencia estimado
- Tipo de campaña recomendado

FORMATO DE RESPUESTA (JSON):
{
  "classifications": [
    {
      "keyword": "string",
      "relevance": "high" | "medium" | "low",
      "intent": "informational" | "navigational" | "transactional" | "commercial",
      "competition": "low" | "medium" | "high",
      "recommendedCampaign": "SP" | "SB" | "SBV" | "SD",
      "reason": "string"
    }
  ]
}`,

  "copywriting": `Eres un experto copywriter especializado en libros de Amazon.
Genera contenido optimizado para SEO y conversión.

INCLUYE:
- Título optimizado (max 200 caracteres)
- Subtítulo atractivo (max 200 caracteres)
- 5-7 bullet points persuasivos
- Descripción (max 4000 caracteres)
- Backend keywords (max 250 caracteres)

FORMATO DE RESPUESTA (JSON):
{
  "title": "string",
  "subtitle": "string",
  "bulletPoints": ["string"],
  "description": "string",
  "backendKeywords": "string"
}`,

  "analyze-competitor": `Eres un analista de competencia para Amazon Advertising.
Analiza los ASINs proporcionados y genera insights estratégicos.

INCLUYE:
- Fortalezas y debilidades
- Keywords que probablemente usan
- Estrategia recomendada
- Oportunidades identificadas

FORMATO DE RESPUESTA (JSON):
{
  "analysis": [
    {
      "asin": "string",
      "strengths": ["string"],
      "weaknesses": ["string"],
      "estimatedKeywords": ["string"],
      "threatLevel": "low" | "medium" | "high"
    }
  ],
  "strategy": "string",
  "opportunities": ["string"]
}`,

  "chat": `Eres un asistente experto en Amazon Advertising para autores y editores.
Tienes acceso al contexto del usuario (libro, keywords, ASINs).
Responde de forma clara, concisa y accionable.
Cuando sea relevante, sugiere keywords, estrategias o mejoras específicas.`,
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, messages, context } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY no está configurada");
    }

    // Build system prompt with context
    let systemPrompt = SYSTEM_PROMPTS[action] || SYSTEM_PROMPTS["chat"];
    
    if (context) {
      systemPrompt += "\n\nCONTEXTO DEL USUARIO:";
      if (context.bookInfo) {
        systemPrompt += `\n- Libro: ${context.bookInfo.title || "Sin título"}`;
        if (context.bookInfo.subtitle) systemPrompt += ` - ${context.bookInfo.subtitle}`;
        if (context.bookInfo.description) systemPrompt += `\n- Descripción: ${context.bookInfo.description}`;
        if (context.bookInfo.categories?.length) systemPrompt += `\n- Categorías: ${context.bookInfo.categories.join(", ")}`;
      }
      if (context.keywords?.length) {
        systemPrompt += `\n- Keywords actuales: ${context.keywords.slice(0, 20).map(k => k.keyword).join(", ")}`;
      }
      if (context.asins?.length) {
        systemPrompt += `\n- ASINs objetivo: ${context.asins.map(a => a.asin).join(", ")}`;
      }
      if (context.marketplace) {
        systemPrompt += `\n- Marketplace: ${context.marketplace}`;
      }
    }

    console.log(`AI Request - Action: ${action}, Messages: ${messages.length}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error(`AI Gateway error: ${status} - ${text}`);
      
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI Gateway error: ${status}`);
    }

    // Stream the response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("AI Assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

## 3. Uso del Hook useAIStream

### Ejemplo básico:

```tsx
import { useAIStream } from "@/hooks/useAIStream";
import { AI_CONFIG } from "@/lib/ai-config";

function MyComponent() {
  const { isLoading, error, response, streamAI, cancel, reset } = useAIStream();

  const generateKeywords = async () => {
    await streamAI({
      action: AI_CONFIG.actions.GENERATE_KEYWORDS,
      messages: [
        { role: "user", content: "Genera 10 keywords para un libro de cocina mexicana" }
      ],
      context: {
        bookInfo: {
          title: "Recetas de la Abuela",
          categories: ["Cookbooks", "Mexican Cuisine"]
        },
        marketplace: "amazon.com.mx"
      }
    });
  };

  return (
    <div>
      <button onClick={generateKeywords} disabled={isLoading}>
        {isLoading ? "Generando..." : "Generar Keywords"}
      </button>
      {isLoading && <button onClick={cancel}>Cancelar</button>}
      {error && <p className="text-red-500">{error}</p>}
      {response && <pre>{response}</pre>}
    </div>
  );
}
```

### Con callbacks:

```tsx
await streamAI(
  {
    action: AI_CONFIG.actions.CHAT,
    messages: [{ role: "user", content: "¿Qué keywords me recomiendas?" }],
    context: { /* ... */ }
  },
  {
    onDelta: (chunk) => console.log("Nuevo texto:", chunk),
    onComplete: () => console.log("Completado"),
    onError: (err) => toast.error(err.message)
  }
);
```

## 4. Acciones Disponibles

| Acción | Descripción | Respuesta |
|--------|-------------|-----------|
| `generate-keywords` | Genera keywords relevantes | JSON con array de keywords |
| `classify` | Clasifica keywords existentes | JSON con clasificaciones |
| `copywriting` | Genera contenido optimizado | JSON con título, bullets, etc |
| `analyze-competitor` | Analiza ASINs competidores | JSON con análisis y estrategia |
| `chat` | Chat conversacional | Texto libre |

## 5. Variables de Entorno

### Frontend (.env):
```env
VITE_AI_ENDPOINT=https://tu-proyecto.supabase.co/functions/v1/ai-assistant
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu-key
```

### Backend (Supabase Secrets):
```
LOVABLE_API_KEY=sk-... (automático con Lovable Cloud)
```

## 6. Despliegue

1. Habilitar Lovable Cloud en el proyecto
2. La edge function se despliega automáticamente
3. Configurar el endpoint en el frontend
4. Probar con el hook useAIStream

## 7. Troubleshooting

### Error 429 (Rate Limit)
- Reducir frecuencia de peticiones
- El hook muestra mensaje de error apropiado

### Error 402 (Payment Required)
- Añadir créditos en Lovable Settings > Workspace > Usage

### Error de CORS
- Verificar que la edge function tiene los headers CORS correctos
- Verificar que el endpoint es correcto

## 8. Próximos Pasos

Una vez implementado el backend, crear los componentes:

1. `AIKeywordGenerator.tsx` - Botón para generar keywords
2. `AIClassifyButton.tsx` - Clasificar keywords seleccionadas
3. `AICopywritingModal.tsx` - Modal para generar contenido
4. `AIChatPanel.tsx` - Panel de chat lateral
