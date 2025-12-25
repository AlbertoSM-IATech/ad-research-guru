import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, AlertTriangle } from 'lucide-react';
import {
  type KeywordValidation,
  VALIDATION_STATUS_OPTIONS,
  getScoreColor,
  getValidationAlerts,
} from '@/lib/keyword-validation';
import { cn } from '@/lib/utils';

interface ValidationBadgeProps {
  validation?: KeywordValidation;
  onValidate: () => void;
  compact?: boolean;
}

export const ValidationBadge = ({
  validation,
  onValidate,
  compact = false,
}: ValidationBadgeProps) => {
  if (!validation || validation.validationStatus === 'unvalidated') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onValidate}
        className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
      >
        <ClipboardCheck className="w-3.5 h-3.5" />
        {!compact && 'Validar'}
      </Button>
    );
  }

  const statusInfo = VALIDATION_STATUS_OPTIONS.find(
    s => s.value === (validation.validationStatusOverride || validation.validationStatus)
  );
  const alerts = getValidationAlerts(validation);
  const hasAlerts = alerts.some(a => a.type === 'error');

  return (
    <div className="flex items-center gap-1.5">
      <Badge
        variant="outline"
        className={cn(
          'cursor-pointer hover:opacity-80 transition-opacity text-xs font-medium',
          statusInfo?.color
        )}
        onClick={onValidate}
      >
        {statusInfo?.label}
      </Badge>
      <span
        className={cn(
          'text-xs font-semibold cursor-pointer hover:opacity-80',
          getScoreColor(validation.validationScore)
        )}
        onClick={onValidate}
      >
        {validation.validationScore}
      </span>
      {hasAlerts && (
        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
      )}
    </div>
  );
};
