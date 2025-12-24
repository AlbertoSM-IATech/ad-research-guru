import { useState } from 'react';
import { Upload, Eye, Plus, X, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImportHelpTooltip } from './ImportHelpTooltip';
import { InlineCampaignTypeSelect } from './InlineCampaignTypeSelect';
import { InlineCompetitionLevelSelect } from './InlineCompetitionLevelSelect';
import { InlineSelectBadge } from './InlineSelectBadge';
import {
  type Keyword,
  type CampaignType,
  type CompetitionLevel,
  type RelevanceLevel,
  type IntentType,
  type KeywordState,
  type BookInfo,
  CAMPAIGN_TYPES,
  RELEVANCE_LEVELS,
  INTENT_TYPES,
  KEYWORD_STATES,
  normalizeText,
  calculateRelevance,
  classifyIntent,
} from '@/types/advertising';

interface BulkKeywordImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (keywords: Array<Omit<Keyword, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  marketplaceId: string;
  bookInfo?: BookInfo;
  existingKeywords?: string[];
}

interface ParsedKeyword {
  keyword: string;
  searchVolume: number;
  competitionLevel: CompetitionLevel;
  campaignTypes: CampaignType[];
  notes: string;
  relevance?: RelevanceLevel;
  intent?: IntentType;
  state?: KeywordState;
  isDuplicate?: boolean;
}

