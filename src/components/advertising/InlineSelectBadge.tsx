import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
  icon?: string;
  color?: string;
}

interface InlineSelectBadgeProps {
  value: string | undefined;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const InlineSelectBadge = ({
  value,
  options,
  onChange,
  placeholder = 'Seleccionar...',
  className,
}: InlineSelectBadgeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find(o => o.value === value);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Badge
        variant="outline"
        className={cn(
          "cursor-pointer hover:bg-muted/50 transition-colors gap-1 pr-1",
          selectedOption?.color || 'bg-muted/30'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedOption?.icon && <span>{selectedOption.icon}</span>}
        <span className="truncate max-w-[100px]">{selectedOption?.label || placeholder}</span>
        <ChevronDown className="w-3 h-3 shrink-0" />
      </Badge>
      
      {isOpen && (
        <div className="absolute z-50 top-full mt-1 left-0 min-w-[160px] bg-popover border border-border rounded-md shadow-lg py-1 animate-scale-in">
          {options.map((option) => (
            <button
              key={option.value}
              className={cn(
                "w-full px-3 py-1.5 text-left text-sm hover:bg-muted/50 flex items-center gap-2 transition-colors",
                option.value === value && "bg-muted"
              )}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.icon && <span>{option.icon}</span>}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
