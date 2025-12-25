import { useState, useEffect, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Save,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
} from 'lucide-react';
import {
  type KeywordValidation,
  type ValidationStatus,
  type TrafficSource,
  type BooksOver200Reviews,
  type ChecklistAnswer,
  TRAFFIC_SOURCE_OPTIONS,
  BOOKS_OVER_200_OPTIONS,
  VALIDATION_STATUS_OPTIONS,
  PROFITABLE_BOOKS_OPTIONS,
  getDefaultValidation,
  getDefaultChecklist,
  calculateRelevanceScore,
  calculateValidationStatus,
  getValidationAlerts,
  getScoreColor,
  getScoreBgColor,
  getScoreImpacts,
  scoreToRelevanceLevel,
} from '@/lib/keyword-validation';
import type { Keyword } from '@/types/advertising';
import { cn } from '@/lib/utils';

interface KeywordValidationDrawerProps {
  keyword: Keyword | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (keywordId: string, validation: KeywordValidation, newScore: number) => void;
}

export const KeywordValidationDrawer = ({
  keyword,
  isOpen,
  onClose,
  onSave,
}: KeywordValidationDrawerProps) => {
  const [validation, setValidation] = useState<KeywordValidation>(getDefaultValidation());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['market-interest']));

  // Load existing validation or defaults
  useEffect(() => {
    if (keyword?.validation) {
      setValidation({
        ...getDefaultValidation(),
        ...keyword.validation,
        checklist: keyword.validation.checklist?.length 
          ? keyword.validation.checklist 
          : getDefaultChecklist(),
      });
    } else {
      setValidation(getDefaultValidation());
    }
  }, [keyword]);

  // Create a virtual keyword with current validation for score calculation
  const virtualKeyword = useMemo((): Keyword | null => {
    if (!keyword) return null;
    return {
      ...keyword,
      validation,
    };
  }, [keyword, validation]);

  // Calculate score using the unified scoring function
  const calculatedScore = useMemo(() => {
    if (!virtualKeyword) return 0;
    return calculateRelevanceScore(virtualKeyword);
  }, [virtualKeyword]);

  const calculatedStatus = useMemo(() => 
    calculateValidationStatus(calculatedScore, validation),
  [calculatedScore, validation]);

  const alerts = useMemo(() => {
    if (!virtualKeyword) return [];
    return getValidationAlerts(virtualKeyword);
  }, [virtualKeyword]);

  const scoreImpacts = useMemo(() => {
    if (!virtualKeyword) return [];
    return getScoreImpacts(virtualKeyword);
  }, [virtualKeyword]);

  const handleFieldChange = <K extends keyof KeywordValidation>(
    field: K,
    value: KeywordValidation[K]
  ) => {
    setValidation(prev => ({
      ...prev,
      [field]: value,
      updatedAt: new Date(),
    }));
  };

  const handleChecklistChange = (
    groupId: string,
    itemId: string,
    field: 'answer' | 'notes',
    value: ChecklistAnswer | string
  ) => {
    setValidation(prev => ({
      ...prev,
      checklist: prev.checklist.map(group =>
        group.id === groupId
          ? {
              ...group,
              items: group.items.map(item =>
                item.id === itemId ? { ...item, [field]: value } : item
              ),
            }
          : group
      ),
      updatedAt: new Date(),
    }));
  };

  const handleSave = () => {
    if (!keyword) return;
    
    const finalValidation: KeywordValidation = {
      ...validation,
      validationStatus: validation.validationStatusOverride || calculatedStatus,
      updatedAt: new Date(),
    };
    
    onSave(keyword.id, finalValidation, calculatedScore);
    onClose();
  };

  const handleReset = () => {
    setValidation(getDefaultValidation());
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const statusInfo = VALIDATION_STATUS_OPTIONS.find(
    s => s.value === (validation.validationStatusOverride || calculatedStatus)
  );

  if (!keyword) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="text-lg font-semibold">
            Validación de Keyword
          </SheetTitle>
          <SheetDescription className="text-base font-medium text-foreground">
            "{keyword.keyword}"
          </SheetDescription>
          <p className="text-xs text-muted-foreground">
            Vol: {keyword.searchVolume.toLocaleString()} • Comp: {keyword.competitionLevel}
            {keyword.competitionNote && ` (${keyword.competitionNote})`}
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            {/* Score Summary */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Puntuación de Relevancia</span>
                <div className={cn(
                  'px-3 py-1 rounded-full font-bold text-lg',
                  getScoreBgColor(calculatedScore),
                  getScoreColor(calculatedScore)
                )}>
                  {calculatedScore}/100
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Nivel</span>
                <Badge variant="outline" className="font-medium">
                  {scoreToRelevanceLevel(calculatedScore) === 'very-high' && '🔵 Muy relevante'}
                  {scoreToRelevanceLevel(calculatedScore) === 'high' && '🟢 Relevante'}
                  {scoreToRelevanceLevel(calculatedScore) === 'low' && '🟡 Baja'}
                  {scoreToRelevanceLevel(calculatedScore) === 'none' && '🔴 No relevante'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Estado</span>
                <Badge variant="outline" className={cn('font-medium', statusInfo?.color)}>
                  {statusInfo?.label}
                </Badge>
              </div>

              {/* Score Impacts */}
              <div className="pt-2 border-t border-border space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">Impacto en score:</p>
                {scoreImpacts.map((impact, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{impact.label}</span>
                    <span className={cn(
                      'font-medium flex items-center gap-1',
                      impact.type === 'positive' && 'text-green-600',
                      impact.type === 'negative' && 'text-red-600',
                      impact.type === 'neutral' && 'text-muted-foreground'
                    )}>
                      {impact.type === 'positive' && <TrendingUp className="w-3 h-3" />}
                      {impact.type === 'negative' && <TrendingDown className="w-3 h-3" />}
                      {impact.type === 'neutral' && <Minus className="w-3 h-3" />}
                      {impact.impact > 0 && '+'}{impact.impact}
                    </span>
                  </div>
                ))}
              </div>

              {/* Status Override */}
              <div className="pt-2 border-t border-border">
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Forzar estado (opcional)
                </Label>
                <Select
                  value={validation.validationStatusOverride || 'auto'}
                  onValueChange={(value) => 
                    handleFieldChange('validationStatusOverride', value === 'auto' ? undefined : value as ValidationStatus)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Usar estado automático" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automático</SelectItem>
                    {VALIDATION_STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Alerts */}
              {alerts.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  {alerts.map((alert, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center gap-2 text-xs px-2 py-1 rounded',
                        alert.type === 'error' 
                          ? 'bg-red-500/10 text-red-600' 
                          : 'bg-yellow-500/10 text-yellow-600'
                      )}
                    >
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      {alert.message}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Qualitative Signals - NO volume, competitors, price duplicates */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Señales Cualitativas
              </h4>
              <p className="text-xs text-muted-foreground -mt-2">
                Estos datos enriquecen el análisis sin duplicar los campos de la tabla.
              </p>
              
              {/* Trademark Warning */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">¿Marca registrada?</Label>
                  <p className="text-xs text-muted-foreground">
                    Si es marca registrada, penaliza severamente (×0.3)
                  </p>
                </div>
                <Switch
                  checked={validation.hasTrademark}
                  onCheckedChange={(checked) => handleFieldChange('hasTrademark', checked)}
                />
              </div>

              {/* Autosuggest */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">¿Aparece en autosuggest?</Label>
                  <p className="text-xs text-muted-foreground">
                    Señal de demanda real (+5 puntos)
                  </p>
                </div>
                <Switch
                  checked={validation.autosuggestPresence}
                  onCheckedChange={(checked) => handleFieldChange('autosuggestPresence', checked)}
                />
              </div>

              {/* Books under 100 reviews */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">¿Hay libros con -100 reviews?</Label>
                  <p className="text-xs text-muted-foreground">
                    Espacio para entrar al mercado (+5 puntos)
                  </p>
                </div>
                <Switch
                  checked={validation.booksUnder100Reviews}
                  onCheckedChange={(checked) => handleFieldChange('booksUnder100Reviews', checked)}
                />
              </div>

              {/* Profitable Books Count */}
              <div className="space-y-2">
                <Label className="text-sm">Libros rentables visibles</Label>
                <Select
                  value={String(validation.profitableBooksCount)}
                  onValueChange={(value) => handleFieldChange('profitableBooksCount', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFITABLE_BOOKS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        <span className={cn('px-2 py-0.5 rounded text-xs', opt.color)}>
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Books Over 200 Reviews */}
              <div className="space-y-2">
                <Label className="text-sm">Libros con +200 reviews</Label>
                <Select
                  value={validation.booksOver200Reviews}
                  onValueChange={(value) => handleFieldChange('booksOver200Reviews', value as BooksOver200Reviews)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BOOKS_OVER_200_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={cn('px-2 py-0.5 rounded text-xs', opt.color)}>
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Traffic Source */}
              <div className="space-y-2">
                <Label className="text-sm">Fuente principal de tráfico</Label>
                <Select
                  value={validation.trafficSource}
                  onValueChange={(value) => handleFieldChange('trafficSource', value as TrafficSource)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAFFIC_SOURCE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs flex items-center gap-1',
                          opt.color
                        )}>
                          {opt.penalty && <AlertTriangle className="w-3 h-3" />}
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Editorial Viability */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Viabilidad Editorial (0-3)</h4>
              <p className="text-xs text-muted-foreground -mt-2">
                ¿Podemos producirlo? ¿Hacerlo mejor? ¿Diferenciarlo?
              </p>
              <div className="flex items-center gap-4">
                <Slider
                  value={[validation.contentFeasibilityScore]}
                  onValueChange={([value]) => handleFieldChange('contentFeasibilityScore', value)}
                  max={3}
                  step={1}
                  className="flex-1"
                />
                <Badge variant="outline" className="w-8 justify-center">
                  {validation.contentFeasibilityScore}
                </Badge>
              </div>
            </div>

            {/* Extra Opportunity */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Oportunidad Extra (0-2)</h4>
              <p className="text-xs text-muted-foreground -mt-2">
                Escalabilidad, nicho relacionado, interés estratégico
              </p>
              <div className="flex items-center gap-4">
                <Slider
                  value={[validation.extraOpportunityScore]}
                  onValueChange={([value]) => handleFieldChange('extraOpportunityScore', value)}
                  max={2}
                  step={1}
                  className="flex-1"
                />
                <Badge variant="outline" className="w-8 justify-center">
                  {validation.extraOpportunityScore}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Checklist */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Checklist de Análisis</h4>
              
              {validation.checklist.map((group) => (
                <Collapsible
                  key={group.id}
                  open={expandedGroups.has(group.id)}
                  onOpenChange={() => toggleGroup(group.id)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between px-3 py-2 h-auto"
                    >
                      <span className="text-sm font-medium">{group.title}</span>
                      <ChevronDown className={cn(
                        'w-4 h-4 transition-transform',
                        expandedGroups.has(group.id) && 'rotate-180'
                      )} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    {group.items.map((item) => (
                      <div key={item.id} className="space-y-2 pl-3 border-l-2 border-border">
                        <p className="text-xs text-muted-foreground">{item.question}</p>
                        <div className="flex gap-1">
                          {(['yes', 'no', 'na'] as ChecklistAnswer[]).map(answer => (
                            <Button
                              key={answer}
                              variant={item.answer === answer ? 'default' : 'outline'}
                              size="sm"
                              className={cn(
                                'h-7 text-xs',
                                item.answer === answer && answer === 'yes' && 'bg-green-600 hover:bg-green-700',
                                item.answer === answer && answer === 'no' && 'bg-red-600 hover:bg-red-700',
                                item.answer === answer && answer === 'na' && 'bg-muted text-muted-foreground'
                              )}
                              onClick={() => handleChecklistChange(group.id, item.id, 'answer', answer)}
                            >
                              {answer === 'yes' ? 'Sí' : answer === 'no' ? 'No' : 'N/A'}
                            </Button>
                          ))}
                        </div>
                        <Textarea
                          placeholder="Notas..."
                          value={item.notes}
                          onChange={(e) => handleChecklistChange(group.id, item.id, 'notes', e.target.value)}
                          className="text-xs min-h-[60px]"
                        />
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Notas de validación</Label>
              <Textarea
                value={validation.validationNotes}
                onChange={(e) => handleFieldChange('validationNotes', e.target.value)}
                placeholder="Notas adicionales sobre esta keyword..."
                className="min-h-[100px]"
              />
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex-shrink-0 border-t border-border pt-4 flex gap-2">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Reiniciar
          </Button>
          <Button onClick={handleSave} className="flex-1 gap-2">
            <Save className="w-4 h-4" />
            Guardar y actualizar score
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
