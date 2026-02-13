import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles, AlertCircle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  tip?: string;
  target?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  requiresTab?: 'keywords' | 'asins' | 'categories';
  requiresInsightsOpen?: boolean;
  requiresBookPanelOpen?: boolean;
  requiresFunctionalView?: 'editorial' | 'ads';
  requiresMainView?: 'data' | 'insights';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenido',
    description: 'Te enseño lo esencial del panel sin bloquearte la pantalla. Puedes clicar mientras haces el tour.',
    tip: 'Ciérralo cuando quieras con ✕ (no se marca como completado).',
    position: 'center',
  },
  {
    id: 'marketplace',
    title: 'Marketplace',
    description: 'Elige el mercado (ES/US/etc.). Afecta a tus referencias y a cómo interpretas los datos.',
    tip: 'El marketplace afecta royalties, precios permitidos y categorías. Configura los criterios de mercado antes de analizar.',
    target: '[data-tour="marketplace"]',
    position: 'bottom',
  },
  {
    id: 'book-info',
    title: 'Contexto',
    description: 'Aquí ves el libro o entidad con la que estás trabajando. Todo lo que registres se asocia a este contexto.',
    tip: 'Piensa en esto como tu "nodo central".',
    target: '[data-tour="book-info"]',
    position: 'bottom',
  },
  {
    id: 'tabs-nav',
    title: 'Datos vs Visualizaciones',
    description: 'Estos botones cambian entre la vista de datos (tablas) y la vista visual (gráficos).',
    tip: 'Si algo "no está", probablemente estás en la pestaña equivocada.',
    target: '[data-tour="tab-datos"]',
    position: 'bottom',
    requiresMainView: 'data',
  },
  {
    id: 'estudio-kw',
    title: 'Estudio de KW',
    description: 'Entras aquí para trabajar el estudio de palabras clave y registrar los datos importantes.',
    tip: 'KDP permite hasta 7 keywords por libro. Evita keyword stuffing, claims subjetivos ("bestselling") y URLs en títulos.',
    target: '[data-tour="btn-estudio-kw"]',
    position: 'bottom',
    requiresMainView: 'data',
    requiresTab: 'keywords',
    requiresFunctionalView: 'editorial',
  },
  {
    id: 'external-import',
    title: 'Importar datos (KW)',
    description: 'Importa datos desde herramientas externas para evitar copiar manualmente.',
    tip: 'Este import es de keywords (no de ADS).',
    target: '[data-tour="external-import"]',
    position: 'bottom',
    requiresMainView: 'data',
    requiresTab: 'keywords',
    requiresFunctionalView: 'editorial',
  },
  {
    id: 'metrics',
    title: 'Métricas rápidas',
    description: 'Un vistazo rápido para detectar anomalías y tomar decisiones sin perder el hilo.',
    tip: 'Si algo no cuadra, vuelve a Datos y revisa la base.',
    target: '[data-tour="tab-visualizaciones"]',
    position: 'bottom',
    requiresMainView: 'data',
  },
  {
    id: 'tab-ads',
    title: 'Gestión de ADS',
    description: 'Aquí controlas y revisas campañas y resultados de Amazon Ads dentro del panel.',
    tip: 'Úsalo para seguimiento y control, sin perder el contexto del libro.',
    target: '[data-tour="tab-ads"]',
    position: 'bottom',
    requiresMainView: 'data',
    requiresTab: 'keywords',
    requiresFunctionalView: 'ads',
  },
  {
    id: 'import-ads',
    title: 'Importar datos (ADS)',
    description: 'Este botón importa los datos de Amazon ADS (no es el import de keywords).',
    tip: 'Si no lo ves, asegúrate de estar en la pestaña de ADS.',
    target: '[data-tour="btn-import-ads"]',
    position: 'bottom',
    requiresMainView: 'data',
    requiresTab: 'keywords',
    requiresFunctionalView: 'ads',
  },
  {
    id: 'visualizaciones',
    title: 'Visualizaciones',
    description: 'Aquí ves gráficos para interpretar tendencias de un vistazo, sin quedarte solo con la tabla.',
    tip: 'Ideal para ver patrones y decidir rápido.',
    target: '[data-tour="tab-visualizaciones"]',
    position: 'bottom',
    requiresMainView: 'data',
  },
];

