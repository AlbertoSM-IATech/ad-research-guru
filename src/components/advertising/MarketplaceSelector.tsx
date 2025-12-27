import { Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MARKETPLACES } from '@/types/advertising';
import { InfoTooltip } from './InfoTooltip';

interface MarketplaceSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const MarketplaceSelector = ({ value, onChange }: MarketplaceSelectorProps) => {
  const selectedMarketplace = MARKETPLACES.find((m) => m.id === value);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">Mercado:</span>
      </div>

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px] h-9 bg-background border-border hover:border-primary/50 transition-colors">
          <SelectValue>
            {selectedMarketplace && (
              <span className="flex items-center gap-2">
                <span className="text-lg">{selectedMarketplace.flag}</span>
                <span className="font-medium text-sm truncate">{selectedMarketplace.name}</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover border-border z-50">
          {MARKETPLACES.map((marketplace) => (
            <SelectItem key={marketplace.id} value={marketplace.id} className="cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="text-lg">{marketplace.flag}</span>
                <span>{marketplace.name}</span>
                <span className="text-xs text-muted-foreground ml-1">({marketplace.domain})</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <InfoTooltip content="Cada mercado tiene sus propias keywords, ASINs y categorías independientes." />
    </div>
  );
};
