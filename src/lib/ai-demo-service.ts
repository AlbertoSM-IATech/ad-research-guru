// AI Demo Service - Simulates AI responses without backend
// Enable with: localStorage.setItem('AI_DEMO_MODE', 'true')

import { AIRequest, AIAction, AI_CONFIG } from './ai-config';
import { 
  type RelevanceLevel, 
  type IntentType, 
  type KeywordState, 
  type CampaignType 
} from '@/types/advertising';

export const isAIDemoMode = (): boolean => {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem('AI_DEMO_MODE');
  // Default to true if not set (first time users get demo mode)
  return stored === null ? true : stored === 'true';
};

export const toggleAIDemoMode = (enabled?: boolean): boolean => {
  const newValue = enabled ?? !isAIDemoMode();
  localStorage.setItem('AI_DEMO_MODE', newValue ? 'true' : 'false');
  return newValue;
};

interface DemoStreamOptions {
  onDelta: (chunk: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

// Simulates streaming by emitting chunks with delays
async function simulateStream(
  text: string, 
  options: Partial<DemoStreamOptions>,
  chunkSize = 5,
  delayMs = 30
): Promise<void> {
  let index = 0;
  
  while (index < text.length) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    const chunk = text.slice(index, index + chunkSize);
    options.onDelta?.(chunk);
    index += chunkSize;
  }
  
  options.onComplete?.();
}

// Demo responses for different AI actions
const demoResponses: Record<string, (request: AIRequest) => string> = {
  'generate-keywords': (request) => {
    const bookTitle = request.context?.bookInfo?.title || 'tu libro';
    return JSON.stringify([
      { keyword: `${bookTitle} guía completa`, volume: 2400, competition: 'medium', relevance: 'very-high' },
      { keyword: `cómo aplicar ${bookTitle}`, volume: 1800, competition: 'low', relevance: 'high' },
      { keyword: `${bookTitle} para principiantes`, volume: 3200, competition: 'medium', relevance: 'very-high' },
      { keyword: `mejores técnicas ${bookTitle}`, volume: 1500, competition: 'low', relevance: 'high' },
      { keyword: `${bookTitle} ejercicios prácticos`, volume: 980, competition: 'low', relevance: 'high' },
      { keyword: `${bookTitle} paso a paso`, volume: 2100, competition: 'medium', relevance: 'very-high' },
      { keyword: `beneficios de ${bookTitle}`, volume: 1200, competition: 'medium', relevance: 'high' },
      { keyword: `${bookTitle} en 10 minutos`, volume: 890, competition: 'low', relevance: 'high' },
      { keyword: `${bookTitle} para ansiedad`, volume: 2800, competition: 'high', relevance: 'very-high' },
      { keyword: `libro ${bookTitle} recomendado`, volume: 1600, competition: 'medium', relevance: 'high' },
    ], null, 2);
  },

  'classify': (request) => {
    const keywords = request.context?.keywords || [];
    const results = keywords.map((k, i) => {
      const relevanceOptions: RelevanceLevel[] = ['very-high', 'high', 'low', 'none'];
      const intentOptions: IntentType[] = ['purchase', 'research', 'problem', 'competition'];
      const stateOptions: KeywordState[] = ['pending', 'tested-works', 'low-competition', 'discarded'];
      const campaignOptions: CampaignType[][] = [['SP'], ['SP', 'SD'], ['SD'], ['SP', 'SB'], ['SP', 'SD', 'SBV']];
      
      return {
        keyword: k.keyword,
        relevance: relevanceOptions[i % relevanceOptions.length],
        intent: intentOptions[i % intentOptions.length],
        state: stateOptions[i % stateOptions.length],
        campaignTypes: campaignOptions[i % campaignOptions.length],
        confidence: 75 + Math.floor(Math.random() * 20),
      };
    });
    return JSON.stringify(results, null, 2);
  },

  'classify-keywords': (request) => {
    return demoResponses['classify'](request);
  },

  'copywriting': (request) => {
    const bookInfo = request.context?.bookInfo;
    const title = bookInfo?.title || 'Título del Libro';
    
    return `# Sugerencias de Copywriting para "${title}"

## Título Optimizado
**${title}: La Guía Definitiva para Transformar Tu Vida**

## Subtítulos Alternativos
1. "Descubre los secretos que cambiarán tu perspectiva para siempre"
2. "El método probado por miles de lectores satisfechos"
3. "De principiante a experto en tiempo récord"

## Descripción Mejorada (A+ Content)

🌟 **¿Te has sentido abrumado buscando la solución perfecta?**

Este libro es tu respuesta. Con más de **100 técnicas prácticas** y **ejercicios paso a paso**, descubrirás cómo:

✅ Dominar las bases en menos de una semana
✅ Aplicar estrategias avanzadas de forma sencilla
✅ Obtener resultados medibles desde el primer día
✅ Crear hábitos duraderos que transformarán tu vida

---

### Lo que dicen los lectores:

> *"Este libro cambió completamente mi forma de ver las cosas. ¡Altamente recomendado!"* - María G.

> *"Práctico, directo y efectivo. Exactamente lo que necesitaba."* - Carlos R.

---

## Keywords Backend Sugeridas
- ${title?.toLowerCase().replace(/\s+/g, '-') || 'libro'}-guia
- mejor-libro-${new Date().getFullYear()}
- guia-practica-principiantes

## Bullet Points para la Ficha
• 📖 **Más de 200 páginas** de contenido de alta calidad
• ⏱️ **Ejercicios de 10 minutos** que se adaptan a tu rutina
• 🎯 **Método probado** con miles de lectores satisfechos
• 💡 **Bonus incluido**: Plantillas descargables exclusivas`;
  },

  'analyze-competitor': (request) => {
    const asins = request.context?.asins || [];
    const asin = asins[0]?.asin || 'B0XXXXXXXX';
    const title = asins[0]?.title || 'Libro Competidor';
    
    return `# Análisis Competitivo: ${title}

## Resumen Ejecutivo
**ASIN:** ${asin}
**Puntuación de Amenaza:** 72/100 🟠

## Fortalezas del Competidor
- ✅ Alta visibilidad en categoría principal
- ✅ Más de 500 reseñas con 4.5★ promedio
- ✅ Precio competitivo (9.99€)
- ✅ A+ Content bien optimizado

## Debilidades Detectadas
- ❌ Título no optimizado para búsqueda
- ❌ Sin keywords de long-tail
- ❌ Descripción con poca persuasión
- ❌ No aprovecha bullet points

## Oportunidades para Tu Libro
1. **Diferenciación por nicho**: Enfócate en subtemas no cubiertos
2. **Keywords de cola larga**: "${title} para principiantes", "${title} ejercicios"
3. **Precio estratégico**: Considera 7.99€ para entrada al mercado
4. **Formato**: Ofrece bundle eBook + audiobook

## Keywords Compartidas
| Keyword | Tu posición | Competidor | Oportunidad |
|---------|-------------|------------|-------------|
| meditación guía | #45 | #12 | Alta |
| mindfulness libro | #32 | #8 | Media |
| calma interior | #18 | #22 | Baja |

## Recomendaciones de Campaña
- **SP**: Targetear keywords donde competidor es débil
- **SD**: Atacar directamente su página de producto
- **Budget sugerido**: 15€/día primeras 2 semanas`;
  },

  'chat': (request) => {
    const lastMessage = request.messages[request.messages.length - 1]?.content || '';
    const bookInfo = request.context?.bookInfo;
    
    // Contextual responses based on keywords in the message
    if (lastMessage.toLowerCase().includes('keyword') || lastMessage.toLowerCase().includes('palabra')) {
      return `¡Buena pregunta sobre keywords! 

Para tu libro "${bookInfo?.title || 'tu libro'}", te recomiendo:

1. **Keywords de intención de compra**: "mejor libro de...", "guía de..."
2. **Keywords informativas**: "cómo...", "qué es...", "beneficios de..."
3. **Keywords de competencia**: analizar los títulos de tus competidores

¿Quieres que genere una lista específica de keywords? Puedo analizar tu nicho y darte sugerencias basadas en volumen de búsqueda y competencia.`;
    }
    
    if (lastMessage.toLowerCase().includes('campaña') || lastMessage.toLowerCase().includes('publicidad')) {
      return `Para tus campañas de Amazon Ads, te sugiero esta estrategia:

**Fase 1 (Semana 1-2)**: Sponsored Products
- Budget: 10-15€/día
- Keywords: exactas de alta relevancia
- Objetivo: Recoger datos

**Fase 2 (Semana 3-4)**: Expansión
- Añadir Sponsored Display
- Keywords de competidores
- Budget: 20€/día

**Fase 3 (Mes 2)**: Optimización
- Eliminar keywords sin conversión
- Aumentar pujas en top performers
- Añadir Sponsored Brands si aplica

¿Necesitas ayuda con alguna fase específica?`;
    }
    
    if (lastMessage.toLowerCase().includes('asin') || lastMessage.toLowerCase().includes('competidor')) {
      return `Para analizar competidores, te recomiendo:

1. **Identificar los top 10 ASINs** de tu categoría
2. **Analizar sus keywords** con herramientas como Helium10 o Jungle Scout
3. **Revisar sus puntos débiles** en reseñas negativas
4. **Estudiar su A+ Content** para mejorar el tuyo

Puedo hacer un análisis detallado si me das un ASIN específico. ¿Cuál te interesa?`;
    }
    
    // Default helpful response
    return `¡Hola! Estoy aquí para ayudarte con tu estrategia de publicidad en Amazon.

Puedo asistirte con:
- 🔑 **Generación de keywords** relevantes para tu libro
- 📊 **Análisis de competidores** (ASINs)
- ✍️ **Copywriting** para títulos y descripciones
- 📈 **Estrategias de campaña** personalizadas
- 💡 **Optimización** de tus anuncios existentes

${bookInfo?.title ? `Veo que tu libro es "${bookInfo.title}". ` : ''}¿En qué te puedo ayudar hoy?`;
  },
};

export async function streamDemoResponse(
  request: AIRequest,
  options: Partial<DemoStreamOptions>
): Promise<string> {
  const action = request.action;
  const responseGenerator = demoResponses[action] || demoResponses['chat'];
  const responseText = responseGenerator(request);
  
  await simulateStream(responseText, options);
  
  return responseText;
}
