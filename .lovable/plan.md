

# Plan: Sincronizar datos Amazon Ads con la tabla de keywords y panel lateral

## El problema

Actualmente hay dos sistemas de datos desconectados:

1. **Keyword.adsData** (manual): cada keyword tiene `clicks`, `cpcActual`, `pedidos`, `impresiones`, etc. introducidos a mano. Es lo que muestra la tabla de "Gestion de Ads" y el panel lateral.
2. **Amazon Ads Store** (importado): datos por campana/target/adgroup con metricas diarias (`impressions`, `clicks`, `spend`, `sales`, `orders`). Viven en un localStorage separado.

La tabla y el panel lateral solo leen de `keyword.adsData`. Los datos importados no llegan ahi.

## Solucion propuesta: Enlace keyword-target + agregacion automatica

La idea es crear un **puente** entre ambos sistemas sin romper la entrada manual existente:

### 1. Anadir campo de enlace en cada keyword

Anadir un campo opcional `amazonAdsTargetKeys?: string[]` en la interfaz `Keyword`. Este campo almacena las claves de targets/campanas del store de Amazon Ads que corresponden a esa keyword.

### 2. Crear un hook de sincronizacion

Un nuevo hook `useAmazonAdsSync` que:
- Recibe las keywords y el store de Amazon Ads.
- Para cada keyword que tenga `amazonAdsTargetKeys`, agrega las metricas diarias correspondientes (suma de impressions, clicks, spend, sales, orders por periodo).
- Devuelve un mapa `keywordId -> metricas agregadas de Amazon Ads`.

### 3. Enriquecer keyword.adsData con datos importados

En lugar de sobreescribir los datos manuales, el sistema:
- Agrega metricas importadas y las inyecta en `keyword.adsData` cuando el usuario lo confirme (boton "Sincronizar desde Amazon Ads").
- O bien muestra ambas fuentes en paralelo en el panel lateral: una seccion "Datos manuales" y otra "Datos Amazon Ads (importados)".

**Opcion recomendada**: Auto-match + confirmacion. El sistema intenta hacer match automatico entre el texto de la keyword y los `targetText` del store importado, y el usuario confirma o corrige.

### 4. Auto-matching inteligente

Logica de matching:
- Normalizar ambos textos (lowercase, trim, eliminar acentos).
- Si `keyword.keyword` coincide exactamente con algun `target.targetText` del store importado, proponer enlace.
- Si hay coincidencia parcial (contenido), proponer con confianza media.
- El usuario puede enlazar manualmente desde el panel lateral (dropdown con targets disponibles).

### 5. Visualizacion en tabla y panel lateral

**En la tabla de Ads**:
- Si una keyword tiene datos importados enlazados, mostrar un icono pequeno (ej: nube con flecha) junto a las metricas para indicar que vienen de Amazon Ads.
- Las metricas importadas (clicks, spend, sales, orders, impressions) llenan automaticamente los campos equivalentes de adsData.

**En el panel lateral (KeywordDetailPanel)**:
- Nueva seccion "Amazon Ads" debajo de la seccion de Ads existente.
- Muestra metricas agregadas del periodo seleccionado.
- Boton para cambiar el enlace target o desvincular.
- Historico diario disponible (grafico de tendencia con datos importados).

---

## Detalle tecnico

### Archivos a modificar

1. **`src/types/advertising.ts`**: Anadir `amazonAdsTargetKeys?: string[]` a la interfaz `Keyword` y `importedAdsData?: ImportedAdsMetrics` a `AdsData`.

2. **`src/types/amazon-ads.ts`**: Anadir interfaz `ImportedAdsMetrics` con los campos agregados (impressions, clicks, spend, sales, orders, ctr, cpc, acos, roas, dateRange).

### Archivos nuevos a crear

3. **`src/hooks/useAmazonAdsSync.ts`**: Hook que recibe keywords + amazonAdsStore y devuelve:
   - `matchSuggestions`: mapa de keyword.id a targets sugeridos (auto-match).
   - `aggregatedMetrics`: mapa de keyword.id a metricas agregadas del store.
   - `linkKeywordToTargets(keywordId, targetKeys[])`: funcion para enlazar.
   - `unlinkKeyword(keywordId)`: funcion para desvincular.

4. **`src/components/advertising/amazon-ads/KeywordAdsLinkPanel.tsx`**: Componente para el panel lateral que muestra metricas importadas y permite gestionar el enlace keyword-target.

### Archivos a modificar

5. **`src/components/advertising/KeywordsSection.tsx`**: Usar `useAmazonAdsSync` para enriquecer la tabla de Ads. Si hay datos importados, mostrar icono indicador y rellenar metricas.

6. **`src/components/advertising/KeywordDetailPanel.tsx`**: Anadir seccion "Amazon Ads (importados)" con metricas agregadas y gestion del enlace.

### Flujo del usuario

```text
1. Usuario importa datos Amazon Ads (wizard existente)
2. El sistema detecta matches entre keywords y targets importados
3. En la tabla, aparece un aviso: "3 keywords tienen datos Amazon Ads disponibles"
4. El usuario puede:
   a) Aceptar todos los matches sugeridos (boton bulk)
   b) Revisar uno a uno desde el panel lateral
5. Al enlazar, las metricas importadas se reflejan en la tabla
6. Los datos manuales previos se preservan (no se sobreescriben)
```

### Regla de prioridad de datos

- Si hay datos importados Y manuales, los importados tienen prioridad (son mas fiables).
- Los datos manuales se mantienen como fallback y para campos que no existen en la importacion (faseActual, guias de ACOS).
- En el panel lateral se muestra un indicador claro de la fuente: "Manual" vs "Amazon Ads".

