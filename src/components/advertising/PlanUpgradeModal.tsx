import { Crown, Check, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PLANS, setCurrentPlan } from '@/lib/plan-system';

interface PlanUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade?: () => void;
}

export function PlanUpgradeModal({
  open,
  onOpenChange,
  onUpgrade,
}: PlanUpgradeModalProps) {
  const handleUpgrade = () => {
    // For demo purposes, just upgrade the plan
    setCurrentPlan('plus');
    onUpgrade?.();
    onOpenChange(false);
    // Reload to apply changes
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Desbloquea Gestión de Ads
          </DialogTitle>
          <DialogDescription>
            Actualiza a Plus para acceder a todas las funcionalidades de gestión de campañas publicitarias.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plus Plan Features */}
          <div className="p-4 rounded-lg border-2 border-blue-500/30 bg-blue-500/5">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-blue-500 text-white">Plus</Badge>
              <span className="font-semibold">Plan Plus</span>
            </div>
            
            <ul className="space-y-2">
              {PLANS.plus.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Benefits highlight */}
          <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-primary/10 border border-amber-500/20">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="font-medium">Con Plus podrás:</span>
            </div>
            <ul className="mt-2 text-sm text-muted-foreground space-y-1">
              <li>• Calcular ACOS y punto de equilibrio</li>
              <li>• Gestionar clicks, CPC y pedidos por keyword</li>
              <li>• Ver el dashboard de rendimiento de campañas</li>
              <li>• Filtrar por rentabilidad y métricas de Ads</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Ahora no
          </Button>
          <Button onClick={handleUpgrade} className="gap-2 bg-blue-500 hover:bg-blue-600">
            <Crown className="w-4 h-4" />
            Actualizar a Plus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
