import { useMemo } from 'react';
import type { Keyword } from '@/types/advertising';

interface WordCloudProps {
  keywords: Keyword[];
}

export const WordCloud = ({ keywords }: WordCloudProps) => {
  const words = useMemo(() => {
    const maxVolume = Math.max(...keywords.map(k => k.searchVolume), 1);
    const minVolume = Math.min(...keywords.map(k => k.searchVolume), 0);
    const range = maxVolume - minVolume || 1;

    return keywords.slice(0, 30).map(k => {
      const normalized = (k.searchVolume - minVolume) / range;
      const size = 12 + normalized * 28; // 12px to 40px
      const opacity = 0.5 + normalized * 0.5; // 0.5 to 1
      
      return {
        text: k.keyword,
        size,
        opacity,
        volume: k.searchVolume,
        competitionLevel: k.competitionLevel,
      };
    });
  }, [keywords]);

  if (words.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Sin datos disponibles</p>
          <p className="text-xs mt-1">Añade keywords para generar la nube</p>
        </div>
      </div>
    );
  }

  // Simple word cloud layout
  const colors = [
    'hsl(217, 91%, 60%)',
    'hsl(24, 94%, 59%)',
    'hsl(142, 76%, 36%)',
    'hsl(280, 65%, 60%)',
    'hsl(0, 84%, 60%)',
    'hsl(45, 93%, 47%)',
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 p-4 h-full overflow-hidden">
      {words.map((word, index) => (
        <span
          key={word.text}
          className="inline-block px-2 py-1 rounded transition-all duration-300 hover:scale-110 cursor-default"
          style={{
            fontSize: `${word.size}px`,
            color: colors[index % colors.length],
            opacity: word.opacity,
            fontWeight: word.size > 25 ? 600 : 400,
          }}
          title={`${word.text}: Vol ${word.volume.toLocaleString()}, Comp ${word.competitionLevel === 'low' ? 'Baja' : word.competitionLevel === 'medium' ? 'Media' : 'Alta'}`}
        >
          {word.text}
        </span>
      ))}
    </div>
  );
};
