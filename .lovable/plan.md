

# Adaptar navegacion al estilo visual de referencia

## Que cambia

La referencia muestra un patron de navegacion mas limpio: en lugar de botones pill para cambiar entre secciones (Datos/Visualizaciones), usa **tabs con borde inferior** (underline tabs). El sidebar actual ya funciona bien pero se puede mejorar con mejor jerarquia visual.

Los cambios son puramente cosmeticos - no se mueve BookInfo, no cambia el layout de columnas, solo se mejora la navegacion.

## Cambios concretos

### 1. Tabs underline en NicheStudyModule (`NicheStudyModule.tsx`)
- Reemplazar los botones pill `bg-muted rounded-md` por tabs con estilo underline
- Tab activo: texto con color primario + borde inferior de 2px
- Tab inactivo: texto muted, sin borde
- Mantener los mismos iconos (Search, TrendingUp)

### 2. Sidebar con mejor jerarquia (`AppSidebar.tsx`)
- Añadir un header con nombre de la app (ej: "KW Research") en la parte superior
- Cambiar el estilo del item activo: en lugar de `bg-primary/10`, usar un indicador lateral izquierdo (borde de 2-3px en color primario) como en la referencia
- Mayor padding vertical en los items para dar mas aire

### 3. Header bar simplificada (`Index.tsx`)
- Añadir breadcrumb contextual al lado del SidebarTrigger mostrando el nombre del modulo activo ("Estudio de KW" / "Gestion de ADS")
- Eliminar los h1 redundantes de dentro de cada modulo (ya que el header los muestra)

## Seccion tecnica

### `src/components/advertising/NicheStudyModule.tsx`
- Lineas 100-112: Reemplazar el bloque de botones pill por un `div` con `border-b` y dos botones con clase condicional `border-b-2 border-primary` para el activo

### `src/components/advertising/AppSidebar.tsx`
- Lineas 58-88: Añadir un header con el nombre de la app antes del primer SidebarGroup
- Lineas 70-73: Cambiar `activeClassName` de `bg-primary/10` a un estilo con `border-l-2 border-primary bg-transparent`

### `src/pages/Index.tsx`
- Lineas 53-55: Añadir al lado del SidebarTrigger un texto con el nombre del modulo activo basado en `location.pathname`

### `src/components/advertising/AdsManagementModule.tsx`
- Lineas 82-98: Eliminar el header `<h1>` ya que se mostrara en la barra superior

