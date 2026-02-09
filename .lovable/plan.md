# Plan: Needs Attention & Ads History - COMPLETED

## A) Fix: Keywords con "necesita atención" - DONE ✅

### Problema Resuelto
Las keywords con ACOS > PE ahora son visibles en ambos módulos con badge visual.

### Implementación
1. **Filtro `needsAttention`** añadido a `AdsFiltersState` en `AdvancedFiltersAds.tsx`
2. **Badge visual "Atención"** en las filas de la tabla cuando ACOS > PE
3. **Contador y toggle** "Necesitan atención: X" en la barra de herramientas (vista Ads)
4. **Lógica de filtrado** implementada en `KeywordsSection.tsx`

### Archivos Modificados
- `src/components/advertising/AdvancedFiltersAds.tsx` - Añadido campo `needsAttention: boolean`
- `src/components/advertising/KeywordsSection.tsx` - Badge visual + contador + filtro
- `src/lib/filter-presets.ts` - Actualizado default state

### Criterios de Aceptación ✅
- [x] KW con ACOS > PE sigue visible en tabla
- [x] Muestra badge "Atención" en rojo
- [x] Puedo editar sus métricas Ads
- [x] Toggle "Necesitan atención" filtra solo esas KW
- [x] No hay filtros ocultos que excluyan keywords

---

## B) Feature: Historial de métricas Ads - DONE ✅

### Implementación
1. **Sección "Historial de Métricas"** integrada en `AcosEquilibrioSection.tsx`
2. **Snapshots manuales** con botón "Guardar snapshot"
3. **Gráfico de evolución** con líneas para Clicks, Pedidos, ACOS
4. **Línea de referencia** para ACOS PE
5. **Selector de rango** (7d / 30d / 90d / Todo)
6. **Deltas de tendencia** (Δ Clicks, Δ Pedidos, Δ ACOS)
7. **Tabla compacta** de snapshots con eliminación

### Archivos Modificados
- `src/components/advertising/AcosEquilibrioSection.tsx` - Añadido componente `AdsHistorySection`

### Modelo de Datos (ya existente)
```typescript
interface AdsHistoryEntry {
  id: string;
  timestamp: Date;
  clicks: number;
  cpcActual: number;
  pedidos: number;
  gasto: number;
  ventas: number;
  acosActual: number | null;
  beneficio: number | null;
}
```

### Criterios de Aceptación ✅
- [x] Puedo guardar snapshot del estado actual
- [x] Veo histórico de ACOS, clicks, pedidos
- [x] Evolución por rango (7/30/90/todo)
- [x] Gráfico con línea de referencia PE
- [x] Puedo eliminar snapshots individuales

---

## Notas Técnicas

### Lógica de "Needs Attention"
- Es un **flag derivado**, no un estado persistido
- Se calcula como: `acosActual > acosEquilibrio`
- El campo `status` (pending/valid/discarded) no cambia automáticamente
- Las keywords nunca desaparecen por tener mal ACOS

### Historial
- Los snapshots se guardan en `keyword.adsData.history[]`
- Si ya existe snapshot del día, se actualiza en lugar de duplicar
- Los gráficos usan Recharts con línea de referencia PE
