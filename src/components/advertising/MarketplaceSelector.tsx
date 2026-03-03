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
    <div className="flex items-center gap-1.5">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-auto h-8 gap-1.5 bg-primary text-primary-foreground border-primary hover:bg-primary/90 transition-colors px-2.5 text-sm">
          <SelectValue>
            {selectedMarketplace && (
              <span className="flex items-center gap-1.5">
                <span className="text-base leading-none">{selectedMarketplace.flag}</span>
                <span className="font-medium text-xs">{selectedMarketplace.domain}</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover border-border z-50">
          {MARKETPLACES.map((marketplace) => (
            <SelectItem key={marketplace.id} value={marketplace.id} className="cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="text-base">{marketplace.flag}</span>
                <span className="text-sm">{marketplace.name}</span>
                <span className="text-xs text-muted-foreground">({marketplace.domain})</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <InfoTooltip content="Cada mercado tiene sus propias keywords, ASINs y categorías independientes." />
    </div>
  );
};
