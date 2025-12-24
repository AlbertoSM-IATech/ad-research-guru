import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ImportHelpTooltipProps {
  type: 'keywords' | 'asins' | 'categories';
}

export const ImportHelpTooltip = ({ type }: ImportHelpTooltipProps) => {
  const getHelpContent = () => {
    switch (type) {
      case 'keywords':
        return (
          <div className="space-y-3 max-w-sm">
            <p className="font-semibold text-foreground">Formatos admitidos:</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li><strong>Texto simple:</strong> Una keyword por línea</li>
              <li><strong>Separadores:</strong> Coma (,), punto y coma (;), tabulación o salto de línea</li>
              <li><strong>CSV pegado:</strong> Puedes pegar datos desde Excel o Google Sheets</li>
            </ul>
            <p className="font-semibold text-foreground mt-2">Ejemplos válidos:</p>
            <code className="block text-xs bg-muted p-2 rounded">
              mindfulness para principiantes{'\n'}
              meditación diaria{'\n'}
              guía de relajación
            </code>
            <code className="block text-xs bg-muted p-2 rounded mt-1">
              keyword1; keyword2; keyword3
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Las columnas no reconocidas se ignorarán. Puedes editar los valores en la vista previa antes de importar.
            </p>
          </div>
        );
      case 'asins':
        return (
          <div className="space-y-3 max-w-sm">
            <p className="font-semibold text-foreground">Formatos admitidos:</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li><strong>ASIN:</strong> Código de 10 caracteres alfanuméricos</li>
              <li><strong>Separadores:</strong> Coma (,), punto y coma (;), tabulación o salto de línea</li>
              <li><strong>URLs Amazon:</strong> Detecta el ASIN automáticamente</li>
            </ul>
            <p className="font-semibold text-foreground mt-2">Ejemplos válidos:</p>
            <code className="block text-xs bg-muted p-2 rounded">
              B08N5WRWNW{'\n'}
              B09V3KXJPB{'\n'}
              B07XJ8C8F5
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Los ASINs inválidos se marcarán en rojo y no se importarán.
            </p>
          </div>
        );
      case 'categories':
        return (
          <div className="space-y-3 max-w-sm">
            <p className="font-semibold text-foreground">Formatos admitidos:</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li><strong>Nombre:</strong> Una categoría por línea</li>
              <li><strong>Con ID:</strong> Nombre | ID Amazon (opcional)</li>
              <li><strong>Separadores:</strong> Coma o tabulación para ID</li>
            </ul>
            <p className="font-semibold text-foreground mt-2">Ejemplos válidos:</p>
            <code className="block text-xs bg-muted p-2 rounded">
              Libros &gt; Ficción{'\n'}
              Libros &gt; No Ficción | 123456{'\n'}
              Kindle &gt; Autoayuda, 789012
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Puedes añadir el ID de Amazon opcionalmente separado por | o coma.
            </p>
          </div>
        );
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="p-3 max-w-md bg-popover border-border">
          {getHelpContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
