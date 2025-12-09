import { cn } from '@/lib/utils';
import { getCompetitionLabel, type CompetitionLevel } from '@/types/advertising';

interface CompetitionBadgeProps {
  level: CompetitionLevel;
  className?: string;
}

const badgeStyles: Record<CompetitionLevel, string> = {
  low: 'badge-competition-low',
  medium: 'badge-competition-medium',
  high: 'badge-competition-high',
};

export const CompetitionBadge = ({ level, className }: CompetitionBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        badgeStyles[level],
        className
      )}
    >
      {getCompetitionLabel(level)}
    </span>
  );
};
