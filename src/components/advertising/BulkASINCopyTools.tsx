import { useState } from 'react';
import { Copy, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { type TargetASIN } from '@/types/advertising';

type CopyFormat = 'asin' | 'asin-types' | 'asin-notes' | 'full';

interface BulkASINCopyToolsProps {
  asins: TargetASIN[];
  selectedIds: Set<string>;
}

export const BulkASINCopyTools = ({ asins, selectedIds }: BulkASINCopyToolsProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const getASINsToCopy = () => {
    if (selectedIds.size > 0) {
      return asins.filter((a) => selectedIds.has(a.id));
    }
    return asins;
  };

  const formatASINs = (format: CopyFormat): string => {
    const asinsToCopy = getASINsToCopy();

    switch (format) {
      case 'asin':
        return asinsToCopy.map((a) => a.asin).join('\n');
      case 'asin-types':
        return asinsToCopy.map((a) => `${a.asin}\t${a.campaignTypes.join(', ')}`).join('\n');
      case 'asin-notes':
        return asinsToCopy.map((a) => `${a.asin}\t${a.notes}`).join('\n');
      case 'full':
        return asinsToCopy
          .map((a) => `${a.asin}\t${a.campaignTypes.join(', ')}\t${a.notes}`)
          .join('\n');
      default:
        return asinsToCopy.map((a) => a.asin).join('\n');
    }
  };

  const copyToClipboard = async (format: CopyFormat) => {
    const text = formatASINs(format);
    const count = getASINsToCopy().length;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: 'Copiado al portapapeles',
        description: `${count} ASIN${count !== 1 ? 's' : ''} copiado${count !== 1 ? 's' : ''}`,
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

  const asinCount = getASINsToCopy().length;
  const label = selectedIds.size > 0 ? `Copiar ${selectedIds.size} seleccionados` : 'Copiar todos';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={asinCount === 0}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {label}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border-border z-50 w-[220px]">
        <DropdownMenuItem onClick={() => copyToClipboard('asin')}>
          <span className="flex flex-col">
            <span>Solo ASINs</span>
            <span className="text-xs text-muted-foreground">Uno por línea</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copyToClipboard('asin-types')}>
          <span className="flex flex-col">
            <span>ASIN + Tipos campaña</span>
            <span className="text-xs text-muted-foreground">Separados por tab</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copyToClipboard('asin-notes')}>
          <span className="flex flex-col">
            <span>ASIN + Notas</span>
            <span className="text-xs text-muted-foreground">Separados por tab</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => copyToClipboard('full')}>
          <span className="flex flex-col">
            <span>Exportación completa</span>
            <span className="text-xs text-muted-foreground">Todos los campos</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
