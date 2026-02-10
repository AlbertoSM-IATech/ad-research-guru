

# Separar Keywords entre Estudio de Nicho y Gestion de Ads

## Situacion actual

Ambas vistas (Estudio de Nicho y Gestion de Ads) muestran exactamente las mismas keywords porque comparten el mismo array `keywordsByMarket` sin ningun filtro. Cada keyword ya tiene un campo `purpose` con valores posibles: `editorial`, `ads` o `both`, pero no se usa para filtrar.

## Solucion

Usar el campo `purpose` existente como filtro principal, y agregar un boton "Enviar a..." para mover keywords entre vistas.

### Paso 1 - Filtrar keywords por vista

En `KeywordsSection.tsx`, antes de aplicar los filtros existentes, filtrar segun `functionalView`:

- Vista **Estudio de Nicho** (`editorial`): mostrar solo keywords con `purpose === 'editorial'` o `purpose === 'both'`
- Vista **Gestion de Ads** (`ads`): mostrar solo keywords con `purpose === 'ads'` o `purpose === 'both'`

### Paso 2 - Asignar purpose automaticamente al crear/importar

- **Wizard (NewKeywordWizard)**: detectar desde que vista se abre y asignar `purpose` automaticamente (`editorial` si se abre desde Estudio, `ads` si se abre desde Gestion de Ads)
- **Import CSV keywords** (AdvancedImportModal): asignar `purpose = 'editorial'` (solo se abre desde vista editorial)
- **Import Amazon Ads** (AmazonAdsImportModal): asignar `purpose = 'ads'` a keywords creadas
- **Import en lote** (handleAddBulkKeywords): respetar el purpose que traiga cada keyword

### Paso 3 - Boton "Enviar a..." en la tabla

Agregar acciones para mover keywords entre vistas:

- En la barra de acciones bulk (cuando hay keywords seleccionadas): boton "Enviar a Estudio de Nicho" o "Enviar a Gestion de Ads" segun la vista actual
- Al pulsar, cambia el `purpose` de las keywords seleccionadas:
  - Desde Editorial -> cambia purpose a `both` (la mantiene en editorial y la agrega a ads)
  - Desde Ads -> cambia purpose a `both` (la mantiene en ads y la agrega a editorial)
- Opcion adicional: "Mover a..." (quitar de la vista actual y poner solo en la otra): cambia purpose a `ads` o `editorial` exclusivamente

### Paso 4 - Indicador visual

- Badge discreto en cada keyword que esta en ambas vistas (`purpose === 'both'`), mostrando un icono de enlace o texto "Ambas"
- En el panel lateral (KeywordDetailPanel): selector de `purpose` para poder cambiar manualmente si una keyword es editorial, ads o ambas

## Detalles tecnicos

### Archivos a modificar

1. **`src/components/advertising/KeywordsSection.tsx`**
   - Agregar filtro por `purpose` en el `useMemo` de `filteredAndSortedKeywords`
   - Pasar `functionalView` al wizard para auto-asignar purpose
   - Agregar botones "Enviar a..." en toolbar de seleccion bulk
   - Badge visual para keywords con `purpose === 'both'`

2. **`src/components/advertising/NewKeywordWizard.tsx`**
   - Recibir prop `defaultPurpose: KeywordPurpose` 
   - Usar como valor por defecto del campo purpose en Step 1

3. **`src/components/advertising/AmazonAdsImportModal.tsx`**
   - Asignar `purpose: 'ads'` a las keywords nuevas creadas durante la importacion

4. **`src/components/advertising/AdvancedImportModal.tsx`**
   - Asignar `purpose: 'editorial'` a las keywords importadas

5. **`src/components/advertising/KeywordDetailPanel.tsx`**
   - Agregar selector de `purpose` (editorial / ads / ambas) para cambio manual

6. **`src/components/advertising/BulkActionsToolbar.tsx`** (o inline en KeywordsSection)
   - Botones "Enviar a Ads" / "Enviar a Estudio" / "Mover a..."

### Logica de filtrado (pseudocodigo)

```text
if functionalView === 'editorial':
  keywords.filter(k => k.purpose === 'editorial' || k.purpose === 'both')
if functionalView === 'ads':
  keywords.filter(k => k.purpose === 'ads' || k.purpose === 'both')
```

### Migracion de datos existentes

Las keywords existentes que ya tienen `purpose: 'both'` (el default actual) seguiran apareciendo en ambas vistas. El usuario puede reasignarlas manualmente usando la seleccion bulk o el panel lateral.

