import { useState, useMemo } from 'react';
import { Target, Plus, Trash2, DollarSign, Calculator, Edit2, Check, X, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { type Keyword, type CampaignPlan, estimateBudget, calculateROI } from '@/types/advertising';
import { useToast } from '@/hooks/use-toast';

interface CampaignPlanManagerProps {
  keywords: Keyword[];
  plans: CampaignPlan[];
  onCreatePlan: (plan: Omit<CampaignPlan, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdatePlan: (id: string, updates: Partial<CampaignPlan>) => void;
  onDeletePlan: (id: string) => void;
  onAssignKeywords: (planId: string, keywordIds: string[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_PLANS = [
  { name: 'Defensa de marca', objective: 'Proteger keywords de marca propias y variantes del título del libro' },
  { name: 'Ataque a competidores', objective: 'Captar tráfico de competidores directos mediante ASINs y keywords de marca' },
  { name: 'Long-tail de nicho', objective: 'Keywords de cola larga con baja competencia y alta conversión' },
  { name: 'Genéricas de alto volumen', objective: 'Keywords generales del nicho con mayor alcance' },
];

export const CampaignPlanManager = ({
  keywords,
  plans,
  onCreatePlan,
  onUpdatePlan,
  onDeletePlan,
  onAssignKeywords,
  isOpen,
  onClose,
}: CampaignPlanManagerProps) => {
  const { toast } = useToast();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanObjective, setNewPlanObjective] = useState('');
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<Set<string>>(new Set());
  const [showROICalculator, setShowROICalculator] = useState(false);
  const [roiInputs, setRoiInputs] = useState({ ctr: 2, conversion: 10, bookPrice: 9.99 });

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  
  const planKeywords = useMemo(() => {
    if (!selectedPlan) return [];
    return keywords.filter(k => selectedPlan.keywords.includes(k.id));
  }, [selectedPlan, keywords]);

  const unassignedKeywords = useMemo(() => {
    const assignedIds = new Set(plans.flatMap(p => p.keywords));
    return keywords.filter(k => !assignedIds.has(k.id));
  }, [keywords, plans]);

  const handleCreatePlan = () => {
    if (!newPlanName.trim()) {
      toast({ title: 'Error', description: 'El nombre del plan es requerido', variant: 'destructive' });
      return;
    }
    
    onCreatePlan({
      name: newPlanName,
      objective: newPlanObjective,
      keywords: [],
      estimatedBudget: 0,
    });
    
    setNewPlanName('');
    setNewPlanObjective('');
    toast({ title: 'Plan creado' });
  };

  const handleCreatePresetPlan = (preset: typeof PRESET_PLANS[0]) => {
    onCreatePlan({
      name: preset.name,
      objective: preset.objective,
      keywords: [],
      estimatedBudget: 0,
    });
    toast({ title: `Plan "${preset.name}" creado` });
  };

  const handleAssignKeywords = () => {
    if (!selectedPlanId || selectedKeywordIds.size === 0) return;
    onAssignKeywords(selectedPlanId, Array.from(selectedKeywordIds));
    setSelectedKeywordIds(new Set());
    toast({ title: `${selectedKeywordIds.size} keywords asignadas` });
  };

  const calculatePlanBudget = (plan: CampaignPlan): number => {
    const planKws = keywords.filter(k => plan.keywords.includes(k.id));
    return planKws.reduce((sum, k) => sum + estimateBudget(k), 0);
  };

  const getTotalBudget = () => {
    return plans.reduce((sum, p) => sum + calculatePlanBudget(p), 0);
  };

  const roiResult = useMemo(() => {
    if (!selectedPlan) return null;
    const budget = calculatePlanBudget(selectedPlan);
    return calculateROI(budget, roiInputs.ctr, roiInputs.conversion, roiInputs.bookPrice);
  }, [selectedPlan, roiInputs, keywords]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Gestor de Planes de Campaña
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Left: Plans List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Planes</h4>
              <Badge variant="outline">
                Presupuesto total: ${getTotalBudget().toFixed(2)}/día
              </Badge>
            </div>

            <ScrollArea className="h-[300px] border border-border rounded-lg p-3">
              <div className="space-y-2">
                {plans.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay planes creados
                  </p>
                ) : (
                  plans.map(plan => (
                    <div
                      key={plan.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPlanId === plan.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedPlanId(plan.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-sm truncate">{plan.name}</h5>
                          <p className="text-xs text-muted-foreground truncate">{plan.objective}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {plan.keywords.length} keywords
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <DollarSign className="w-3 h-3 mr-1" />
                              {calculatePlanBudget(plan).toFixed(2)}/día
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePlan(plan.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Quick Create */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">Crear plan rápido:</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_PLANS.map((preset, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => handleCreatePresetPlan(preset)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Custom Create */}
            <div className="space-y-3">
              <Label>Crear plan personalizado</Label>
              <Input
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                placeholder="Nombre del plan..."
                className="h-8"
              />
              <Textarea
                value={newPlanObjective}
                onChange={(e) => setNewPlanObjective(e.target.value)}
                placeholder="Objetivo del plan..."
                rows={2}
              />
              <Button onClick={handleCreatePlan} disabled={!newPlanName.trim()} size="sm" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Crear Plan
              </Button>
            </div>
          </div>

          {/* Right: Plan Details & Assign */}
          <div className="space-y-4">
            {selectedPlan ? (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{selectedPlan.name}</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowROICalculator(!showROICalculator)}
                    className="gap-2"
                  >
                    <Calculator className="w-4 h-4" />
                    Calculadora ROI
                  </Button>
                </div>

                {/* ROI Calculator */}
                {showROICalculator && (
                  <Card className="bg-muted/30">
                    <CardContent className="pt-4 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">CTR (%)</Label>
                          <Input
                            type="number"
                            value={roiInputs.ctr}
                            onChange={(e) => setRoiInputs(prev => ({ ...prev, ctr: parseFloat(e.target.value) || 0 }))}
                            className="h-8"
                            step="0.1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Conversión (%)</Label>
                          <Input
                            type="number"
                            value={roiInputs.conversion}
                            onChange={(e) => setRoiInputs(prev => ({ ...prev, conversion: parseFloat(e.target.value) || 0 }))}
                            className="h-8"
                            step="0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Precio libro ($)</Label>
                          <Input
                            type="number"
                            value={roiInputs.bookPrice}
                            onChange={(e) => setRoiInputs(prev => ({ ...prev, bookPrice: parseFloat(e.target.value) || 0 }))}
                            className="h-8"
                            step="0.01"
                          />
                        </div>
                      </div>
                      {roiResult && (
                        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Ventas Est.</p>
                            <p className="font-bold text-lg">{roiResult.sales}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Ingresos</p>
                            <p className="font-bold text-lg text-green-600">${roiResult.revenue.toFixed(2)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">ROAS</p>
                            <p className={`font-bold text-lg ${roiResult.roas >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                              {roiResult.roas.toFixed(2)}x
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Plan Keywords */}
                <div className="space-y-2">
                  <Label className="text-sm">Keywords en este plan ({planKeywords.length})</Label>
                  <ScrollArea className="h-[120px] border border-border rounded-lg">
                    <div className="p-2 flex flex-wrap gap-1">
                      {planKeywords.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-2">Sin keywords asignadas</p>
                      ) : (
                        planKeywords.map(kw => (
                          <Badge key={kw.id} variant="secondary" className="text-xs">
                            {kw.keyword}
                          </Badge>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <Separator />

                {/* Assign Keywords */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Keywords sin asignar ({unassignedKeywords.length})</Label>
                    {selectedKeywordIds.size > 0 && (
                      <Button size="sm" onClick={handleAssignKeywords} className="h-7 text-xs">
                        Asignar {selectedKeywordIds.size}
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="h-[150px] border border-border rounded-lg">
                    <div className="p-2 space-y-1">
                      {unassignedKeywords.map(kw => (
                        <label
                          key={kw.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedKeywordIds.has(kw.id)}
                            onCheckedChange={(checked) => {
                              setSelectedKeywordIds(prev => {
                                const newSet = new Set(prev);
                                if (checked) {
                                  newSet.add(kw.id);
                                } else {
                                  newSet.delete(kw.id);
                                }
                                return newSet;
                              });
                            }}
                          />
                          <span className="text-sm flex-1">{kw.keyword}</span>
                          <Badge variant="outline" className="text-xs">
                            {kw.searchVolume.toLocaleString()}
                          </Badge>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Selecciona un plan para ver detalles</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
