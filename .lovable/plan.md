
# Navegacion entre keywords y panel redimensionable

## Que se va a hacer

1. **Botones Anterior/Siguiente en el panel lateral**: Dos botones (flecha arriba y flecha abajo) en el header del panel para navegar entre las keywords visibles en la tabla sin cerrar el panel.

2. **Panel redimensionable manualmente**: Reemplazar el ancho fijo del Sheet por un sistema donde el usuario puede arrastrar el borde izquierdo del panel para ajustar el ancho a su gusto. El ancho elegido se guarda en localStorage.

## Detalles tecnicos

### Navegacion prev/next

- Agregar dos nuevas props a `KeywordDetailPanel`:
  - `visibleKeywordIds: string[]` - lista ordenada de IDs de keywords visibles en la tabla (de `filteredKeywords`)
  - `onNavigate: (keywordId: string) => void` - callback para cambiar la keyword seleccionada (llama a `setSelectedKeywordId`)

- En el header del panel, junto al titulo, mostrar botones ChevronUp/ChevronDown con el indice actual (ej: "3 de 15")
- Desactivar ChevronUp si es la primera, ChevronDown si es la ultima

### Panel redimensionable

- Sobreescribir el ancho del `SheetContent` con un estilo dinamico controlado por estado
- Agregar un handle de arrastre en el borde izquierdo del panel (similar al patron de `ResizableTableHeader`)
- Ancho minimo: 400px, maximo: 80% del viewport
- Persistir el ancho en localStorage con clave `panel-detail-width`

### Archivos a modificar

1. **`src/components/advertising/KeywordDetailPanel.tsx`**
   - Nuevas props: `visibleKeywordIds`, `onNavigate`
   - Botones prev/next en el SheetHeader
   - Handle de resize en el borde izquierdo del SheetContent
   - Estado de ancho con persistencia en localStorage

2. **`src/components/advertising/KeywordsSection.tsx`**
   - Pasar `visibleKeywordIds` (array de IDs de `filteredKeywords`) y `onNavigate` (que llama a `setSelectedKeywordId`) al KeywordDetailPanel
