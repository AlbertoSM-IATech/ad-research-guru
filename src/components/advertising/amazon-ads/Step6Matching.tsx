import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Search, Wand2, XCircle, ArrowRight } from 'lucide-react';
import { suggestMatches } from '@/lib/amazon-ads/import-aggregator';
import type { ImportAgg } from '@/types/amazon-ads';
import type { Keyword } from '@/types/advertising';

interface Step6MatchingProps {
  unmatched: ImportAgg[];
  keywords: Keyword[];
  /** Map of normalizedText -> keywordId for resolved matches */
  resolutions: Map<string, string | null>; // null = ignored
  onResolutionsChange: (resolutions: Map<string, string | null>) => void;
}

export const Step6Matching = ({
  unmatched,
  keywords,
  resolutions,
  onResolutionsChange,
}: Step6MatchingProps) => {
  const [searchFilter, setSearchFilter] = useState('');

  // Auto-suggestions
  const suggestions = useMemo(
    () => suggestMatches(unmatched, keywords, 0.3),
    [unmatched, keywords],
  );

  const filteredUnmatched = useMemo(() => {
    if (!searchFilter) return suggestions;
    const q = searchFilter.toLowerCase();
    return suggestions.filter(s =>
      s.agg.normalizedText.includes(q) ||
      s.agg.originalTexts.some(t => t.toLowerCase().includes(q))
    );
  }, [suggestions, searchFilter]);

  const handleAssign = (normalizedText: string, keywordId: string | null) => {
    const next = new Map(resolutions);
    if (keywordId === '_ignore') {
      next.set(normalizedText, null);
    } else if (keywordId) {
      next.set(normalizedText, keywordId);
    } else {
      next.delete(normalizedText);
    }
    onResolutionsChange(next);
  };

  const handleAutoSuggest = () => {
    const next = new Map(resolutions);
    for (const { agg, suggestions: suggs } of suggestions) {
      if (next.has(agg.normalizedText)) continue;
      if (suggs.length > 0 && suggs[0].score >= 0.6) {
        next.set(agg.normalizedText, suggs[0].keywordId);
      }
    }
    onResolutionsChange(next);
  };

  const resolvedCount = resolutions.size;
  const ignoredCount = Array.from(resolutions.values()).filter(v => v === null).length;
  const assignedCount = resolvedCount - ignoredCount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {unmatched.length} targets sin coincidencia directa
          </p>
          <p className="text-xs text-muted-foreground">
            {assignedCount} asignados · {ignoredCount} ignorados · {unmatched.length - resolvedCount} pendientes
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleAutoSuggest}>
          <Wand2 className="h-3 w-3" />
          Auto-sugerir
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar targets..."
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>

      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
        {filteredUnmatched.map(({ agg, suggestions: suggs }) => {
          const resolution = resolutions.get(agg.normalizedText);
          const isResolved = resolutions.has(agg.normalizedText);
          const assignedKw = resolution ? keywords.find(k => k.id === resolution) : null;

          return (
            <div
              key={agg.normalizedText}
              className={`border rounded-lg p-2.5 space-y-1.5 ${
                isResolved ? 'bg-muted/20 border-muted' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{agg.originalTexts[0]}</p>
                  <p className="text-xs text-muted-foreground">
                    {agg.clicks} clics · {agg.spend.toFixed(2)} gasto · {agg.orders} pedidos
                  </p>
                </div>
                {isResolved && (
                  <Badge variant={resolution === null ? 'secondary' : 'default'} className="text-xs shrink-0">
                    {resolution === null ? 'Ignorado' : 'Asignado'}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <Select
                  value={
                    resolution === null ? '_ignore' :
                    resolution ?? '_unset'
                  }
                  onValueChange={v => handleAssign(agg.normalizedText, v === '_unset' ? null : v)}
                >
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue placeholder="Seleccionar keyword..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_unset">— Sin asignar —</SelectItem>
                    <SelectItem value="_ignore">
                      <span className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> Ignorar
                      </span>
                    </SelectItem>
                    {/* Suggestions first */}
                    {suggs.length > 0 && suggs.map(s => (
                      <SelectItem key={`sugg-${s.keywordId}`} value={s.keywordId}>
                        <span className="flex items-center gap-1">
                          <Wand2 className="h-3 w-3 text-primary" />
                          {s.keyword}
                          <span className="text-muted-foreground ml-1">({Math.round(s.score * 100)}%)</span>
                        </span>
                      </SelectItem>
                    ))}
                    {/* All keywords */}
                    {keywords
                      .filter(kw => !suggs.some(s => s.keywordId === kw.id))
                      .slice(0, 50)
                      .map(kw => (
                        <SelectItem key={kw.id} value={kw.id}>
                          {kw.keyword}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>

              {assignedKw && (
                <p className="text-xs text-green-600 flex items-center gap-1 ml-5">
                  <CheckCircle className="h-3 w-3" />
                  → {assignedKw.keyword}
                </p>
              )}
            </div>
          );
        })}

        {filteredUnmatched.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {searchFilter ? 'Sin resultados para el filtro.' : 'Todos los targets fueron matched automáticamente. ¡Genial!'}
          </p>
        )}
      </div>
    </div>
  );
};
