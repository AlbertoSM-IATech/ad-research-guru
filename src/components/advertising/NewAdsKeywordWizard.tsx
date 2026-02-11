import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CampaignSelect } from './CampaignSelect';
import { AlertTriangle, ArrowRight, Megaphone, Check } from 'lucide-react';
import { type Keyword, type AdsData, type AdsFase, ADS_FASE_OPTIONS, getCurrencySymbol } from '@/types/advertising';
import { findDuplicateKeyword } from '@/lib/keyword-builder';
import { createKeywordDefaults } from '@/lib/keyword-helpers';
import {
  calcularAcosActualPorcentaje,
  calcularConversionPorcentaje,
  formatearPorcentaje,
  formatearMoneda,
} from '@/lib/acosEquilibrio';

interface NewAdsKeywordWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (keyword: Keyword) => void;
  marketplaceId: string;
  existingKeywords: Keyword[];
  initialKeyword?: string;
  campaigns: string[];
  onAddCampaign: (name: string) => void;
  onOpenExistingKeyword?: (keyword: Keyword) => void;
}

export function NewAdsKeywordWizard({
  open,
  onOpenChange,
  onComplete,
  marketplaceId,
  existingKeywords,
  initialKeyword = '',
  campaigns,
  onAddCampaign,
  onOpenExistingKeyword,
}: NewAdsKeywordWizardProps) {
  const currencySymbol = getCurrencySymbol(marketplaceId);

  // Step state
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [keyword, setKeyword] = useState(initialKeyword);
  const [campaignName, setCampaignName] = useState('');
  const [fase, setFase] = useState<AdsFase>('lanzamiento');

  // Step 2 fields
  const [impresiones, setImpresiones] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [cpcStr, setCpcStr] = useState('');
  const [pedidos, setPedidos] = useState(0);

  // Derived CPC value
  const cpc = cpcStr === '' ? 0 : parseFloat(cpcStr) || 0;

  // Duplicate detection
  const duplicate = useMemo(
    () => keyword.trim() ? findDuplicateKeyword(keyword, marketplaceId, existingKeywords) : undefined,
    [keyword, marketplaceId, existingKeywords]
  );

  // Auto-calculated fields
  const gastoCalc = clicks > 0 && cpc > 0 ? clicks * cpc : null;
  const ctr = impresiones > 0 ? (clicks / impresiones) * 100 : null;
  const acosActual = calcularAcosActualPorcentaje(gastoCalc ?? undefined, undefined);
  const conversion = calcularConversionPorcentaje(pedidos, clicks);

  const resetForm = () => {
    setStep(1);
    setKeyword('');
    setCampaignName('');
    setFase('lanzamiento');
    setImpresiones(0);
    setClicks(0);
    setCpcStr('');
    setPedidos(0);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleNext = () => {
    if (step === 1 && keyword.trim() && !duplicate) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
  };

  const handleSave = () => {
    const normalizedKeyword = keyword.trim().replace(/\s+/g, ' ');

    const gastoFinal = clicks * cpc;

    const adsData: AdsData = {
      impresiones: impresiones || 0,
      clicks: clicks || 0,
      cpcActual: cpc || 0,
      pedidos: pedidos || 0,
      gasto: gastoFinal || 0,
      ventas: 0,
      ctr: ctr ?? 0,
      faseActual: fase,
      campaignName: campaignName || undefined,
    };

    const base = createKeywordDefaults({
      keyword: normalizedKeyword,
      marketplaceId,
      adsData,
    });

    const now = new Date();
    const newKeyword: Keyword = {
      ...base,
      id: `kw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
      purpose: 'ads',
      status: 'pending',
    };

    onComplete(newKeyword);
    handleOpenChange(false);
  };

  const handleOpenDuplicate = () => {
    if (duplicate && onOpenExistingKeyword) {
      onOpenExistingKeyword(duplicate);
      handleOpenChange(false);
    }
  };

  const numInput = (value: number, onChange: (v: number) => void) => (
    <Input
      type="number"
      min={0}
      step={1}
      value={value || ''}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      className="h-9"
    />
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Nueva Keyword de Ads
          </DialogTitle>
          <DialogDescription>
            Paso {step} de 2 — {step === 1 ? 'Keyword y campaña' : 'Datos de rendimiento'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            {/* Keyword */}
            <div className="space-y-2">
              <Label htmlFor="ads-keyword">Keyword *</Label>
              <Input
                id="ads-keyword"
                placeholder="Ej: meditación para principiantes"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && keyword.trim() && !duplicate) {
                    e.preventDefault();
                    handleNext();
                  }
                }}
                autoFocus
              />
              {duplicate && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/20 text-sm">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  <span className="flex-1">Esta keyword ya existe en este mercado.</span>
                  {onOpenExistingKeyword && (
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleOpenDuplicate}>
                      Abrir existente
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Campaign */}
            <div className="space-y-2">
              <Label>Campaña</Label>
              <CampaignSelect
                value={campaignName}
                onChange={setCampaignName}
                campaigns={campaigns}
                onAddCampaign={onAddCampaign}
              />
            </div>

            {/* Fase */}
            <div className="space-y-2">
              <Label>Fase actual</Label>
              <Select value={fase} onValueChange={(v) => setFase(v as AdsFase)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADS_FASE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Todos los campos son opcionales. Puedes rellenarlos luego desde la tabla o el panel lateral.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Impresiones</Label>
                {numInput(impresiones, setImpresiones)}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Clicks</Label>
                {numInput(clicks, setClicks)}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CPC ({currencySymbol})</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={cpcStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Allow empty, digits, dot, comma
                    if (val === '' || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                      setCpcStr(val.replace(',', '.'));
                    }
                  }}
                  placeholder="0.00"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pedidos</Label>
                {numInput(pedidos, setPedidos)}
              </div>
            </div>

            {/* Summary - includes auto-calculated Gasto */}
            <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Resumen calculado</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gasto</span>
                  <span>{gastoCalc !== null ? formatearMoneda(gastoCalc, currencySymbol) : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CTR</span>
                  <span>{ctr !== null ? formatearPorcentaje(ctr) : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conv.</span>
                  <span>{formatearPorcentaje(conversion)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ACOS</span>
                  <span>{formatearPorcentaje(acosActual)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 2 && (
            <Button variant="outline" onClick={handleBack} className="mr-auto">
              Atrás
            </Button>
          )}
          {step === 1 ? (
            <Button onClick={handleNext} disabled={!keyword.trim() || !!duplicate} className="gap-1">
              Siguiente
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSave} className="gap-1">
              <Check className="w-4 h-4" />
              Guardar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
