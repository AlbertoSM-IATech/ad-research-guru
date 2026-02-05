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
 }
 
 const TOUR_STEPS: TourStep[] = [
   {
     id: 'welcome',
     title: 'Bienvenido a tu panel',
     description: 'Este panel reúne lo básico para analizar keywords y tomar decisiones sin perderte entre pestañas y excels.',
     tip: 'Puedes clicar por el panel mientras hago el tour.',
     position: 'center',
   },
   {
     id: 'marketplace',
     title: 'Selecciona tu marketplace',
     description: 'Define el mercado (ES, US, etc.). Esto afecta referencias y lectura de datos.',
     tip: 'Cámbialo antes de analizar para no mezclar mercados.',
     target: '[data-tour="marketplace"]',
     position: 'bottom',
   },
   {
     id: 'book-info',
     title: 'Contexto del libro',
     description: 'Aquí ves el libro o entidad sobre la que estás trabajando y su información principal.',
     tip: 'Todo lo que hagas aquí queda ligado a este contexto.',
     target: '[data-tour="book-info"]',
     position: 'bottom',
   },
   {
     id: 'tabs',
     title: 'Navega por áreas',
     description: 'Cambia entre secciones para ver datos, tablas y visualizaciones sin perder el hilo.',
     tip: 'Si buscas algo y no lo ves, revisa primero en qué pestaña estás.',
     target: '[data-tour="tabs"]',
     position: 'bottom',
   },
   {
     id: 'keywords',
     title: 'Tabla de keywords',
     description: 'Aquí registras, comparas y decides qué keywords tienen sentido según tus criterios.',
     tip: 'Mantén la tabla limpia: lo que no sirve, se archiva o descarta.',
     target: '[data-tour="keywords-section"]',
     position: 'top',
     requiresTab: 'keywords',
   },
   {
     id: 'external-import',
     title: 'Importar datos',
     description: 'Importa datos de herramientas externas (por ejemplo, tu investigación previa) para no copiar a mano.',
     tip: 'Este botón pertenece a keywords: úsalo aquí, no en Ads.',
     target: '[data-tour="external-import"]',
     position: 'bottom',
     requiresTab: 'keywords',
   },
   {
     id: 'stats',
     title: 'Visualizaciones',
     description: 'Un vistazo rápido a métricas y resúmenes. Ideal para detectar anomalías y decidir rápido.',
     tip: 'Si algo te chirría, vuelve a la tabla y revisa los datos base.',
     target: '[data-tour="stats"]',
     position: 'top',
     requiresInsightsOpen: true,
   },
   {
     id: 'finish',
     title: 'Listo',
     description: 'Ya conoces lo esencial. Repite este tour cuando quieras desde el botón "Tour" del header.',
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
 
   useEffect(() => {
     if (!isOpen) return;
     setTargetRect(null);
     setTargetNotFound(false);
     if (!step.target) {
       setLastValidRect(null);
       return;
     }
     prepareUIState(step);
     const findTimeout = setTimeout(() => {
       const element = document.querySelector(step.target!);
       if (element) {
         const rect = element.getBoundingClientRect();
         const viewportHeight = window.innerHeight;
         const margin = 80;
         if (rect.top < margin || rect.bottom > viewportHeight - margin) {
           element.scrollIntoView({ behavior: 'auto', block: 'center' });
         }
         requestAnimationFrame(() => updateTargetRect());
       } else {
         setTargetNotFound(true);
       }
     }, 150);
     return () => clearTimeout(findTimeout);
   }, [isOpen, currentStep, step.target, prepareUIState, updateTargetRect]);
 
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
 
   const getCardStyle = (): React.CSSProperties => {
     if (!displayRect || step.position === 'center') return {};
     const padding = 20;
     const cardWidth = 420;
     const cardHeight = 240;
     switch (step.position) {
       case 'bottom':
         return {
           position: 'fixed',
           top: Math.min(displayRect.bottom + padding, window.innerHeight - cardHeight - padding),
           left: Math.max(padding, Math.min(displayRect.left, window.innerWidth - cardWidth - padding)),
         };
       case 'top':
         return {
           position: 'fixed',
           bottom: Math.max(padding, window.innerHeight - displayRect.top + padding),
           left: Math.max(padding, Math.min(displayRect.left, window.innerWidth - cardWidth - padding)),
         };
       case 'left':
         return {
           position: 'fixed',
           top: Math.max(padding, Math.min(displayRect.top, window.innerHeight - cardHeight)),
           right: Math.max(padding, window.innerWidth - displayRect.left + padding),
         };
       case 'right':
         return {
           position: 'fixed',
           top: Math.max(padding, Math.min(displayRect.top, window.innerHeight - cardHeight)),
           left: Math.min(displayRect.right + padding, window.innerWidth - cardWidth - padding),
         };
       default:
         return {};
     }
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
         className={`pointer-events-auto max-w-md shadow-2xl border-primary/30 bg-card/95 backdrop-blur-sm animate-in fade-in-0 zoom-in-95 ${
           showCentered ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''
         }`}
         style={!showCentered ? getCardStyle() : undefined}
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
