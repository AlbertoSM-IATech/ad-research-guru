// Centralized keyword sorting logic
import type { Keyword } from '@/types/advertising';
import { calculateMarketScore, getDefaultMarketData } from './market-score';
import { calcularGastoAcumulado, calcularVentasAcumuladas, calcularAcosActualPorcentaje, calcularConversionPorcentaje } from './acosEquilibrio';

export type SortField = 
  | 'keyword' 
  | 'searchVolume' 
  | 'competitors'
  | 'competitionLevel' 
  | 'relevance' 
  | 'state'
  | 'status'
  | 'marketScore'
  // Ads fields
  | 'clicks'
  | 'cpc'
  | 'gasto'
  | 'ventas'
  | 'pedidos'
  | 'acosActual'
  | 'conversion';
  
export type SortOrder = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  order: SortOrder;
  label: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { field: 'marketScore', order: 'desc', label: 'Market Score (mayor primero)' },
  { field: 'marketScore', order: 'asc', label: 'Market Score (menor primero)' },
  { field: 'keyword', order: 'asc', label: 'Keyword (A-Z)' },
  { field: 'keyword', order: 'desc', label: 'Keyword (Z-A)' },
  { field: 'searchVolume', order: 'desc', label: 'Volumen (mayor primero)' },
  { field: 'searchVolume', order: 'asc', label: 'Volumen (menor primero)' },
  { field: 'competitors', order: 'asc', label: 'Competidores (menor primero)' },
  { field: 'competitors', order: 'desc', label: 'Competidores (mayor primero)' },
  { field: 'competitionLevel', order: 'asc', label: 'Nivel competencia (menor primero)' },
  { field: 'competitionLevel', order: 'desc', label: 'Nivel competencia (mayor primero)' },
  { field: 'status', order: 'asc', label: 'Estado (Pendiente→Válida→Descartada)' },
  { field: 'state', order: 'asc', label: 'Fase (legacy)' },
  // Ads sort options
  { field: 'clicks', order: 'desc', label: 'Clicks (mayor primero)' },
  { field: 'clicks', order: 'asc', label: 'Clicks (menor primero)' },
  { field: 'cpc', order: 'desc', label: 'CPC (mayor primero)' },
  { field: 'cpc', order: 'asc', label: 'CPC (menor primero)' },
  { field: 'gasto', order: 'desc', label: 'Gasto (mayor primero)' },
  { field: 'gasto', order: 'asc', label: 'Gasto (menor primero)' },
  { field: 'ventas', order: 'desc', label: 'Ventas (mayor primero)' },
  { field: 'ventas', order: 'asc', label: 'Ventas (menor primero)' },
  { field: 'pedidos', order: 'desc', label: 'Pedidos (mayor primero)' },
  { field: 'pedidos', order: 'asc', label: 'Pedidos (menor primero)' },
  { field: 'acosActual', order: 'asc', label: 'ACOS Actual (menor primero)' },
  { field: 'acosActual', order: 'desc', label: 'ACOS Actual (mayor primero)' },
  { field: 'conversion', order: 'desc', label: 'Conversión (mayor primero)' },
  { field: 'conversion', order: 'asc', label: 'Conversión (menor primero)' },
];

// Get the market score for a keyword (uses cached value or calculates)
export function getKeywordMarketScore(keyword: Keyword): number {
  // If marketScore is cached and valid, use it
  if (keyword.marketScore !== undefined && keyword.marketScore > 0) {
    return keyword.marketScore;
  }
  
  // Build market data from keyword fields
  const data = {
    ...getDefaultMarketData(),
    searchVolume: keyword.searchVolume || 0,
    competitors: keyword.competitors || 0,
    price: keyword.price || 9.99,
    royalties: keyword.royalties || 2.00,
    trafficSource: keyword.marketData?.trafficSource || 'amazon',
  };
  
  return calculateMarketScore(data).total;
}

// Check if keyword has incomplete market data
export function isMarketDataIncomplete(keyword: Keyword): boolean {
  return (
    !keyword.searchVolume || 
    keyword.searchVolume === 0 ||
    !keyword.competitors ||
    keyword.competitors === 0
  );
}

