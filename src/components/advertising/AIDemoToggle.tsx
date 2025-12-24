import { useState, useEffect } from 'react';
import { Sparkles, Zap, ZapOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { isAIDemoMode, toggleAIDemoMode } from '@/lib/ai-demo-service';
import { useToast } from '@/hooks/use-toast';

export const AIDemoToggle = () => {
  const { toast } = useToast();
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    setIsDemoMode(isAIDemoMode());
  }, []);

  const handleToggle = () => {
    const newValue = toggleAIDemoMode();
    setIsDemoMode(newValue);
    toast({
      title: newValue ? 'Modo Demo IA activado' : 'Modo Demo IA desactivado',
      description: newValue 
        ? 'Las funciones de IA mostrarán respuestas simuladas sin backend' 
        : 'Las funciones de IA intentarán conectar con el backend real',
    });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isDemoMode ? 'default' : 'outline'}
          size="sm"
          onClick={handleToggle}
          className="gap-2"
        >
          {isDemoMode ? (
            <>
              <Zap className="w-4 h-4" />
              Demo IA
              <Badge variant="secondary" className="ml-1 bg-green-500/20 text-green-700 dark:text-green-300">
                ON
              </Badge>
            </>
          ) : (
            <>
              <ZapOff className="w-4 h-4" />
              Demo IA
            </>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="font-medium mb-1">Modo Demo de IA</p>
        <p className="text-xs text-muted-foreground">
          {isDemoMode 
            ? 'Activo: Las funciones de IA muestran respuestas simuladas para probar la interfaz sin necesidad de backend.' 
            : 'Inactivo: Haz clic para activar respuestas simuladas de IA.'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
