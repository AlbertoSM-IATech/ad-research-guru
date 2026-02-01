// Demo Data Generator - Creates varied sample data for testing
import { 
  type Keyword, 
  type TargetASIN, 
  type AdvertisingCategory,
  type CampaignType,
  type CompetitionLevel,
  type RelevanceLevel,
  type IntentType,
  type KeywordState,
} from '@/types/advertising';
import { createKeywordDefaults } from '@/lib/keyword-helpers';

// Keyword themes for variety
const keywordThemes = {
  meditation: [
    'meditación', 'meditar', 'meditación guiada', 'meditación para principiantes',
    'meditación diaria', 'meditación corta', 'meditación zen', 'meditación tibetana',
    'aprender a meditar', 'técnicas de meditación', 'meditación profunda',
    'meditación matutina', 'meditación nocturna', 'meditación para dormir',
  ],
  mindfulness: [
    'mindfulness', 'atención plena', 'mindfulness para principiantes',
    'ejercicios mindfulness', 'mindfulness diario', 'práctica mindfulness',
    'mindfulness en español', 'mindfulness libro', 'mindfulness guía',
    'mindfulness trabajo', 'mindfulness niños', 'mindfulness adultos',
  ],
  anxiety: [
    'ansiedad', 'calmar ansiedad', 'reducir ansiedad', 'ansiedad libro',
    'superar ansiedad', 'ansiedad tratamiento', 'ansiedad natural',
    'técnicas ansiedad', 'control ansiedad', 'ansiedad estrés',
    'ansiedad social', 'ataques de pánico', 'nerviosismo',
  ],
  stress: [
    'estrés', 'reducir estrés', 'manejo del estrés', 'estrés laboral',
    'combatir estrés', 'relajación estrés', 'técnicas antiestrés',
    'estrés crónico', 'burnout', 'agotamiento mental',
  ],
  relaxation: [
    'relajación', 'técnicas de relajación', 'relajación muscular',
    'relajación profunda', 'ejercicios relajación', 'relajación guiada',
    'calma interior', 'paz interior', 'tranquilidad', 'serenidad',
  ],
  breathing: [
    'respiración', 'técnicas respiración', 'respiración consciente',
    'ejercicios respiración', 'respiración profunda', 'respiración diafragmática',
    'pranayama', 'breathwork', 'respiración 4-7-8',
  ],
  sleep: [
    'dormir mejor', 'insomnio', 'sueño reparador', 'conciliar sueño',
    'higiene del sueño', 'mejorar sueño', 'descanso nocturno',
    'rutina sueño', 'dormir rápido', 'sueño profundo',
  ],
  wellbeing: [
    'bienestar', 'bienestar emocional', 'salud mental', 'autocuidado',
    'equilibrio emocional', 'crecimiento personal', 'desarrollo personal',
    'autoayuda', 'superación personal', 'transformación personal',
  ],
  habits: [
    'hábitos saludables', 'crear hábitos', 'rutinas diarias', 'disciplina',
    'productividad', 'organización personal', 'gestión del tiempo',
    'metas personales', 'motivación', 'constancia',
  ],
  emotions: [
    'gestión emocional', 'inteligencia emocional', 'control emociones',
    'regular emociones', 'emociones negativas', 'positividad',
    'optimismo', 'resiliencia', 'fortaleza mental',
  ],
};

const modifiers = [
  'guía', 'libro', 'manual', 'curso', 'para principiantes', 'avanzado',
  'completo', 'práctico', 'fácil', 'rápido', 'efectivo', 'paso a paso',
  'en 10 minutos', 'en casa', 'sin experiencia', 'para adultos',
  'para mujeres', 'para hombres', 'para mayores', 'científico',
];

