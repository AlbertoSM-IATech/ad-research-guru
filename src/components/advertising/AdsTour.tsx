import { GuidedTour, type TourStep } from "./GuidedTour";

const ADS_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenido a Gestión de ADS',
    description: 'Este módulo gestiona tus campañas de Amazon Ads. Controla rendimiento, ACOS y rentabilidad.',
    tip: 'Puedes interactuar con la interfaz mientras haces el tour.',
    position: 'center',
  },
  {
    id: 'book-info',
    title: 'Contexto del Libro',
    description: 'El precio y regalías definen tu Punto de Equilibrio (PE). Asegúrate de tenerlos configurados.',
    tip: 'Sin precio y regalías, no podrás calcular si tus Ads son rentables.',
    target: '[data-tour="book-info"]',
    position: 'bottom',
  },
  {
    id: 'dashboard',
    title: 'Dashboard de Rendimiento',
    description: 'Vista global de métricas: Gasto, Ventas, ACOS y alertas de keywords que necesitan atención.',
    tip: 'El dashboard se actualiza automáticamente al importar datos de Amazon Ads.',
    target: '[data-tour="keywords-section"]',
    position: 'top',
  },
  {
    id: 'keywords-ads',
    title: 'Keywords de Ads',
    description: 'Gestiona keywords de campañas con métricas de rendimiento: CPC, clics, pedidos y ACOS.',
    tip: 'Revisa bids cada 2 semanas: sube top performers, reduce no convertidores.',
    target: '[data-tour="keywords-section"]',
    position: 'top',
  },
  {
    id: 'import-ads',
    title: 'Importar Amazon ADS',
    description: 'Importa datos directamente desde tu consola de Amazon Ads para automatizar el seguimiento.',
    tip: 'Los reportes de Amazon pueden tardar hasta 14 días en ser definitivos.',
    target: '[data-tour="btn-import-ads"]',
    position: 'bottom',
  },
  {
    id: 'alerts',
    title: 'Alertas ACOS',
    description: 'Recibe avisos cuando keywords superan el Punto de Equilibrio o tienen anomalías de rendimiento.',
    tip: 'Compara tu ACOS actual con el PE antes de escalar presupuesto.',
    target: '[data-tour="keywords-section"]',
    position: 'top',
  },
];

interface AdsTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const AdsTour = ({ isOpen, onClose, onComplete }: AdsTourProps) => {
  return (
    <GuidedTour
      isOpen={isOpen}
      onClose={onClose}
      onComplete={onComplete}
      steps={ADS_TOUR_STEPS}
    />
  );
};
