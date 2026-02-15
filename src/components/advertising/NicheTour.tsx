import { GuidedTour, type TourStep } from "./GuidedTour";

const NICHE_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenido al Estudio de Nicho',
    description: 'Este módulo te ayuda a investigar nichos y seleccionar keywords editoriales para tus libros en KDP.',
    tip: 'Puedes interactuar con la interfaz mientras haces el tour. Ciérralo cuando quieras con ✕.',
    position: 'center',
  },
  {
    id: 'marketplace',
    title: 'Marketplace',
    description: 'Selecciona el mercado que quieres analizar. Cada marketplace tiene keywords y datos independientes.',
    tip: 'El marketplace afecta royalties, precios permitidos y categorías. Configura los criterios antes de analizar.',
    target: '[data-tour="marketplace"]',
    position: 'right',
  },
  {
    id: 'book-info',
    title: 'Contexto del Libro',
    description: 'Define título, precio y regalías para calcular métricas como el ACOS de Punto de Equilibrio.',
    tip: 'Piensa en esto como tu "nodo central" — todo se asocia a este contexto.',
    target: '[data-tour="book-info"]',
    position: 'bottom',
  },
  {
    id: 'keywords',
    title: 'Keywords Editoriales',
    description: 'Aquí gestionas tus keywords de investigación. Añade, importa o edita keywords para tu estudio de nicho.',
    tip: 'KDP permite hasta 7 keywords por libro. Evita keyword stuffing, claims subjetivos y URLs.',
    target: '[data-tour="keywords-section"]',
    position: 'top',
    requiresMainView: 'data',
  },
  {
    id: 'import',
    title: 'Importar Datos',
    description: 'Importa datos desde Helium 10, BookBeam o Publisher Rocket para evitar copiar manualmente.',
    tip: 'Este import es de keywords editoriales (no de ADS).',
    target: '[data-tour="external-import"]',
    position: 'bottom',
    requiresMainView: 'data',
  },
  {
    id: 'visualizaciones',
    title: 'Visualizaciones',
    description: 'Cambia a la vista de gráficos para ver patrones, distribuciones y oportunidades de mercado.',
    tip: 'Ideal para ver patrones y decidir rápido.',
    target: '[data-tour="tab-visualizaciones"]',
    position: 'bottom',
    requiresMainView: 'data',
  },
];

interface NicheTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const NicheTour = ({ isOpen, onClose, onComplete }: NicheTourProps) => {
  return (
    <GuidedTour
      isOpen={isOpen}
      onClose={onClose}
      onComplete={onComplete}
      steps={NICHE_TOUR_STEPS}
    />
  );
};
