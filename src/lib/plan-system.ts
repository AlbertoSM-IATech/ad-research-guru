// Plan system for gating features
// Starter = basic plan with Estudio de KW
// Plus = premium plan with Gestión de Ads

export type PlanType = 'starter' | 'plus';

export interface PlanConfig {
  id: PlanType;
  name: string;
  description: string;
  features: string[];
}

export const PLANS: Record<PlanType, PlanConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Estudio de KW y análisis de mercado',
    features: [
      'Estudio de KW',
      'Market Score',
      'Visualizaciones básicas',
      'Exportar CSV',
      'Importar en lote',
    ],
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    description: 'Todo de Starter + Gestión completa de Ads',
    features: [
      'Todo de Starter',
      'Gestión de Ads',
      'ACOS y métricas de rentabilidad',
      'Dashboard de rendimiento',
      'Filtros avanzados de Ads',
      'Histórico de campañas',
    ],
  },
};

const PLAN_STORAGE_KEY = 'ad-research:user-plan';

// Get current user plan from localStorage
export function getCurrentPlan(): PlanType {
  try {
    const stored = localStorage.getItem(PLAN_STORAGE_KEY);
    if (stored === 'starter' || stored === 'plus') {
      return stored;
    }
  } catch {
    // Ignore errors
  }
  // Default to plus for now (can be changed to 'starter' to restrict access)
  return 'plus';
}

// Set user plan (for testing/admin purposes)
export function setCurrentPlan(plan: PlanType): void {
  try {
    localStorage.setItem(PLAN_STORAGE_KEY, plan);
  } catch {
    // Ignore errors
  }
}

// Check if a feature requires Plus plan
export function requiresPlus(feature: 'ads-management' | 'ads-dashboard' | 'ads-filters'): boolean {
  return true; // All these features require Plus
}

// Check if user has access to a feature
export function hasAccess(feature: 'ads-management' | 'ads-dashboard' | 'ads-filters'): boolean {
  const plan = getCurrentPlan();
  if (plan === 'plus') return true;
  return !requiresPlus(feature);
}
