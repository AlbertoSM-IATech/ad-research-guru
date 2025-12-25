import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, HelpCircle, Sparkles, ArrowDown, ArrowUp, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
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
  // UI state requirements for this step
  requiresTab?: 'keywords' | 'asins' | 'categories';
  requiresInsightsOpen?: boolean;
  requiresBookPanelOpen?: boolean;
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
    requiresBookPanelOpen: true,
  },
  {
    id: 'tabs',
    title: '📍 Pestañas de Navegación',
    description: 'Observa las pestañas: Keywords, ASIN, Categorías → Navega entre secciones haciendo clic en ellas.',
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
    requiresTab: 'keywords',
  },
  {
    id: 'bulk-import',
    title: '📍 Importación en Lote',
    description: 'Busca el botón "Añadir en lote" → Importa múltiples keywords de una vez desde Helium 10, Publisher Rocket, etc.',
    target: '[data-tour="bulk-import"]',
    position: 'bottom',
    pointer: 'up',
    requiresTab: 'keywords',
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
    id: 'stats',
    title: '📍 Panel de Estadísticas',
    description: 'Mira las tarjetas de estadísticas → Aquí verás un resumen de tus keywords, ASINs y categorías con métricas clave.',
    target: '[data-tour="stats"]',
    position: 'top',
    pointer: 'down',
    requiresInsightsOpen: true,
  },
  {
    id: 'finish',
    title: '¡Listo para empezar!',
    description: 'Ya conoces las funcionalidades principales. Puedes reabrir este tour desde el botón "Ver tour" en la parte superior. ¡Éxito con tus campañas!',
    position: 'center',
  },
];

const STORAGE_KEY = 'publify-tour-completed';

export interface UIStateRequest {
  activeTab?: 'keywords' | 'asins' | 'categories';
  showInsights?: boolean;
  isBookPanelOpen?: boolean;
}

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onRequestUIState?: (state: UIStateRequest) => void;
}

export const GuidedTour = ({ isOpen, onClose, onComplete, onRequestUIState }: GuidedTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetNotFound, setTargetNotFound] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const step = TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  // Prepare UI state before trying to find the target
  const prepareUIState = useCallback((tourStep: TourStep) => {
    if (!onRequestUIState) return;
    
    const stateRequest: UIStateRequest = {};
    
    if (tourStep.requiresTab) {
      stateRequest.activeTab = tourStep.requiresTab;
    }
    if (tourStep.requiresInsightsOpen) {
      stateRequest.showInsights = true;
    }
    if (tourStep.requiresBookPanelOpen) {
      stateRequest.isBookPanelOpen = true;
    }
    
    if (Object.keys(stateRequest).length > 0) {
      onRequestUIState(stateRequest);
    }
  }, [onRequestUIState]);

  // Find target element and update rect
  const updateTargetRect = useCallback(() => {
    if (!step.target) {
      setTargetRect(null);
      setTargetNotFound(false);
      return;
    }
    
    const element = document.querySelector(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
      setTargetNotFound(false);
    } else {
      setTargetRect(null);
      setTargetNotFound(true);
    }
  }, [step.target]);

  // Effect: Prepare UI state and find target when step changes
  useEffect(() => {
    if (!isOpen) return;
    
    // Reset state
    setTargetRect(null);
    setTargetNotFound(false);
    
    // If no target, nothing to do
    if (!step.target) return;
    
    // First, prepare the UI state (open panels, switch tabs, etc.)
    prepareUIState(step);
    
    // Wait for React to re-render, then find the element
    const findAndScrollTimeout = setTimeout(() => {
      const element = document.querySelector(step.target!);
      if (element) {
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Wait for scroll to complete, then recalculate rect
        setTimeout(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              updateTargetRect();
            });
          });
        }, 300);
      } else {
        setTargetNotFound(true);
      }
    }, 100);
    
    return () => clearTimeout(findAndScrollTimeout);
  }, [isOpen, currentStep, step.target, prepareUIState, updateTargetRect]);

  // Effect: Recalculate on scroll and resize
  useEffect(() => {
    if (!isOpen || !step.target) return;
    
    const handleScrollOrResize = () => {
      requestAnimationFrame(() => {
        updateTargetRect();
      });
    };
    
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, step.target, updateTargetRect]);

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
    const cardHeight = 280; // Approximate card height
    
    switch (step.position) {
      case 'bottom':
        return {
          position: 'fixed',
          top: Math.min(targetRect.bottom + padding, window.innerHeight - cardHeight),
          left: Math.max(padding, Math.min(targetRect.left, window.innerWidth - cardWidth - padding)),
        };
      case 'top':
        return {
          position: 'fixed',
          bottom: Math.max(padding, window.innerHeight - targetRect.top + padding),
          left: Math.max(padding, Math.min(targetRect.left, window.innerWidth - cardWidth - padding)),
        };
      case 'left':
        return {
          position: 'fixed',
          top: Math.max(padding, Math.min(targetRect.top, window.innerHeight - cardHeight)),
          right: Math.max(padding, window.innerWidth - targetRect.left + padding),
        };
      case 'right':
        return {
          position: 'fixed',
          top: Math.max(padding, Math.min(targetRect.top, window.innerHeight - cardHeight)),
          left: Math.min(targetRect.right + padding, window.innerWidth - cardWidth - padding),
        };
      default:
        return {};
    }
  };

  const PointerArrow = () => {
    if (!step.pointer || targetNotFound) return null;
    
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

  // Determine if we should show centered (no target found or center position)
  const showCentered = step.position === 'center' || (step.target && targetNotFound);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Semi-transparent overlay - NO blur so highlighted elements stay crisp */}
      <div 
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        onClick={handleSkip}
      />

      {/* Highlight box around target element - creates clear "window" */}
      {targetRect && !targetNotFound && (
        <>
          {/* Clear window over the target - removes the dark overlay in this area */}
          <div
            className="absolute bg-transparent pointer-events-none"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
              borderRadius: '12px',
            }}
          />
          {/* Border highlight */}
          <div
            className="absolute border-2 border-primary rounded-lg pointer-events-none"
            style={{
              top: targetRect.top - 4,
              left: targetRect.left - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
              boxShadow: '0 0 20px 4px hsl(var(--primary) / 0.4)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        </>
      )}

      {/* Tour Card */}
      <Card 
        ref={cardRef}
        className={`pointer-events-auto max-w-md shadow-2xl border-primary/20 bg-card animate-in fade-in-0 zoom-in-95 ${
          showCentered ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''
        }`}
        style={!showCentered ? getCardStyle() : undefined}
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
              {step.pointer && !targetNotFound && (
                <div className="flex items-center gap-1 text-xs text-primary">
                  <PointerArrow />
                  <span>Mira aquí</span>
                </div>
              )}
            </div>
            <Progress value={progress} className="h-1" />
          </div>

          {/* Target not found warning */}
          {targetNotFound && step.target && (
            <div className="mb-3 p-2 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>No se pudo resaltar el elemento. Pulsa Siguiente para continuar.</span>
            </div>
          )}

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
