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
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Globe className="w-5 h-5 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-muted-foreground">Mercado activo</span>
          <span className="text-xs text-muted-foreground">Los datos son independientes por mercado</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:ml-auto">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-[220px] h-11 bg-background border-primary/30 hover:border-primary/50 transition-colors">
            <SelectValue>
              {selectedMarketplace && (
                <span className="flex items-center gap-2">
                  <span className="text-xl">{selectedMarketplace.flag}</span>
                  <span className="font-medium">{selectedMarketplace.name}</span>
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {MARKETPLACES.map((marketplace) => (
              <SelectItem key={marketplace.id} value={marketplace.id} className="cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="text-xl">{marketplace.flag}</span>
                  <span>{marketplace.name}</span>
                  <span className="text-xs text-muted-foreground ml-1">({marketplace.domain})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <InfoTooltip content="Las estrategias varían según el mercado. Cada país tiene sus propias keywords, ASIN y categorías independientes." />
      </div>
    </div>
  );
};