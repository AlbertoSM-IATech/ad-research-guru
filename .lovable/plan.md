

# Separar en 2 Submodulos con Sidebar de Navegacion

## Resumen

El monolito `AdvertisingResearch` se divide en 2 submodulos independientes accesibles desde un sidebar lateral:

1. **Estudio de Nicho** - Keywords (vista editorial) + Visualizaciones
2. **Gestion de ADS** - Keywords (vista ads) + Dashboard de Ads

Ambos comparten: Economia del Libro, Keyword Principal, Marketplace, y datos persistidos. ASIN y Categorias quedan ocultos (preparados para el futuro). Cada submodulo tendra su propio tour guiado.

## Arquitectura propuesta

```text
App.tsx
  +-- SidebarProvider
        +-- AppSidebar (sidebar lateral)
        |     - "Estudio de Nicho" (link a /estudio)
        |     - "Gestion de ADS"  (link a /ads)
        |     - Separador
        |     - ThemeToggle, Backup, Settings, Reset (acciones globales)
        +-- main content
              +-- Routes
                    /estudio -> NicheStudyModule
                    /ads     -> AdsManagementModule
```

### Datos compartidos

Se creara un contexto React (`AdvertisingDataContext`) que centralizara:
- `bookInfo`, `bookEconomy` (compartidos)
- `keywordsByMarket` (compartido, cada vista filtra por `purpose`)
- `selectedMarketplace`
- Persistence (el mismo `useLocalPersistence`)
- Handlers de CRUD de keywords (compartidos)
- Sync status, pending changes

Esto evita duplicar la logica de estado/persistencia y mantiene los datos sincronizados entre submodulos.

### Componentes nuevos

1. **`src/components/advertising/AdvertisingDataProvider.tsx`** - Context provider con toda la logica de estado, persistencia y CRUD extraida de `AdvertisingResearch.tsx` (lineas 71-587 aprox.)

2. **`src/components/advertising/AppSidebar.tsx`** - Sidebar lateral con 2 items de navegacion, iconos, acciones globales (backup, settings, reset, theme)

3. **`src/components/advertising/NicheStudyModule.tsx`** - Submodulo 1: BookInfoPanelCompact + KeywordsSection (forzado a vista editorial) + toggle Datos/Visualizaciones + StatsPanel + VisualizationsTab + CollapsibleEducation

4. **`src/components/advertising/AdsManagementModule.tsx`** - Submodulo 2: BookInfoPanelCompact (solo lectura o compartido) + KeywordsSection (forzado a vista ads) + AdsDashboard + AcosAlertsTray

5. **`src/components/advertising/NicheTour.tsx`** - Tour guiado especifico para Estudio de Nicho (5-6 pasos: bienvenida, marketplace, contexto libro, keywords editorial, importar KW, visualizaciones)

6. **`src/components/advertising/AdsTour.tsx`** - Tour guiado especifico para Gestion de ADS (5-6 pasos: bienvenida, dashboard, keywords ads, importar ads, ACOS/PE, alertas)

### Componentes modificados

7. **`src/App.tsx`** - Envolver en `SidebarProvider`, agregar rutas `/estudio` y `/ads`, redirect `/` a `/estudio`

8. **`src/pages/Index.tsx`** - Reemplazar con layout de sidebar + outlet de rutas

9. **`src/components/advertising/KeywordsSection.tsx`** - Recibir prop `forcedView: 'editorial' | 'ads'` para eliminar el switch editorial/ads interno. Cada submodulo pasa la vista que corresponde.

10. **`src/components/advertising/GuidedTour.tsx`** - Refactorizar para aceptar `steps: TourStep[]` como prop en lugar de usar `TOUR_STEPS` hardcoded. Los steps se definen en cada modulo.

### Componentes que quedan ocultos (sin eliminar)

- `ASINSection.tsx` - no se renderiza en ninguno de los 2 submodulos
- `CategoriesSection.tsx` - no se renderiza en ninguno de los 2 submodulos
- Las tabs ASIN/Categorias desaparecen del UI

## Sidebar: Diseno

