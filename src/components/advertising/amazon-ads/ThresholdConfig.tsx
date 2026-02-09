import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ThresholdConfig as ThresholdConfigType } from '@/types/amazon-ads';

interface ThresholdConfigProps {
  isOpen: boolean;
  onClose: () => void;
  thresholds: ThresholdConfigType;
  marketplace: string;
  onSave: (config: ThresholdConfigType) => void;
}

export const ThresholdConfig = ({ isOpen, onClose, thresholds, marketplace, onSave }: ThresholdConfigProps) => {
  const [local, setLocal] = useState<ThresholdConfigType>(thresholds);

  const update = <K extends keyof ThresholdConfigType>(key: K, value: number) => {
    setLocal(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Umbrales de reglas — {marketplace}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">ACOS objetivo (%)</label>
            <Input
              type="number"
              value={local.acosTarget}
              onChange={e => update('acosTarget', parseFloat(e.target.value) || 0)}
              min={0}
              max={100}
            />
            <p className="text-xs text-muted-foreground">Por debajo de este valor, el ACOS se considera bueno.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Clicks mínimos para reglas</label>
            <Input
              type="number"
              value={local.minClicksForRules}
              onChange={e => update('minClicksForRules', parseInt(e.target.value) || 0)}
              min={0}
            />
            <p className="text-xs text-muted-foreground">Nº de clics mínimos antes de activar alertas de "fuga".</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Gasto mínimo para reglas ({marketplace})</label>
            <Input
              type="number"
              value={local.minSpendForRules}
              onChange={e => update('minSpendForRules', parseFloat(e.target.value) || 0)}
              min={0}
              step={0.5}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Impresiones mínimas para CTR</label>
            <Input
              type="number"
              value={local.minImpressionsForCTR}
              onChange={e => update('minImpressionsForCTR', parseInt(e.target.value) || 0)}
              min={0}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Umbral CTR bajo (%)</label>
            <Input
              type="number"
              value={local.ctrThreshold}
              onChange={e => update('ctrThreshold', parseFloat(e.target.value) || 0)}
              min={0}
              max={100}
              step={0.1}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(local)}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
