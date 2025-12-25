import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardCheck } from 'lucide-react';
import {
  type KeywordValidation,
  VALIDATION_STATUS_OPTIONS,
  getScoreColor,
  getScoreBgColor,
} from '@/lib/keyword-validation';
import { cn } from '@/lib/utils';

interface ValidationBadgeProps {
  validation?: KeywordValidation;
  score: number;
  onValidate: () => void;
}

export const ValidationBadge = ({ validation, score, onValidate }: ValidationBadgeProps) => {
  if (!validation) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onValidate}
        className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1"
      >
        <ClipboardCheck className="w-3 h-3" />
        Validar
      </Button>
    );
  }

  const status = validation.validationStatusOverride || validation.validationStatus;
  const statusInfo = VALIDATION_STATUS_OPTIONS.find(s => s.value === status);

  return (
    <div className="flex items-center gap-1">
      <Badge
        variant="outline"
        className={cn(
          'text-[10px] px-1.5 py-0 cursor-pointer hover:opacity-80',
          statusInfo?.color
        )}
        onClick={onValidate}
      >
        {statusInfo?.label}
      </Badge>
      <span
        className={cn(
          'text-xs font-medium cursor-pointer hover:opacity-80 px-1 py-0.5 rounded',
          getScoreBgColor(score),
          getScoreColor(score)
        )}
        onClick={onValidate}
      >
        {score}
      </span>
    </div>
  );
};
