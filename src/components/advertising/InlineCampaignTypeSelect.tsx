import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { CampaignTypeBadge } from './CampaignTypeBadge';
import { type CampaignType, CAMPAIGN_TYPES } from '@/types/advertising';
import { cn } from '@/lib/utils';

interface InlineCampaignTypeSelectProps {
  value: CampaignType[];
  onChange: (value: CampaignType[]) => void;
}

export const InlineCampaignTypeSelect = ({
  value,
  onChange,
}: InlineCampaignTypeSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (type: CampaignType) => {
    const newValue = value.includes(type)
      ? value.filter((t) => t !== type)
      : [...value, type];
    onChange(newValue);
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'cursor-pointer px-2 py-1 rounded hover:bg-muted/50 transition-colors min-h-[32px] flex items-center gap-1 flex-wrap',
          isOpen && 'bg-muted/50'
        )}
      >
        {value.length > 0 ? (
          value.map((type) => <CampaignTypeBadge key={type} type={type} />)
        ) : (
          <span className="text-muted-foreground italic">Seleccionar...</span>
        )}
        <ChevronDown className={cn('w-3 h-3 ml-auto transition-transform', isOpen && 'rotate-180')} />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg p-2 min-w-[200px] animate-scale-in">
          {CAMPAIGN_TYPES.map((type) => (
            <div
              key={type.value}
              className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer"
              onClick={() => handleToggle(type.value)}
            >
              <Checkbox
                checked={value.includes(type.value)}
                onCheckedChange={() => handleToggle(type.value)}
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{type.label}</span>
                <span className="text-xs text-muted-foreground">{type.description}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};