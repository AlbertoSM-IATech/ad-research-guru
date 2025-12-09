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
import { type AdvertisingCategory } from '@/types/advertising';

type CopyFormat = 'name' | 'name-id' | 'name-types' | 'full';

interface BulkCategoryCopyToolsProps {
  categories: AdvertisingCategory[];
  selectedIds: Set<string>;
}

export const BulkCategoryCopyTools = ({ categories, selectedIds }: BulkCategoryCopyToolsProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const getCategoriesToCopy = () => {
    if (selectedIds.size > 0) {
      return categories.filter((c) => selectedIds.has(c.id));
    }
    return categories;
  };

  const formatCategories = (format: CopyFormat): string => {
    const categoriesToCopy = getCategoriesToCopy();

    switch (format) {
      case 'name':
        return categoriesToCopy.map((c) => c.name).join('\n');
      case 'name-id':
        return categoriesToCopy.map((c) => `${c.name}\t${c.amazonId}`).join('\n');
      case 'name-types':
        return categoriesToCopy.map((c) => `${c.name}\t${c.campaignTypes.join(', ')}`).join('\n');
      case 'full':
        return categoriesToCopy
          .map((c) => `${c.name}\t${c.amazonId}\t${c.campaignTypes.join(', ')}\t${c.notes}`)
          .join('\n');
      default:
        return categoriesToCopy.map((c) => c.name).join('\n');
    }
  };

  const copyToClipboard = async (format: CopyFormat) => {
    const text = formatCategories(format);
    const count = getCategoriesToCopy().length;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: 'Copiado al portapapeles',
        description: `${count} categoría${count !== 1 ? 's' : ''} copiada${count !== 1 ? 's' : ''}`,
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

  const categoryCount = getCategoriesToCopy().length;
  const label = selectedIds.size > 0 ? `Copiar ${selectedIds.size} seleccionadas` : 'Copiar todas';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={categoryCount === 0}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {label}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border-border z-50 w-[220px]">
        <DropdownMenuItem onClick={() => copyToClipboard('name')}>
          <span className="flex flex-col">
            <span>Solo nombres</span>
            <span className="text-xs text-muted-foreground">Uno por línea</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copyToClipboard('name-id')}>
          <span className="flex flex-col">
            <span>Nombre + ID Amazon</span>
            <span className="text-xs text-muted-foreground">Separados por tab</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copyToClipboard('name-types')}>
          <span className="flex flex-col">
            <span>Nombre + Tipos campaña</span>
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
