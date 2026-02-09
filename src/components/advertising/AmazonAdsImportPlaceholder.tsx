import { Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AmazonAdsImportPlaceholderProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AmazonAdsImportPlaceholder = ({ 
  isOpen, 
  onClose 
}: AmazonAdsImportPlaceholderProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Importación Amazon Ads
          </DialogTitle>
          <DialogDescription className="pt-2">
            <span className="block text-base text-foreground font-medium mb-2">
              Próximamente
            </span>
            <span className="text-muted-foreground">
              Importación de métricas desde Amazon Ads. Esta funcionalidad aún no está implementada.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p className="mb-2">Esta funcionalidad permitirá:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Importar métricas de campañas desde archivos de Amazon Ads</li>
              <li>Sincronizar clicks, impresiones, CPC y pedidos</li>
              <li>Actualizar automáticamente los datos de Ads por keyword</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