const STORAGE_KEY = 'publify-tour-completed';

const CARD_WIDTH = 380;
const CARD_HEIGHT_ESTIMATE = 220;
const VIEWPORT_MARGIN = 12;
const SCROLL_MARGIN = 80;

export interface UIStateRequest {
  activeTab?: 'keywords' | 'asins' | 'categories';
  showInsights?: boolean;
  isBookPanelOpen?: boolean;
  functionalView?: 'editorial' | 'ads';
  mainView?: 'data' | 'insights';
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
  const [lastValidRect, setLastValidRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  // Sticky highlight: use last valid rect if current target not found
  const displayRect = useMemo(() => {
    if (targetRect) return targetRect;
    if (targetNotFound && lastValidRect) return lastValidRect;
    return null;
  }, [targetRect, targetNotFound, lastValidRect]);

  const prepareUIState = useCallback((tourStep: TourStep) => {
    if (!onRequestUIState) return;
    const stateRequest: UIStateRequest = {};
    if (tourStep.requiresTab) stateRequest.activeTab = tourStep.requiresTab;
    if (tourStep.requiresInsightsOpen) stateRequest.showInsights = true;
    if (tourStep.requiresBookPanelOpen) stateRequest.isBookPanelOpen = true;
    if (tourStep.requiresFunctionalView) stateRequest.functionalView = tourStep.requiresFunctionalView;
    if (tourStep.requiresMainView) stateRequest.mainView = tourStep.requiresMainView;
    if (Object.keys(stateRequest).length > 0) onRequestUIState(stateRequest);
  }, [onRequestUIState]);

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
      setLastValidRect(rect);
      setTargetNotFound(false);
    } else {
      setTargetRect(null);
      setTargetNotFound(true);
    }
  }, [step.target]);

  // Scroll only if element is outside safe margins
  const scrollIfNeeded = useCallback((element: Element) => {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    if (rect.top < SCROLL_MARGIN || rect.bottom > viewportHeight - SCROLL_MARGIN) {
      element.scrollIntoView({ behavior: 'auto', block: 'center' });
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setTargetRect(null);
    setTargetNotFound(false);
    if (!step.target) {
      setLastValidRect(null);
      return;
    }
    prepareUIState(step);
    // Single RAF after UI state change to find element
    const findTimeout = setTimeout(() => {
      requestAnimationFrame(() => {
        const element = document.querySelector(step.target!);
        if (element) {
          scrollIfNeeded(element);
          requestAnimationFrame(() => updateTargetRect());
        } else {
          setTargetNotFound(true);
        }
      });
    }, 120);
    return () => clearTimeout(findTimeout);
  }, [isOpen, currentStep, step.target, prepareUIState, updateTargetRect, scrollIfNeeded]);

  useEffect(() => {
    if (!isOpen || !step.target) return;
    const handleScrollOrResize = () => requestAnimationFrame(() => updateTargetRect());
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, step.target, updateTargetRect]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) setCurrentStep(currentStep + 1);
    else handleComplete();
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setCurrentStep(0);
    setLastValidRect(null);
    onComplete();
  };

  const handleSkip = () => {
    setCurrentStep(0);
    setLastValidRect(null);
    onClose();
  };

  if (!isOpen) return null;

  // Clamp a value between min and max
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const getCardStyle = (): React.CSSProperties => {
    if (!displayRect || step.position === 'center') return {};
    const padding = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let desiredTop: number | undefined;
    let desiredLeft: number | undefined;
    let desiredBottom: number | undefined;
    let desiredRight: number | undefined;

    switch (step.position) {
      case 'bottom': {
        desiredTop = displayRect.bottom + padding;
        desiredLeft = displayRect.left + displayRect.width / 2 - CARD_WIDTH / 2;
        break;
      }
      case 'top': {
        desiredTop = displayRect.top - CARD_HEIGHT_ESTIMATE - padding;
        desiredLeft = displayRect.left + displayRect.width / 2 - CARD_WIDTH / 2;
        break;
      }
      case 'left': {
        desiredTop = displayRect.top + displayRect.height / 2 - CARD_HEIGHT_ESTIMATE / 2;
        desiredLeft = displayRect.left - CARD_WIDTH - padding;
        break;
      }
      case 'right': {
        desiredTop = displayRect.top + displayRect.height / 2 - CARD_HEIGHT_ESTIMATE / 2;
        desiredLeft = displayRect.right + padding;
        break;
      }
    }

    // Auto-flip if card goes off-screen
    if (desiredTop !== undefined && desiredTop + CARD_HEIGHT_ESTIMATE > vh - VIEWPORT_MARGIN) {
      // Try placing above
      const aboveTop = displayRect.top - CARD_HEIGHT_ESTIMATE - padding;
      if (aboveTop >= VIEWPORT_MARGIN) {
        desiredTop = aboveTop;
      }
    }
    if (desiredTop !== undefined && desiredTop < VIEWPORT_MARGIN) {
      // Try placing below
      const belowTop = displayRect.bottom + padding;
      if (belowTop + CARD_HEIGHT_ESTIMATE <= vh - VIEWPORT_MARGIN) {
        desiredTop = belowTop;
      }
    }

    // Clamp to viewport
    const finalLeft = desiredLeft !== undefined
      ? clamp(desiredLeft, VIEWPORT_MARGIN, vw - CARD_WIDTH - VIEWPORT_MARGIN)
      : undefined;
    const finalTop = desiredTop !== undefined
      ? clamp(desiredTop, VIEWPORT_MARGIN, vh - CARD_HEIGHT_ESTIMATE - VIEWPORT_MARGIN)
      : undefined;

    return {
      position: 'fixed' as const,
      ...(finalTop !== undefined ? { top: finalTop } : {}),
      ...(finalLeft !== undefined ? { left: finalLeft } : {}),
      ...(desiredBottom !== undefined ? { bottom: desiredBottom } : {}),
      ...(desiredRight !== undefined ? { right: desiredRight } : {}),
    };
  };

  const showCentered = step.position === 'center' || (step.target && !displayRect);
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none" role="dialog" aria-modal="false">
      {displayRect && (
        <div
          className="absolute border-2 border-primary rounded-lg pointer-events-none"
          style={{
            top: displayRect.top - 4,
            left: displayRect.left - 4,
            width: displayRect.width + 8,
            height: displayRect.height + 8,
            boxShadow: '0 0 20px 4px hsl(var(--primary) / 0.4)',
            animation: targetNotFound ? 'none' : 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            opacity: targetNotFound ? 0.5 : 1,
          }}
        />
      )}

      <Card
        ref={cardRef}
        className={`pointer-events-auto shadow-2xl border-primary/30 bg-card/95 backdrop-blur-sm animate-in fade-in-0 zoom-in-95 ${
          showCentered ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''
        }`}
        style={{
          ...(!showCentered ? getCardStyle() : undefined),
          width: CARD_WIDTH,
          maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
        }}
      >
        <CardContent className="pt-5 pb-4">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-7 w-7 p-0 opacity-70 hover:opacity-100"
            onClick={handleSkip}
            aria-label="Cerrar tour"
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="gap-1">
                <Sparkles className="w-3 h-3" />
                Paso {currentStep + 1} de {TOUR_STEPS.length}
              </Badge>
            </div>
            <Progress value={progress} className="h-1" />
          </div>

          {targetNotFound && step.target && !displayRect && (
            <div className="mb-2 p-2 rounded-md bg-destructive/10 border border-destructive/30 flex items-start gap-2 text-xs text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Elemento no disponible ahora. Abre la sección indicada o vuelve atrás.</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <h3 className="font-heading font-semibold text-base mb-1.5">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
            {step.tip && (
              <div className="flex items-start gap-2 p-2 rounded-md bg-primary/5 border border-primary/10">
                <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="text-xs text-muted-foreground">{step.tip}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <Button variant="ghost" size="sm" onClick={handlePrev} disabled={currentStep === 0} className="gap-1">
              <ChevronLeft className="w-4 h-4" />
              Atrás
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
                Saltar
              </Button>
              <Button size="sm" onClick={handleNext} className="gap-1">
                {isLastStep ? 'Finalizar' : 'Siguiente'}
                {!isLastStep && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

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
