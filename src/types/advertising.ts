export type Marketplace = {
  id: string;
  name: string;
  domain: string;
  flag: string;
};

export type CampaignType = 'SP' | 'SB' | 'SBV' | 'SD';

export type CompetitionLevel = 'low' | 'medium' | 'high';

// New types for advanced features
export type RelevanceLevel = 'very-high' | 'high' | 'low' | 'none';
export type IntentType = 'purchase' | 'research' | 'competition' | 'problem';
export type KeywordState = 'tested-works' | 'pending' | 'low-competition' | 'discarded';

export interface BookInfo {
  title: string;
  subtitle: string;
  description: string;
  categories: string[];
}

// History entry for tracking changes
export interface HistoryEntry {
  id: string;
  timestamp: Date;
  field: 'searchVolume' | 'state' | 'relevance' | 'competitionLevel' | 'notes';
  oldValue: string | number | undefined;
  newValue: string | number | undefined;
}

// Campaign Plan for organizing keywords
export interface CampaignPlan {
  id: string;
  name: string;
  objective: string;
  keywords: string[]; // keyword IDs
  estimatedBudget: number;
  createdAt: Date;
  updatedAt: Date;
}

// Mapping template for external imports
export interface ImportMappingTemplate {
  id: string;
  name: string;
  source: string; // e.g., 'Helium10', 'Publisher Rocket', 'Custom'
  mappings: Record<string, string>; // external column -> internal field
  createdAt: Date;
}

// Import market score types
import type { MarketData, StrategicData } from '@/lib/market-score';

export interface Keyword {
  id: string;
  keyword: string;
  marketplaceId: string;
  createdAt: Date;
  updatedAt: Date;
  
  // ============ LEGACY FIELDS (for backward compatibility) ============
  // These map to marketData but kept for existing code
  searchVolume: number;
  competitionLevel: CompetitionLevel;
  competitionNote?: string;
  relevance?: RelevanceLevel;
  
  // ============ MARKET DATA V2 (new unified model) ============
  marketData?: MarketData;
  marketScore?: number; // 0-100, calculated from marketData
  
  // ============ STRATEGIC DATA (NO afecta Market Score) ============
  strategicData?: StrategicData;
  
  // ============ OPERATIONAL FIELDS ============
  campaignTypes: CampaignType[];
  notes: string;
  intent?: IntentType;
  state?: KeywordState;
  variantGroup?: string;
  history?: HistoryEntry[];
  estimatedBudget?: number;
  campaignPlanId?: string;
}

export interface TargetASIN {
  id: string;
  asin: string;
  notes: string;
  campaignTypes: CampaignType[];
  marketplaceId: string;
  bsr?: number; // Best Seller Rank
  createdAt: Date;
  updatedAt: Date;
  // New competitive analysis fields
  title?: string;
  amazonUrl?: string;
  threatScore?: number; // 0-100
  sharedKeywords?: number; // count of keywords in common
}