export const BulkKeywordImport = ({
  isOpen,
  onClose,
  onImport,
  marketplaceId,
  bookInfo,
  existingKeywords = [],
}: BulkKeywordImportProps) => {
  const [bulkText, setBulkText] = useState('');
  const [defaultVolume, setDefaultVolume] = useState('1000');
  const [defaultCompetitionLevel, setDefaultCompetitionLevel] = useState<CompetitionLevel>('medium');
  const [defaultCampaignTypes, setDefaultCampaignTypes] = useState<CampaignType[]>(['SP']);
  const [defaultNotes, setDefaultNotes] = useState('');
  const [defaultState, setDefaultState] = useState<KeywordState>('pending');
  const [parsedKeywords, setParsedKeywords] = useState<ParsedKeyword[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [autoClassify, setAutoClassify] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const handleCampaignTypeToggle = (type: CampaignType) => {
    setDefaultCampaignTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const parseKeywords = () => {
    const existingSet = new Set(existingKeywords.map(k => normalizeText(k)));
    
    const lines = bulkText
      .split(/[\n,;\t]+/)
      .map((line) => normalizeText(line))
      .filter((line) => line.length > 0);

    const uniqueLines = [...new Set(lines)];
    const volume = parseInt(defaultVolume) || 0;

    const parsed: ParsedKeyword[] = uniqueLines.map((keyword) => {
      const isDuplicate = existingSet.has(normalizeText(keyword));
      
      let relevance: RelevanceLevel | undefined;
      let intent: IntentType | undefined;
      
      if (autoClassify && bookInfo && (bookInfo.title || bookInfo.subtitle)) {
        relevance = calculateRelevance(keyword, bookInfo);
        intent = classifyIntent(keyword);
      }

      return {
        keyword,
        searchVolume: volume,
        competitionLevel: defaultCompetitionLevel,
        campaignTypes: defaultCampaignTypes,
        notes: defaultNotes,
        relevance,
        intent,
        state: defaultState,
        isDuplicate,
      };
    });

    setParsedKeywords(parsed);
    setShowPreview(true);
  };

  const updateParsedKeyword = (index: number, updates: Partial<ParsedKeyword>) => {
    setParsedKeywords(prev => 
      prev.map((k, i) => i === index ? { ...k, ...updates } : k)
    );
  };

  const handleImport = () => {
    const keywordsToImport = parsedKeywords
      .filter(k => !skipDuplicates || !k.isDuplicate)
      .map((k) => ({
        keyword: k.keyword,
        searchVolume: k.searchVolume,
        competitionLevel: k.competitionLevel,
        campaignTypes: k.campaignTypes,
        notes: k.notes,
        relevance: k.relevance,
        intent: k.intent,
        state: k.state,
        marketplaceId,
      }));
    onImport(keywordsToImport);
    handleClose();
  };

  const handleClose = () => {
    setBulkText('');
    setParsedKeywords([]);
    setShowPreview(false);
    onClose();
  };

  const removeFromPreview = (index: number) => {
    setParsedKeywords((prev) => prev.filter((_, i) => i !== index));
  };

  const duplicateCount = parsedKeywords.filter(k => k.isDuplicate).length;
  const toImportCount = parsedKeywords.filter(k => !skipDuplicates || !k.isDuplicate).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importar Keywords en Lote
            <ImportHelpTooltip type="keywords" />
          </DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Keywords (una por línea o separadas por coma/punto y coma)</Label>
                <InfoTooltip content="Pega tu lista de keywords. Se normalizarán automáticamente." />
              </div>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="kindle paperwhite&#10;ebook reader&#10;funda kindle"
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {bulkText.split(/[\n,;\t]+/).filter((l) => l.trim()).length} keywords detectadas
              </p>
            </div>

            <div className="flex items-center space-x-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Checkbox
                id="auto-classify"
                checked={autoClassify}
                onCheckedChange={(checked) => setAutoClassify(checked === true)}
              />
              <label htmlFor="auto-classify" className="text-sm cursor-pointer flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary" />
                <span>Clasificar automáticamente relevancia e intención</span>
              </label>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Valores por defecto</h4>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-volume">Volumen de búsqueda</Label>
                  <Input
                    id="bulk-volume"
                    type="number"
                    value={defaultVolume}
                    onChange={(e) => setDefaultVolume(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Competidores</Label>
                  <Select value={defaultCompetitionLevel} onValueChange={(v) => setDefaultCompetitionLevel(v as CompetitionLevel)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estado inicial</Label>
                  <Select value={defaultState} onValueChange={(v) => setDefaultState(v as KeywordState)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      {KEYWORD_STATES.map((state) => (
                        <SelectItem key={state.value} value={state.value}>
                          <span className="flex items-center gap-1">
                            <span>{state.icon}</span>
                            {state.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipos de Campaña</Label>
                <div className="flex flex-wrap gap-3">
                  {CAMPAIGN_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bulk-campaign-${type.value}`}
                        checked={defaultCampaignTypes.includes(type.value)}
                        onCheckedChange={() => handleCampaignTypeToggle(type.value)}
                      />
                      <label htmlFor={`bulk-campaign-${type.value}`} className="text-sm font-medium cursor-pointer">
                        {type.value}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Vista previa ({parsedKeywords.length} keywords)</h4>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>Volver</Button>
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                {parsedKeywords.length} procesadas
              </Badge>
              {duplicateCount > 0 && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                  {duplicateCount} duplicadas
                </Badge>
              )}
            </div>

            {duplicateCount > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <Checkbox
                  id="skip-duplicates"
                  checked={skipDuplicates}
                  onCheckedChange={(checked) => setSkipDuplicates(checked === true)}
                />
                <label htmlFor="skip-duplicates" className="text-sm cursor-pointer">
                  Ignorar keywords duplicadas ({duplicateCount})
                </label>
              </div>
            )}

            <div className="max-h-[350px] overflow-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-2 font-medium">Keyword</th>
                    <th className="text-left p-2 font-medium w-[80px]">Volumen</th>
                    <th className="text-left p-2 font-medium w-[100px]">Competidores</th>
                    <th className="text-left p-2 font-medium w-[100px]">Relevancia</th>
                    <th className="text-left p-2 font-medium w-[100px]">Estado</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {parsedKeywords.map((keyword, index) => (
                    <tr key={index} className={`border-t border-border hover:bg-muted/30 ${keyword.isDuplicate ? 'bg-yellow-500/5' : ''}`}>
                      <td className="p-2">
                        <Input
                          value={keyword.keyword}
                          onChange={(e) => updateParsedKeyword(index, { keyword: e.target.value })}
                          className="h-8 bg-transparent border-transparent hover:border-border"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={keyword.searchVolume}
                          onChange={(e) => updateParsedKeyword(index, { searchVolume: parseInt(e.target.value) || 0 })}
                          className="h-8 w-[70px] bg-transparent border-transparent hover:border-border"
                        />
                      </td>
                      <td className="p-2">
                        <InlineCompetitionLevelSelect
                          value={keyword.competitionLevel}
                          onChange={(level) => updateParsedKeyword(index, { competitionLevel: level })}
                        />
                      </td>
                      <td className="p-2">
                        <InlineSelectBadge
                          value={keyword.relevance}
                          options={RELEVANCE_LEVELS.map(r => ({ value: r.value, label: r.label, icon: r.icon }))}
                          onChange={(v) => updateParsedKeyword(index, { relevance: v as RelevanceLevel })}
                          placeholder="—"
                        />
                      </td>
                      <td className="p-2">
                        <InlineSelectBadge
                          value={keyword.state}
                          options={KEYWORD_STATES.map(s => ({ value: s.value, label: s.label, icon: s.icon }))}
                          onChange={(v) => updateParsedKeyword(index, { state: v as KeywordState })}
                          placeholder="—"
                        />
                      </td>
                      <td className="p-2">
                        <button onClick={() => removeFromPreview(index)} className="text-muted-foreground hover:text-destructive">
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          {!showPreview ? (
            <Button onClick={parseKeywords} disabled={!bulkText.trim()} className="gap-2">
              <Eye className="w-4 h-4" />
              Procesar Keywords
            </Button>
          ) : (
            <Button onClick={handleImport} disabled={toImportCount === 0} className="gap-2">
              <Plus className="w-4 h-4" />
              Guardar {toImportCount} Keywords
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
