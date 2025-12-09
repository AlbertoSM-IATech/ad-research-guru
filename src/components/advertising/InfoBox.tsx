import { Info, Lightbulb, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoBoxProps {
  title?: string;
  children: React.ReactNode;
  variant?: 'info' | 'tip' | 'learn';
  className?: string;
}

export const InfoBox = ({ title, children, variant = 'info', className }: InfoBoxProps) => {
  const icons = {
    info: Info,
    tip: Lightbulb,
    learn: BookOpen,
  };

  const styles = {
    info: 'bg-accent/10 border-accent/20 text-accent',
    tip: 'bg-primary/10 border-primary/20 text-primary',
    learn: 'bg-success/10 border-success/20 text-success',
  };

  const Icon = icons[variant];

  return (
    <div className={cn('rounded-lg border p-4', styles[variant], className)}>
      <div className="flex gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          {title && <p className="font-medium text-foreground">{title}</p>}
          <div className="text-sm text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
};