export interface AdvertisingCategory {
  id: string;
  name: string;
  amazonId: string;
  campaignTypes: CampaignType[];
  notes: string;
  marketplaceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export const MARKETPLACES: Marketplace[] = [
  { id: 'us', name: 'Estados Unidos', domain: 'Amazon.com', flag: '🇺🇸' },
  { id: 'ca', name: 'Canadá', domain: 'Amazon.ca', flag: '🇨🇦' },
  { id: 'uk', name: 'Reino Unido', domain: 'Amazon.co.uk', flag: '🇬🇧' },
  { id: 'es', name: 'España', domain: 'Amazon.es', flag: '🇪🇸' },
  { id: 'de', name: 'Alemania', domain: 'Amazon.de', flag: '🇩🇪' },
  { id: 'fr', name: 'Francia', domain: 'Amazon.fr', flag: '🇫🇷' },
  { id: 'it', name: 'Italia', domain: 'Amazon.it', flag: '🇮🇹' },
  { id: 'au', name: 'Australia', domain: 'Amazon.com.au', flag: '🇦🇺' },
  { id: 'mx', name: 'México', domain: 'Amazon.com.mx', flag: '🇲🇽' },
  { id: 'nl', name: 'Países Bajos', domain: 'Amazon.nl', flag: '🇳🇱' },
  { id: 'se', name: 'Suecia', domain: 'Amazon.se', flag: '🇸🇪' },
  { id: 'jp', name: 'Japón', domain: 'Amazon.co.jp', flag: '🇯🇵' },
];

export const CAMPAIGN_TYPES: { value: CampaignType; label: string; description: string }[] = [
  { value: 'SP', label: 'Sponsored Products', description: 'Anuncios de productos individuales en resultados de búsqueda' },
  { value: 'SB', label: 'Sponsored Brands', description: 'Banners de marca con logo y múltiples productos' },
  { value: 'SBV', label: 'Sponsored Brands Video', description: 'Anuncios de video en resultados de búsqueda' },
  { value: 'SD', label: 'Sponsored Display', description: 'Anuncios de display dentro y fuera de Amazon' },
];

export const COMPETITION_LEVELS: { value: CompetitionLevel; label: string; color: string }[] = [
  { value: 'low', label: 'Baja', color: 'bg-green-500' },
  { value: 'medium', label: 'Media', color: 'bg-yellow-500' },
  { value: 'high', label: 'Alta', color: 'bg-red-500' },
];

export const RELEVANCE_LEVELS: { value: RelevanceLevel; label: string; color: string; icon: string }[] = [
  { value: 'very-high', label: 'Muy relevante', color: 'bg-blue-500', icon: '🔵' },
  { value: 'high', label: 'Relevante', color: 'bg-green-500', icon: '🟢' },
  { value: 'low', label: 'Relevancia baja', color: 'bg-yellow-500', icon: '🟡' },
  { value: 'none', label: 'No relevante', color: 'bg-red-500', icon: '🔴' },
];

export const INTENT_TYPES: { value: IntentType; label: string; description: string }[] = [
  { value: 'purchase', label: 'Compra directa', description: 'El usuario quiere comprar' },
  { value: 'research', label: 'Investigación', description: 'El usuario busca información' },
  { value: 'competition', label: 'Competencia', description: 'Marca, autor o ASIN competidor' },
  { value: 'problem', label: 'Problema-solución', description: 'El libro resuelve este problema' },
];

export const KEYWORD_STATES: { value: KeywordState; label: string; icon: string; color: string }[] = [
  { value: 'tested-works', label: 'Probada', icon: '🟢', color: 'bg-green-500/20 text-green-600 border-green-500/30' },
  { value: 'pending', label: 'Pendiente', icon: '🟡', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  { value: 'low-competition', label: 'Ideal', icon: '🔵', color: 'bg-blue-500/20 text-blue-600 border-blue-500/30' },
  { value: 'discarded', label: 'Descartada', icon: '🔴', color: 'bg-red-500/20 text-red-600 border-red-500/30' },
];

export const getCompetitionLabel = (level: CompetitionLevel): string => {
  switch (level) {
    case 'low': return 'Baja';
    case 'medium': return 'Media';
    case 'high': return 'Alta';
  }
};

// Utility functions for classification
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Remove extra spaces
    .trim();
};

export const calculateRelevance = (keyword: string, bookInfo: BookInfo): RelevanceLevel => {
  const normalizedKeyword = normalizeText(keyword);
  const normalizedTitle = normalizeText(bookInfo.title);
  const normalizedSubtitle = normalizeText(bookInfo.subtitle);
  const normalizedDescription = normalizeText(bookInfo.description);
  const normalizedCategories = bookInfo.categories.map(normalizeText);
  
  const keywordWords = normalizedKeyword.split(' ').filter(w => w.length > 2);
  
  // Check exact match in title
  if (normalizedTitle.includes(normalizedKeyword)) return 'very-high';
  
  // Check if all keyword words are in title
  const allInTitle = keywordWords.every(w => normalizedTitle.includes(w));
  if (allInTitle && keywordWords.length > 0) return 'very-high';
  
  // Check in subtitle
  if (normalizedSubtitle.includes(normalizedKeyword)) return 'high';
  const someInSubtitle = keywordWords.some(w => normalizedSubtitle.includes(w));
  if (someInSubtitle) return 'high';
  
  // Check in categories
  const inCategories = normalizedCategories.some(cat => 
    cat.includes(normalizedKeyword) || keywordWords.some(w => cat.includes(w))
  );
  if (inCategories) return 'high';
  
  // Check in description
  const matchesInDesc = keywordWords.filter(w => normalizedDescription.includes(w)).length;
  if (matchesInDesc >= keywordWords.length * 0.5) return 'low';
  if (matchesInDesc > 0) return 'low';
  
  return 'none';
};

export const classifyIntent = (keyword: string): IntentType => {
  const normalized = normalizeText(keyword);
  
  // Purchase intent indicators
  const purchaseKeywords = ['comprar', 'mejor', 'precio', 'barato', 'oferta', 'recomendado', 'top', 'buy', 'best', 'cheap', 'libros'];
  if (purchaseKeywords.some(p => normalized.includes(p))) return 'purchase';
  
  // Research intent indicators
  const researchKeywords = ['como', 'que es', 'guia', 'tutorial', 'aprender', 'how to', 'what is', 'learn', 'guide', 'tecnicas', 'ejercicios'];
  if (researchKeywords.some(r => normalized.includes(r))) return 'research';
  
  // Competition indicators (brand/author names, ASINs)
  const asinPattern = /^[b][0-9a-z]{9}$/i;
  if (asinPattern.test(normalized.replace(/\s/g, ''))) return 'competition';
  const competitionKeywords = ['autores', 'famosos', 'marca'];
  if (competitionKeywords.some(c => normalized.includes(c))) return 'competition';
  
  // Problem indicators
  const problemKeywords = ['problema', 'solucion', 'resolver', 'eliminar', 'evitar', 'ansiedad', 'estres', 'calmar', 'reducir', 'dormir'];
  if (problemKeywords.some(p => normalized.includes(p))) return 'problem';
  
  // Default to research
  return 'research';
};

export const detectVariants = (keywords: string[]): Map<string, string[]> => {
  const groups = new Map<string, string[]>();
  const normalized = keywords.map(k => ({ original: k, normalized: normalizeText(k) }));
  
  normalized.forEach((item, i) => {
    const words = item.normalized.split(' ');
    const key = words.sort().join(' ');
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item.original);
  });
  
