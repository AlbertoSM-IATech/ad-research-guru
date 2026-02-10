import { useState, useCallback, useRef, useMemo } from 'react';
import {
  Upload, FileSpreadsheet, ArrowRight, AlertCircle, CheckCircle2, Info,
  FileUp, AlertTriangle, Settings2, Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import type { Keyword, BookEconomy, AdsData, AdsHistoryEntry } from '@/types/advertising';
import { normalizeText } from '@/types/advertising';
import { parseFile, parseDelimitedText, type ParsedTable } from '@/lib/import/parsers';
import { parseNumberFlexible, parseIntegerFlexible } from '@/lib/import/number';
import {
  AMAZON_ADS_FIELDS,
  detectAmazonAdsTemplate,
  autoMapAmazonAdsHeaders,
  type AmazonAdsFieldKey,
  type AmazonAdsReportType,
} from '@/lib/import/amazonAdsTemplates';
import { calcularGastoAcumulado, calcularVentasAcumuladas, calcularAcosActualPorcentaje } from '@/lib/acosEquilibrio';

// ============ Types ============

type ImportMode = 'replace' | 'accumulate';
type CampaignStrategy = 'max-spend' | 'max-clicks' | 'first';
type WizardStep = 'upload' | 'mapping' | 'preview' | 'done';

interface ImportedRow {
  rawTerm: string;
  normalizedTerm: string;
  campaign?: string;
  impressions: number;
  clicks: number;
  orders: number;
  spend: number;
  cpc: number;
  ctr: number;
  sales: number;
  matchedKeyword?: Keyword;
  warnings: string[];
}

interface AggregatedTerm {
  rawTerm: string;
  normalizedTerm: string;
  campaigns: string[];
  impressions: number;
  clicks: number;
  orders: number;
  spend: number;
  sales: number;
  cpcWeightedSum: number; // for weighted avg
  cpcCount: number;
  matchedKeyword?: Keyword;
  isNew: boolean;
}

interface ImportResult {
  updated: number;
  created: number;
  skipped: number;
}

interface AmazonAdsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  keywords: Keyword[];
  onUpdateKeyword: (id: string, patch: Partial<Keyword>) => void;
  onAddBulk?: (keywords: Array<Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  addCampaign: (name: string) => void;
  bookEconomy: BookEconomy;
  marketplaceId: string;
}

// ============ Helpers ============

function normalizeTermForMatching(term: string): string {
  return term
    .toLowerCase()
    .replace(/[""''""]/g, '')
    .replace(/[\[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickCampaign(campaigns: string[], rows: { campaign: string; spend: number; clicks: number }[], strategy: CampaignStrategy): string {
  if (campaigns.length <= 1) return campaigns[0] || '';
  switch (strategy) {
    case 'max-spend': {
      const best = rows.reduce((a, b) => a.spend >= b.spend ? a : b);
      return best.campaign;
    }
    case 'max-clicks': {
      const best = rows.reduce((a, b) => a.clicks >= b.clicks ? a : b);
      return best.campaign;
    }
    default:
      return campaigns[0] || '';
  }
}

// ============ Component ============

export const AmazonAdsImportModal = ({
  isOpen,
  onClose,
  keywords,
  onUpdateKeyword,
  onAddBulk,
  addCampaign,
  bookEconomy,
  marketplaceId,
}: AmazonAdsImportModalProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [step, setStep] = useState<WizardStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Parsed data
  const [parsedTable, setParsedTable] = useState<ParsedTable | null>(null);
  const [reportType, setReportType] = useState<AmazonAdsReportType>('unknown');
  const [columnMappings, setColumnMappings] = useState<Record<string, AmazonAdsFieldKey | 'ignore'>>({});

  // Options
  const [importMode, setImportMode] = useState<ImportMode>('replace');
  const [createMissing, setCreateMissing] = useState(false);
  const [saveSnapshot, setSaveSnapshot] = useState(true);
  const [campaignStrategy, setCampaignStrategy] = useState<CampaignStrategy>('max-spend');

  // Preview data
  const [importedRows, setImportedRows] = useState<ImportedRow[]>([]);
  const [aggregatedTerms, setAggregatedTerms] = useState<AggregatedTerm[]>([]);

  // Result
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // ============ Keyword index for matching ============
  const keywordIndex = useMemo(() => {
    const idx = new Map<string, Keyword>();
    keywords.forEach(k => {
      idx.set(normalizeTermForMatching(k.keyword), k);
    });
    return idx;
  }, [keywords]);

  // ============ Step 1: Upload ============
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  }, []);

  const processFile = useCallback(async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    try {
      const table = await parseFile(selectedFile);
      if (table.headers.length === 0) {
        toast({ title: 'Error', description: 'No se detectaron columnas', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      setParsedTable(table);
      const detected = detectAmazonAdsTemplate(table.headers);
      setReportType(detected);
      const autoMappings = autoMapAmazonAdsHeaders(table.headers);
      setColumnMappings(autoMappings);
      setStep('mapping');
    } catch (error) {
      toast({ title: 'Error al procesar', description: error instanceof Error ? error.message : 'Error desconocido', variant: 'destructive' });
    }
    setIsLoading(false);
  }, [selectedFile, toast]);

  // ============ Step 2 → Step 3: Build preview ============
  const hasTermMapping = Object.values(columnMappings).includes('term');

  const buildPreview = useCallback(() => {
    if (!parsedTable || !hasTermMapping) return;

    const rows: ImportedRow[] = [];
    const fieldForHeader = (field: AmazonAdsFieldKey): string | undefined => {
      return Object.entries(columnMappings).find(([_, v]) => v === field)?.[0];
    };

    const termHeader = fieldForHeader('term');
    const campaignHeader = fieldForHeader('campaign');
    const impressionsHeader = fieldForHeader('impressions');
    const clicksHeader = fieldForHeader('clicks');
    const ordersHeader = fieldForHeader('orders');
    const spendHeader = fieldForHeader('spend');
    const cpcHeader = fieldForHeader('cpc');
    const ctrHeader = fieldForHeader('ctr');
    const salesHeader = fieldForHeader('sales');

    parsedTable.rows.forEach(row => {
      const rawTerm = termHeader ? (row[termHeader] ?? '').trim() : '';
      if (!rawTerm) return;

      const normalizedTerm = normalizeTermForMatching(rawTerm);
      const warnings: string[] = [];

      const impressions = impressionsHeader ? (parseIntegerFlexible(row[impressionsHeader]) ?? 0) : 0;
      const clicks = clicksHeader ? (parseIntegerFlexible(row[clicksHeader]) ?? 0) : 0;
      const orders = ordersHeader ? (parseIntegerFlexible(row[ordersHeader]) ?? 0) : 0;
      const spend = spendHeader ? (parseNumberFlexible(row[spendHeader]) ?? 0) : 0;
      const sales = salesHeader ? (parseNumberFlexible(row[salesHeader]) ?? 0) : 0;

      let cpc = cpcHeader ? (parseNumberFlexible(row[cpcHeader]) ?? 0) : 0;
      if (cpc === 0 && spend > 0 && clicks > 0) cpc = spend / clicks;

      let ctr = ctrHeader ? (parseNumberFlexible(row[ctrHeader]) ?? 0) : 0;
      // Heuristic: if CTR < 1.5 and we have clicks+impressions, it's likely a ratio (0-1), convert to %
      if (ctr > 0 && ctr < 1.5 && impressions > 0 && clicks > 0) {
        const calculatedCtr = (clicks / impressions) * 100;
        // Use calculated if available, otherwise convert ratio to %
        if (Math.abs(calculatedCtr - ctr * 100) < 5) {
          ctr = ctr * 100; // was proportion
        }
      }
      // Always prefer calculated CTR if we have both clicks and impressions
      if (impressions > 0 && clicks > 0) {
        ctr = (clicks / impressions) * 100;
      }

      const campaign = campaignHeader ? (row[campaignHeader] ?? '').trim() : '';
      const matched = keywordIndex.get(normalizedTerm);

      rows.push({
        rawTerm, normalizedTerm, campaign, impressions, clicks, orders,
        spend, cpc, ctr, sales, matchedKeyword: matched, warnings,
      });
    });

    setImportedRows(rows);

    // Aggregate by normalizedTerm
    const termMap = new Map<string, { raw: string; rows: ImportedRow[] }>();
    rows.forEach(r => {
      const existing = termMap.get(r.normalizedTerm);
      if (existing) {
        existing.rows.push(r);
      } else {
        termMap.set(r.normalizedTerm, { raw: r.rawTerm, rows: [r] });
      }
    });

    const agg: AggregatedTerm[] = [];
    termMap.forEach(({ raw, rows: termRows }) => {
      const matched = termRows[0].matchedKeyword;
      const campaigns = [...new Set(termRows.map(r => r.campaign).filter(Boolean))];
      agg.push({
        rawTerm: raw,
        normalizedTerm: termRows[0].normalizedTerm,
        campaigns,
        impressions: termRows.reduce((s, r) => s + r.impressions, 0),
        clicks: termRows.reduce((s, r) => s + r.clicks, 0),
        orders: termRows.reduce((s, r) => s + r.orders, 0),
        spend: termRows.reduce((s, r) => s + r.spend, 0),
        sales: termRows.reduce((s, r) => s + r.sales, 0),
        cpcWeightedSum: termRows.reduce((s, r) => s + r.cpc * Math.max(r.clicks, 1), 0),
        cpcCount: termRows.reduce((s, r) => s + Math.max(r.clicks, 1), 0),
        matchedKeyword: matched,
        isNew: !matched,
      });
    });

    setAggregatedTerms(agg);
    setStep('preview');
  }, [parsedTable, columnMappings, hasTermMapping, keywordIndex]);

  // ============ Preview stats ============
  const matchedCount = aggregatedTerms.filter(t => !t.isNew).length;
  const unmatchedCount = aggregatedTerms.filter(t => t.isNew).length;

  // ============ Step 4: Execute import ============
  const executeImport = useCallback(() => {
    const result: ImportResult = { updated: 0, created: 0, skipped: 0 };
    const newKeywords: Array<Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'>> = [];

    aggregatedTerms.forEach(term => {
      const cpc = term.cpcCount > 0 ? term.cpcWeightedSum / term.cpcCount : 0;
      const ctr = term.impressions > 0 ? (term.clicks / term.impressions) * 100 : 0;
      const campaignName = pickCampaign(
        term.campaigns,
        importedRows.filter(r => r.normalizedTerm === term.normalizedTerm).map(r => ({
          campaign: r.campaign || '', spend: r.spend, clicks: r.clicks,
        })),
        campaignStrategy
      );

      if (term.matchedKeyword) {
        // Update existing keyword
        const kw = term.matchedKeyword;
        const baseAds = (kw.adsData ?? {}) as AdsData;
        let newAdsData: AdsData;

        if (importMode === 'replace') {
          newAdsData = {
            ...baseAds,
            impresiones: term.impressions,
            clicks: term.clicks,
            pedidos: term.orders,
            cpcActual: Math.round(cpc * 100) / 100,
            ctr: Math.round(ctr * 100) / 100,
            gasto: Math.round(term.spend * 100) / 100,
            ventas: Math.round(term.sales * 100) / 100,
            campaignName: campaignName || baseAds.campaignName,
          };
        } else {
          // Accumulate
          const prevClicks = baseAds.clicks ?? 0;
          const prevImpr = baseAds.impresiones ?? 0;
          const newClicks = prevClicks + term.clicks;
          const newImpr = prevImpr + term.impressions;
          newAdsData = {
            ...baseAds,
            impresiones: newImpr,
            clicks: newClicks,
            pedidos: (baseAds.pedidos ?? 0) + term.orders,
            cpcActual: Math.round(cpc * 100) / 100,
            ctr: newImpr > 0 ? Math.round((newClicks / newImpr) * 10000) / 100 : baseAds.ctr,
            gasto: Math.round(((baseAds.gasto ?? 0) + term.spend) * 100) / 100,
            ventas: Math.round(((baseAds.ventas ?? 0) + term.sales) * 100) / 100,
            campaignName: campaignName || baseAds.campaignName,
          };
        }

        // Save snapshot if enabled
        if (saveSnapshot) {
          const gasto = calcularGastoAcumulado(newAdsData.clicks, newAdsData.cpcActual) ?? newAdsData.gasto ?? 0;
          const ventas = calcularVentasAcumuladas(newAdsData.pedidos, bookEconomy.precioLibro) ?? newAdsData.ventas ?? 0;
          const acosActual = calcularAcosActualPorcentaje(gasto, ventas);
          const beneficio = ventas - gasto;
          const entry: AdsHistoryEntry = {
            id: `ads-import-${Date.now()}-${kw.id}`,
            timestamp: new Date(),
            clicks: newAdsData.clicks ?? 0,
            cpcActual: newAdsData.cpcActual ?? 0,
            pedidos: newAdsData.pedidos ?? 0,
            gasto,
            ventas,
            acosActual,
            beneficio,
          };
          newAdsData.history = [...(baseAds.history ?? []), entry];
        }

        onUpdateKeyword(kw.id, { adsData: newAdsData });
        if (campaignName) addCampaign(campaignName);
        result.updated++;
      } else if (createMissing && onAddBulk) {
        // Create new keyword
        const newAdsData: AdsData = {
          impresiones: term.impressions,
          clicks: term.clicks,
          pedidos: term.orders,
          cpcActual: Math.round(cpc * 100) / 100,
          ctr: Math.round(ctr * 100) / 100,
          gasto: Math.round(term.spend * 100) / 100,
          ventas: Math.round(term.sales * 100) / 100,
          campaignName,
        };

        newKeywords.push({
          keyword: term.rawTerm,
          marketplaceId,
          searchVolume: 0,
          competitors: 0,
          price: 0,
          royalties: 0,
          marketScore: 0,
          competitionLevel: 'medium',
          campaignTypes: ['SP'],
          notes: '',
          status: 'pending',
          purpose: 'ads',
          history: [],
          adsData: newAdsData,
        });
        if (campaignName) addCampaign(campaignName);
        result.created++;
      } else {
        result.skipped++;
      }
    });

    if (newKeywords.length > 0 && onAddBulk) {
      onAddBulk(newKeywords);
    }

    setImportResult(result);
    setStep('done');

    toast({
      title: 'Importación completada',
      description: `Actualizadas: ${result.updated} | Creadas: ${result.created} | Omitidas: ${result.skipped}`,
    });
  }, [aggregatedTerms, importedRows, importMode, createMissing, saveSnapshot, campaignStrategy, onUpdateKeyword, onAddBulk, addCampaign, bookEconomy, marketplaceId, toast]);

  // ============ Reset ============
  const handleClose = () => {
    setStep('upload');
    setSelectedFile(null);
    setParsedTable(null);
    setReportType('unknown');
    setColumnMappings({});
    setImportedRows([]);
    setAggregatedTerms([]);
    setImportResult(null);
    setImportMode('replace');
    setCreateMissing(false);
    setSaveSnapshot(true);
    setCampaignStrategy('max-spend');
    onClose();
  };

  // ============ Step indicators ============
  const steps: { key: WizardStep; label: string; tourId: string }[] = [
    { key: 'upload', label: 'Subir archivo', tourId: 'ads-import-step-upload' },
    { key: 'mapping', label: 'Mapeo', tourId: 'ads-import-step-map' },
    { key: 'preview', label: 'Vista previa', tourId: 'ads-import-step-preview' },
    { key: 'done', label: 'Resumen', tourId: 'ads-import-step-done' },
  ];
  const stepIndex = steps.findIndex(s => s.key === step);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[950px] max-h-[90vh] overflow-hidden flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Download className="w-5 h-5" />
            Importar Reporte Amazon Ads
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-sm py-2">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2" data-tour={s.tourId}>
              <Badge variant={i <= stepIndex ? 'default' : 'outline'} className="gap-1">
                <span className="font-bold">{i + 1}</span> {s.label}
              </Badge>
              {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto py-4 min-h-0">
          {/* ============ STEP 1: UPLOAD ============ */}
          {step === 'upload' && (
            <div className="space-y-6" data-tour="ads-import-step-upload">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
              >
                <FileUp className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">
                  {selectedFile ? selectedFile.name : 'Haz clic o arrastra tu archivo aquí'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Soporta .csv, .tsv, .txt, .xlsx, .xls
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {selectedFile && (
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button onClick={processFile} disabled={isLoading} className="gap-2">
                    {isLoading ? 'Procesando...' : 'Continuar'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ============ STEP 2: MAPPING ============ */}
          {step === 'mapping' && parsedTable && (
            <div className="space-y-6" data-tour="ads-import-step-map">
              {/* Report type detection */}
              {reportType === 'campaignOnly' && (
                <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      Reporte solo por campaña detectado
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Este archivo no incluye una columna de término/keyword. Para importar a tu tabla por keyword necesitas exportar un <strong>"Search Term Report"</strong> o <strong>"Targeting Report"</strong> desde Amazon Ads que incluya la columna <em>"Customer Search Term"</em>, <em>"Search Term"</em> o <em>"Término de búsqueda"</em>.
                    </p>
                  </div>
                </div>
              )}

              {reportType === 'searchTerm' && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-green-700 dark:text-green-300">Reporte de Search Term / Targeting detectado</span>
                </div>
              )}

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Badge variant="outline" className="gap-1">
                  <FileSpreadsheet className="w-3 h-3" />
                  {parsedTable.rawRowCount} filas
                </Badge>
                <Badge variant="outline" className="gap-1">
                  {parsedTable.headers.length} columnas
                </Badge>
                {parsedTable.delimiter && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    Delimitador: {parsedTable.delimiter === '\t' ? 'TAB' : `"${parsedTable.delimiter}"`}
                  </Badge>
                )}
              </div>

              {/* Column Mapping */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Mapeo de columnas</Label>

                {!hasTermMapping && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4" />
                    Debes mapear la columna "Término / Keyword" para continuar.
                  </div>
                )}

                <div className="grid gap-2">
                    {parsedTable.headers.map(header => (
                      <div key={header} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <Badge variant="outline" className="font-mono text-xs truncate max-w-full">
                            {header}
                          </Badge>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <Select
                          value={columnMappings[header] || 'ignore'}
                          onValueChange={v => setColumnMappings(prev => ({
                            ...prev, [header]: v as AmazonAdsFieldKey | 'ignore',
                          }))}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ignore">❌ Ignorar</SelectItem>
                            {AMAZON_ADS_FIELDS.map(f => (
                              <SelectItem key={f.key} value={f.key}>
                                {f.required ? '⭐ ' : ''}{f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                </div>
              </div>

              {/* Advanced Options */}
              <div className="space-y-4 p-4 border border-border rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Settings2 className="w-4 h-4" />
                  Opciones de importación
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Import mode */}
                  <div className="space-y-2">
                    <Label className="text-xs">Modo de importación</Label>
                    <Select value={importMode} onValueChange={v => setImportMode(v as ImportMode)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="replace">Reemplazar datos</SelectItem>
                        <SelectItem value="accumulate">Sumar al acumulado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Campaign strategy */}
                  <div className="space-y-2">
                    <Label className="text-xs">Estrategia de campaña</Label>
                    <Select value={campaignStrategy} onValueChange={v => setCampaignStrategy(v as CampaignStrategy)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="max-spend">Mayor gasto</SelectItem>
                        <SelectItem value="max-clicks">Mayor clicks</SelectItem>
                        <SelectItem value="first">Primera encontrada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Crear keywords si no existen</Label>
                    <Switch checked={createMissing} onCheckedChange={setCreateMissing} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Guardar snapshot en historial</Label>
                    <Switch checked={saveSnapshot} onCheckedChange={setSaveSnapshot} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ STEP 3: PREVIEW ============ */}
          {step === 'preview' && (
            <div className="space-y-6" data-tour="ads-import-step-preview">
              {/* Summary */}
              <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Badge variant="outline" className="gap-1">
                  {importedRows.length} filas procesadas
                </Badge>
                <Badge variant="outline" className="gap-1">
                  {aggregatedTerms.length} términos únicos
                </Badge>
                <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-600 border-green-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  {matchedCount} coinciden
                </Badge>
                <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/30">
                  <AlertTriangle className="w-3 h-3" />
                  {unmatchedCount} sin match
                </Badge>
                {createMissing && unmatchedCount > 0 && (
                  <Badge variant="outline" className="gap-1 bg-blue-500/10 text-blue-600 border-blue-500/30">
                    Se crearán {unmatchedCount} nuevas
                  </Badge>
                )}
              </div>

              {/* Preview table */}
              <ScrollArea className="max-h-[350px]">
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">Término</th>
                        <th className="text-center p-2 font-medium">Match</th>
                        <th className="text-right p-2 font-medium">Impr.</th>
                        <th className="text-right p-2 font-medium">Clicks</th>
                        <th className="text-right p-2 font-medium">Pedidos</th>
                        <th className="text-right p-2 font-medium">Gasto</th>
                        <th className="text-right p-2 font-medium">CPC</th>
                        <th className="text-right p-2 font-medium">Ventas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aggregatedTerms.slice(0, 50).map((term, i) => {
                        const cpc = term.cpcCount > 0 ? term.cpcWeightedSum / term.cpcCount : 0;
                        return (
                          <tr key={i} className={cn(
                            "border-t border-border",
                            term.isNew ? 'bg-amber-500/5' : 'hover:bg-muted/30'
                          )}>
                            <td className="p-2 max-w-[200px] truncate" title={term.rawTerm}>
                              {term.rawTerm}
                            </td>
                            <td className="p-2 text-center">
                              {term.matchedKeyword ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mx-auto" />
                              ) : (
                                <span className="text-amber-500 text-[10px]">No</span>
                              )}
                            </td>
                            <td className="p-2 text-right tabular-nums">{term.impressions.toLocaleString()}</td>
                            <td className="p-2 text-right tabular-nums">{term.clicks.toLocaleString()}</td>
                            <td className="p-2 text-right tabular-nums">{term.orders}</td>
                            <td className="p-2 text-right tabular-nums">${term.spend.toFixed(2)}</td>
                            <td className="p-2 text-right tabular-nums">${cpc.toFixed(2)}</td>
                            <td className="p-2 text-right tabular-nums">${term.sales.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {aggregatedTerms.length > 50 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Mostrando 50 de {aggregatedTerms.length} términos
                  </p>
                )}
              </ScrollArea>
            </div>
          )}

          {/* ============ STEP 4: DONE ============ */}
          {step === 'done' && importResult && (
            <div className="space-y-6 text-center py-8" data-tour="ads-import-step-done">
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
              <div>
                <h3 className="text-lg font-semibold">Importación completada</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Los datos se han volcado en la tabla de Ads por keyword.
                </p>
              </div>

              <div className="flex justify-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{importResult.updated}</p>
                  <p className="text-xs text-muted-foreground">Actualizadas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{importResult.created}</p>
                  <p className="text-xs text-muted-foreground">Creadas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{importResult.skipped}</p>
                  <p className="text-xs text-muted-foreground">Omitidas</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Footer */}
        <DialogFooter className="gap-2">
          {step === 'mapping' && (
            <Button variant="outline" onClick={() => setStep('upload')}>Atrás</Button>
          )}
          {step === 'preview' && (
            <Button variant="outline" onClick={() => setStep('mapping')}>Atrás</Button>
          )}

          {step === 'mapping' && (
            <Button onClick={buildPreview} disabled={!hasTermMapping}>
              Vista previa
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          {step === 'preview' && (
            <Button onClick={executeImport} className="gap-2">
              <Upload className="w-4 h-4" />
              Importar ({matchedCount + (createMissing ? unmatchedCount : 0)} keywords)
            </Button>
          )}
          {step === 'done' && (
            <Button onClick={handleClose}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
