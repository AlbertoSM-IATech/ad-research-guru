import { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface CampaignSelectProps {
  value: string;
  onChange: (value: string) => void;
  campaigns: string[];
  onAddCampaign?: (name: string) => void;
  placeholder?: string;
  className?: string;
}

export function CampaignSelect({
  value,
  onChange,
  campaigns,
  onAddCampaign,
  placeholder = 'Seleccionar campaña...',
  className,
}: CampaignSelectProps) {
  const [open, setOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);

  const handleAddNew = () => {
    if (newCampaignName.trim() && onAddCampaign) {
      onAddCampaign(newCampaignName.trim());
      onChange(newCampaignName.trim());
      setNewCampaignName('');
      setShowNewInput(false);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0 bg-popover border-border" align="start">
        <Command>
          <CommandInput placeholder="Buscar campaña..." />
          <CommandList>
            <CommandEmpty>
              {campaigns.length === 0 
                ? 'No hay campañas creadas' 
                : 'No se encontró ninguna campaña'}
            </CommandEmpty>
            <CommandGroup>
              {campaigns.map((campaign) => (
                <CommandItem
                  key={campaign}
                  value={campaign}
                  onSelect={() => {
                    onChange(campaign === value ? '' : campaign);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === campaign ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {campaign}
                </CommandItem>
              ))}
            </CommandGroup>
            
            {onAddCampaign && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  {showNewInput ? (
                    <div className="p-2 space-y-2">
                      <Input
                        value={newCampaignName}
                        onChange={(e) => setNewCampaignName(e.target.value)}
                        placeholder="Nombre de la campaña..."
                        className="h-8"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNew();
                          }
                          if (e.key === 'Escape') {
                            setShowNewInput(false);
                            setNewCampaignName('');
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 h-7"
                          onClick={handleAddNew}
                          disabled={!newCampaignName.trim()}
                        >
                          Crear
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7"
                          onClick={() => {
                            setShowNewInput(false);
                            setNewCampaignName('');
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <CommandItem
                      onSelect={() => setShowNewInput(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Nueva campaña...
                    </CommandItem>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
