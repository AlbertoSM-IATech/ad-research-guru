import { useState } from 'react';
import { Copy, Check, ChevronDown, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { type Keyword, RELEVANCE_LEVELS, INTENT_TYPES, KEYWORD_STATES } from '@/types/advertising';

type CopyFormat = 
  | 'keyword' 
  | 'keyword-volume' 
  | 'keyword-competition' 
  | 'keyword-volume-competition'
  | 'keyword-types' 
  | 'amazon-ads'
  | 'csv'
  | 'full';

interface BulkCopyToolsProps {
  keywords: Keyword[];
  selectedIds: Set<string>;
}

export const BulkCopyTools = ({ keywords, selectedIds }: BulkCopyToolsProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const getKeywordsToCopy = () => {
    if (selectedIds.size > 0) {
      return keywords.filter((k) => selectedIds.has(k.id));
    }
    return keywords;
  };

  const getRelevanceLabel = (value?: string) => {
    const level = RELEVANCE_LEVELS.find(r => r.value === value);
    return level?.label || '';
  };

  const getIntentLabel = (value?: string) => {
    const intent = INTENT_TYPES.find(i => i.value === value);
    return intent?.label || '';
  };

  const getStateLabel = (value?: string) => {
    const state = KEYWORD_STATES.find(s => s.value === value);
    return state?.label || '';
  };

  const getCompetitionLabel = (level: string): string => {
    const labels: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };
    return labels[level] || level;
  };

  const formatKeywords = (format: CopyFormat): string => {
    const keywordsToCopy = getKeywordsToCopy();
    
    switch (format) {
      case 'keyword':
        return keywordsToCopy.map((k) => k.keyword).join('\n');
      
      case 'keyword-volume':
        return keywordsToCopy.map((k) => `${k.keyword}\t${k.searchVolume}`).join('\n');
      
      case 'keyword-competition':
        return keywordsToCopy.map((k) => `${k.keyword}\t${getCompetitionLabel(k.competitionLevel)}`).join('\n');
      
      case 'keyword-volume-competition':
        return keywordsToCopy.map((k) => `${k.keyword}\t${k.searchVolume}\t${getCompetitionLabel(k.competitionLevel)}`).join('\n');
      
      case 'keyword-types':
        return keywordsToCopy.map((k) => `${k.keyword}\t${k.campaignTypes.join(', ')}`).join('\n');
      
      case 'amazon-ads':
        return keywordsToCopy.map((k) => k.keyword.trim()).join('\n');
      
      case 'csv':
        const headers = 'Keyword,Volumen de búsqueda,Competidores,Tipos,Relevancia,Intención,Estado,Notas';
        const rows = keywordsToCopy.map((k) => 
          `"${k.keyword}",${k.searchVolume},"${getCompetitionLabel(k.competitionLevel)}","${k.campaignTypes.join(';')}","${getRelevanceLabel(k.relevance)}","${getIntentLabel(k.intent)}","${getStateLabel(k.state)}","${(k.notes || '').replace(/"/g, '""')}"`
        );
        return [headers, ...rows].join('\n');
      
      case 'full':
        return keywordsToCopy
          .map((k) => `${k.keyword}\t${k.searchVolume}\t${getCompetitionLabel(k.competitionLevel)}\t${k.campaignTypes.join(', ')}\t${k.notes || ''}`)
          .join('\n');
      
      default:
        return keywordsToCopy.map((k) => k.keyword).join('\n');
    }
  };

  const copyToClipboard = async (format: CopyFormat) => {
    const text = formatKeywords(format);
    const count = getKeywordsToCopy().length;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: 'Copiado al portapapeles',
        description: `${count} keyword${count !== 1 ? 's' : ''} copiada${count !== 1 ? 's' : ''}`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo copiar al portapapeles',
        variant: 'destructive',
      });
    }
  };

  const keywordCount = getKeywordsToCopy().length;
  const label = selectedIds.size > 0 ? `Copiar ${selectedIds.size} seleccionadas` : 'Copiar todas';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={keywordCount === 0}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {label}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border-border z-50 w-[240px]">
        <DropdownMenuItem onClick={() => copyToClipboard('keyword')}>
          <span className="flex flex-col">
            <span>Solo keywords</span>
            <span className="text-xs text-muted-foreground">Una por línea</span>
          </span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span className="flex flex-col">
              <span>Keyword + métricas</span>
              <span className="text-xs text-muted-foreground">Con datos adicionales</span>
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="bg-popover border-border">
            <DropdownMenuItem onClick={() => copyToClipboard('keyword-volume')}>
              Keyword + Volumen
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copyToClipboard('keyword-competition')}>
              Keyword + Competencia
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copyToClipboard('keyword-volume-competition')}>
              Keyword + Volumen + Competencia
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copyToClipboard('keyword-types')}>
              Keyword + Tipos campaña
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => copyToClipboard('amazon-ads')} className="gap-2">
          <FileText className="w-4 h-4" />
          <span className="flex flex-col">
            <span>Formato Amazon Ads</span>
            <span className="text-xs text-muted-foreground">Optimizado para carga masiva</span>
          </span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => copyToClipboard('csv')} className="gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          <span className="flex flex-col">
            <span>Formato CSV</span>
            <span className="text-xs text-muted-foreground">Todos los campos con cabeceras</span>
          </span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => copyToClipboard('full')}>
          <span className="flex flex-col">
            <span>Exportación completa (TSV)</span>
            <span className="text-xs text-muted-foreground">Separado por tabulaciones</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