const competitionLevels: CompetitionLevel[] = ['low', 'medium', 'high'];
const relevanceLevels: RelevanceLevel[] = ['very-high', 'high', 'low', 'none'];
const intentTypes: IntentType[] = ['purchase', 'research', 'problem', 'competition'];
const keywordStates: KeywordState[] = ['pending', 'tested-works', 'low-competition', 'discarded'];
const campaignTypeOptions: CampaignType[][] = [
  ['SP'], ['SD'], ['SP', 'SD'], ['SP', 'SB'], ['SP', 'SD', 'SBV'], ['SBV'], ['SP', 'SB', 'SD'],
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomVolume(): number {
  const ranges = [
    { min: 100, max: 500, weight: 30 },
    { min: 500, max: 1500, weight: 35 },
    { min: 1500, max: 3500, weight: 20 },
    { min: 3500, max: 8000, weight: 10 },
    { min: 8000, max: 15000, weight: 5 },
  ];
  
  const totalWeight = ranges.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const range of ranges) {
    random -= range.weight;
    if (random <= 0) {
      return Math.floor(Math.random() * (range.max - range.min) + range.min);
    }
  }
  
  return Math.floor(Math.random() * 1000 + 500);
}

function randomCompetitors(): number {
  // Generate realistic competitor counts (number of products)
  const ranges = [
    { min: 50, max: 500, weight: 15 },      // Very low competition
    { min: 500, max: 1500, weight: 25 },    // Low competition
    { min: 1500, max: 4000, weight: 30 },   // Medium competition
    { min: 4000, max: 10000, weight: 20 },  // High competition
    { min: 10000, max: 50000, weight: 10 }, // Very high competition
  ];
  
  const totalWeight = ranges.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const range of ranges) {
    random -= range.weight;
    if (random <= 0) {
      return Math.floor(Math.random() * (range.max - range.min) + range.min);
    }
  }
  
  return Math.floor(Math.random() * 2000 + 1000);
}

function generateKeyword(marketplaceId: string, usedKeywords: Set<string>): Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'> | null {
  const themes = Object.values(keywordThemes).flat();
  let keyword = '';
  let attempts = 0;
  
  while (attempts < 10) {
    const baseKeyword = randomFrom(themes);
    const useModifier = Math.random() > 0.4;
    keyword = useModifier 
      ? `${baseKeyword} ${randomFrom(modifiers)}`.trim()
      : baseKeyword;
    
    if (!usedKeywords.has(keyword.toLowerCase())) {
      usedKeywords.add(keyword.toLowerCase());
      break;
    }
    attempts++;
  }
  
  if (usedKeywords.has(keyword.toLowerCase()) && attempts >= 10) {
    return null;
  }
  
  const notes = Math.random() > 0.7 
    ? randomFrom([
        'Alto potencial',
        'Requiere optimización',
        'Testear con bajo budget',
        'Palabra clave principal',
        'Long-tail prometedora',
        'Competencia creciente',
        'Estacional',
        'Evergreen',
        '',
      ])
    : '';

  // Generate random ADS data for about 60% of keywords
  const hasAdsData = Math.random() > 0.4;
  const adsData = hasAdsData ? generateRandomAdsData() : undefined;

  return createKeywordDefaults({
    keyword,
    searchVolume: randomVolume(),
    competitors: randomCompetitors(),
    competitionLevel: randomFrom(competitionLevels),
    campaignTypes: randomFrom(campaignTypeOptions),
    notes,
    marketplaceId,
    intent: randomFrom(intentTypes),
    state: randomFrom(keywordStates),
    adsData,
  });
}

// Generate random ADS data for demo purposes
function generateRandomAdsData(): import('@/types/advertising').AdsData {
  const clicks = Math.floor(Math.random() * 200);
  const cpcActual = parseFloat((0.15 + Math.random() * 0.85).toFixed(2)); // $0.15 - $1.00
  const conversionRate = 0.02 + Math.random() * 0.08; // 2% - 10%
  const pedidos = Math.floor(clicks * conversionRate);
  
  // Generate impressions based on CTR between 2-8%
  const ctr = 2 + Math.random() * 6; // 2-8%
  const impresiones = clicks > 0 ? Math.floor((clicks / ctr) * 100) : Math.floor(Math.random() * 5000);
  
  const campaigns = ['Campaña Principal', 'Auto', 'Manual Exacto', 'Broad Test', 'Discovery', 'Libro #1', 'Nichos Q1'];
  
  return {
    clicks,
    cpcActual,
    pedidos,
    impresiones,
    ctr: parseFloat(ctr.toFixed(2)),
    campaignName: randomFrom(campaigns),
    history: generateRandomAdsHistory(clicks, cpcActual, pedidos),
  };
}