  // Only return groups with more than one variant
  const result = new Map<string, string[]>();
  groups.forEach((variants, key) => {
    if (variants.length > 1) {
      result.set(key, variants);
    }
  });
  
  return result;
};

export const generateSuggestions = (keyword: string): string[] => {
  const words = keyword.toLowerCase().split(' ');
  const suggestions: string[] = [];
  
  // Add plural/singular variations
  words.forEach((word, i) => {
    const newWords = [...words];
    if (word.endsWith('s')) {
      newWords[i] = word.slice(0, -1);
    } else {
      newWords[i] = word + 's';
    }
    suggestions.push(newWords.join(' '));
  });
  
  // Add common prefixes
  ['mejor', 'top', 'guia de', 'como'].forEach(prefix => {
    suggestions.push(`${prefix} ${keyword}`);
  });
  
  // Add common suffixes
  ['libro', 'ebook', 'pdf', 'gratis', 'online'].forEach(suffix => {
    suggestions.push(`${keyword} ${suffix}`);
  });
  
  return suggestions.slice(0, 10);
};

// Estimate budget based on competition
export const estimateBudget = (keyword: Keyword): number => {
  const baseRate = 0.50; // Base CPC in dollars
  const volumeMultiplier = Math.min(keyword.searchVolume / 1000, 5); // Max 5x for high volume
  
  let competitionMultiplier = 1;
  switch (keyword.competitionLevel) {
    case 'low': competitionMultiplier = 0.8; break;
    case 'medium': competitionMultiplier = 1.5; break;
    case 'high': competitionMultiplier = 2.5; break;
  }
  
  // Daily budget estimate (30 clicks target)
  return Math.round(baseRate * competitionMultiplier * (1 + volumeMultiplier * 0.2) * 30 * 100) / 100;
};

// Calculate ROI
export const calculateROI = (
  budget: number,
  ctr: number, // 0-100
  conversionRate: number, // 0-100
  bookPrice: number
): { impressions: number; clicks: number; sales: number; revenue: number; profit: number; roas: number } => {
  const cpc = budget / 30; // Assume daily budget / 30 clicks
  const clicks = Math.floor(budget / cpc);
  const impressions = Math.round(clicks / (ctr / 100));
  const sales = Math.round(clicks * (conversionRate / 100));
  const revenue = sales * bookPrice;
  const profit = revenue - budget;
  const roas = budget > 0 ? (revenue / budget) : 0;
  
  return { impressions, clicks, sales, revenue, profit, roas };
};

