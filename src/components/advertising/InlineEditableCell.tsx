import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface InlineEditableCellProps {
  value: string | number;
  onSave: (value: string | number) => void;
  type?: 'text' | 'number' | 'textarea';
  className?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  formatter?: (value: string | number) => string;
}

export const InlineEditableCell = ({
  value,
  onSave,
  type = 'text',
  className,
  placeholder,
  min,
  max,
  formatter,
}: InlineEditableCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(String(value));
  }, [value]);

  const handleSave = () => {
    let finalValue: string | number = editValue;
    if (type === 'number') {
      finalValue = parseInt(editValue) || 0;
      if (min !== undefined && finalValue < min) finalValue = min;
      if (max !== undefined && finalValue > max) finalValue = max;
    }
    onSave(finalValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(String(value));
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const displayValue = formatter ? formatter(value) : String(value);

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className={cn(
          'cursor-pointer px-2 py-1 rounded hover:bg-muted/50 transition-colors min-h-[32px] flex items-center',
          !value && 'text-muted-foreground italic',
          className
        )}
      >
        {displayValue || placeholder || '—'}
      </div>
    );
  }

  if (type === 'textarea') {
    return (
      <div className="flex items-start gap-1">
        <Textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="min-h-[60px] text-sm"
          placeholder={placeholder}
          rows={2}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        className="h-8 text-sm"
        placeholder={placeholder}
        min={min}
        max={max}
      />
    </div>
  );
};