// Generate random ADS history for sparklines
function generateRandomAdsHistory(currentClicks: number, currentCpc: number, currentPedidos: number): import('@/types/advertising').AdsHistoryEntry[] {
  const history: import('@/types/advertising').AdsHistoryEntry[] = [];
  const numEntries = Math.floor(Math.random() * 10) + 3; // 3-12 entries
  
  let cumulativeClicks = Math.max(0, currentClicks - Math.floor(Math.random() * 100));
  let cumulativePedidos = Math.max(0, currentPedidos - Math.floor(Math.random() * 10));
  
  for (let i = numEntries; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const dayClicks = Math.floor(Math.random() * 20) + 1;
    const dayPedidos = Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0;
    const dayCpc = currentCpc * (0.8 + Math.random() * 0.4); // ±20% variation
    
    cumulativeClicks += dayClicks;
    cumulativePedidos += dayPedidos;
    
    const gasto = cumulativeClicks * dayCpc;
    const ventas = cumulativePedidos * 12.99; // Assume $12.99 price
    const acosActual = ventas > 0 ? (gasto / ventas) * 100 : null;
    const beneficio = ventas > 0 ? ventas - gasto : null;
    
    history.push({
      id: `demo-${Date.now()}-${i}`,
      timestamp: date,
      clicks: cumulativeClicks,
      cpcActual: parseFloat(dayCpc.toFixed(2)),
      pedidos: cumulativePedidos,
      gasto: parseFloat(gasto.toFixed(2)),
      ventas: parseFloat(ventas.toFixed(2)),
      acosActual: acosActual !== null ? parseFloat(acosActual.toFixed(1)) : null,
      beneficio: beneficio !== null ? parseFloat(beneficio.toFixed(2)) : null,
    });
  }
  
  return history;
}

