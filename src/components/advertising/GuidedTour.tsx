import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, HelpCircle, Sparkles, ArrowDown, ArrowUp, ArrowLeft, ArrowRight } from 'lucide-react';
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
  pointer?: 'up' | 'down' | 'left' | 'right'; // Arrow direction pointing to element
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
    title: '📍 Selector de Mercado',
    description: 'Mira arriba a la izquierda → Aquí puedes seleccionar el marketplace de Amazon donde quieres gestionar tus datos.',
    target: '[data-tour="marketplace"]',
    position: 'bottom',
    pointer: 'up',
  },
  {
    id: 'book-info',
    title: '📍 Información del Libro',
    description: 'Busca el panel "Información del Libro" → Configura el título, subtítulo y descripción. Esta información se usa para calcular la relevancia de keywords.',
    target: '[data-tour="book-info"]',
    position: 'bottom',
    pointer: 'up',
  },
  {
    id: 'stats',
    title: '📍 Panel de Estadísticas',
    description: 'Mira las tarjetas de estadísticas → Aquí verás un resumen de tus keywords, ASINs y categorías con métricas clave.',
    target: '[data-tour="stats"]',
    position: 'bottom',
    pointer: 'up',
  },
  {
    id: 'tabs',
    title: '📍 Pestañas de Navegación',
    description: 'Observa las pestañas: Keywords, ASIN, Categorías, Visualizaciones → Navega entre secciones haciendo clic en ellas.',
    target: '[data-tour="tabs"]',
    position: 'bottom',
    pointer: 'up',
  },
  {
    id: 'keywords',
    title: '📍 Gestión de Keywords',
    description: 'En la pestaña "Keywords" encontrarás:\n• Campo de añadir rápido arriba\n• Tabla editable con tus keywords\n• Botones de acciones en lote',
    target: '[data-tour="keywords-section"]',
    position: 'top',
    pointer: 'down',
  },
  {
    id: 'bulk-import',
    title: '📍 Importación en Lote',
    description: 'Busca el botón "Añadir en lote" → Importa múltiples keywords de una vez desde Helium 10, Publisher Rocket, etc.',
    target: '[data-tour="bulk-import"]',
    position: 'bottom',
    pointer: 'up',
  },
  {
    id: 'relevance',
    title: 'Relevancia Automática',
    description: 'En la columna "Relevancia" verás:\n• 🔵 Muy relevante: Coincide con el título\n• 🟢 Relevante: Está en el subtítulo\n• 🟡 Baja: Aparece en la descripción\n• 🔴 No relevante: Sin coincidencias',
    position: 'center',
  },
  {
    id: 'states',
    title: 'Estados de Keywords',
    description: 'En la columna "Estado" puedes marcar:\n• 🟢 Probada: Funciona bien\n• 🟡 Pendiente: Por probar\n• 🔵 Ideal: Baja competencia\n• 🔴 Descartada: No funciona',
    position: 'center',
  },
  {
    id: 'visualizations',
    title: '📍 Visualizaciones',
    description: 'Haz clic en la pestaña "Visualizaciones" → Accede a gráficas interactivas como el Mapa de Oportunidades, nube de palabras y más.',
    target: '[data-tour="tabs"]',
    position: 'bottom',
    pointer: 'up',
  },
  {
    id: 'finish',
    title: '¡Listo para empezar!',
    description: 'Ya conoces las funcionalidades principales. Puedes reabrir este tour desde el botón "Ver tour" en la parte superior. ¡Éxito con tus campañas!',
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
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const step = TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  // Find and highlight target element
  useEffect(() => {
    if (!isOpen || !step.target) {
      setTargetRect(null);
      return;
    }
    
    const element = document.querySelector(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
      
      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setTargetRect(null);
    }
  }, [isOpen, step.target, currentStep]);

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

  // Calculate card position based on target
  const getCardStyle = (): React.CSSProperties => {
    if (!targetRect || step.position === 'center') {
      return {};
    }
    
    const padding = 20;
    const cardWidth = 450;
    
    switch (step.position) {
      case 'bottom':
        return {
          position: 'fixed',
          top: Math.min(targetRect.bottom + padding, window.innerHeight - 300),
          left: Math.max(padding, Math.min(targetRect.left, window.innerWidth - cardWidth - padding)),
        };
      case 'top':
        return {
          position: 'fixed',
          bottom: window.innerHeight - targetRect.top + padding,
          left: Math.max(padding, Math.min(targetRect.left, window.innerWidth - cardWidth - padding)),
        };
      default:
        return {};
    }
  };

  const PointerArrow = () => {
    if (!step.pointer) return null;
    
    const arrowClass = "w-6 h-6 text-primary animate-bounce";
    
    switch (step.pointer) {
      case 'up':
        return <ArrowUp className={arrowClass} />;
      case 'down':
        return <ArrowDown className={arrowClass} />;
      case 'left':
        return <ArrowLeft className={arrowClass} />;
      case 'right':
        return <ArrowRight className={arrowClass} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Semi-transparent overlay with cutout for target */}
      <div 
        className="absolute inset-0 bg-background/60 backdrop-blur-[2px] pointer-events-auto"
        onClick={handleSkip}
      />

      {/* Highlight box around target element */}
      {targetRect && (
        <div
          className="absolute border-2 border-primary rounded-lg shadow-lg shadow-primary/30 pointer-events-none animate-pulse"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
          }}
        />
      )}

      {/* Tour Card */}
      <Card 
        ref={cardRef}
        className={`pointer-events-auto max-w-md shadow-2xl border-primary/20 bg-card animate-in fade-in-0 zoom-in-95 ${
          step.position === 'center' ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''
        }`}
        style={step.position !== 'center' ? getCardStyle() : undefined}
      >
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
              {step.pointer && (
                <div className="flex items-center gap-1 text-xs text-primary">
                  <PointerArrow />
                  <span>Mira aquí</span>
                </div>
              )}
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