// Helper to get calculated ads values for sorting
function getAdsValue(keyword: Keyword, field: 'gasto' | 'ventas' | 'acosActual' | 'conversion', precioLibro?: number): number {
  const ads = keyword.adsData;
  if (!ads) return -1;
  
  switch (field) {
    case 'gasto': {
      const gasto = calcularGastoAcumulado(ads.clicks, ads.cpcActual);
      return gasto ?? -1;
    }
    case 'ventas': {
      const ventas = calcularVentasAcumuladas(ads.pedidos, precioLibro);
      return ventas ?? -1;
    }
    case 'acosActual': {
      const gasto = calcularGastoAcumulado(ads.clicks, ads.cpcActual);
      const ventas = calcularVentasAcumuladas(ads.pedidos, precioLibro);
      const acos = calcularAcosActualPorcentaje(gasto ?? undefined, ventas ?? undefined);
      return acos ?? -1;
    }
    case 'conversion': {
      const conv = calcularConversionPorcentaje(ads.pedidos, ads.clicks);
      return conv ?? -1;
    }
    default:
      return -1;
  }
}

// Sort keywords by a given field and order (stable sort)
export function sortKeywords(
  keywords: Keyword[], 
  field: SortField, 
  order: SortOrder,
  precioLibro?: number
): Keyword[] {
  const modifier = order === 'asc' ? 1 : -1;
  
  return [...keywords].sort((a, b) => {
    let comparison = 0;
    
    switch (field) {
      case 'keyword':
        comparison = a.keyword.localeCompare(b.keyword);
        break;
        
      case 'searchVolume':
        comparison = (a.searchVolume || 0) - (b.searchVolume || 0);
        break;
        
      case 'competitors':
        comparison = (a.competitors || 0) - (b.competitors || 0);
        break;
        
      case 'competitionLevel': {
        const competitionOrder = ['low', 'medium', 'high'];
        comparison = 
          competitionOrder.indexOf(a.competitionLevel) - 
          competitionOrder.indexOf(b.competitionLevel);
        break;
      }
        
      case 'relevance': {
        const relevanceOrder = ['very-high', 'high', 'low', 'none'];
        comparison = 
          relevanceOrder.indexOf(a.relevance || 'none') - 
          relevanceOrder.indexOf(b.relevance || 'none');
        break;
      }
        
      case 'state': {
        const stateOrder = ['tested-works', 'pending', 'low-competition', 'discarded'];
        comparison = 
          stateOrder.indexOf(a.state || 'pending') - 
          stateOrder.indexOf(b.state || 'pending');
        break;
      }
      
      case 'status': {
        const statusOrder = ['pending', 'valid', 'discarded'];
        comparison = 
          statusOrder.indexOf(a.status || 'pending') - 
          statusOrder.indexOf(b.status || 'pending');
        break;
      }
        
      case 'marketScore': {
        // Get scores, treating null/undefined as -1 to push to end
        const scoreA = getKeywordMarketScore(a);
        const scoreB = getKeywordMarketScore(b);
        const effectiveA = scoreA > 0 ? scoreA : -1;
        const effectiveB = scoreB > 0 ? scoreB : -1;
        comparison = effectiveA - effectiveB;
        break;
      }
      
      // Ads fields
      case 'clicks':
        comparison = (a.adsData?.clicks ?? -1) - (b.adsData?.clicks ?? -1);
        break;
        
      case 'cpc':
        comparison = (a.adsData?.cpcActual ?? -1) - (b.adsData?.cpcActual ?? -1);
        break;
        
      case 'pedidos':
        comparison = (a.adsData?.pedidos ?? -1) - (b.adsData?.pedidos ?? -1);
        break;
        
      case 'gasto':
        comparison = getAdsValue(a, 'gasto', precioLibro) - getAdsValue(b, 'gasto', precioLibro);
        break;
        
      case 'ventas':
        comparison = getAdsValue(a, 'ventas', precioLibro) - getAdsValue(b, 'ventas', precioLibro);
        break;
        
      case 'acosActual':
        comparison = getAdsValue(a, 'acosActual', precioLibro) - getAdsValue(b, 'acosActual', precioLibro);
        break;
        
      case 'conversion':
        comparison = getAdsValue(a, 'conversion', precioLibro) - getAdsValue(b, 'conversion', precioLibro);
        break;
        
      default:
        comparison = 0;
    }
    
    // Apply direction modifier
    const result = comparison * modifier;
    
    // Stable sort: if equal, sort by keyword name asc
    if (result === 0 && field !== 'keyword') {
      return a.keyword.localeCompare(b.keyword);
    }
    
    return result;
  });
}
