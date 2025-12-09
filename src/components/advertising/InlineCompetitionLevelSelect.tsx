import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CompetitionBadge } from './CompetitionBadge';
import { type CompetitionLevel, COMPETITION_LEVELS } from '@/types/advertising';
import { cn } from '@/lib/utils';

interface InlineCompetitionLevelSelectProps {
  value: CompetitionLevel;
  note?: string;
  onChange: (level: CompetitionLevel, note?: string) => void;
}

export const InlineCompetitionLevelSelect = ({
  value,
  note,
  onChange,
}: InlineCompetitionLevelSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [noteValue, setNoteValue] = useState(note || '');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setNoteValue(note || '');
  }, [note]);

  const handleLevelClick = (level: CompetitionLevel) => {
    onChange(level, noteValue || undefined);
    setIsOpen(false);
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNote = e.target.value;
    setNoteValue(newNote);
  };

  const handleNoteBlur = () => {
    onChange(value, noteValue || undefined);
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onChange(value, noteValue || undefined);
      setIsOpen(false);
    }
    if (e.key === 'Escape') {
      setNoteValue(note || '');
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'cursor-pointer px-2 py-1 rounded hover:bg-muted/50 transition-colors min-h-[32px] flex items-center gap-2',
          isOpen && 'bg-muted/50'
        )}
      >
        <CompetitionBadge level={value} />
        {note && <span className="text-xs text-muted-foreground">({note})</span>}
        <ChevronDown className={cn('w-3 h-3 ml-auto transition-transform', isOpen && 'rotate-180')} />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[220px] animate-scale-in">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nivel de competidores</label>
              <div className="flex gap-2">
                {COMPETITION_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => handleLevelClick(level.value)}
                    className={cn(
                      'flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors',
                      value === level.value
                        ? level.value === 'low'
                          ? 'bg-green-500/20 text-green-600 ring-1 ring-green-500/50'
                          : level.value === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-600 ring-1 ring-yellow-500/50'
                          : 'bg-red-500/20 text-red-600 ring-1 ring-red-500/50'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nota (opcional, ej: "526 productos")</label>
              <Input
                value={noteValue}
                onChange={handleNoteChange}
                onBlur={handleNoteBlur}
                onKeyDown={handleNoteKeyDown}
                placeholder="Ej: 526 productos"
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
