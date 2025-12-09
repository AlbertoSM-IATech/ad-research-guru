import { cn } from '@/lib/utils';
import type { CampaignType } from '@/types/advertising';

interface CampaignTypeBadgeProps {
  type: CampaignType;
  className?: string;
}

const badgeStyles: Record<CampaignType, string> = {
  SP: 'badge-sp',
  SB: 'badge-sb',
  SBV: 'badge-sbv',
  SD: 'badge-sd',
};

export const CampaignTypeBadge = ({ type, className }: CampaignTypeBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        badgeStyles[type],
        className
      )}
    >
      {type}
    </span>
  );
};
