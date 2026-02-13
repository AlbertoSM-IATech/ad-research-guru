

# Integrar Base de Conocimiento KDP/Amazon Ads en el modulo

## Resumen

Se trata de enriquecer toda la interfaz del modulo con tooltips, helper texts y consejos basados en la documentacion oficial de Amazon KDP y Amazon Ads que has proporcionado. No se toca ninguna logica existente; solo se anade contenido educativo contextual donde el usuario lo necesita.

## Cambios propuestos

### 1. Actualizar las secciones educativas (CollapsibleEducation)

El contenido actual en `educationSections` es generico y basico. Se reescribira con informacion oficial organizada en 4 secciones:

- **Conceptos KDP**: Keywords (max 7 frases), categorias (max 3), titulo+subtitulo (max 200 chars), metadata guidelines, no promos/URLs/HTML en titulo
- **Buenas Practicas Ads**: ACOS/ROAS/TACOS explicados, targeting auto vs manual (lock tras lanzar), match types (broad/phrase/exact), keywords max 10 palabras/80 caracteres, dynamic bidding
- **Errores Comunes**: keyword stuffing en titulo, no declarar IA, categorias irrelevantes, optimizar con poca data, ignorar latencias de reportes (hasta 14 dias)
- **Checklist Rapido**: Revisar cada 2 semanas, minar Search Term Report quincenal, anadir negativos para gasto irrelevante

### 2. Tooltips contextuales en campos clave

Anadir/mejorar tooltips con contenido oficial en los siguientes puntos:

**En BookInfoPanelCompact (contexto del libro):**
- **Titulo**: "Usa solo el titulo tal como aparece en la portada. Evita promos, rank claims, URLs y HTML. Titulo+subtitulo max 200 caracteres."
- **Subtitulo**: "Complementa el titulo sin repetir keywords. Titulo+subtitulo max 200 caracteres total."
- **PVP**: "Precio medio de la competencia. eBooks 70% requieren rango especifico por marketplace."
- **Regalias**: "Regalias promedio del nicho. eBooks: 35% o 70% (territorios elegibles, descuenta delivery cost). Print: 50-60% segun marketplace."

**En KeywordDetailPanel (panel lateral - pestana Nicho):**
- **Volumen de busqueda**: "KDP permite hasta 7 keywords/frases. Prioriza terminos especificos sobre genericos."
- **Competidores**: "Numero de resultados competidores. Menos es mejor para nichos emergentes."
- **Fuente de trafico**: "Identifica la fuente principal: Amazon organico es ideal, trafico de marca o RRSS reduce el market score."
- **Market Score**: "Puntuacion compuesta basada en volumen, competencia, precio y regalias. Calibra los criterios por mercado antes de analizar."

**En KeywordDetailPanel (pestana Ads):**
- **Fase**: "Lanzamiento: visibilidad inicial. Dominio: consolidar posicion. Beneficio: optimizar rentabilidad."
- **ACOS**: "Advertising Cost of Sales = Gasto / Ventas. Cuanto menor, mas rentable. Compara con tu Punto de Equilibrio."
- **CPC**: "Coste por clic actual. Revisa bids cada 2 semanas: sube top performers, baja no convertidores."
- **Impresiones**: "Numero de veces que se muestra tu anuncio. Sin impresiones, revisa relevancia de keywords y bid."
- **CTR**: "Click-Through Rate = Clics / Impresiones. Un 3-5% es optimo. Bajo CTR sugiere mejorar portada o titulo."

**En AcosEquilibrioSection (panel ACOS):**
- **Punto de Equilibrio**: "ACOS maximo para no perder dinero. PE = (Regalias / PVP) x 100."
- **ACOS Sig. Click**: "Simula como quedaria tu ACOS si recibieras un clic mas sin venta. Util para anticipar riesgo."
- **Snapshot**: (ya tiene tooltip, se mejorara el texto con referencia a latencias de datos: "Los reportes de Amazon pueden tardar hasta 14 dias en reflejar datos finales.")

### 3. Tooltips en wizards de creacion

**NewKeywordWizard (crear keyword):**
- **Campo keyword**: "Usa frases especificas (2-4 palabras). Evita keywords vagas, claims subjetivos o info temporal ('new', 'bestselling')."
- **Proposito (editorial/ads)**: "Editorial: para estudio de nicho y descubribilidad. Ads: para gestion de campanas publicitarias."

**NewAdsKeywordWizard (crear keyword Ads):**
- **Campana**: "Una vez live, no puedes cambiar el tipo de targeting. Crea campanas separadas si necesitas auto y manual."
- **Fase**: "Lanzamiento: bid agresivo para ganar visibilidad. Dominio: mantener posicion. Beneficio: reducir ACOS."
- **Impresiones/Clics**: "Datos de tu consola de Amazon Ads. Los reportes pueden tardar hasta 14 dias en ser definitivos."

### 4. Helper text en importaciones masivas

**ImportHelpTooltip** - Anadir una nota adicional en cada tipo:
- **Keywords**: "Recuerda: KDP permite max 7 keywords por libro. Para Ads, limite de 10 palabras y 80 caracteres por keyword."
- **ASINs**: "Los ASINs se usan para product targeting en campanas manuales."

### 5. Mejoras en el Tour Guiado

Actualizar 2-3 pasos del `GuidedTour` con tips mas accionables basados en la guia:
- Paso "marketplace": Tip actualizado a "El marketplace afecta royalties, precios permitidos y categorias. Configura los criterios antes de analizar."
- Paso "Estudio KW": Tip actualizado a "KDP permite hasta 7 keywords. Evita keyword stuffing, claims subjetivos y URLs."

## Seccion tecnica

### Archivos a modificar

1. **`src/components/advertising/AdvertisingResearch.tsx`**
   - Reescribir `educationSections` con 4 secciones ricas basadas en la guia oficial

2. **`src/components/advertising/BookInfoPanelCompact.tsx`**
   - Anadir tooltips a los campos Titulo, Subtitulo, PVP y Regalias

3. **`src/components/advertising/KeywordDetailPanel.tsx`**
   - Anadir/mejorar tooltips en campos de la pestana Nicho (volumen, competidores, trafico) y Ads (fase, ACOS, CPC, impresiones, CTR)

4. **`src/components/advertising/AcosEquilibrioSection.tsx`**
   - Mejorar tooltip del snapshot y anadir tooltips al PE y ACOS Sig. Click

5. **`src/components/advertising/NewKeywordWizard.tsx`**
   - Anadir helper text/tooltips al campo keyword y proposito

6. **`src/components/advertising/NewAdsKeywordWizard.tsx`**
   - Anadir helper text/tooltips a campana, fase, impresiones, clics

7. **`src/components/advertising/ImportHelpTooltip.tsx`**
   - Anadir nota sobre limites oficiales de KDP/Ads

8. **`src/components/advertising/GuidedTour.tsx`**
   - Actualizar tips de 2-3 pasos con informacion oficial

### Sin cambios de logica
Todos los calculos, flujos, persistencia y handlers permanecen exactamente iguales. Solo se anade/mejora contenido textual (tooltips, helper texts, secciones educativas).

