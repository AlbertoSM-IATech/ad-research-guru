import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import type { WizardConfig, AdType, AttributionWindow } from '@/types/amazon-ads';

interface Step1ConfigProps {
  config: WizardConfig;
  onChange: (config: WizardConfig) => void;
}

const MARKETPLACES = [
  { id: 'ES', label: '🇪🇸 España' },
  { id: 'US', label: '🇺🇸 Estados Unidos' },
  { id: 'UK', label: '🇬🇧 Reino Unido' },
  { id: 'DE', label: '🇩🇪 Alemania' },
  { id: 'FR', label: '🇫🇷 Francia' },
  { id: 'IT', label: '🇮🇹 Italia' },
  { id: 'MX', label: '🇲🇽 México' },
];

const CURRENCIES = [
  { id: 'EUR', label: '€ EUR' },
  { id: 'USD', label: '$ USD' },
  { id: 'GBP', label: '£ GBP' },
  { id: 'MXN', label: '$ MXN' },
];

export const Step1Config = ({ config, onChange }: Step1ConfigProps) => {
  const update = <K extends keyof WizardConfig>(key: K, value: WizardConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        {/* Marketplace */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Marketplace</label>
          <Select value={config.marketplace} onValueChange={v => update('marketplace', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MARKETPLACES.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Currency */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Moneda</label>
          <Select value={config.currency} onValueChange={v => update('currency', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ad Type */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Tipo de anuncio</label>
          <Select value={config.adType} onValueChange={v => update('adType', v as AdType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SP">Sponsored Products (SP)</SelectItem>
              <SelectItem value="SB">Sponsored Brands (SB)</SelectItem>
              <SelectItem value="SD">Sponsored Display (SD)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Attribution Window */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Ventana de atribución</label>
          <Select value={config.attributionWindow} onValueChange={v => update('attributionWindow', v as AttributionWindow)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 días</SelectItem>
              <SelectItem value="14d">14 días</SelectItem>
              <SelectItem value="30d">30 días</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Label */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Etiqueta de importación (opcional)</label>
        <Input
          placeholder="Ej: Enero 2026 - limpieza campañas"
          value={config.label}
          onChange={e => update('label', e.target.value)}
        />
      </div>

      {/* Help */}
      <TooltipProvider>
        <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground flex items-start gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Los archivos de Bulk operations suelen ser .xlsx/.xls y pueden contener varias pestañas. Nosotros detectaremos la adecuada y te pediremos confirmación si hay dudas.
            </TooltipContent>
          </Tooltip>
          <span>
            Sube tus bulksheets (.xlsx/.xls). Amazon permite descargar métricas y gestionarlas en <strong>Bulk operations</strong>. También aceptamos .csv como formato experimental.
          </span>
        </div>
      </TooltipProvider>
    </div>
  );
};