export function generateDemoKeywords(
  marketplaceId: string, 
  count: number = 40
): Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'>[] {
  const usedKeywords = new Set<string>();
  const keywords: Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  
  // Add some guaranteed high-value keywords first
  const guaranteedKeywords = [
    { keyword: 'meditación para principiantes', searchVolume: 4200, competitors: 2800, competitionLevel: 'medium' as CompetitionLevel, relevance: 'very-high' as RelevanceLevel, intent: 'purchase' as IntentType, state: 'tested-works' as KeywordState },
    { keyword: 'mindfulness guía completa', searchVolume: 3800, competitors: 450, competitionLevel: 'low' as CompetitionLevel, relevance: 'very-high' as RelevanceLevel, intent: 'purchase' as IntentType, state: 'tested-works' as KeywordState },
    { keyword: 'reducir ansiedad naturalmente', searchVolume: 5100, competitors: 8500, competitionLevel: 'high' as CompetitionLevel, relevance: 'high' as RelevanceLevel, intent: 'problem' as IntentType, state: 'pending' as KeywordState },
    { keyword: 'técnicas de relajación rápida', searchVolume: 2900, competitors: 320, competitionLevel: 'low' as CompetitionLevel, relevance: 'high' as RelevanceLevel, intent: 'research' as IntentType, state: 'low-competition' as KeywordState },
    { keyword: 'calmar la mente', searchVolume: 3200, competitors: 2100, competitionLevel: 'medium' as CompetitionLevel, relevance: 'very-high' as RelevanceLevel, intent: 'problem' as IntentType, state: 'pending' as KeywordState },
    { keyword: 'meditación guiada español', searchVolume: 6500, competitors: 3500, competitionLevel: 'medium' as CompetitionLevel, relevance: 'very-high' as RelevanceLevel, intent: 'purchase' as IntentType, state: 'tested-works' as KeywordState },
    { keyword: 'libro mindfulness amazon', searchVolume: 2100, competitors: 12000, competitionLevel: 'high' as CompetitionLevel, relevance: 'high' as RelevanceLevel, intent: 'purchase' as IntentType, state: 'pending' as KeywordState },
    { keyword: 'ejercicios respiración ansiedad', searchVolume: 1800, competitors: 280, competitionLevel: 'low' as CompetitionLevel, relevance: 'high' as RelevanceLevel, intent: 'problem' as IntentType, state: 'low-competition' as KeywordState },
    { keyword: 'dormir mejor sin pastillas', searchVolume: 4800, competitors: 9200, competitionLevel: 'high' as CompetitionLevel, relevance: 'high' as RelevanceLevel, intent: 'problem' as IntentType, state: 'pending' as KeywordState },
    { keyword: 'bienestar emocional libro', searchVolume: 1500, competitors: 180, competitionLevel: 'low' as CompetitionLevel, relevance: 'very-high' as RelevanceLevel, intent: 'purchase' as IntentType, state: 'tested-works' as KeywordState },
  ];
  
  guaranteedKeywords.forEach(gk => {
    usedKeywords.add(gk.keyword.toLowerCase());
    keywords.push(createKeywordDefaults({
      ...gk,
      campaignTypes: randomFrom(campaignTypeOptions),
      notes: '',
      marketplaceId,
    }));
  });
  
  // Generate remaining keywords
  while (keywords.length < count) {
    const kw = generateKeyword(marketplaceId, usedKeywords);
    if (kw) {
      keywords.push(kw);
    }
  }
  
  return keywords;
}

// ASIN generation
const bookTitles = [
  'Mindfulness: Guía Completa', 'El Arte de Meditar', 'Paz Interior',
  'Calma en el Caos', 'Vivir sin Ansiedad', 'Respirar y Ser',
  'El Poder del Ahora', 'Meditación Práctica', 'Serenidad Total',
  'Mente en Calma', 'El Camino del Zen', 'Bienestar Emocional',
  'Domina tu Mente', 'Silencio Interior', 'La Vida Consciente',
  'Relajación Profunda', 'Equilibrio Mental', 'Despertar la Calma',
  'Mindfulness Diario', 'El Arte de la Serenidad', 'Meditación para Todos',
  'Supera la Ansiedad', 'Técnicas de Relajación', 'Paz Mental',
  'El Libro de la Calma', 'Mindfulness en Acción', 'Guía de Meditación',
  'Bienestar Integral', 'Vida Plena', 'El Poder de la Mente',
  'Respiración Consciente', 'Calma tu Mente', 'Vivir el Presente',
  'Meditación Zen', 'El Arte de Respirar', 'Tranquilidad Interior',
  'Mente Serena', 'El Camino de la Paz', 'Consciencia Plena',
  'Libérate del Estrés', 'Armonía Interior', 'El Poder del Silencio',
];

function generateASIN(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let asin = 'B0';
  for (let i = 0; i < 8; i++) {
    asin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return asin;
}

function randomBSR(): number {
  const ranges = [
    { min: 100, max: 1000, weight: 5 },
    { min: 1000, max: 5000, weight: 20 },
    { min: 5000, max: 15000, weight: 30 },
    { min: 15000, max: 50000, weight: 25 },
    { min: 50000, max: 150000, weight: 15 },
    { min: 150000, max: 500000, weight: 5 },
  ];
  
  const totalWeight = ranges.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const range of ranges) {
    random -= range.weight;
    if (random <= 0) {
      return Math.floor(Math.random() * (range.max - range.min) + range.min);
    }
  }
  
  return Math.floor(Math.random() * 10000 + 5000);
}

