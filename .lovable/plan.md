

# Unificar toolbar en 1 sola fila

## Objetivo
Mover todos los elementos de las 2 filas actuales de la toolbar a una unica fila, reorganizando el orden segun lo indicado:

## Orden final (izquierda a derecha)

1. **Importar** (boton primario - Importar datos / Importar Amazon ADS segun vista)
2. **+ Nueva** (solo el boton, sin el input de texto "Escribe una keyword...")
3. **Buscar keywords** (input de busqueda)
4. **Contador** ("15 de 15 keywords")
5. **Vista contextual** (badge "Vista editorial" / "Vista de inversion Ads")
6. **Necesitan atencion** (solo en vista ads, si aplica)
7. **Separador vertical**
8. **Enviar tambien a...** / **Mover a...** (botones de transferencia)
9. **Spacer** (flex-1)
10. **Resetear columnas** (icono)
11. **Copiar todas** (BulkCopyTools)
12. **Exportar CSV**
13. **Comparar** (si 2 seleccionadas)
14. **Eliminar** (si hay seleccion)

## Cambios

El input "Escribe una keyword..." se elimina de la fila. El boton "+ Nueva" abrira directamente el wizard sin necesidad del input de texto previo.

## Seccion tecnica

### Archivo modificado: `src/components/advertising/KeywordsSection.tsx`

Lineas ~900-1032: Se reestructura el bloque del toolbar:

- Eliminar el input `quickAddKeyword` y su contenedor (lineas 901-906)
- Mover los botones de Importar (lineas 1010-1017) al inicio de la fila
- Colocar el boton "+ Nueva" (que llama a `handleOpenNewKeywordWizard`) justo despues
- Mantener el resto de elementos en el orden descrito
- Todo dentro del mismo `<div className="flex items-center gap-2 flex-wrap">`
- Eliminar el div contenedor `<div className="flex items-center gap-2">` interno de "Right-side tools" (lineas 994, 1031) para aplanar todo en una sola fila

