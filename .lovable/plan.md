
# Añadir campos de Ads al importador CSV y soporte italiano

## Problema

1. El campo "Acquisti" (pedidos en italiano) no se reconoce porque no esta en los alias de ninguna plantilla
2. Campos como "Pedidos", "Clicks", "Impresiones" y "CPC" no aparecen como opciones en el selector de mapeo del Paso 2, asi que el usuario no puede asignarlos manualmente

## Solucion

### 1. Ampliar IMPORTABLE_FIELDS con campos de Ads

Añadir los siguientes campos al array `IMPORTABLE_FIELDS` en `src/lib/import/templates.ts`:

- `clicks` - Clicks
- `impressions` - Impresiones  
- `orders` - Pedidos
- `spend` - Gasto
- `sales` - Ventas

### 2. Añadir alias en italiano (y otros idiomas) a las plantillas

En la plantilla `custom` (y opcionalmente en las demas), añadir alias italianos:

- `orders`: "Acquisti", "Ordini", "Pedidos", "Orders"
- `clicks`: "Clic", "Clicks", "Click"
- `impressions`: "Impressioni", "Impresiones", "Impressions"
- `spend`: "Spesa", "Gasto", "Spend", "Cost"
- `sales`: "Vendite", "Ventas", "Sales"

### 3. Procesar los nuevos campos en AdvancedImportModal

En `processRows` de `AdvancedImportModal.tsx`, añadir los nuevos campos al `mappedData` y al crear la keyword, inyectar los valores en el objeto `adsData`.

## Archivos a modificar

1. **`src/lib/import/templates.ts`**
   - Ampliar `IMPORTABLE_FIELDS` con clicks, impressions, orders, spend, sales
   - Añadir alias italianos/españoles/ingleses en la plantilla custom (y en las demas para cobertura)

2. **`src/components/advertising/AdvancedImportModal.tsx`**
   - Ampliar `ParsedRow.mappedData` para incluir los nuevos campos
   - En `processRows`, parsear los nuevos campos numericos
   - En `handleImport`, inyectar los valores en `adsData` de la keyword creada
