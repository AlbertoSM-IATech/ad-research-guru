

# Plan: Importar datos Amazon Ads

## Resumen

Implementar el sistema completo de importacion de datos de Amazon Ads: wizard de 5 pasos, modelo de datos, parsing/normalizacion, dashboard post-importacion y recomendaciones accionables. Todo con persistencia en localStorage separada del sistema existente.

---

## Fase 1: Modelo de datos + Parsing + Normalizacion

### Archivos nuevos a crear:

1. **`src/types/amazon-ads.ts`** -- Interfaces completas: AdsImportBatch, AdsEntityCampaign, AdsEntityAdGroup, AdsEntityTarget, AdsDailyMetrics, RecommendationRule, ThresholdConfig.

2. **`src/lib/amazon-ads/column-aliases.ts`** -- Diccionario de sinonimos EN/ES para columnas tipicas de Amazon Ads (impressions/impresiones, clicks/clics, spend/gasto, etc.).

3. **`src/lib/amazon-ads/normalizers.ts`** -- Funciones para normalizar numeros (1.234,56 y 1,234.56), fechas (YYYY-MM-DD, DD/MM/YYYY a ISO), y eliminar simbolos de moneda.

4. **`src/lib/amazon-ads/column-mapper.ts`** -- Auto-mapeo de columnas del archivo al esquema interno usando aliases. Devuelve confianza Alta/Media/Baja.

5. **`src/lib/amazon-ads/sheet-detector.ts`** -- Deteccion de pestanas en Excel, analisis de headers para determinar la mejor pestana y tipo de datos.

6. **`src/lib/amazon-ads/row-parser.ts`** -- Parseo fila a fila: extraccion de entidades, normalizacion de metricas, generacion de hash anti-duplicados.

7. **`src/lib/amazon-ads/metrics-calculator.ts`** -- Calculo de metricas derivadas (CTR, CPC, CVR, ACOS, ROAS) con safe division (null si divisor es 0).

8. **`src/lib/amazon-ads/recommendations.ts`** -- Motor de reglas para generar recomendaciones accionables con umbrales configurables.

9. **`src/hooks/useAmazonAdsData.ts`** -- Hook para gestionar estado de datos importados en localStorage (`amazon-ads:{bookId}:v1`). CRUD de batches, entidades y metricas. Upsert por hash.

---

## Fase 2: Wizard de importacion (5 pasos)

### Archivos nuevos a crear:

10. **`src/components/advertising/amazon-ads/AmazonAdsImportWizard.tsx`** -- Wizard modal principal con 5 pasos, control de navegacion y estado global del proceso de importacion.

11. **`src/components/advertising/amazon-ads/Step1Config.tsx`** -- Paso 1: Selectores de marketplace, moneda, tipo de anuncio (SP/SB/SD), ventana de atribucion (7/14/30d), campo de etiqueta.

12. **`src/components/advertising/amazon-ads/Step2Upload.tsx`** -- Paso 2: Zona drag-and-drop multi-archivo con lista de archivos y estados (pendiente/analizando/listo/error).

13. **`src/components/advertising/amazon-ads/Step3Mapping.tsx`** -- Paso 3: Selector de pestana para Excel multi-hoja, preview de 20 filas, panel de columnas detectadas, editor de mapeo manual.

14. **`src/components/advertising/amazon-ads/Step4Validation.tsx`** -- Paso 4: Errores bloqueantes, warnings, resumen de filas validas/descartadas y entidades detectadas.

15. **`src/components/advertising/amazon-ads/Step5Import.tsx`** -- Paso 5: Barra de progreso (Analizando, Normalizando, Guardando, Finalizado), CTAs post-importacion.

### Archivos a modificar:

16. **`src/components/advertising/KeywordsSection.tsx`** -- Reemplazar la importacion y uso de `AmazonAdsImportPlaceholder` por `AmazonAdsImportWizard`. Anadir renderizado condicional del dashboard de Amazon Ads cuando hay datos importados.

### Archivos a eliminar:

17. **`src/components/advertising/AmazonAdsImportPlaceholder.tsx`** -- Se elimina por completo, sustituido por el wizard funcional.

---

## Fase 3: Dashboard post-importacion + Recomendaciones

### Archivos nuevos a crear:

18. **`src/components/advertising/amazon-ads/AmazonAdsDashboard.tsx`** -- Dashboard con tarjetas de metricas globales (gasto total, ventas, ACOS global, CTR medio, CPC medio, campanas activas), top 5 campanas por gasto/ventas/peor ACOS.

19. **`src/components/advertising/amazon-ads/CampaignTable.tsx`** -- Tabla de campanas con filtros (rango de fechas, adType, buscador por nombre), ordenacion por todas las metricas, semaforo por fila (verde/amarillo/rojo).

20. **`src/components/advertising/amazon-ads/RecommendationsPanel.tsx`** -- Seccion "Que haria ahora" con tarjetas agrupadas: fugas de clics, gasto sin retorno, candidatos a escalar, limpieza de search terms, optimizacion CTR. Cada tarjeta con explicacion y acciones sugeridas.

21. **`src/components/advertising/amazon-ads/ThresholdConfig.tsx`** -- Popover para configurar umbrales por marketplace (ACOS objetivo, clicks minimos, gasto minimo para reglas).

### Archivos a modificar:

22. **`src/hooks/useLocalPersistence.ts`** -- Anadir prefijo `amazon-ads:` al `clearBookStorage` para que el reset de datos tambien limpie los datos importados de Amazon Ads.

---

## Detalles tecnicos clave

### Modelo de datos (localStorage separado)

- Clave: `amazon-ads:{bookId}:v1`
- Estructura: `{ version: 1, batches: [...], campaigns: [...], adgroups: [...], targets: [...], dailyMetrics: [...], thresholds: {...} }`
- Completamente independiente de `ad-research:{bookId}:v2`

### Anti-duplicados

- Hash por fila: combinacion de date + entityKey + adType + marketplace + metricas principales
- Modo por defecto: Sustituir (upsert). Modo "Mantener ambos" oculto tras boton Avanzado.

### Reglas de recomendaciones

| Regla | Condicion | Accion sugerida |
|---|---|---|
| Fuga de clics | clicks >= N, orders == 0 | Bajar puja, pausar target |
| Gasto sin retorno | spend > X, sales < Y | Reducir presupuesto |
| Candidato a escalar | ACOS < objetivo, orders > 0 | Subir presupuesto/puja |
| Search term negativo | spend > 0, orders == 0 | Sugerir como negativa |
| Search term ganador | orders > 0 | Pasar a exact/phrase |
| CTR bajo | CTR < umbral, impressions altas | Revisar relevancia |

### Dependencias

- No se instalan paquetes nuevos. Se usa `xlsx` y `papaparse` ya instalados.

### Impacto en codigo existente

- **KeywordsSection.tsx**: cambio minimo, solo swap de componente placeholder por wizard + renderizado condicional de dashboard.
- **useLocalPersistence.ts**: una linea adicional en clearBookStorage.
- Todo lo demas son archivos nuevos sin tocar la tabla ni el panel lateral existentes.