// Example data generators
export const getExampleKeywords = (marketplaceId: string): Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'>[] => [
  { keyword: 'meditación para principiantes', searchVolume: 3400, competitionLevel: 'low', campaignTypes: ['SP', 'SD'], notes: 'Keyword principal del nicho', marketplaceId, relevance: 'very-high', intent: 'purchase', state: 'pending', history: [] },
  { keyword: 'mindfulness para principiantes', searchVolume: 3900, competitionLevel: 'medium', campaignTypes: ['SP', 'SD'], notes: 'Funciona muy bien', marketplaceId, relevance: 'very-high', intent: 'purchase', state: 'tested-works', history: [] },
  { keyword: 'meditación diaria', searchVolume: 1600, competitionLevel: 'medium', campaignTypes: ['SP', 'SBV'], notes: '', marketplaceId, relevance: 'high', intent: 'research', state: 'pending', history: [] },
  { keyword: 'guía de meditación ansiedad', searchVolume: 1200, competitionLevel: 'low', campaignTypes: ['SP', 'SD'], notes: '', marketplaceId, relevance: 'high', intent: 'problem', state: 'pending', history: [] },
  { keyword: 'cómo meditar paso a paso', searchVolume: 2100, competitionLevel: 'low', campaignTypes: ['SP'], notes: 'Long-tail fuerte', marketplaceId, relevance: 'high', intent: 'research', state: 'low-competition', history: [] },
  { keyword: 'respiración consciente', searchVolume: 900, competitionLevel: 'medium', campaignTypes: ['SP'], notes: '', marketplaceId, relevance: 'low', intent: 'research', state: 'pending', history: [] },
  { keyword: 'mindfulness ejercicios cortos', searchVolume: 700, competitionLevel: 'low', campaignTypes: ['SP'], notes: '', marketplaceId, relevance: 'low', intent: 'purchase', state: 'pending', history: [] },
  { keyword: 'reducir estrés mindfulness', searchVolume: 850, competitionLevel: 'high', campaignTypes: ['SD'], notes: '', marketplaceId, relevance: 'low', intent: 'problem', state: 'pending', history: [] },
  { keyword: 'meditar en casa guía fácil', searchVolume: 500, competitionLevel: 'low', campaignTypes: ['SP'], notes: '', marketplaceId, relevance: 'high', intent: 'purchase', state: 'pending', history: [] },
  { keyword: 'mindfulness para dormir', searchVolume: 1300, competitionLevel: 'medium', campaignTypes: ['SP'], notes: '', marketplaceId, relevance: 'high', intent: 'problem', state: 'pending', history: [] },
  { keyword: 'técnicas de respiración', searchVolume: 1100, competitionLevel: 'medium', campaignTypes: ['SP'], notes: '', marketplaceId, relevance: 'low', intent: 'research', state: 'pending', history: [] },
  { keyword: 'mindfulness ansiedad adultos', searchVolume: 920, competitionLevel: 'high', campaignTypes: ['SD'], notes: '', marketplaceId, relevance: 'high', intent: 'problem', state: 'discarded', history: [] },
  { keyword: 'empezar meditación', searchVolume: 1500, competitionLevel: 'low', campaignTypes: ['SP'], notes: '', marketplaceId, relevance: 'high', intent: 'purchase', state: 'pending', history: [] },
  { keyword: 'mindfulness para enfado', searchVolume: 400, competitionLevel: 'medium', campaignTypes: ['SP'], notes: '', marketplaceId, relevance: 'low', intent: 'research', state: 'pending', history: [] },
  { keyword: 'relajación para ansiedad', searchVolume: 1250, competitionLevel: 'high', campaignTypes: ['SD'], notes: '', marketplaceId, relevance: 'low', intent: 'problem', state: 'tested-works', history: [] },
  { keyword: 'meditación guiada estrés', searchVolume: 980, competitionLevel: 'medium', campaignTypes: ['SP', 'SD'], notes: '', marketplaceId, relevance: 'high', intent: 'problem', state: 'pending', history: [] },
  { keyword: 'cómo calmar ansiedad', searchVolume: 3200, competitionLevel: 'high', campaignTypes: ['SD'], notes: '', marketplaceId, relevance: 'low', intent: 'problem', state: 'low-competition', history: [] },
  { keyword: 'rutina mindfulness 10 minutos', searchVolume: 450, competitionLevel: 'low', campaignTypes: ['SP'], notes: '', marketplaceId, relevance: 'low', intent: 'research', state: 'pending', history: [] },
  { keyword: 'mindfulness autores famosos', searchVolume: 250, competitionLevel: 'high', campaignTypes: ['SD'], notes: '', marketplaceId, relevance: 'none', intent: 'competition', state: 'discarded', history: [] },
  { keyword: 'mejores libros mindfulness', searchVolume: 1800, competitionLevel: 'medium', campaignTypes: ['SP'], notes: '', marketplaceId, relevance: 'high', intent: 'purchase', state: 'tested-works', history: [] },
];

