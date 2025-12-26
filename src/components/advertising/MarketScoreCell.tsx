import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ClipboardCheck, AlertCircle } from 'lucide-react';
import {
  type MarketData,
  type MarketScoreBreakdown,
  getMarketScoreInfo,
  calculateMarketScore,
} from '@/lib/market-score';
import { cn } from '@/lib/utils';

interface MarketScoreCellProps {
  marketData?: MarketData;
  score: number;
  breakdown?: MarketScoreBreakdown;
  isIncomplete?: boolean;
  onValidate: () => void;
}

export const MarketScoreCell = ({ 
  marketData, 
  score, 
  breakdown,
  isIncomplete,
  onValidate 
}: MarketScoreCellProps) => {
  // If no market data and no score, show validate button
  if (!marketData && score === 0) {
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
  const actualBreakdown = breakdown || (marketData ? calculateMarketScore(marketData) : null);
  
  // Get progress bar color based on score
  const getProgressColor = () => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const BreakdownTooltip = () => {
    if (!actualBreakdown) {
      return (
        <div className="text-xs text-muted-foreground">
          Completa datos de mercado para ver desglose
        </div>
      );
    }

    return (
      <div className="space-y-2 text-xs">
        <div className="font-semibold border-b border-border pb-1">Desglose Market Score</div>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span>Volumen</span>
            <span className="font-mono">{actualBreakdown.volume.points}/{actualBreakdown.volume.max}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">{actualBreakdown.volume.label}</div>
          
          <div className="flex justify-between gap-4">
            <span>Competidores</span>
            <span className="font-mono">{actualBreakdown.competitors.points}/{actualBreakdown.competitors.max}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">{actualBreakdown.competitors.label}</div>
          
          <div className="flex justify-between gap-4">
            <span>Precio</span>
            <span className="font-mono">{actualBreakdown.price.points}/{actualBreakdown.price.max}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">{actualBreakdown.price.label}</div>
          
          <div className="flex justify-between gap-4">
            <span>Regalías</span>
            <span className="font-mono">{actualBreakdown.royalties.points}/{actualBreakdown.royalties.max}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">{actualBreakdown.royalties.label}</div>
          
          {actualBreakdown.penalties.points !== 0 && (
            <>
              <div className="flex justify-between gap-4 text-red-500">
                <span>Penalizaciones</span>
                <span className="font-mono">{actualBreakdown.penalties.points}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">{actualBreakdown.penalties.label}</div>
            </>
          )}
        </div>
        <div className="border-t border-border pt-1 font-semibold flex justify-between">
          <span>Total</span>
          <span>{actualBreakdown.total}/100</span>
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex flex-col gap-1 cursor-pointer hover:opacity-80 min-w-[80px]',
              isIncomplete && 'opacity-60'
            )}
            onClick={onValidate}
          >
            {/* Score row with badge and number */}
            <div className="flex items-center gap-1.5">
              {isIncomplete && (
                <AlertCircle className="w-3 h-3 text-muted-foreground" />
              )}
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] px-1.5 py-0 h-5',
                  scoreInfo.color
                )}
              >
                {isIncomplete ? 'Incompleto' : scoreInfo.label}
              </Badge>
              <span
                className={cn(
                  'text-xs font-semibold tabular-nums',
                  scoreInfo.color
                )}
              >
                {score}
              </span>
            </div>
            
            {/* Mini progress bar */}
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', getProgressColor())}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[250px]">
          <BreakdownTooltip />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