export function generateDemoASINs(
  marketplaceId: string, 
  count: number = 40
): Omit<TargetASIN, 'id' | 'createdAt' | 'updatedAt'>[] {
  const usedASINs = new Set<string>();
  const usedTitles = new Set<string>();
  const asins: Omit<TargetASIN, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  
  for (let i = 0; i < count; i++) {
    let asin = generateASIN();
    while (usedASINs.has(asin)) {
      asin = generateASIN();
    }
    usedASINs.add(asin);
    
    let title = randomFrom(bookTitles);
    let suffix = 1;
    while (usedTitles.has(title)) {
      title = `${randomFrom(bookTitles)} ${suffix > 1 ? `Vol. ${suffix}` : ''}`.trim();
      suffix++;
    }
    usedTitles.add(title);
    
    const bsr = randomBSR();
    const threatScore = Math.max(10, Math.min(95, 100 - Math.floor(Math.log10(bsr) * 15) + Math.floor(Math.random() * 20 - 10)));
    const sharedKeywords = Math.floor(Math.random() * 20) + 1;
    
    const notes = Math.random() > 0.6 
      ? randomFrom([
          'Competidor directo',
          'Best seller del nicho',
          'Nuevo lanzamiento',
          'Precio agresivo',
          'Buen A+ Content',
          'Muchas reseñas',
          'Autor conocido',
          '',
        ])
      : '';

    asins.push({
      asin,
      title,
      campaignTypes: randomFrom(campaignTypeOptions),
      notes,
      marketplaceId,
      bsr,
      amazonUrl: `https://amazon.com/dp/${asin}`,
      threatScore,
      sharedKeywords,
    });
  }
  
  // Sort by BSR (lower = more relevant)
  return asins.sort((a, b) => (a.bsr || 0) - (b.bsr || 0));
}

// Category generation
const categoryNames = [
  'Kindle eBooks → Meditation',
  'Kindle eBooks → Stress Management',
  'Kindle eBooks → Mindfulness',
  'Kindle eBooks → Anxiety Disorders',
  'Kindle eBooks → Personal Transformation',
  'Kindle eBooks → Psychology → Emotions',
  'Kindle eBooks → Alternative Medicine',
  'Kindle eBooks → Guided Meditation',
  'Kindle eBooks → Breathing Exercises',
  'Kindle eBooks → Sleep & Dreams',
  'Books → Spirituality',
  'Books → Personal Transformation',
  'Books → Self-Help',
  'Books → Mental Health',
  'Books → Wellness',
  'Kindle → Short Reads 90m',
  'Kindle → Short Reads 45m',
  'Books → Relaxation Techniques',
  'Kindle eBooks → Yoga & Meditation',
  'Books → Holistic Health',
];

function generateCategoryId(): string {
  const prefixes = ['KHD', 'KSH', 'BRS', 'BPT', 'KMF', 'BAM', 'KPE', 'BAD', 'KSR', 'BGM'];
  return `${randomFrom(prefixes)}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`;
}

export function generateDemoCategories(
  marketplaceId: string, 
  count: number = 15
): Omit<AdvertisingCategory, 'id' | 'createdAt' | 'updatedAt'>[] {
  const usedNames = new Set<string>();
  const categories: Omit<AdvertisingCategory, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  
  for (let i = 0; i < Math.min(count, categoryNames.length); i++) {
    let name = categoryNames[i];
    if (usedNames.has(name)) continue;
    usedNames.add(name);
    
    const notes = Math.random() > 0.5 
      ? randomFrom([
          'Categoría principal',
          'Alta conversión',
          'Mucha competencia',
          'Buen alcance',
          'Nicho específico',
          '',
        ])
      : '';

    categories.push({
      name,
      amazonId: generateCategoryId(),
      campaignTypes: randomFrom(campaignTypeOptions),
      notes,
      marketplaceId,
    });
  }
  
  return categories;
}
