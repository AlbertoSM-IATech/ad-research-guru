
# Sacar acciones del menu "..." al header + mejoras UI/UX

## 1. Extraer acciones del overflow menu al header

Actualmente el menu de 3 puntos contiene: Tour guiado, Criterios por mercado, Backup y Restablecer datos. Ademas, el boton "Tour" ya existe como boton independiente (duplicado).

**Cambios:**

- **Eliminar `HeaderOverflowMenu`** completamente (ya no hara falta el componente)
- **Eliminar el boton "Tour" duplicado** que ya esta fuera del menu
- **Agregar botones directos en el header** para cada accion:
  - **Tour** (icono HelpCircle, ya existente, se mantiene uno solo)
  - **Criterios** (icono Settings, boton ghost/outline compacto)
  - **Backup** (icono HardDrive, boton ghost/outline compacto)
  - **Restablecer** (icono Trash2, boton ghost destructivo con el mismo AlertDialog de confirmacion que tenia el overflow menu)
- Agrupar visualmente con un separador vertical entre las acciones utilitarias (Tour, Criterios, Backup) y la accion destructiva (Restablecer)

## 2. Mejoras UI/UX del header y layout general (sin tocar logica)

- **Header mas limpio**: reducir el gap entre titulo y controles, alinear mejor el aviso (warning) debajo del titulo con menos padding
- **Botones del header**: usar un estilo uniforme (`variant="ghost"`, `size="icon"` con tooltip) para Tour, Criterios, Backup, ThemeToggle - todos del mismo tamano (h-9 w-9)
- **Restablecer**: unico boton con `variant="ghost"` y clase `text-destructive` para diferenciarlo visualmente sin ocupar espacio extra
- **MarketplaceSelector**: mantener su posicion actual, es correcto

## 3. Mejoras UI/UX en la pestana de Visualizaciones

La pestana ha evolucionado mucho pero el "Panel de Control" superior es demasiado pesado visualmente para solo 5 graficas.

**Cambios propuestos:**

- **Simplificar el Panel de Control**: convertirlo en una barra inline (toolbar) en lugar de una Card con CardHeader. Solo una fila con los controles (Visibilidad dropdown, Tamano select, Restablecer) sin titulo grande ni icono decorativo
- **Eliminar el Info Box** de "Arrastra y suelta": es redundante una vez que el usuario ya lo sabe. El drag handle en cada carta es suficiente pista visual
- **Mejorar el grid de graficas**: usar `gap-4` en lugar de `gap-6` para que queden mas compactas y se aproveche mejor el espacio
- **ChartCard refinamiento**: reducir el padding del header, hacer el drag handle siempre visible (no solo on hover) con opacidad reducida para que sea mas descubrible
- **Estado vacio mejorado**: icono mas pequeno y mensaje mas compacto

## Seccion tecnica

### Archivos a modificar

1. **`src/components/advertising/AdvertisingResearch.tsx`**
   - Eliminar import de `HeaderOverflowMenu`
   - Eliminar el boton "Tour" duplicado (lineas 679-701)
   - Eliminar la linea del `HeaderOverflowMenu` (linea 704)
   - Agregar botones directos: Tour (HelpCircle), Criterios (Settings), Backup (HardDrive), Restablecer (Trash2)
   - Mover el AlertDialog de confirmacion de reset aqui (actualmente esta en HeaderOverflowMenu)
   - Agregar estado `showResetDialog` para el AlertDialog

2. **`src/components/advertising/HeaderOverflowMenu.tsx`**
   - Se puede eliminar o dejar sin uso (preferible eliminar para limpiar)

3. **`src/components/advertising/visualizations/VisualizationsTab.tsx`**
   - Reemplazar la Card del "Panel de Control" por una toolbar inline (`div` con `flex items-center justify-between`)
   - Eliminar el bloque "Info Box" de arrastra y suelta (lineas 333-345)
   - Cambiar grid gap de `gap-6` a `gap-4`
   - Reducir el tamano del estado vacio

4. **`src/components/advertising/visualizations/ChartCard.tsx`**
   - Hacer el drag handle siempre visible con opacidad base (opacity-40 en lugar de opacity-0)
   - Reducir padding del CardHeader (`pb-1` en lugar de `pb-2`)

### Sin cambios de logica
Todos los handlers, calculos, persistencia y flujos de datos permanecen exactamente iguales. Solo se reorganiza la ubicacion visual de los botones y se simplifica el CSS/layout.