export const getExampleASINs = (marketplaceId: string): Omit<TargetASIN, 'id' | 'createdAt' | 'updatedAt'>[] => [
  { asin: 'B0C1K7L9Q2', campaignTypes: ['SP', 'SD'], notes: 'Libro top ventas', marketplaceId, bsr: 1520, title: 'Mindfulness: Guía Completa', amazonUrl: `https://amazon.com/dp/B0C1K7L9Q2`, threatScore: 85, sharedKeywords: 12 },
  { asin: 'B0B8Z4T1M5', campaignTypes: ['SP'], notes: '', marketplaceId, bsr: 8900, title: 'Meditación para Todos', amazonUrl: `https://amazon.com/dp/B0B8Z4T1M5`, threatScore: 45, sharedKeywords: 5 },
  { asin: 'B09XH2FQJ7', campaignTypes: ['SD'], notes: 'Muy relevante', marketplaceId, bsr: 2200, title: 'Calma Interior', amazonUrl: `https://amazon.com/dp/B09XH2FQJ7`, threatScore: 72, sharedKeywords: 9 },
  { asin: 'B0D2N8C4W1', campaignTypes: ['SP', 'SD'], notes: '', marketplaceId, bsr: 3100, title: 'El Arte de Meditar', amazonUrl: `https://amazon.com/dp/B0D2N8C4W1`, threatScore: 65, sharedKeywords: 7 },
  { asin: 'B0A7M3P9L8', campaignTypes: ['SP'], notes: '', marketplaceId, bsr: 4500, title: 'Respiración Consciente', amazonUrl: `https://amazon.com/dp/B0A7M3P9L8`, threatScore: 55, sharedKeywords: 4 },
  { asin: 'B098H5T2R4', campaignTypes: ['SD'], notes: '', marketplaceId, bsr: 1700, title: 'Mindfulness Práctico', amazonUrl: `https://amazon.com/dp/B098H5T2R4`, threatScore: 78, sharedKeywords: 10 },
  { asin: 'B0C9F1W6M3', campaignTypes: ['SP'], notes: '', marketplaceId, bsr: 980, title: 'Paz Mental', amazonUrl: `https://amazon.com/dp/B0C9F1W6M3`, threatScore: 88, sharedKeywords: 14 },
  { asin: 'B0B4N6Q8S7', campaignTypes: ['SP'], notes: '', marketplaceId, bsr: 6500, title: 'Bienestar Emocional', amazonUrl: `https://amazon.com/dp/B0B4N6Q8S7`, threatScore: 35, sharedKeywords: 3 },
  { asin: 'B0D5K2M1Y9', campaignTypes: ['SD'], notes: '', marketplaceId, bsr: 14000, title: 'Ejercicios de Relajación', amazonUrl: `https://amazon.com/dp/B0D5K2M1Y9`, threatScore: 20, sharedKeywords: 2 },
  { asin: 'B09T3L7H2V', campaignTypes: ['SP'], notes: '', marketplaceId, bsr: 2700, title: 'Vivir en Calma', amazonUrl: `https://amazon.com/dp/B09T3L7H2V`, threatScore: 68, sharedKeywords: 8 },
];

export const getExampleCategories = (marketplaceId: string): Omit<AdvertisingCategory, 'id' | 'createdAt' | 'updatedAt'>[] => [
  { name: 'Kindle eBooks → Meditation', amazonId: 'KHD-001', campaignTypes: ['SP', 'SD'], notes: 'Categoría principal del nicho', marketplaceId },
  { name: 'Kindle eBooks → Stress Management', amazonId: 'KSH-044', campaignTypes: ['SP'], notes: 'Muy relevante para ansiedad', marketplaceId },
  { name: 'Books → Spirituality', amazonId: 'BRS-012', campaignTypes: ['SD'], notes: 'Alcance amplio', marketplaceId },
  { name: 'Books → Personal Transformation', amazonId: 'BPT-029', campaignTypes: ['SP'], notes: 'Relevancia media', marketplaceId },
  { name: 'Kindle eBooks → Mindfulness', amazonId: 'KMF-037', campaignTypes: ['SP', 'SD'], notes: 'Muy relevante', marketplaceId },
  { name: 'Books → Alternative Medicine', amazonId: 'BAM-055', campaignTypes: ['SP'], notes: 'Competencia media', marketplaceId },
  { name: 'Kindle → Psychology → Emotions', amazonId: 'KPE-090', campaignTypes: ['SD'], notes: 'Perfecta para ansiedad', marketplaceId },
  { name: 'Books → Anxiety Disorders', amazonId: 'BAD-122', campaignTypes: ['SD'], notes: 'Alta conversión', marketplaceId },
  { name: 'Kindle → Short Reads 90m', amazonId: 'KSR-90M', campaignTypes: ['SP'], notes: 'Long-tail', marketplaceId },
  { name: 'Books → Guided Meditation', amazonId: 'BGM-016', campaignTypes: ['SP'], notes: 'Muy directa', marketplaceId },
];
