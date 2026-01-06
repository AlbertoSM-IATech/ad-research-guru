import { Book, Info, DollarSign, Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { InfoTooltip } from './InfoTooltip';
import { type BookInfo, type BookEconomy, type Keyword } from '@/types/advertising';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface BookInfoPanelProps {
  bookInfo: BookInfo;
  onChange: (bookInfo: BookInfo) => void;
  bookEconomy?: BookEconomy;
  onBookEconomyChange?: (economy: BookEconomy) => void;
  keywords?: Keyword[];
}

export const BookInfoPanel = ({ 
  bookInfo, 
  onChange,
  bookEconomy,
  onBookEconomyChange,
  keywords = []
}: BookInfoPanelProps) => {
  const [isOpen, setIsOpen] = useState(true);

  // Determine main keyword (best Market Score with status 'valid')
  const mainKeyword = useMemo(() => {
    const validKeywords = keywords.filter(k => k.status === 'valid');
    if (validKeywords.length === 0) return null;
    return validKeywords.reduce((best, current) => 
      (current.marketScore || 0) > (best.marketScore || 0) ? current : best
    );
  }, [keywords]);

  // Calculate ACOS equilibrio
  const acosEquilibrio = bookEconomy && bookEconomy.precioLibro > 0
    ? (bookEconomy.regaliasPorVenta / bookEconomy.precioLibro) * 100
    : null;

  const handlePrecioChange = (value: string) => {
    if (!onBookEconomyChange || !bookEconomy) return;
    const numValue = parseFloat(value) || 0;
    onBookEconomyChange({
      ...bookEconomy,
      precioLibro: Math.max(0, numValue),
    });
  };

  const handleRegaliasChange = (value: string) => {
    if (!onBookEconomyChange || !bookEconomy) return;
    const numValue = parseFloat(value) || 0;
    onBookEconomyChange({
      ...bookEconomy,
      regaliasPorVenta: Math.max(0, numValue),
    });
  };

  return (
    <div data-tour="book-info" className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Book className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="font-heading font-semibold text-lg">Información</h3>
              <p className="text-sm text-muted-foreground">
                {bookInfo.title || 'Define el título para clasificar keywords automáticamente'}
              </p>
            </div>
          </div>
          <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-6 pb-6 space-y-5 border-t border-border/50 pt-4">
            
            {/* KW Principal destacada */}
            {mainKeyword && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-primary" />
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    KW Principal
                  </Label>
                  <Badge variant="outline" className="text-xs">
                    Score: {mainKeyword.marketScore || 0}
                  </Badge>
                </div>
                <div className="font-medium text-base">{mainKeyword.keyword}</div>
                <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                  <span>Vol: <strong className="text-foreground">{(mainKeyword.searchVolume || 0).toLocaleString()}</strong></span>
                  <span>Comp: <strong className={cn(
                    "text-foreground",
                    (mainKeyword.competitors || 0) < 3000 ? "text-green-600 dark:text-green-400" : ""
                  )}>{(mainKeyword.competitors || 0).toLocaleString()}</strong></span>
                </div>
              </div>
            )}

            {/* Economía del libro (integrada) */}
            {bookEconomy && onBookEconomyChange && (
              <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Economía del Libro
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p>Se usa para calcular el ACOS de equilibrio y beneficios en la gestión de Ads.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {/* Precio del libro */}
                  <div className="space-y-1">
                    <Label htmlFor="precioLibro" className="text-xs text-muted-foreground">
                      Precio (sin IVA)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        id="precioLibro"
                        type="number"
                        min={0}
                        step={0.01}
                        value={bookEconomy.precioLibro || ''}
                        onChange={(e) => handlePrecioChange(e.target.value)}
                        placeholder="0.00"
                        className="pl-6 h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Regalías netas */}
                  <div className="space-y-1">
                    <Label htmlFor="regaliasPorVenta" className="text-xs text-muted-foreground">
                      Regalías netas
                    </Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        id="regaliasPorVenta"
                        type="number"
                        min={0}
                        step={0.01}
                        value={bookEconomy.regaliasPorVenta || ''}
                        onChange={(e) => handleRegaliasChange(e.target.value)}
                        placeholder="0.00"
                        className="pl-6 h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* ACOS Equilibrio Preview */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      ACOS PE
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Punto de equilibrio: si el ACOS actual supera este valor, pierdes dinero.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <div className="h-8 px-2.5 flex items-center rounded-md border border-border bg-background/50">
                      <span className={acosEquilibrio !== null ? 'font-mono font-semibold text-primary text-sm' : 'text-muted-foreground text-sm'}>
                        {acosEquilibrio !== null ? `${acosEquilibrio.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contexto del libro */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Book className="w-4 h-4 text-muted-foreground" />
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Contexto del Libro
                </Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="book-title">Título del libro</Label>
                    <InfoTooltip content="El título principal de tu libro. Se usa para calcular la relevancia de las keywords." />
                  </div>
                  <Input
                    id="book-title"
                    value={bookInfo.title}
                    onChange={(e) => onChange({ ...bookInfo, title: e.target.value })}
                    placeholder="Ej: Meditación para principiantes"
                    className="bg-background"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="book-subtitle">Subtítulo del libro</Label>
                    <InfoTooltip content="El subtítulo que aparece en Amazon. Mejora la clasificación de relevancia." />
                  </div>
                  <Input
                    id="book-subtitle"
                    value={bookInfo.subtitle}
                    onChange={(e) => onChange({ ...bookInfo, subtitle: e.target.value })}
                    placeholder="Ej: Guía práctica de mindfulness"
                    className="bg-background"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="book-description">Descripción (opcional)</Label>
                  <InfoTooltip content="La descripción de tu libro. Se usa para identificar keywords con relevancia baja que aún aparecen en tu descripción." />
                </div>
                <Textarea
                  id="book-description"
                  value={bookInfo.description}
                  onChange={(e) => onChange({ ...bookInfo, description: e.target.value })}
                  placeholder="Pega aquí la descripción de tu libro..."
                  rows={3}
                  className="bg-background"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="book-categories">Categorías (una por línea)</Label>
                  <InfoTooltip content="Las categorías de Amazon donde está tu libro. Ayuda a identificar keywords relevantes del nicho." />
                </div>
                <Textarea
                  id="book-categories"
                  value={bookInfo.categories.join('\n')}
                  onChange={(e) => onChange({ ...bookInfo, categories: e.target.value.split('\n').filter(c => c.trim()) })}
                  placeholder="Libros > Autoayuda&#10;Libros > Salud y bienestar"
                  rows={2}
                  className="bg-background font-mono text-sm"
                />
              </div>
            </div>
            
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                Esta información se usa para clasificar automáticamente la <strong>relevancia</strong> de cada keyword 
                respecto a tu libro. Las keywords que coincidan con el título serán marcadas como "Muy relevantes".
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
