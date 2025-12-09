import { Book, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { InfoTooltip } from './InfoTooltip';
import { type BookInfo } from '@/types/advertising';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookInfoPanelProps {
  bookInfo: BookInfo;
  onChange: (bookInfo: BookInfo) => void;
}

export const BookInfoPanel = ({ bookInfo, onChange }: BookInfoPanelProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Book className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="font-heading font-semibold text-lg">Información del Libro</h3>
              <p className="text-sm text-muted-foreground">
                {bookInfo.title || 'Define el título para clasificar keywords automáticamente'}
              </p>
            </div>
          </div>
          <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-6 pb-6 space-y-4 border-t border-border/50 pt-4">
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
