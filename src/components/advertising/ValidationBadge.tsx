import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardCheck } from 'lucide-react';
import {
  type MarketData,
  getMarketScoreInfo,
  getMarketScoreColor,
  getMarketScoreBgColor,
} from '@/lib/market-score';
import { cn } from '@/lib/utils';

interface ValidationBadgeProps {
  marketData?: MarketData;
  score: number;
  onValidate: () => void;
}

export const ValidationBadge = ({ marketData, score, onValidate }: ValidationBadgeProps) => {
  if (!marketData) {
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

  const scoreInfo = getMarketScoreInfo(score);

  return (
    <div className="flex items-center gap-1">
      <Badge
        variant="outline"
        className={cn(
          'text-[10px] px-1.5 py-0 cursor-pointer hover:opacity-80',
          scoreInfo.color
        )}
        onClick={onValidate}
      >
        {scoreInfo.label}
      </Badge>
      <span
        className={cn(
          'text-xs font-medium cursor-pointer hover:opacity-80 px-1 py-0.5 rounded',
          getMarketScoreBgColor(score),
          getMarketScoreColor(score)
        )}
        onClick={onValidate}
      >
        {score}
      </span>
    </div>
  );
};
