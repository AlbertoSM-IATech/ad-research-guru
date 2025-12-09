import { useState } from 'react';
import { ChevronDown, BookOpen, Lightbulb, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleEducationProps {
  sections: {
    id: string;
    title: string;
    icon: 'learn' | 'tip' | 'reminder';
    content: React.ReactNode;
  }[];
}

const iconMap = {
  learn: BookOpen,
  tip: Lightbulb,
  reminder: AlertCircle,
};

const colorMap = {
  learn: 'text-accent border-accent/20 bg-accent/5',
  tip: 'text-primary border-primary/20 bg-primary/5',
  reminder: 'text-muted-foreground border-border bg-muted/30',
};

export const CollapsibleEducation = ({ sections }: CollapsibleEducationProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedSections(new Set(sections.map((s) => s.id)));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Guía y Buenas Prácticas
        </h3>
        <div className="flex gap-2 text-sm">
          <button
            onClick={expandAll}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Expandir todo
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            onClick={collapseAll}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Colapsar todo
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {sections.map((section) => {
          const Icon = iconMap[section.icon];
          const isExpanded = expandedSections.has(section.id);
          
          return (
            <div
              key={section.id}
              className={cn(
                'rounded-lg border overflow-hidden transition-all duration-200',
                colorMap[section.icon]
              )}
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{section.title}</span>
                </div>
                <ChevronDown
                  className={cn(
                    'w-5 h-5 transition-transform duration-200',
                    isExpanded && 'rotate-180'
                  )}
                />
              </button>
              
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 animate-fade-in">
                  <div className="pl-8 text-sm text-foreground/80">
                    {section.content}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};