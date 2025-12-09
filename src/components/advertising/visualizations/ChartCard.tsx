import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GripVertical, MoreVertical, Eye, EyeOff, Maximize2, Minimize2, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  id: string;
  title: string;
  description: string;
  tooltip: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isVisible: boolean;
  size: 'normal' | 'compact' | 'expanded';
  onToggleVisibility: () => void;
  onSizeChange: (size: 'normal' | 'compact' | 'expanded') => void;
}

export const ChartCard = ({
  id,
  title,
  description,
  tooltip,
  icon,
  children,
  isVisible,
  size,
  onToggleVisibility,
  onSizeChange,
}: ChartCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!isVisible) return null;

  const heightClass = size === 'compact' ? 'h-[250px]' : size === 'expanded' ? 'h-[500px]' : 'h-[350px]';

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group bg-card border-border/50 shadow-lg hover:shadow-xl transition-all duration-300',
        isDragging && 'opacity-50 z-50 shadow-2xl ring-2 ring-primary',
        size === 'expanded' && 'col-span-full'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-heading font-semibold">{title}</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-sm">{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border">
              <DropdownMenuItem onClick={onToggleVisibility}>
                <EyeOff className="w-4 h-4 mr-2" />
                Ocultar gráfica
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onSizeChange('compact')} disabled={size === 'compact'}>
                <Minimize2 className="w-4 h-4 mr-2" />
                Tamaño compacto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSizeChange('normal')} disabled={size === 'normal'}>
                Normal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSizeChange('expanded')} disabled={size === 'expanded'}>
                <Maximize2 className="w-4 h-4 mr-2" />
                Expandir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className={cn('pt-2', heightClass)}>
        {children}
      </CardContent>
    </Card>
  );
};