El sidebar sera minimalista:
- Ancho expandido: ~220px, colapsado: ~56px (solo iconos)
- 2 items principales con iconos:
  - BookOpen + "Estudio de Nicho"
  - Megaphone + "Gestion de ADS" (con badge "Plus" si aplica plan gating)
- Seccion inferior: MarketplaceSelector, ThemeToggle, Backup, Settings, Reset
- Toggle de colapso via `SidebarTrigger`
- Highlight del item activo via NavLink

## Tours rediseñados

### Tour "Estudio de Nicho" (6 pasos)
1. Bienvenida - "Este modulo te ayuda a investigar nichos y seleccionar keywords editoriales"
2. Marketplace - "Selecciona el mercado que quieres analizar"
3. Contexto del Libro - "Define titulo, precio y regalias para calcular metricas"
4. Keywords - "Aqui gestionas tus keywords de investigacion. KDP permite hasta 7 por libro"
5. Importar - "Importa datos de Helium 10, BookBeam o Publisher Rocket"
6. Visualizaciones - "Cambia a la vista de graficos para ver patrones y oportunidades"

### Tour "Gestion de ADS" (6 pasos)
1. Bienvenida - "Este modulo gestiona tus campanas de Amazon Ads"
2. Dashboard - "Vista global de rendimiento: Gasto, Ventas, ACOS y alertas"
3. Keywords Ads - "Gestiona keywords de campanas con metricas de rendimiento"
4. Importar Ads - "Importa datos directamente desde tu consola de Amazon Ads"
5. ACOS y PE - "Compara tu ACOS actual con el Punto de Equilibrio para evaluar rentabilidad"
6. Alertas - "Recibe avisos cuando keywords superan el PE o tienen anomalias"

## Seccion tecnica detallada

### Archivos nuevos

1. **`src/components/advertising/AdvertisingDataProvider.tsx`**
   - Extraer de AdvertisingResearch: useState de bookInfo, bookEconomy, keywordsByMarket, asinsByMarket, categoriesByMarket, campaignPlansByMarket, selectedMarketplace
   - Extraer hydration, persistence, sync status, pending changes
   - Extraer todos los handlers CRUD (handleAddKeyword, handleUpdateKeyword, etc.)
   - Exportar via `useAdvertisingData()` hook

2. **`src/components/advertising/AppSidebar.tsx`**
   - Usa componentes de `@/components/ui/sidebar`
   - NavLink para `/estudio` y `/ads`
   - Acciones globales en el footer del sidebar

3. **`src/components/advertising/NicheStudyModule.tsx`**
   - Consume `useAdvertisingData()` para obtener datos y handlers
   - Renderiza BookInfoPanelCompact, toggle Datos/Visualizaciones, KeywordsSection (forcedView='editorial'), StatsPanel, VisualizationsTab, CollapsibleEducation
   - Tour propio con NicheTour

4. **`src/components/advertising/AdsManagementModule.tsx`**
   - Consume `useAdvertisingData()` para obtener datos y handlers
   - Renderiza BookInfoPanelCompact, AdsDashboard, KeywordsSection (forcedView='ads'), AcosAlertsTray
   - Tour propio con AdsTour

5. **`src/components/advertising/NicheTour.tsx`** y **`src/components/advertising/AdsTour.tsx`**
   - Definen sus propios TOUR_STEPS
   - Usan el GuidedTour refactorizado pasando steps como prop

### Archivos modificados

6. **`src/App.tsx`** - Layout con SidebarProvider + rutas
7. **`src/pages/Index.tsx`** - Redirect a /estudio o layout wrapper
8. **`src/components/advertising/KeywordsSection.tsx`** - Prop `forcedView` que fuerza editorial o ads sin el switch interno
9. **`src/components/advertising/GuidedTour.tsx`** - Aceptar `steps` como prop
10. **`src/components/advertising/AdvertisingResearch.tsx`** - Se puede mantener como legacy o eliminar gradualmente

### Sin cambios de logica
Toda la logica de persistencia, calculos de ACOS, market score, filtros, sorting, imports y exports se mantiene identica. Solo se reorganiza donde vive el estado (context en vez de componente monolitico) y como se renderiza (2 modulos en vez de 1 con tabs).

