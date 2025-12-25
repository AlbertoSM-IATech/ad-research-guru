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
  HelpCircle,
} from 'lucide-react';
import {
  type KeywordValidation,
  type ValidationStatus,
  type ChecklistAnswer,
  type ChecklistGroup,
  BRAND_REGISTERED_OPTIONS,
  VOLUME_BUCKET_OPTIONS,
  COMPETITORS_BUCKET_OPTIONS,
  PROFITABLE_BOOKS_OPTIONS,
  BOOKS_OVER_200_REVIEWS_OPTIONS,
  HAS_BOOKS_UNDER_100_REVIEWS_OPTIONS,
  PRICE_BUCKET_OPTIONS,
  ROYALTIES_BUCKET_OPTIONS,
  TRAFFIC_SOURCE_OPTIONS,
  VALIDATION_STATUS_OPTIONS,
  getDefaultValidation,
  getDefaultChecklist,
  calculateValidationScore,
  calculateValidationStatus,
  getValidationAlerts,
  getScoreColor,
  getScoreBgColor,
} from '@/lib/keyword-validation';
import type { Keyword } from '@/types/advertising';
import { cn } from '@/lib/utils';

interface KeywordValidationDrawerProps {
  keyword: Keyword | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (keywordId: string, validation: KeywordValidation) => void;
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
        excelCriteria: keyword.validation.excelCriteria?.length 
          ? keyword.validation.excelCriteria 
          : getDefaultChecklist(),
      });
    } else {
      setValidation(getDefaultValidation());
    }
  }, [keyword]);

  // Recalculate score whenever validation data changes
  const calculatedScore = useMemo(() => calculateValidationScore(validation), [validation]);
  const calculatedStatus = useMemo(() => calculateValidationStatus({
    ...validation,
    validationScore: calculatedScore,
  }), [validation, calculatedScore]);
  const alerts = useMemo(() => getValidationAlerts(validation), [validation]);

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
      excelCriteria: prev.excelCriteria.map(group =>
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
      validationScore: calculatedScore,
      validationStatus: validation.validationStatusOverride || calculatedStatus,
      updatedAt: new Date(),
    };
    
    onSave(keyword.id, finalValidation);
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
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            {/* Score Summary */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Puntuación</span>
                <div className={cn(
                  'px-3 py-1 rounded-full font-bold text-lg',
                  getScoreBgColor(calculatedScore),
                  getScoreColor(calculatedScore)
                )}>
                  {calculatedScore}/100
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Estado</span>
                <Badge variant="outline" className={cn('font-medium', statusInfo?.color)}>
                  {statusInfo?.label}
                </Badge>
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
                        'flex items-center gap-2 text-sm px-2 py-1 rounded',
                        alert.type === 'error' 
                          ? 'bg-red-500/10 text-red-600' 
                          : 'bg-yellow-500/10 text-yellow-600'
                      )}
                    >
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      {alert.message}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Relevance Mode Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Usar score como Relevancia</Label>
                <p className="text-xs text-muted-foreground">
                  Si activo, la columna Relevancia mostrará el valor derivado del score.
                </p>
              </div>
              <Switch
                checked={validation.relevanceMode === 'from_validation'}
                onCheckedChange={(checked) =>
                  handleFieldChange('relevanceMode', checked ? 'from_validation' : 'manual')
                }
              />
            </div>

            <Separator />

            {/* Validation Fields */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Datos de validación</h4>
              
              {/* Brand Registered */}
              <div className="space-y-2">
                <Label className="text-xs">¿Marca registrada?</Label>
                <Select
                  value={validation.brandRegistered || ''}
                  onValueChange={(value) => handleFieldChange('brandRegistered', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAND_REGISTERED_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={cn('px-2 py-0.5 rounded text-xs', opt.color)}>
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Volume Bucket */}
              <div className="space-y-2">
                <Label className="text-xs">Volumen de búsqueda</Label>
                <Select
                  value={validation.volumeBucket || ''}
                  onValueChange={(value) => handleFieldChange('volumeBucket', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rango..." />
                  </SelectTrigger>
                  <SelectContent>
                    {VOLUME_BUCKET_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={cn('px-2 py-0.5 rounded text-xs', opt.color)}>
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Competitors Bucket */}
              <div className="space-y-2">
                <Label className="text-xs">Resultados en Amazon (competidores)</Label>
                <Select
                  value={validation.competitorsBucket || ''}
                  onValueChange={(value) => handleFieldChange('competitorsBucket', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rango..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPETITORS_BUCKET_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={cn('px-2 py-0.5 rounded text-xs', opt.color)}>
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Profitable Books */}
              <div className="space-y-2">
                <Label className="text-xs">Libros rentables visibles</Label>
                <Select
                  value={validation.profitableBooks || ''}
                  onValueChange={(value) => handleFieldChange('profitableBooks', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFITABLE_BOOKS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
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
                <Label className="text-xs">Libros con +200 reviews</Label>
                <Select
                  value={validation.booksOver200ReviewsBucket || ''}
                  onValueChange={(value) => handleFieldChange('booksOver200ReviewsBucket', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rango..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BOOKS_OVER_200_REVIEWS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={cn('px-2 py-0.5 rounded text-xs', opt.color)}>
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Has Books Under 100 Reviews */}
              <div className="space-y-2">
                <Label className="text-xs">¿Hay libros con menos de 100 reviews?</Label>
                <Select
                  value={validation.hasBooksUnder100Reviews || ''}
                  onValueChange={(value) => handleFieldChange('hasBooksUnder100Reviews', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {HAS_BOOKS_UNDER_100_REVIEWS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={cn('px-2 py-0.5 rounded text-xs', opt.color)}>
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Bucket */}
              <div className="space-y-2">
                <Label className="text-xs">Rango de precio medio</Label>
                <Select
                  value={validation.priceBucket || ''}
                  onValueChange={(value) => handleFieldChange('priceBucket', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rango..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_BUCKET_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={cn('px-2 py-0.5 rounded text-xs', opt.color)}>
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Royalties Bucket */}
              <div className="space-y-2">
                <Label className="text-xs">Regalías estimadas</Label>
                <Select
                  value={validation.royaltiesBucket || ''}
                  onValueChange={(value) => handleFieldChange('royaltiesBucket', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rango..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ROYALTIES_BUCKET_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={cn('px-2 py-0.5 rounded text-xs', opt.color)}>
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Main Traffic Source */}
              <div className="space-y-2">
                <Label className="text-xs">Fuente principal de tráfico</Label>
                <Select
                  value={validation.mainTrafficSource || ''}
                  onValueChange={(value) => handleFieldChange('mainTrafficSource', value as any)}
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
                          {opt.warning && <AlertTriangle className="w-3 h-3" />}
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Checklist */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Checklist de viabilidad</h4>
              
              {validation.excelCriteria.map((group) => (
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
            Guardar validación
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
