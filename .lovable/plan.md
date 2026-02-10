

# Wizard dedicado para crear Keywords desde la pestaña de Ads

## Problema actual
Cuando estás en la vista de "Gestion de Ads" y pulsas "Nueva", se abre el mismo wizard de 4 pasos diseñado para "Estudio de Nicho" (mercado, estructura, editorial...). Ese flujo no tiene sentido para Ads, donde lo que necesitas es meter directamente la keyword con sus datos de rendimiento publicitario.

## Solucion

Crear un nuevo wizard simplificado de **2 pasos** exclusivo para la vista de Ads:

### Paso 1 - Keyword y Campana
- Keyword (texto, obligatorio, con deteccion de duplicados)
- Campana (selector reutilizando CampaignSelect existente)
- Fase actual (Lanzamiento / Dominio / Beneficio)

### Paso 2 - Datos de rendimiento
- Impresiones
- Clicks
- CPC
- Pedidos
- Gasto
- Ventas
- Resumen automatico calculado: CTR, ACOS, Conversion, Beneficio
- Boton "Guardar" que crea la keyword con `purpose: 'ads'`

Todos los campos de rendimiento son opcionales (se pueden dejar en 0 para rellenar luego desde la tabla o el panel lateral).

## Comportamiento
- Se abre SOLO cuando `functionalView === 'ads'` y el usuario pulsa "Nueva" o escribe + Enter
- La keyword se crea con `purpose: 'ads'`, `status: 'pending'`, y los datos de Ads en `adsData`
- Los campos de Market Score se rellenan con valores por defecto (no se piden al usuario)
- La deteccion de duplicados funciona igual que en el wizard actual

## Seccion tecnica

### Archivo nuevo
- `src/components/advertising/NewAdsKeywordWizard.tsx` - Wizard de 2 pasos con dialog, campos de Ads, calculos automaticos (CTR, ACOS, Beneficio), y reutilizacion de `CampaignSelect`

### Archivos modificados
- `src/components/advertising/KeywordsSection.tsx`:
  - Importar `NewAdsKeywordWizard`
  - Nuevo estado `isAdsWizardOpen`
  - Cuando `functionalView === 'ads'`, el boton "Nueva" abre `NewAdsKeywordWizard` en lugar de `NewKeywordWizard`
  - Handler `handleAdsWizardComplete` que crea la keyword con `createKeywordDefaults` + `adsData`

### Reutilizacion
- `CampaignSelect` para seleccion/creacion de campanas
- `createKeywordDefaults` de `keyword-helpers.ts` para crear la keyword base
- `findDuplicateKeyword` de `keyword-builder.ts` para deteccion de duplicados
- Funciones de calculo de `acosEquilibrio.ts` para CTR, ACOS, Conversion en el resumen
- `getCurrencySymbol` para mostrar la moneda correcta del marketplace

