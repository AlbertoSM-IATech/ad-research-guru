/**
 * Funciones de cálculo ACOS & Equilibrio para Ads
 * Todas devuelven null si no se puede calcular (para que UI muestre "—")
 */

/**
 * ACOS de Equilibrio (Break-even)
 * ACOS_equilibrio_% = (regaliasPorVenta / precioLibro) * 100
 */
export function calcularAcosEquilibrioPorcentaje(
  precioLibro: number | undefined,
  regaliasPorVenta: number | undefined
): number | null {
  if (!precioLibro || precioLibro <= 0 || regaliasPorVenta === undefined) {
    return null;
  }
  return (regaliasPorVenta / precioLibro) * 100;
}

/**
 * Gasto acumulado (auto-calculado)
 * gasto = clicks × cpcActual
 */
export function calcularGastoAcumulado(
  clicks: number | undefined,
  cpcActual: number | undefined
): number | null {
  if (clicks === undefined || cpcActual === undefined) {
    return null;
  }
  return clicks * cpcActual;
}

/**
 * Ventas acumuladas (auto-calculado)
 * ventas = pedidos × precioLibro
 */
export function calcularVentasAcumuladas(
  pedidos: number | undefined,
  precioLibro: number | undefined
): number | null {
  if (pedidos === undefined || !precioLibro || precioLibro <= 0) {
    return null;
  }
  return pedidos * precioLibro;
}

/**
 * ACOS Actual
 * ACOS_actual_% = (gasto / ventas) * 100
 */
export function calcularAcosActualPorcentaje(
  gasto: number | undefined,
  ventas: number | undefined
): number | null {
  if (gasto === undefined || ventas === undefined || ventas <= 0) {
    return null;
  }
  return (gasto / ventas) * 100;
}

/**
 * ACOS Siguiente Click (simula 1 compra adicional)
 * ventas_next = ventas + precioLibro
 * gasto_next = gasto + cpcActual
 * ACOS_siguienteClick_% = (gasto_next / ventas_next) * 100
 */
export function calcularAcosSiguienteClickPorcentaje(
  gasto: number | undefined,
  cpcActual: number | undefined,
  ventas: number | undefined,
  precioLibro: number | undefined
): number | null {
  if (
    gasto === undefined ||
    cpcActual === undefined ||
    ventas === undefined ||
    !precioLibro || precioLibro <= 0
  ) {
    return null;
  }
  
  const ventasNext = ventas + precioLibro;
  const gastoNext = gasto + cpcActual;
  
  if (ventasNext <= 0) return null;
  
  return (gastoNext / ventasNext) * 100;
}

/**
 * Conversión (%)
 * conversion_% = (pedidos / clicks) * 100
 */
export function calcularConversionPorcentaje(
  pedidos: number | undefined,
  clicks: number | undefined
): number | null {
  if (pedidos === undefined || clicks === undefined || clicks <= 0) {
    return null;
  }
  return (pedidos / clicks) * 100;
}

/**
 * Beneficio actual (corregido)
 * beneficioAhora = ventas - gasto
 */
export function calcularBeneficioAhora(
  ventas: number | undefined,
  gasto: number | undefined
): number | null {
  if (ventas === undefined || gasto === undefined) {
    return null;
  }
  return ventas - gasto;
}

/**
 * Beneficio si el siguiente click genera 1 compra (corregido)
 * beneficioSiguienteClick = ((pedidos + 1) × precioLibro) - (gasto + cpcActual)
 */
export function calcularBeneficioSiguienteClick(
  pedidos: number | undefined,
  precioLibro: number | undefined,
  gasto: number | undefined,
  cpcActual: number | undefined
): number | null {
  if (
    pedidos === undefined ||
    !precioLibro || precioLibro <= 0 ||
    gasto === undefined ||
    cpcActual === undefined
  ) {
    return null;
  }
  const ventasSiguiente = (pedidos + 1) * precioLibro;
  const gastoSiguiente = gasto + cpcActual;
  return ventasSiguiente - gastoSiguiente;
}

/**
 * Calcula las guías de fase basadas en ACOS de equilibrio
 * Lanzamiento = ACOS_equilibrio * 1.7
 * Dominio = ACOS_equilibrio * 1.2
 * Beneficio = ACOS_equilibrio * 0.5
 */
export function calcularGuiasFase(acosEquilibrio: number | null): {
  lanzamiento: number | null;
  dominio: number | null;
  beneficio: number | null;
} {
  if (acosEquilibrio === null) {
    return { lanzamiento: null, dominio: null, beneficio: null };
  }
  return {
    lanzamiento: acosEquilibrio * 1.7,
    dominio: acosEquilibrio * 1.2,
    beneficio: acosEquilibrio * 0.5,
  };
}

/**
 * Determina el badge informativo basado en ACOS
 */
export type AcosBadgeType = 
  | 'bajo-pe'           // ACOS actual <= ACOS equilibrio
  | 'recuperable'       // ACOS actual > equilibrio pero siguiente click <= equilibrio
  | 'en-perdida'        // ACOS siguiente click > equilibrio
  | 'sin-datos';        // Faltan datos para calcular

export function determinarAcosBadge(
  acosEquilibrio: number | null,
  acosActual: number | null,
  acosSiguienteClick: number | null
): AcosBadgeType {
  if (acosEquilibrio === null || (acosActual === null && acosSiguienteClick === null)) {
    return 'sin-datos';
  }
  
  if (acosActual !== null && acosActual <= acosEquilibrio) {
    return 'bajo-pe';
  }
  
  if (acosActual !== null && acosActual > acosEquilibrio) {
    if (acosSiguienteClick !== null && acosSiguienteClick <= acosEquilibrio) {
      return 'recuperable';
    }
    return 'en-perdida';
  }
  
  return 'sin-datos';
}

/**
 * Lista de datos faltantes para mostrar al usuario
 * Actualizado: ahora solo se requiere clicks, cpcActual, pedidos (gasto y ventas se auto-calculan)
 */
export function obtenerDatosFaltantes(
  precioLibro: number | undefined,
  regaliasPorVenta: number | undefined,
  clicks: number | undefined,
  cpcActual: number | undefined,
  pedidos: number | undefined
): string[] {
  const faltantes: string[] = [];
  
  if (!precioLibro || precioLibro <= 0) faltantes.push('Precio del libro');
  if (regaliasPorVenta === undefined || regaliasPorVenta <= 0) faltantes.push('Regalías');
  if (clicks === undefined) faltantes.push('Clicks');
  if (cpcActual === undefined) faltantes.push('CPC (actual)');
  if (pedidos === undefined) faltantes.push('Pedidos');
  
  return faltantes;
}

/**
 * Formatea un porcentaje para mostrar (1 decimal)
 */
export function formatearPorcentaje(valor: number | null): string {
  if (valor === null) return '—';
  return `${valor.toFixed(1)}%`;
}

/**
 * Formatea moneda (2 decimales)
 */
export function formatearMoneda(valor: number | null, simbolo: string = '$'): string {
  if (valor === null) return '—';
  return `${simbolo}${valor.toFixed(2)}`;
}
