import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, HelpCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for highlighting
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: '¡Bienvenido a Investigación Publicitaria!',
    description: 'Esta herramienta te ayudará a gestionar y optimizar tus keywords, ASINs y categorías para campañas de Amazon Ads. Vamos a recorrer las principales funcionalidades.',
    position: 'center',
  },
  {
    id: 'marketplace',
    title: 'Selector de Mercado',
    description: 'Aquí puedes seleccionar el marketplace de Amazon donde quieres gestionar tus datos. Cada mercado tiene su propio conjunto de keywords, ASINs y categorías.',
    target: '[data-tour="marketplace"]',
    position: 'bottom',
  },
  {
    id: 'book-info',
    title: 'Información del Libro',
    description: 'Configura el título, subtítulo y descripción de tu libro. Esta información se usa para calcular automáticamente la relevancia de las keywords.',
    target: '[data-tour="book-info"]',
    position: 'bottom',
  },
  {
    id: 'stats',
    title: 'Panel de Estadísticas',
    description: 'Aquí verás un resumen rápido de tus keywords, ASINs y categorías. Incluye métricas como volumen total, competencia promedio y distribución por estado.',
    target: '[data-tour="stats"]',
    position: 'bottom',
  },
  {
    id: 'tabs',
    title: 'Pestañas de Navegación',
    description: 'Navega entre las diferentes secciones: Keywords para palabras clave, ASIN para productos competidores, Categorías para segmentos de Amazon, y Visualizaciones para gráficas.',
    target: '[data-tour="tabs"]',
    position: 'bottom',
  },
  {
    id: 'keywords',
    title: 'Gestión de Keywords',
    description: 'Añade keywords manualmente o importa en lote. Cada keyword tiene campos como volumen de búsqueda, competencia, relevancia, intención y estado. Puedes editar directamente en la tabla.',
    position: 'center',
  },
  {
    id: 'bulk-import',
    title: 'Importación en Lote',
    description: 'Usa "Añadir en lote" para importar múltiples keywords de una vez. Soporta datos de herramientas externas como Helium 10 o Publisher Rocket con mapeo de columnas personalizable.',
    position: 'center',
  },
  {
    id: 'relevance',
    title: 'Relevancia Automática',
    description: 'El sistema calcula la relevancia de cada keyword basándose en el título y descripción de tu libro:\n• 🔵 Muy relevante: Coincide con el título\n• 🟢 Relevante: Está en el subtítulo o categorías\n• 🟡 Baja: Aparece en la descripción\n• 🔴 No relevante: Sin coincidencias',
    position: 'center',
  },
  {
    id: 'states',
    title: 'Estados de Keywords',
    description: 'Marca el estado de cada keyword según su rendimiento:\n• 🟢 Probada: Funciona bien\n• 🟡 Pendiente: Por probar\n• 🔵 Ideal: Baja competencia\n• 🔴 Descartada: No funciona',
    position: 'center',
  },
  {
    id: 'visualizations',
    title: 'Visualizaciones',
    description: 'Accede a gráficas interactivas como el Mapa de Oportunidades, distribución de volumen, nube de palabras y más. Puedes reorganizar y personalizar el dashboard.',
    position: 'center',
  },
  {
    id: 'finish',
    title: '¡Listo para empezar!',
    description: 'Ya conoces las funcionalidades principales. Puedes reabrir este tour en cualquier momento desde el botón "Ver tour" en la parte superior. ¡Éxito con tus campañas!',
    position: 'center',
  },
];

const STORAGE_KEY = 'publify-tour-completed';

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const GuidedTour = ({ isOpen, onClose, onComplete }: GuidedTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const step = TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setCurrentStep(0);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setCurrentStep(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Tour Card */}
      <Card className="relative z-10 max-w-lg mx-4 shadow-2xl border-primary/20 bg-card animate-in fade-in-0 zoom-in-95">
        <CardContent className="pt-6">
          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 p-0"
            onClick={handleSkip}
          >
            <X className="w-4 h-4" />
          </Button>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="gap-1">
                <Sparkles className="w-3 h-3" />
                Paso {currentStep + 1} de {TOUR_STEPS.length}
              </Badge>
            </div>
            <Progress value={progress} className="h-1" />
          </div>

          {/* Content */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <HelpCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{step.description}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
              >
                Saltar tour
              </Button>
              <Button
                size="sm"
                onClick={handleNext}
                className="gap-1"
              >
                {currentStep === TOUR_STEPS.length - 1 ? 'Finalizar' : 'Siguiente'}
                {currentStep < TOUR_STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Hook to check if tour should be shown
export const useTourStatus = () => {
  const [hasCompletedTour, setHasCompletedTour] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    setHasCompletedTour(completed === 'true');
  }, []);

  const resetTour = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasCompletedTour(false);
  };

  return { hasCompletedTour, setHasCompletedTour, resetTour };
};
